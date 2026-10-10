"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { login, loginWithGoogle } from "@/actions/auth";
import { resendVerificationAction } from "@/actions/auth_extended";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (formData: FormData) => {
    setError("");
    setLoading(true);

    const requestedRedirect = new URLSearchParams(window.location.search).get("redirect");
    setEmail(String(formData.get("email") ?? ""));
    setVerificationSent(false);
    if (requestedRedirect) formData.set("redirect", requestedRedirect);
    
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan saat masuk.";
      if (!message.includes("NEXT_REDIRECT")) setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    const requestedRedirect = new URLSearchParams(window.location.search).get("redirect") || "/profile";
    try {
      const result = await loginWithGoogle(requestedRedirect);
      if (result?.error) {
        setError(result.error);
        setGoogleLoading(false);
      }
    } catch {
      setError("Gagal menghubungkan dengan akun Google.");
      setGoogleLoading(false);
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
      <div className="w-full max-w-md bg-card p-8 rounded-[32px] border border-border shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Selamat Datang</h1>
          <p className="text-muted-foreground">Masuk ke akun Next Solution Store Anda</p>
        </div>

        <form action={handleLogin} className="space-y-4">
          {error && <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-xl border border-destructive/20" role="alert">
            {error}
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

          <Button type="submit" disabled={loading || googleLoading} size="lg" className="w-full rounded-full h-12 text-base mt-2">
            {loading ? "Masuk..." : "Masuk"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">atau masuk dengan</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="w-full rounded-full h-12 text-sm font-medium flex items-center justify-center gap-3 border-input hover:bg-muted/50 transition-colors"
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
          {googleLoading ? "Menghubungkan ke Google..." : "Masuk dengan Akun Google"}
        </Button>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
