"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (formData: FormData) => {
    setError("");
    setLoading(true);

    const requestedRedirect = new URLSearchParams(window.location.search).get("redirect");
    if (requestedRedirect) formData.set("redirect", requestedRedirect);
    
    try {
      const result = await login(formData);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your Next Solution account</p>
        </div>

        <form action={handleLogin} className="space-y-6">
          {error && <div className="text-destructive text-sm text-center">{error}</div>}
          <div>
            <Input 
              type="email" 
              name="email"
              placeholder="Email Address" 
              required 
              className="bg-muted/30 h-12 rounded-xl" 
            />
          </div>
          <div>
            <Input 
              type="password" 
              name="password"
              placeholder="Password" 
              required 
              className="bg-muted/30 h-12 rounded-xl" 
            />
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
