"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Heart, ShoppingCart, Info, X } from "lucide-react";
import { login } from "@/actions/auth";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { resendVerificationAction } from "@/actions/auth_extended";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";

export default function LoginPage() {
  const [error, setError] = useState(() => {
    if (typeof window === "undefined") return "";
    const err = new URLSearchParams(window.location.search).get("error");
    return err ? decodeURIComponent(err) : "";
  });
  const [attention, setAttention] = useState<{
    type: "wishlist" | "checkout" | "cart" | "generic";
    title: string;
    description: string;
  } | null>(null);
  const [redirectTarget, setRedirectTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Memeriksa akun...");
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(true);
  const [email, setEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const redir = params.get("redirect") || "";
    const notice = params.get("notice") || "";
    const err = params.get("error");
    if (err) setError(decodeURIComponent(err));
    if (redir) setRedirectTarget(redir);

    const isWishlist = notice === "wishlist" || redir.toLowerCase().includes("wishlist");
    const isCheckout = notice === "checkout" || redir.toLowerCase().includes("checkout");
    const isCart = notice === "cart";

    if (isWishlist) {
      setAttention({
        type: "wishlist",
        title: "Perhatian: Masuk untuk Akses Wishlist",
        description:
          "Untuk membuka dan mengelola daftar produk favorit Anda di Wishlist, silakan masuk ke akun Anda terlebih dahulu.",
      });
    } else if (isCheckout) {
      setAttention({
        type: "checkout",
        title: "Perhatian: Masuk untuk Melanjutkan Pembayaran",
        description:
          "Untuk melanjutkan proses pemesanan, alamat pengiriman, dan checkout pembayaran, silakan masuk ke akun Anda terlebih dahulu.",
      });
    } else if (isCart) {
      setAttention({
        type: "cart",
        title: "Perhatian: Masuk untuk Menambah ke Keranjang",
        description:
          "Silakan masuk ke akun Anda terlebih dahulu untuk menambahkan produk pilihan ke keranjang belanja.",
      });
    } else if (notice === "profile" || redir.toLowerCase().includes("profile")) {
      setAttention({
        type: "generic",
        title: "Perhatian: Masuk untuk Akses Profil Akun",
        description:
          "Untuk melihat riwayat pesanan, profil, dan pengaturan akun Anda, silakan masuk ke akun Anda terlebih dahulu.",
      });
    } else if (notice === "invoice" || redir.toLowerCase().includes("invoice")) {
      setAttention({
        type: "generic",
        title: "Perhatian: Masuk untuk Akses Faktur",
        description:
          "Silakan masuk ke akun Anda terlebih dahulu untuk melihat atau mencetak faktur pesanan.",
      });
    } else if (redir && !redir.startsWith("/login")) {
      setAttention({
        type: "generic",
        title: "Perhatian: Autentikasi Diperlukan",
        description:
          "Halaman ini memerlukan akun. Silakan masuk ke akun Anda terlebih dahulu untuk melanjutkan.",
      });
    }
  }, []);

  useEffect(() => {
    getStorefrontSettingsAction()
      .then((raw) => {
        if (raw) {
          const sf = normalizeStorefrontSettings(raw);
          if (sf.features.google_login_enabled === false) {
            setGoogleLoginEnabled(false);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (formData: FormData) => {
    setError("");
    setLoading(true);
    setLoadingText("Memeriksa akun & kata sandi...");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:start-loading"));
    }

    const requestedRedirect = new URLSearchParams(window.location.search).get("redirect");
    setEmail(String(formData.get("email") ?? ""));
    setVerificationSent(false);
    if (requestedRedirect) formData.set("redirect", requestedRedirect);
    
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:stop-loading"));
        }
        return;
      }

      // Login berhasil, proses redirect sedang berjalan
      setLoadingText("Berhasil masuk! Membuka akun...");
      // Pertahankan status loading agar tombol tidak kembali normal sebelum halaman berpindah
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan saat masuk.";
      if (message.includes("NEXT_REDIRECT")) {
        // Next.js redirect sedang aktif, pertahankan status loading
        setLoadingText("Berhasil masuk! Mengalihkan...");
        return;
      }
      setError(message);
      setLoading(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("app:stop-loading"));
      }
    }
  };

  const handleResendVerification = async () => {
    const formData = new FormData();
    formData.set("email", email);
    setLoading(true);
    setError("");
    try {
      const result = await resendVerificationAction(formData);
      if (result.success) setVerificationSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal mengirim email verifikasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-card p-8 rounded-[32px] border border-border shadow-lg relative overflow-hidden">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Selamat Datang</h1>
          <p className="text-muted-foreground">Masuk ke akun Next Solution Store Anda</p>
        </div>

        {attention && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-6 flex items-start justify-between gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              attention.type === "wishlist"
                ? "border-rose-500/25 bg-rose-500/10 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/25 dark:text-rose-200"
                : attention.type === "checkout"
                ? "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-200"
                : attention.type === "cart"
                ? "border-blue-500/25 bg-blue-500/10 text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/25 dark:text-blue-200"
                : "border-primary/25 bg-primary/10 text-foreground dark:border-primary/30 dark:bg-primary/20"
            }`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  attention.type === "wishlist"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : attention.type === "checkout"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : attention.type === "cart"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {attention.type === "wishlist" && <Heart className="size-4.5 fill-rose-500/25" />}
                {attention.type === "checkout" && <ShoppingCart className="size-4.5" />}
                {attention.type === "cart" && <ShoppingCart className="size-4.5" />}
                {attention.type === "generic" && <Info className="size-4.5" />}
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-semibold text-sm leading-snug">{attention.title}</p>
                <p className="mt-1 leading-relaxed opacity-90">{attention.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttention(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors -mr-1 -mt-1 shrink-0"
              aria-label="Tutup pemberitahuan"
              title="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <form action={handleLogin} onSubmit={() => { setLoading(true); setLoadingText("Memeriksa akun & kata sandi..."); }} className="space-y-4">
          {error && <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-xl border border-destructive/20" role="alert">
            {error}
            {error.startsWith("Email atau password tidak sesuai.") && (
              <p className="mt-2 text-xs text-muted-foreground">
                Setelah login dengan Google, buka{" "}
                <Link href="/profile?tab=settings" className="font-medium text-primary underline">
                  Pengaturan &gt; Keamanan
                </Link>{" "}
                untuk membuat password.
              </p>
            )}
            {error.toLowerCase().includes("email not confirmed") && (
              <div className="mt-2">
                {verificationSent ? <p className="text-green-700">Email verifikasi sudah dikirim ulang. Periksa inbox atau folder spam.</p> : (
                  <button type="button" onClick={handleResendVerification} disabled={loading || !email} className="font-medium text-primary underline disabled:opacity-50">
                    Kirim ulang email verifikasi
                  </button>
                )}
              </div>
            )}
          </div>}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <Input 
              type="email" 
              name="email"
              placeholder="nama@email.com" 
              required 
              className="bg-muted/30 h-12 rounded-xl" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Kata Sandi</label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Kata Sandi Anda" 
                required 
                className="bg-muted/30 h-12 rounded-xl pr-12"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-primary w-4 h-4 rounded" />
              <span className="text-muted-foreground text-xs">Ingat saya</span>
            </label>
            <Link href="/forgot-password" className="text-primary text-xs hover:underline">
              Lupa kata sandi?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="w-full rounded-full h-12 text-base mt-2 font-bold transition-all shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-80"
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="size-4.5 animate-spin" />
                <span>{loadingText || "Memeriksa Akun..."}</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>Masuk</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        {googleLoginEnabled && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">atau masuk dengan</span>
              </div>
            </div>

            <GoogleAuthButton
              redirectPath={redirectTarget || (typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("redirect") || "/profile") : "/profile")}
              mode="signin"
              onStart={() => setError("")}
              onError={(msg) => setError(msg)}
              disabled={loading}
            />
          </>
        )}

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href={redirectTarget ? `/register?redirect=${encodeURIComponent(redirectTarget)}` : "/register"}
            className="text-primary font-medium hover:underline"
          >
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
