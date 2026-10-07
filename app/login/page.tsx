"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { login } from "@/actions/auth";
import { resendVerificationAction } from "@/actions/auth_extended";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your Next Solution account</p>
        </div>

        <form action={handleLogin} className="space-y-6">
          {error && <div className="text-destructive text-sm text-center" role="alert">
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
            <Input 
              type="email" 
              name="email"
              placeholder="Email Address" 
              required 
              className="bg-muted/30 h-12 rounded-xl" 
            />
          </div>
          <div className="relative">
            <Input 
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password" 
              required 
              className="bg-muted/30 h-12 rounded-xl pr-12"
            />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-primary w-4 h-4 rounded" />
              <span className="text-muted-foreground">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" disabled={loading} size="lg" className="w-full rounded-full h-12 text-base">
            {loading ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
