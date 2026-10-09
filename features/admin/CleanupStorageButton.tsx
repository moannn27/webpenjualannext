"use client";

import { useState, useTransition } from "react";
import { cleanupUnusedStorageAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function CleanupStorageButton() {
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCleanup = () => {
    if (!window.confirm("Fitur ini akan memindai storage dan menghapus gambar-gambar yang sudah tidak terpakai di database. Lanjutkan?")) return;
    
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await cleanupUnusedStorageAction();
        setMessage({ type: "success", text: `Selesai! ${result.deletedCount} file lama/tidak terpakai berhasil dihapus.` });
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Gagal membersihkan file." });
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" size="sm" onClick={handleCleanup} disabled={busy}>
        <Trash2 className="mr-2 size-4" />
        {busy ? "Membersihkan..." : "Bersihkan File Lama"}
      </Button>
      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-green-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

