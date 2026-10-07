"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/auth_extended";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Konfirmasi kata sandi tidak cocok.");
      setLoading(false);
      return;
    }
    try {
      await resetPasswordAction(form);
      setMessage("Kata sandi berhasil diubah. Silakan masuk kembali.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal mengubah kata sandi.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
    <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-lg">
      <h1 className="mb-2 text-2xl font-bold">Buat kata sandi baru</h1>
      <p className="mb-6 text-sm text-muted-foreground">Gunakan minimal 6 karakter.</p>
      <form onSubmit={submit} className="space-y-4">
        <Input name="password" type="password" placeholder="Kata sandi baru" minLength={6} required />
        <Input name="confirmPassword" type="password" placeholder="Ulangi kata sandi" minLength={6} required />
        {message && <p role="status" className="text-sm text-green-700">{message} <Link className="underline" href="/login">Login</Link></p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={loading || Boolean(message)}>{loading ? "Menyimpan..." : "Simpan kata sandi"}</Button>
      </form>
    </div>
  </div>;
}
