"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register, loginWithGoogle } from "@/actions/auth";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (formData: FormData) => {
    setError("");
    
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    
    if (password !== confirmPassword) {
      setError("Kata sandi dan konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError("Terjadi kesalahan tidak terduga saat pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle("/profile");
      if (result?.error) {
        setError(result.error);
        setGoogleLoading(false);
      }
    } catch {
      setError("Gagal menghubungkan dengan akun Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-card p-8 rounded-[32px] border border-border shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Buat Akun Baru</h1>
          <p className="text-muted-foreground">Bergabung dengan Next Solution Store hari ini</p>
        </div>

        <form action={handleRegister} className="space-y-4">
          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-xl border border-destructive/20" role="alert">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nama Lengkap</label>
            <Input name="full_name" placeholder="Nama Lengkap Anda" required className="bg-muted/30 h-12 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nomor WhatsApp / HP</label>
            <Input
              name="phone"
              type="tel"
              placeholder="08123456789"
              required
              className="bg-muted/30 h-12 rounded-xl"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Wajib & unik untuk konfirmasi pesanan dan perlindungan akun.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <Input name="email" type="email" placeholder="nama@email.com" required className="bg-muted/30 h-12 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Kata Sandi</label>
            <div className="relative">
              <Input name="password" type={showPassword ? "text" : "password"} placeholder="Minimal 6 karakter" required minLength={6} className="bg-muted/30 h-12 rounded-xl pr-12" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Konfirmasi Kata Sandi</label>
            <div className="relative">
              <Input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Ulangi kata sandi" required minLength={6} className="bg-muted/30 h-12 rounded-xl pr-12" />
              <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirmPassword} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
                {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>
          
          <label className="flex items-start gap-2 cursor-pointer text-xs pt-1">
            <input type="checkbox" required className="accent-primary w-4 h-4 mt-0.5 rounded" />
            <span className="text-muted-foreground leading-snug">
              Saya menyetujui <Link href="/terms" className="text-primary hover:underline">Syarat &amp; Ketentuan</Link> serta{" "}
              <Link href="/privacy" className="text-primary hover:underline">Kebijakan Privasi</Link>.
            </span>
          </label>

          <Button type="submit" disabled={loading || googleLoading} size="lg" className="w-full rounded-full h-12 text-base mt-2">
            {loading ? "Mendaftarkan..." : "Daftar Akun"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">atau daftar dengan</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignup}
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
          {googleLoading ? "Menghubungkan ke Google..." : "Daftar dengan Akun Google"}
        </Button>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
