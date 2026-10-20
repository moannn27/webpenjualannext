"use client";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Maximize2,
  Minimize2,
  MessageCircle,
  Send,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  discount_price: number | null;
  stock: number;
  image: string | null;
  brands: { name: string } | null;
};

type Message = { role: "user" | "assistant"; text: string; products?: Product[] };

const suggestions = ["Buat kuliah", "Buat kerja", "Belum tahu, bantu tentukan"];

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
  const hasStartedChat = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasStartedChat.current) return;
    hasStartedChat.current = true;
    setBusy(true);
    void fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Mulai percakapan. Sapa pelanggan dengan ramah dan tanyakan perangkat serta tujuan pemakaiannya. Jangan tampilkan katalog dulu.",
      }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Chat tidak dapat menjawab saat ini.");
        setMessages([{ role: "assistant", text: result.answer }]);
      })
      .catch(() => {
        setMessages([
          {
            role: "assistant",
            text: "Halo! Selamat datang di Next Solution. Aku siap membantu kamu memilih perangkat yang sesuai. Kamu sedang mencari perangkat apa dan akan digunakan untuk apa?",
          },
        ]);
      })
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || busy) return;
    const history = messages.slice(-8).map(({ role, text }) => ({ role, text }));
    setInput("");
    setMessages((current) => [...current, { role: "user", text: message }]);
    setBusy(true);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chat tidak dapat menjawab saat ini.");
      setMessages((current) => [...current, { role: "assistant", text: result.answer, products: result.products }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: error instanceof Error ? error.message : "Koneksi chat bermasalah." },
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
    <div className="fixed bottom-5 right-5 z-50 flex items-end gap-3">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Tanya langsung ke admin lewat WhatsApp"
        title="Tanya langsung lewat WhatsApp"
        className="mb-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      >
        <MessageCircle className="size-6" />
      </a>

      <section
        aria-label="Chat rekomendasi produk"
        className={`flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl transition-[width,height] duration-300 ease-in-out ${
          isExpanded
            ? "h-[min(780px,calc(100vh-28px))] w-[min(700px,calc(100vw-32px))]"
            : "h-[min(650px,calc(100vh-36px))] w-[min(400px,calc(100vw-100px))] sm:w-[410px]"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between bg-primary p-3.5 text-primary-foreground shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold tracking-tight">Next Assistant</h2>
                <span className="flex size-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
              </div>
              <p className="text-[11px] text-primary-foreground/80">Rekomendasi Cerdas & Akurat</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-xs sm:text-sm">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col gap-2 ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-2xs ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-xs"
                    : "bg-muted/80 text-foreground rounded-tl-xs border border-border/50"
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

              {/* Product Cards Attachment */}
              {message.products && message.products.length > 0 && (
                <div
                  className={`mt-1 w-full max-w-[95%] ${
                    isExpanded
                      ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                      : "space-y-2.5"
                  }`}
                >
                  {message.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="group flex gap-3 rounded-xl border border-border/80 bg-background/95 p-2.5 text-foreground transition-all duration-200 hover:border-primary hover:shadow-md hover:bg-accent/5"
                    >
                      {product.image && (
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/40">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <span className="min-w-0 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="block truncate text-xs font-semibold group-hover:text-primary transition-colors">
                            {product.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {product.brands?.name || ""} · stok {product.stock}
                          </span>
                        </div>
                        <span className="block text-xs font-bold text-primary">
                          Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
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
              <span className="text-xs font-medium">Next Assistant sedang berpikir...</span>
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
        <form onSubmit={send} className="flex gap-2 border-t border-border/80 p-3 bg-card/60 backdrop-blur-xs">
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
          >
            <Send className="size-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}

