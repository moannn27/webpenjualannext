import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { getFAQsAction } from "@/actions/content";

interface FaqItem {
  id?: string;
  question: string;
  answer: string;
  category?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export const metadata: Metadata = {
  title: "Tanya Jawab (FAQ)",
  description: "Jawaban seputar produk, pemesanan, pembayaran, pengiriman, dan layanan Next Solution Store.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Tanya Jawab (FAQ) | Next Solution Store",
    description: "Temukan jawaban seputar produk dan layanan Next Solution Store.",
    url: "/faq",
  },
};

export default async function FAQPage() {
  const rawFaqs = (await getFAQsAction().catch(() => [])) as FaqItem[];
  const faqs: FaqItem[] = Array.isArray(rawFaqs) ? rawFaqs : [];
  const groups: Record<string, FaqItem[]> = {};
  for (const faq of faqs) {
    const category = faq.category?.trim() || "Informasi Umum";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(faq);
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-8 rounded-3xl border border-border bg-card px-6 py-8 sm:px-9 sm:py-10">
        <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircleQuestion className="size-5" aria-hidden="true" />
        </div>
        <p className="mb-2 text-sm font-semibold text-primary">Bantuan Next Solution</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pertanyaan yang sering diajukan</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Informasi tentang produk, pembayaran, pengiriman, dan layanan kami. Pilih topik untuk membaca jawabannya.
        </p>
      </header>

      {Object.keys(groups).length ? (
        <div className="space-y-7">
          {Object.entries(groups).map(([category, items]) => (
            <section key={category} aria-label={category}>
              <h2 className="mb-3 text-lg font-semibold">{category}</h2>
              <div className="divide-y divide-border rounded-2xl border border-border bg-card px-5 sm:px-6">
                {items.map((faq) => (
                  <details key={faq.id || faq.question} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                      <span>{faq.question}</span>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <p className="mt-3 whitespace-pre-line pr-8 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-border bg-card p-8 text-muted-foreground">
          Informasi FAQ belum tersedia. Silakan hubungi tim kami melalui halaman{" "}
          <Link href="/about" className="font-medium text-primary underline underline-offset-4">Tentang Kami</Link>.
        </p>
      )}
    </main>
  );
}
