"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
type FAQ = { id: string; question: string; answer: string };

export function FaqSection({
  faqs = [],
  title = "Pertanyaan Umum",
  subtitle = "Jawaban atas pertanyaan yang sering diajukan seputar produk, garansi, dan transaksi.",
}: {
  faqs?: FAQ[];
  title?: string;
  subtitle?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Outer White Card Container (Matching Reference Aesthetic) */}
      <div className="rounded-[32px] sm:rounded-[36px] bg-white dark:bg-[#1E2028] p-6 sm:p-8 lg:p-10 shadow-sm border border-slate-100 dark:border-white/5 max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-block text-xs font-bold tracking-wider text-primary uppercase mb-2">
            PUSAT BANTUAN
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-[#F8F9FA] dark:bg-white/5 border-primary/40 dark:border-primary/40 shadow-xs ring-1 ring-primary/20"
                    : "bg-[#F8F9FA] dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-[#F2F4F7] dark:hover:bg-white/10 shadow-2xs"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between text-left cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? "rotate-180 text-primary" : "rotate-0"
                    }`}
                  />
                </button>
                <div
                  className={`px-5 sm:px-6 overflow-hidden transition-all duration-200 ease-in-out ${
                    isOpen ? "max-h-96 pb-5 sm:pb-6 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line text-xs sm:text-sm md:text-base border-t border-slate-200/60 dark:border-white/10 pt-3">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {faqs.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:border-primary hover:text-primary transition"
            >
              <span>Lihat Semua Tanya Jawab (FAQ)</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        )}
        {!faqs.length && (
          <p className="text-center text-sm text-slate-400 py-6">FAQ belum tersedia.</p>
        )}
      </div>
    </section>
  );
}
