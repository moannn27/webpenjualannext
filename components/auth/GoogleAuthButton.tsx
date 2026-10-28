"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginWithGoogle, syncOAuthProfileAndCartAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void | Promise<void>;
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
 * - Google menerima SHA-256 hashed nonce.
 * - Supabase menerima raw unhashed nonce untuk diverifikasi terhadap ID token.
 */
async function generateCryptoNonce(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const rawNonce = btoa(String.fromCharCode(...randomBytes));

  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(rawNonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
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
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [gisScriptLoaded, setGisScriptLoaded] = useState(false);
  const [gisRendered, setGisRendered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
  const isGisAvailable = Boolean(googleClientId);

  // Inisialisasi Google Identity Services (GIS) bila Client ID tersedia
  useEffect(() => {
    if (!isGisAvailable || !gisScriptLoaded || typeof window === "undefined" || !window.google?.accounts?.id) {
      return;
    }

    let isMounted = true;

    async function initGIS() {
      try {
        const { rawNonce, hashedNonce } = await generateCryptoNonce();

        if (!isMounted || !window.google?.accounts?.id || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          auto_select: false,
          callback: async (response) => {
            if (!response.credential) {
              onError?.("Token otentikasi Google tidak diterima.");
              return;
            }

            setLoading(true);
            setLoadingText("Memverifikasi akun Google...");
            onStart?.();

            try {
              const supabase = createClient();
              // Mengautentikasi ke Supabase menggunakan ID Token + raw nonce
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
                nonce: rawNonce,
              });

              if (error) {
                throw new Error(error.message);
              }

              if (data?.session && data?.user) {
                setLoadingText("Menyiapkan akun...");
                // Sinkronisasi profil ke public.users dan pastikan keranjang tersedia
                const syncResult = await syncOAuthProfileAndCartAction();

                setLoadingText("Berhasil! Mengalihkan...");

                const targetPath =
                  syncResult?.role === "admin" || syncResult?.role === "super_admin"
                    ? (redirectPath === "/profile" ? "/admin" : redirectPath)
                    : redirectPath;

                // Gunakan window.location agar seluruh cookie sesi SSR termuat segar
                window.location.href = targetPath;
              } else {
                throw new Error("Sesi login Google tidak dapat dibuat.");
              }
            } catch (authError) {
              const message =
                authError instanceof Error ? authError.message : "Terjadi kesalahan saat otentikasi Google.";
              onError?.(message);
              setLoading(false);
            }
          },
        });

        // Kosongkan kontainer sebelum render untuk menghindari duplikasi tombol
        containerRef.current.innerHTML = "";
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

        setGisRendered(true);
      } catch (err) {
        // Fallback jika crypto / GIS gagal inisialisasi
        setGisRendered(false);
      }
    }

    void initGIS();

    return () => {
      isMounted = false;
    };
  }, [googleClientId, isGisAvailable, gisScriptLoaded, mode, redirectPath, onStart, onError]);

  // Fallback handler: Memakai OAuth redirect Supabase jika GIS tidak aktif / adblocker / offline
  const handleFallbackOAuth = async () => {
    onError?.("");
    setLoading(true);
    setLoadingText("Menghubungkan ke Google...");
    onStart?.();

    try {
      const result = await loginWithGoogle(redirectPath);
      if (result?.error) {
        onError?.(result.error);
        setLoading(false);
      }
    } catch (err) {
      const errorObj = err as { message?: string; digest?: string };
      if (errorObj?.message?.includes("NEXT_REDIRECT") || errorObj?.digest?.includes("NEXT_REDIRECT")) {
        return;
      }
      onError?.("Gagal menghubungkan dengan akun Google.");
      setLoading(false);
    }
  };

  return (
    <div className={cn("w-full flex flex-col items-center justify-center", className)}>
      {isGisAvailable && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGisScriptLoaded(true)}
          onError={() => {
            // Jika script GIS diblokir atau gagal dimuat, fallback ke OAuth standar
            setGisScriptLoaded(false);
            setGisRendered(false);
          }}
        />
      )}

      {loading ? (
        <div className="w-full rounded-full h-12 text-sm font-medium flex items-center justify-center gap-3 border border-input bg-muted/30 text-foreground shadow-2xs">
          <LoaderCircle className="size-5 animate-spin text-primary" />
          <span>{loadingText || "Memproses..."}</span>
        </div>
      ) : isGisAvailable && gisRendered ? (
        <div className="w-full flex justify-center py-0.5 min-h-[44px]">
          <div ref={containerRef} className="w-full flex justify-center" />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleFallbackOAuth}
          disabled={disabled || loading}
          className="w-full rounded-full h-12 text-sm font-medium flex items-center justify-center gap-3 border-input hover:bg-muted/50 transition-colors shadow-2xs cursor-pointer"
          aria-busy={loading}
        >
          <svg className="size-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{mode === "signup" ? "Daftar dengan Akun Google" : "Masuk dengan Akun Google"}</span>
        </Button>
      )}
    </div>
  );
}

