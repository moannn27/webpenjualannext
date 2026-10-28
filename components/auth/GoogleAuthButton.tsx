"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { loginWithGoogle, syncOAuthProfileAndCartAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void | Promise<void>;
            nonce?: string;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              logo_alignment?: "left" | "center";
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt?: (callback?: (notification: unknown) => void) => void;
          cancel?: () => void;
        };
      };
    };
  }
}

/**
 * Helper kriptografi: Menghasilkan raw nonce acak 32-byte dan SHA-256 hash-nya.
 * Sesuai panduan resmi:
 * - Google menerima SHA-256 hashed nonce (hexadecimal 64-karakter).
 * - Supabase menerima raw unhashed nonce (base64) untuk diverifikasi terhadap ID token.
 */
export async function generateCryptoNonce(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
  if (!cryptoObj?.getRandomValues || !cryptoObj?.subtle) {
    throw new Error("Web Cryptography API tidak tersedia di lingkungan ini.");
  }

  const randomBytes = new Uint8Array(32);
  cryptoObj.getRandomValues(randomBytes);
  const rawNonce = btoa(String.fromCharCode(...randomBytes));

  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(rawNonce);
  const hashBuffer = await cryptoObj.subtle.digest("SHA-256", encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return { rawNonce, hashedNonce };
}

interface GoogleAuthButtonProps {
  redirectPath?: string;
  mode?: "signin" | "signup";
  onStart?: () => void;
  onError?: (errorMessage: string) => void;
  disabled?: boolean;
  className?: string;
}

export function GoogleAuthButton({
  redirectPath = "/profile",
  mode = "signin",
  onStart,
  onError,
  disabled = false,
  className,
}: GoogleAuthButtonProps) {
  // Container stabil khusus untuk GIS - React TIDAK PERNAH mengelola elemen anak di dalamnya
  const containerRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<{ rawNonce: string; hashedNonce: string } | null>(null);
  const gisRenderedRef = useRef(false);

  // Simpan callback dan redirectPath dalam ref agar perubahan prop tidak memicu inisialisasi ulang GIS
  const onStartRef = useRef(onStart);
  const onErrorRef = useRef(onError);
  const redirectPathRef = useRef(redirectPath);

  useEffect(() => {
    onStartRef.current = onStart;
    onErrorRef.current = onError;
    redirectPathRef.current = redirectPath;
  });

  const [gisScriptLoaded, setGisScriptLoaded] = useState(() => {
    return typeof window !== "undefined" && Boolean(window.google?.accounts?.id);
  });
  const [gisRendered, setGisRendered] = useState(false);
  // Pembedaan error: gisInitError khusus kegagalan setup GIS, authError khusus kegagalan alur runtime login
  const [gisInitError, setGisInitError] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // Normalize Client ID dari environment variable
  const rawClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
  const googleClientId = rawClientId.replace(/^["']|["']$/g, "").trim();
  const isGisAvailable = Boolean(googleClientId);

  const effectiveInitError = gisInitError || (!isGisAvailable ? "Google Client ID belum terkonfigurasi pada sistem." : "");

  // Deteksi ketersediaan script jika sudah dimuat sebelumnya oleh Next.js Script manager
  useEffect(() => {
    if (typeof window === "undefined" || window.google?.accounts?.id) return;

    const scriptTag =
      document.getElementById("google-identity-services") ||
      document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

    if (scriptTag) {
      const handleLoad = () => setGisScriptLoaded(true);
      const handleError = () => setGisInitError("Script Google Identity Services gagal dimuat.");
      scriptTag.addEventListener("load", handleLoad);
      scriptTag.addEventListener("error", handleError);
      return () => {
        scriptTag.removeEventListener("load", handleLoad);
        scriptTag.removeEventListener("error", handleError);
      };
    }
  }, []);

  // Inisialisasi Google Identity Services (GIS)
  useEffect(() => {
    if (!isGisAvailable || !gisScriptLoaded || typeof window === "undefined" || !window.google?.accounts?.id) {
      return;
    }

    let isMounted = true;

    async function initGIS() {
      try {
        if (!isMounted || !window.google?.accounts?.id || !containerRef.current) return;

        // Buat nonce kriptografis baru untuk sesi login ini
        const noncePair = await generateCryptoNonce();
        nonceRef.current = noncePair;

        if (!isMounted || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          nonce: noncePair.hashedNonce,
          use_fedcm_for_prompt: true,
          auto_select: false,
          callback: async (response) => {
            setAuthError("");
            onErrorRef.current?.("");

            // Tahap 1: Validasi credential token dari Google
            if (!response?.credential) {
              const msg = "Otentikasi Google dibatalkan atau token tidak diterima. Silakan coba lagi.";
              setAuthError(msg);
              onErrorRef.current?.(msg);
              setLoading(false);
              return;
            }

            setLoading(true);
            setLoadingText("Memverifikasi akun Google...");
            onStartRef.current?.();

            try {
              const supabase = createClient();
              // Tahap 2: Otentikasi via ID Token Google + raw nonce verifikasi kriptografis
              const { data, error: signInError } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
                nonce: nonceRef.current?.rawNonce || noncePair.rawNonce,
              });

              if (signInError) {
                throw new Error(`Verifikasi akun Google gagal: ${signInError.message}`);
              }

              // Tahap 3: Pembentukan sesi Supabase
              if (!data?.session || !data?.user) {
                throw new Error("Sesi login Google tidak dapat dibuat oleh server autentikasi.");
              }

              setLoadingText("Menyiapkan akun...");

              // Tahap 4: Sinkronisasi profil ke public.users dan pastikan keranjang belanja tersedia
              let targetRole = "customer";
              try {
                const syncResult = await syncOAuthProfileAndCartAction();
                if (syncResult?.role) {
                  targetRole = syncResult.role;
                }
              } catch (syncErr) {
                // Sesi Supabase sudah valid dan tersimpan di browser cookie.
                // Jangan batalkan sesi login yang sudah berhasil jika hanya sinkronisasi background yang tertunda.
                console.warn("Sinkronisasi profil OAuth background warning:", syncErr);
              }

              // Tahap 5: Redirect ke halaman tujuan
              setLoadingText("Berhasil! Mengalihkan...");
              const currentRedirect = redirectPathRef.current || "/profile";
              const targetPath =
                targetRole === "admin" || targetRole === "super_admin"
                  ? (currentRedirect === "/profile" ? "/admin" : currentRedirect)
                  : currentRedirect;

              // Full reload agar cookie sesi SSR Supabase terbaca segar oleh proxy & middleware
              window.location.href = targetPath;
            } catch (authErr) {
              const message =
                authErr instanceof Error ? authErr.message : "Terjadi kesalahan saat otentikasi Google.";
              setAuthError(message);
              onErrorRef.current?.(message);
              setLoading(false);
            }
          },
        });

        // PENTING: containerRef.current TIDAK memiliki anak yang dikelola oleh React.
        // Kita hanya mengosongkan node imperatif murni (jika ada sisa render sebelumnya)
        // menggunakan replaceChildren() tanpa mengganggu tree Virtual DOM React.
        if (containerRef.current) {
          containerRef.current.replaceChildren();
          window.google.accounts.id.renderButton(containerRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
            shape: "pill",
            text: mode === "signup" ? "signup_with" : "signin_with",
            logo_alignment: "left",
            width: 380,
            locale: "id",
          });

          if (isMounted) {
            gisRenderedRef.current = true;
            setGisRendered(true);
            setGisInitError("");
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "Gagal menginisialisasi Google Identity Services.";
        gisRenderedRef.current = false;
        setGisInitError(message);
        setGisRendered(false);
      }
    }

    void initGIS();

    // Timeout guard jika script gagal beroperasi
    const timeoutId = setTimeout(() => {
      if (isMounted && !gisRenderedRef.current && !window.google?.accounts?.id) {
        setGisInitError(
          "Waktu pemuatan Google Identity Services habis. Periksa koneksi internet atau ekstensi adblocker Anda."
        );
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (typeof window !== "undefined" && window.google?.accounts?.id?.cancel) {
        try {
          window.google.accounts.id.cancel();
        } catch {}
      }
    };
  }, [googleClientId, isGisAvailable, gisScriptLoaded, mode]);

  // Handler fallback manual/eksplisit - HANYA dipanggil jika user dengan sengaja menekan tombol cadangan
  const handleExplicitOAuthFallback = async () => {
    setAuthError("");
    onErrorRef.current?.("");
    setLoading(true);
    setLoadingText("Menghubungkan ke OAuth Supabase cadangan...");
    onStartRef.current?.();

    try {
      const currentRedirect = redirectPathRef.current || "/profile";
      const result = await loginWithGoogle(currentRedirect);
      if (result?.error) {
        setAuthError(result.error);
        onErrorRef.current?.(result.error);
        setLoading(false);
      }
    } catch (err) {
      const errorObj = err as { message?: string; digest?: string };
      if (errorObj?.message?.includes("NEXT_REDIRECT") || errorObj?.digest?.includes("NEXT_REDIRECT")) {
        return;
      }
      const msg = "Gagal menghubungkan dengan login Google cadangan.";
      setAuthError(msg);
      onErrorRef.current?.(msg);
      setLoading(false);
    }
  };

  return (
    <div className={cn("w-full flex flex-col items-center justify-center", className)}>
      {isGisAvailable && (
        <Script
          id="google-identity-services"
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGisScriptLoaded(true)}
          onError={() => {
            setGisInitError("Script Google Identity Services gagal dimuat (mungkin diblokir adblocker).");
          }}
        />
      )}

      {/* State 1: Sedang memverifikasi token / menyiapkan sesi */}
      {loading && (
        <div className="w-full max-w-[380px] rounded-full h-11 text-sm font-medium flex items-center justify-center gap-3 border border-input bg-muted/30 text-foreground shadow-2xs">
          <LoaderCircle className="size-5 animate-spin text-primary" />
          <span>{loadingText || "Memproses..."}</span>
        </div>
      )}

      {/* State 2: GIS Container - Tetap stabil di DOM */}
      <div
        className={cn(
          "w-full flex flex-col items-center justify-center min-h-[44px]",
          (loading || !isGisAvailable || Boolean(effectiveInitError)) && "hidden"
        )}
      >
        {/* Pesan error autentikasi runtime jika terjadi saat percobaan login sebelumnya */}
        {authError && !loading && (
          <div className="w-full max-w-[380px] mb-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center flex items-center justify-center gap-2">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Placeholder SEBELUM GIS selesai merender tombol */}
        {!gisRendered && (
          <div className="w-full max-w-[380px] rounded-full h-11 text-sm font-medium flex items-center justify-center gap-2.5 border border-input bg-muted/20 text-muted-foreground shadow-2xs">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            <span>Menyiapkan Akun Google...</span>
          </div>
        )}

        {/* Container KHUSUS untuk Google GIS renderButton. */}
        {/* PENTING: Tag ini TIDAK MEMILIKI ANAK JSX. React tidak mengelola anak di dalamnya */}
        <div
          ref={containerRef}
          className={cn(
            "w-full flex justify-center py-0.5 min-h-[44px]",
            !gisRendered && "hidden",
            disabled && "pointer-events-none opacity-60"
          )}
        />
      </div>

      {/* State 3: HANYA jika GIS Gagal Dimuat atau Client ID belum diatur sama sekali */}
      {!loading && (!isGisAvailable || Boolean(effectiveInitError)) && (
        <div className="w-full max-w-[380px] flex flex-col items-center gap-2.5 p-3.5 rounded-2xl bg-destructive/5 border border-destructive/20 text-center">
          <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
            <AlertCircle className="size-4 shrink-0" />
            <span>Google Identity Services tidak tersedia</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {effectiveInitError || "Konfigurasi Google Identity Services belum dapat dimuat saat ini."}
          </p>

          {process.env.NODE_ENV === "development" && (
            <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg text-left w-full mt-1 border border-amber-200 dark:border-amber-900/40">
              <span className="font-bold">Info Development:</span>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Client ID: {isGisAvailable ? "Terdeteksi" : "KOSONG di NEXT_PUBLIC_GOOGLE_CLIENT_ID"}</li>
                <li>Script GIS: {gisScriptLoaded ? "Telah dimuat" : "Belum termuat"}</li>
              </ul>
            </div>
          )}

          {/* Opsi fallback alternatif eksplisit */}
          <div className="pt-1 w-full border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExplicitOAuthFallback}
              disabled={disabled || loading}
              className="w-full text-xs text-muted-foreground hover:text-foreground h-9 rounded-xl"
            >
              Gunakan OAuth Redirect Cadangan (Supabase)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
