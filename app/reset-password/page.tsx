"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPasswordAction } from "@/actions/auth_extended";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X, AlertCircle, ArrowRight } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isMinLength = password.length >= 6;
  const hasConfirm = confirmPassword.length > 0;
  const isMatching = hasConfirm && password === confirmPassword;
  const isMismatch = hasConfirm && password !== confirmPassword;

  // Otomatis redirect ke halaman login setelah 10 detik jika reset password berhasil
  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      router.push("/login");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Kata sandi harus memiliki minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      await resetPasswordAction(form);
      setMessage("Kata sandi berhasil diubah. Silakan masuk kembali.");
      setCountdown(10);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal mengubah kata sandi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Buat kata sandi baru</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Gunakan minimal 6 karakter.
        </p>

        <form onSubmit={submit} className="space-y-4">
          {/* Input Kata Sandi Baru */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">Kata Sandi Baru</label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Kata sandi baru"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={Boolean(message)}
                className="h-11 rounded-xl bg-muted/20 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Input Konfirmasi Kata Sandi */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">Konfirmasi Kata Sandi</label>
            <div className="relative">
              <Input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Ulangi kata sandi"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                disabled={Boolean(message)}
                className={cn(
                  "h-11 rounded-xl bg-muted/20 pr-11 transition-colors",
                  isMismatch && "border-destructive focus-visible:ring-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                title={showConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Attention / Ketentuan Kata Sandi */}
          {!message && (
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5 space-y-2 text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ketentuan Kata Sandi
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full transition-colors",
                    isMinLength
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Check className="size-2.5 stroke-[3]" />
                </div>
                <span
                  className={cn(
                    "text-xs transition-colors",
                    isMinLength
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  Gunakan minimal 6 karakter
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full transition-colors",
                    isMatching
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : isMismatch
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isMismatch ? <X className="size-2.5 stroke-[3]" /> : <Check className="size-2.5 stroke-[3]" />}
                </div>
                <span
                  className={cn(
                    "text-xs transition-colors",
                    isMatching
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : isMismatch
                      ? "font-medium text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {isMatching
                    ? "Kata sandi cocok"
                    : isMismatch
                    ? "Kata sandi harus sama"
                    : "Kedua kata sandi harus sama"}
                </span>
              </div>
            </div>
          )}

          {/* Feedback Messages & Countdown Auto-redirect */}
          {message && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5 stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                    {message}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Otomatis dialihkan ke halaman login dalam{" "}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {countdown ?? 10}
                    </span>{" "}
                    detik jika tidak mengklik tombol di bawah.
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                >
                  <span>Masuk Sekarang (Login)</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-medium shadow-sm transition-all"
            disabled={loading || Boolean(message) || !isMinLength || !isMatching}
          >
            {loading ? "Menyimpan kata sandi..." : "Simpan kata sandi"}
          </Button>
        </form>
      </div>
    </div>
  );
}
