"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, ExternalLink, MessageCircle } from "lucide-react";
import type { StoreBranch } from "@/lib/storefront-settings";

export function FooterBranchSelector({ branches }: { branches: StoreBranch[] }) {
  const activeBranches = branches.filter((b) => b.is_active !== false);
  const [selectedId, setSelectedId] = useState<string>(() => activeBranches[0]?.id ?? "");

  if (!activeBranches.length) return null;

  const selectedBranch = activeBranches.find((b) => b.id === selectedId) ?? activeBranches[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="footer-branch-select" className="text-xs font-medium text-muted-foreground">
          Pilih lokasi cabang:
        </label>
        <Link
          href="/#cabang"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Lihat di Peta ↗
        </Link>
      </div>

      {/* Branch Dropdown Selector */}
      <select
        id="footer-branch-select"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {activeBranches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} ({branch.city})
          </option>
        ))}
      </select>

      {/* Selected Branch Compact Info Box */}
      {selectedBranch && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-2 transition-all">
          <div>
            <span className="inline-block rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase mb-1">
              {selectedBranch.city}
            </span>
            <p className="font-bold text-foreground leading-snug">{selectedBranch.name}</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed mt-1">
              {selectedBranch.address}
            </p>
          </div>

          {selectedBranch.operating_hours && (
            <p className="text-muted-foreground text-[11px]">
              🕒 {selectedBranch.operating_hours}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
            {selectedBranch.maps_url && (
              <a
                href={selectedBranch.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <MapPin className="size-3 shrink-0" />
                Google Maps <ExternalLink className="size-2.5" />
              </a>
            )}
            {selectedBranch.whatsapp && (
              <a
                href={`https://wa.me/${selectedBranch.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Halo ${selectedBranch.name}, saya ingin bertanya tentang ketersediaan stok.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#25D366] hover:underline"
              >
                <MessageCircle className="size-3 shrink-0" />
                WhatsApp ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

