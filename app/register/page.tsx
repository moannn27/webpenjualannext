"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register } from "@/actions/auth";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (formData: FormData) => {
    setError("");
    
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-card p-8 rounded-[32px] border border-border shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground">Join Next Solution Store today</p>
        </div>

        <form action={handleRegister} className="space-y-6">
          {error && <div className="text-destructive text-sm text-center">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            {/* The backend expects 'full_name' but we have first/last. Let's combine them on submit, or change backend. We'll change backend to take full_name directly here */}
            <Input name="full_name" placeholder="Full Name" required className="bg-muted/30 h-12 rounded-xl col-span-2" />
          </div>
          <div>
            <Input name="email" type="email" placeholder="Email Address" required className="bg-muted/30 h-12 rounded-xl" />
          </div>
          <div className="relative">
            <Input name="password" type={showPassword ? "text" : "password"} placeholder="Password" required minLength={6} className="bg-muted/30 h-12 rounded-xl pr-12" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          <div className="relative">
            <Input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" required minLength={6} className="bg-muted/30 h-12 rounded-xl pr-12" />
            <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirmPassword} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
              {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <input type="checkbox" required className="accent-primary w-4 h-4 mt-0.5 rounded" />
            <span className="text-muted-foreground leading-snug">
              I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          <Button type="submit" disabled={loading} size="lg" className="w-full rounded-full h-12 text-base">
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
