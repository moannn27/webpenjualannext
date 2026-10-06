"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQS } from "@/constants/dummy";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-lg text-muted-foreground">
          Have a question? We&apos;re here to help.
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, index) => (
          <div
            key={index}
            className={`border border-border rounded-[24px] overflow-hidden transition-all duration-300 ${
              openIndex === index ? "bg-card shadow-md" : "bg-transparent"
            }`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
            >
              <span className="text-lg font-semibold text-foreground pr-4">
                {faq.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${
                  openIndex === index ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
            <div
              className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? "max-h-40 pb-6 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <p className="text-muted-foreground">
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
