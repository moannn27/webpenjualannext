"use client";

import { Check, ShoppingCart, CreditCard, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutProgressHeaderProps {
  currentStep: 1 | 2 | 3;
  className?: string;
}

const STEPS = [
  { step: 1, label: "1. Keranjang", icon: ShoppingCart },
  { step: 2, label: "2. Pengiriman & Pembayaran", icon: CreditCard },
  { step: 3, label: "3. Selesai", icon: CheckCircle2 },
] as const;

export function CheckoutProgressHeader({ currentStep, className }: CheckoutProgressHeaderProps) {
  return (
    <nav aria-label="Alur checkout" className={cn("mb-8 w-full", className)}>
      <ol className="flex items-center justify-between max-w-2xl mx-auto px-2">
        {STEPS.map((item, index) => {
          const isCompleted = currentStep > item.step;
          const isCurrent = currentStep === item.step;

          return (
            <li key={item.step} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span
                  className={cn(
                    "flex size-7 sm:size-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground shadow-xs",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm",
                    !isCompleted && !isCurrent && "border-2 border-border/80 bg-muted/40 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="size-3.5" /> : item.step}
                </span>

                <span
                  className={cn(
                    "text-xs sm:text-sm tracking-tight transition-colors whitespace-nowrap",
                    isCurrent && "font-bold text-foreground",
                    isCompleted && "font-semibold text-foreground/80",
                    !isCompleted && !isCurrent && "font-medium text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "h-0.5 flex-1 mx-2 sm:mx-4 transition-colors duration-300",
                    currentStep > item.step ? "bg-primary" : "bg-border/70"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
