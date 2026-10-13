"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register, loginWithGoogle } from "@/actions/auth";
import { Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { cn } from "@/lib/utils";
import { isValidIndonesianPhone } from "@/lib/phone";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateFullName(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return "Nama lengkap wajib diisi.";
  if (trimmed.length < 2) return "Nama lengkap minimal 2 karakter.";
  return "";
}

function validatePhone(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return "Nomor WhatsApp / HP wajib diisi.";
  if (!isValidIndonesianPhone(trimmed)) {
    return "Masukkan nomor HP / WhatsApp Indonesia yang valid (contoh: 08123456789).";
  }
  return "";
}

function validateEmail(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return "Email wajib diisi.";
  if (!EMAIL_REGEX.test(trimmed)) return "Format email tidak valid (contoh: nama@email.com).";
  return "";
}

function validatePassword(val: string): string {
  if (!val) return "Kata sandi wajib diisi.";
  if (val.length < 6) return "Kata sandi minimal 6 karakter.";
  return "";
}

function validateConfirmPassword(confirmVal: string, passwordVal: string): string {
  if (!confirmVal) return "Konfirmasi kata sandi wajib diisi.";
  if (confirmVal !== passwordVal) return "Kata sandi dan konfirmasi kata sandi tidak cocok.";
  return "";
}

export default function RegisterPage() {
  const [formValues, setFormValues] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreed: false,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const fullNameError = touched.full_name ? validateFullName(formValues.full_name) : "";
  const phoneError = touched.phone ? validatePhone(formValues.phone) : "";
  const emailError = touched.email ? validateEmail(formValues.email) : "";
  const passwordError = touched.password ? validatePassword(formValues.password) : "";
  const confirmPasswordError = touched.confirmPassword
    ? validateConfirmPassword(formValues.confirmPassword, formValues.password)
    : "";

  const handleRegister = async (formData: FormData) => {
    setError("");

    setTouched({
      full_name: true,
      phone: true,
      email: true,
      password: true,
      confirmPassword: true,
      agreed: true,
    });

    const fullName = String(formData.get("full_name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const nameErr = validateFullName(fullName);
    const phErr = validatePhone(phone);
    const emErr = validateEmail(email);
    const passErr = validatePassword(password);
    const confErr = validateConfirmPassword(confirmPassword, password);

    if (nameErr || phErr || emErr || passErr || confErr || !formValues.agreed) {
      return;
    }

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
    } catch (err) {
      const errorObj = err as { message?: string; digest?: string };
      if (errorObj?.message?.includes("NEXT_REDIRECT") || errorObj?.digest?.includes("NEXT_REDIRECT")) {
        return;
      }
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

        <form action={handleRegister} noValidate className="space-y-4">
          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-xl border border-destructive/20 flex items-center justify-center gap-2" role="alert">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nama Lengkap</label>
            <Input
              name="full_name"
              value={formValues.full_name}
              onChange={(e) => {
                const val = e.target.value;
                setFormValues((prev) => ({ ...prev, full_name: val }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, full_name: true }))}
              placeholder="Nama Lengkap Anda"
              autoComplete="name"
              required
              className={cn(
                "bg-muted/30 h-12 rounded-xl transition-colors",
                fullNameError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {fullNameError && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{fullNameError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nomor WhatsApp / HP</label>
            <Input
              name="phone"
              type="tel"
              value={formValues.phone}
              onChange={(e) => {
                const val = e.target.value;
                setFormValues((prev) => ({ ...prev, phone: val }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
              placeholder="08123456789"
              autoComplete="tel"
              required
              className={cn(
                "bg-muted/30 h-12 rounded-xl transition-colors",
                phoneError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {phoneError ? (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{phoneError}</span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Wajib &amp; unik untuk konfirmasi pesanan dan perlindungan akun.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <Input
              name="email"
              type="email"
              value={formValues.email}
              onChange={(e) => {
                const val = e.target.value;
                setFormValues((prev) => ({ ...prev, email: val }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              placeholder="nama@email.com"
              autoComplete="email"
              required
              className={cn(
                "bg-muted/30 h-12 rounded-xl transition-colors",
                emailError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {emailError && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Kata Sandi</label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formValues.password}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormValues((prev) => ({ ...prev, password: val }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                required
                minLength={6}
                className={cn(
                  "bg-muted/30 h-12 rounded-xl pr-12 transition-colors",
                  passwordError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {/* Checklist Aturan Kata Sandi: Minimal 6 Karakter */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <div
                className={cn(
                  "flex size-4 items-center justify-center rounded-full transition-colors",
                  formValues.password.length >= 6
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Check className="size-2.5 stroke-[3]" />
              </div>
              <span
                className={cn(
                  "text-[11px] transition-colors",
                  formValues.password.length >= 6
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-muted-foreground"
                )}
              >
                Minimal 6 karakter
              </span>
            </div>
            {passwordError && touched.password && formValues.password.length === 0 && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Konfirmasi Kata Sandi</label>
            <div className="relative">
              <Input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formValues.confirmPassword}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormValues((prev) => ({ ...prev, confirmPassword: val }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                placeholder="Ulangi kata sandi"
                autoComplete="new-password"
                required
                minLength={6}
                className={cn(
                  "bg-muted/30 h-12 rounded-xl pr-12 transition-colors",
                  confirmPasswordError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {/* Indikator Kecocokan Konfirmasi */}
            {formValues.confirmPassword.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {formValues.confirmPassword === formValues.password ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                    <div className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                    <span>Kata sandi cocok</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-destructive font-medium text-[11px]">
                    <div className="flex size-4 items-center justify-center rounded-full bg-destructive/15">
                      <X className="size-2.5 stroke-[3]" />
                    </div>
                    <span>Kata sandi belum cocok</span>
                  </div>
                )}
              </div>
            )}
            {confirmPasswordError && touched.confirmPassword && formValues.confirmPassword.length === 0 && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{confirmPasswordError}</span>
              </p>
            )}
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                name="agreed"
                checked={formValues.agreed}
                onChange={(e) => {
                  setFormValues((prev) => ({ ...prev, agreed: e.target.checked }));
                  setTouched((prev) => ({ ...prev, agreed: true }));
                }}
                required
                className="accent-primary w-4 h-4 mt-0.5 rounded cursor-pointer"
              />
              <span className="text-muted-foreground leading-snug">
                Saya menyetujui <Link href="/terms" className="text-primary hover:underline">Syarat &amp; Ketentuan</Link> serta{" "}
                <Link href="/privacy" className="text-primary hover:underline">Kebijakan Privasi</Link>.
              </span>
            </label>
            {touched.agreed && !formValues.agreed && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Anda harus menyetujui Syarat &amp; Ketentuan serta Kebijakan Privasi.</span>
              </p>
            )}
          </div>

          <Button type="submit" disabled={loading || googleLoading} size="lg" className="w-full rounded-full h-12 text-base mt-2">
            {loading ? "Mendaftarkan..." : "Daftar Akun"}
          </Button>
        </form>

        {googleLoginEnabled && (
          <>
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
          </>
        )}

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
