"use client";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LoaderCircle,
  Maximize2,
  Minimize2,
  MessageCircle,
  Send,
  X,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type Product = {
  id: string;
  name: string;
  price: number;
  discount_price: number | null;
  stock: number;
  image: string | null;
  brands: { name: string } | null;
  highlights?: { key: string; value: string }[];
  graphicsLabel?: string | null;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  products?: Product[];
  alternatives?: Product[];
  alternativeLabel?: string;
  isError?: boolean;
  isRateLimit?: boolean;
  aiGenerated?: boolean;
};

export function toRecommendationHistory(messages: Message[]) {
  return messages.slice(-20).map(({ role, text, products, alternatives }) => ({
    role,
    text,
    ...(role === "assistant" && (products?.length || alternatives?.length)
      ? { productIds: [...(products ?? []), ...(alternatives ?? [])].map(({ id }) => id) }
      : {}),
  }));
}

const suggestions = ["Buat kuliah", "Buat kerja", "Belum tahu, bantu tentukan"];

export function ProductCards({ products, isExpanded, title }: { products: Product[]; isExpanded: boolean; title?: string }) {
  if (!products.length) return null;
  return (
    <section className="mt-1 w-full max-w-full space-y-2">
      {title && <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>}
      <div className={isExpanded ? "grid grid-cols-1 gap-2.5 sm:grid-cols-2" : "space-y-2.5"}>
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="group flex min-w-0 gap-3 rounded-2xl border border-border/80 bg-card p-3 text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
          >
            {product.image && (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted">
                <Image src={product.image} alt={product.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="64px" />
              </div>
            )}
            <span className="flex min-w-0 flex-1 flex-col justify-between">
              <span>
                <span className="block truncate text-xs font-semibold transition-colors group-hover:text-primary">{product.name}</span>
                <span className="block text-[11px] text-muted-foreground">{product.brands?.name || ""} · stok {product.stock}</span>
                {product.graphicsLabel !== undefined && (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Grafis: {product.graphicsLabel || "belum dicantumkan di katalog"}
                  </span>
                )}
                {product.highlights?.length ? (
                  <span className="mt-0.5 block line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {product.highlights.map(({ key, value }) => `${key}: ${value}`).join(" · ")}
                  </span>
                ) : null}
              </span>
              <span className="block text-sm font-bold text-primary">
                Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 font-bold first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-background/70 p-2 text-xs">{children}</pre>
  ),
  code: ({ children }) => <code className="rounded bg-background/70 px-1 py-0.5 text-xs">{children}</code>,
};

export function RecommendationChatWindow({
  whatsappHref,
  onClose,
}: {
  whatsappHref: string;
  onClose: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdminHelp, setShowAdminHelp] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Halo! Selamat datang di Next Solution. Aku siap membantu kamu menemukan perangkat elektronik yang paling sesuai. Supaya saranku tepat, perangkat apa yang sedang kamu cari dan akan digunakan untuk apa?",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || busy) return;
    const history = toRecommendationHistory(messages);
    setInput("");
    setMessages((current) => [...current, { role: "user", text: message }]);
    setBusy(true);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      let result: {
        error?: string;
        answer?: string;
        isRateLimit?: boolean;
        products?: Product[];
        alternatives?: Product[];
        alternativeLabel?: string;
        aiGenerated?: boolean;
      } | null = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      if (!response.ok || !result) {
        const isLimit = response.status === 429 || Boolean(result?.isRateLimit);
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text:
              result?.error ||
              result?.answer ||
              (isLimit
                ? "Batas pertanyaan tercapai. Silakan coba beberapa saat lagi atau hubungi admin kami via WhatsApp."
                : "Maaf, sistem asisten sedang memproses permintaan lain atau mengalami kendala jaringan. Kamu juga bisa langsung chat admin via WhatsApp untuk respons instan."),
            isError: !isLimit,
            isRateLimit: isLimit,
          },
        ]);
        return;
      }
      const isLimit = Boolean(result.isRateLimit);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: result.answer || "Ada yang bisa saya bantu lagi seputar produk laptop atau komputer kami?",
          products: result.products,
          alternatives: result.alternatives,
          alternativeLabel: result.alternativeLabel,
          aiGenerated: Boolean(result.aiGenerated),
          isRateLimit: isLimit,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "Koneksi chat sedang terputus. Silakan coba sesaat lagi atau langsung hubungi admin toko kami via WhatsApp.",
          isError: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  return (
  <div className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:justify-end sm:px-0">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Tanya langsung ke admin lewat WhatsApp"
        title="Tanya langsung lewat WhatsApp"
        className="mb-1 hidden size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:flex"
      >
        <MessageCircle className="size-6" />
      </a>

      <section
        aria-label="Chat rekomendasi produk"
        className={`flex flex-col overflow-hidden rounded-[1.4rem] border border-border/80 bg-background shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)] transition-[width,height] duration-300 ease-in-out ${
          isExpanded
            ? "h-[min(780px,calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-[700px]"
            : "h-[min(650px,calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-[410px]"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between bg-gradient-to-br from-primary via-primary to-primary/85 p-3.5 text-primary-foreground shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold tracking-tight">AI Assistant</h2>
                <span className="flex size-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
              </div>
              <p className="text-[11px] text-primary-foreground/80">Asisten Next Solution Store</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMessages([
                  {
                    role: "assistant",
                    text: "Halo! Selamat datang di Next Solution. Aku siap membantu kamu menemukan perangkat elektronik yang paling sesuai. Supaya saranku tepat, perangkat apa yang sedang kamu cari dan akan digunakan untuk apa?",
                  },
                ]);
              }}
              aria-label="Mulai chat baru"
              title="Chat Baru"
              className="flex size-8 items-center justify-center rounded-lg text-primary-foreground/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Perkecil chat" : "Perbesar chat"}
              title={isExpanded ? "Perkecil" : "Perbesar"}
              className="hidden sm:flex size-8 items-center justify-center rounded-lg text-primary-foreground/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup chat"
              title="Tutup chat"
              className="flex size-8 items-center justify-center rounded-lg text-primary-foreground/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Messages Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-muted/25 to-background p-3.5 text-sm sm:p-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col gap-2 ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 leading-7 shadow-sm sm:max-w-[84%] ${
                  message.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : message.isRateLimit
                      ? "rounded-bl-md border border-amber-500/35 bg-amber-500/10 text-foreground"
                      : message.isError
                        ? "rounded-bl-md border border-destructive/25 bg-destructive/5 text-foreground"
                        : "rounded-bl-md border border-border/70 bg-card text-foreground"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm">
                    <ReactMarkdown components={markdownComponents}>
                      {message.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  message.text
                )}
              </div>

              {message.isRateLimit && (
                <div className="max-w-[90%] sm:max-w-[84%] flex items-start gap-2.5 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-100 shadow-xs animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Perhatian: Chat Asisten Sedang Penuh
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                      Saat ini kapasitas chat asisten AI sedang mencapai batas antrean. Kamu bisa mencoba kembali beberapa menit ke depan, atau langsung hubungi admin WhatsApp kami untuk bantuan instan.
                    </p>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline pt-1 text-[11px]"
                    >
                      <span>Chat Admin WhatsApp</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              )}

              {message.role === "assistant" && !message.isError && !message.isRateLimit && message.aiGenerated && (
                <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 select-none">
                  <Sparkles className="size-3 shrink-0" />
                  <span>Dijawab oleh AI</span>
                </div>
              )}

              {/* Product Cards Attachment */}
              {message.products?.length ? <ProductCards products={message.products} isExpanded={isExpanded} /> : null}
              {message.alternatives?.length ? (
                <ProductCards products={message.alternatives} isExpanded={isExpanded} title={message.alternativeLabel ?? "Alternatif"} />
              ) : null}
            </div>
          ))}

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in duration-300">
              <div className="w-full text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-0.5">
                <Sparkles className="size-3 text-primary" />
                Pilihan cepat untuk mulai:
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  disabled={busy}
                  className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground/80 shadow-2xs transition-all hover:border-primary/50 hover:bg-accent hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 rounded-2xl bg-muted/80 p-3 text-muted-foreground w-fit rounded-tl-xs border border-border/50">
              <div className="flex gap-1">
                <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce" />
              </div>
              <span className="text-xs font-medium">AI Assistant sedang berpikir...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Helper: Tanya Admin Langsung */}
        {showAdminHelp ? (
          <div className="mx-3 mb-2 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-foreground">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#25D366] shrink-0" />
              <span className="text-[11px] font-medium">Perlu respons cepat dari tim toko?</span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline text-[11px]"
              >
                <span>Chat Admin</span>
                <ExternalLink className="size-3" />
              </a>
              <button
                type="button"
                onClick={() => setShowAdminHelp(false)}
                className="ml-1 text-muted-foreground hover:text-foreground p-0.5 rounded"
                aria-label="Tutup rekomendasi admin WhatsApp"
                title="Sembunyikan"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-3 mb-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAdminHelp(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 border border-emerald-200/70 dark:border-emerald-900/60 rounded-full px-2.5 py-1 transition-all"
              aria-label="Buka bantuan admin WhatsApp"
              title="Buka bantuan admin WhatsApp"
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Tanya Admin WA</span>
              <ChevronUp className="size-3" />
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={send} className="flex gap-2 border-t border-border/80 bg-card/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:pb-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={500}
            placeholder="Contoh: cari laptop Asus di bawah 8 jutaan..."
            className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2 text-xs sm:text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Kirim pesan"
            disabled={busy || !input.trim()}
            className="rounded-full shadow-xs transition-transform active:scale-95"
            aria-busy={busy}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </section>
    </div>
  );
}

