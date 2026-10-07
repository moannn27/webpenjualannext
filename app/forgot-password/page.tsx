"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/actions/auth_extended";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await forgotPasswordAction(new FormData(event.currentTarget));
      if (result.success) setMessage("Jika email terdaftar, tautan reset akan segera dikirim.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal mengirim email reset.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
    <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-lg">
      <h1 className="mb-2 text-2xl font-bold">Lupa kata sandi?</h1>
      <p className="mb-6 text-sm text-muted-foreground">Masukkan email akunmu untuk menerima tautan reset.</p>
      <form onSubmit={submit} className="space-y-4">
        <Input name="email" type="email" placeholder="Alamat email" required />
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={loading}>{loading ? "Mengirim..." : "Kirim tautan reset"}</Button>
      </form>
      <Link href="/login" className="mt-6 block text-center text-sm text-primary hover:underline">Kembali ke login</Link>
    </div>
  </div>;
}
