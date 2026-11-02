"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Phone, MapPin, Clock } from "lucide-react";
import { DEFAULT_PRIVACY_CONTENT, type LegalDocument } from "@/lib/legal-content";
import { getLegalContentAction } from "@/actions/legal";
import { RichTextRenderer } from "@/components/shared/RichTextRenderer";

export function PrivacyPolicyClientView({ initialContent }: { initialContent?: LegalDocument } = {}) {
  const [content, setContent] = useState<LegalDocument>(initialContent || DEFAULT_PRIVACY_CONTENT);

  useEffect(() => {
    let active = true;
    getLegalContentAction("privacy")
      .then((data) => {
        if (active && data) {
          setContent(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Header Banner */}
      <header className="mb-10 rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xs">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
          <ShieldCheck className="size-4" />
          <span>Privasi &amp; Perlindungan Data Pengguna</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {content.title || "Kebijakan Privasi (Privacy Policy)"}
        </h1>
        <div className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-3xl">
          <RichTextRenderer content={content.subtitle || DEFAULT_PRIVACY_CONTENT.subtitle} />
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground/80">
          Terakhir diperbarui: {content.last_updated || "28 Oktober 2026"} &bull; Berlaku untuk domain <strong>{content.effective_domain || "https://nextsolution.web.id"}</strong>
        </p>
      </header>

      {/* Konten Kebijakan Dinamis */}
      <div className="space-y-8 text-foreground/90 leading-relaxed text-sm sm:text-base">
        {content.sections.map((section, idx) => {
          const isContactSection = section.title.toLowerCase().includes("kontak") || section.title.toLowerCase().includes("hubungi");

          return (
            <section
              key={section.id || idx}
              className={`rounded-2xl border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs ${
                isContactSection
                  ? "border-primary/30 bg-primary/5"
                  : "border-border"
              }`}
            >
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                {isContactSection && <Mail className="size-5 text-primary" />}
                <span>{section.title}</span>
              </h2>

              <div className="text-sm leading-relaxed text-muted-foreground prose dark:prose-invert max-w-none">
                <RichTextRenderer content={section.content} />
              </div>
            </section>
          );
        })}

        {/* Static Contact Badges Card */}
        <section className="rounded-2xl border border-primary/20 bg-card p-6 sm:p-8 space-y-4 shadow-2xs">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <span>Saluran Kontak Resmi Perlindungan Data</span>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Jika Anda memiliki pertanyaan mengenai privasi, hak akses data, atau akun:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm pt-1">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <Mail className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Email Dukungan Pelanggan</span>
                <a href="mailto:support@nextsolution.id" className="text-primary hover:underline">
                  support@nextsolution.id
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <Phone className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">WhatsApp &amp; Telepon</span>
                <a href="https://wa.me/628112238310" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  +62 811-2238-310
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Alamat Gerai Toko Fisik</span>
                <span className="text-muted-foreground">
                  Jl. Kartini No. 9, Bandung / Jl. Pajajaran No. 42, Kota Bandung, Jawa Barat
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <Clock className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Jam Operasional Layanan</span>
                <span className="text-muted-foreground">
                  Senin &ndash; Sabtu: 09.00 &ndash; 18.00 WIB
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Kunjungi juga halaman{" "}
            <Link href="/about" className="font-semibold text-primary underline underline-offset-4">
              Tentang Kami (About Us)
            </Link>{" "}
            atau{" "}
            <Link href="/terms" className="font-semibold text-primary underline underline-offset-4">
              Syarat &amp; Ketentuan (Terms of Service)
            </Link>.
          </p>
        </section>
      </div>
    </main>
  );
}

