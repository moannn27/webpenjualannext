"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register } from "@/actions/auth";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          <div>
            <Input name="password" type="password" placeholder="Password" required className="bg-muted/30 h-12 rounded-xl" />
          </div>
          <div>
            <Input name="confirmPassword" type="password" placeholder="Confirm Password" required className="bg-muted/30 h-12 rounded-xl" />
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
