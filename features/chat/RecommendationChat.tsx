"use client";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ExternalLink, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Product = { id: string; name: string; description: string; price: number; discount_price: number | null; stock: number; image: string | null; brands: { name: string } | null };
type Message = { role: "user" | "assistant"; text: string; products?: Product[] };
const suggestions = ["Buat kuliah", "Buat kerja", "Belum tahu, bantu tentukan"];
const markdownComponents: Components = {
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 font-bold first:mt-0">{children}</h3>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-background/70 p-2 text-xs">{children}</pre>,
  code: ({ children }) => <code className="rounded bg-background/70 px-1 py-0.5 text-xs">{children}</code>,
};

export function RecommendationChat({ whatsappNumber }: { whatsappNumber: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Halo! Selamat datang di Next Solution. Aku siap membantu kamu menemukan perangkat elektronik yang paling sesuai. Supaya saranku tepat, perangkat apa yang sedang kamu cari dan akan digunakan untuk apa?" }]);
  const hasStartedChat = useRef(false);
  const normalizedWhatsapp = whatsappNumber.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${normalizedWhatsapp}?text=${encodeURIComponent("Halo Next Solution, saya ingin bertanya tentang produk.")}`;

  useEffect(() => {
    if (!open || hasStartedChat.current) return;
    hasStartedChat.current = true;
    setBusy(true);
    void fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Mulai percakapan. Sapa pelanggan dengan ramah dan tanyakan perangkat serta tujuan pemakaiannya. Jangan tampilkan katalog dulu." }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chat tidak dapat menjawab saat ini.");
      setMessages([{ role: "assistant", text: result.answer }]);
    }).catch(() => {
      setMessages([{ role: "assistant", text: "Halo! Selamat datang di Next Solution. Aku siap membantu kamu memilih perangkat yang sesuai. Kamu sedang mencari perangkat apa dan akan digunakan untuk apa?" }]);
    }).finally(() => setBusy(false));
  }, [open]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim(); if (!message || busy) return;
    const history = messages.slice(-8).map(({ role, text }) => ({ role, text }));
    setInput(""); setMessages((current) => [...current, { role: "user", text: message }]); setBusy(true);
    try {
      const response = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chat tidak dapat menjawab saat ini.");
      setMessages((current) => [...current, { role: "assistant", text: result.answer, products: result.products }]);
    } catch (error) { setMessages((current) => [...current, { role: "assistant", text: error instanceof Error ? error.message : "Koneksi chat bermasalah." }]); }
    finally { setBusy(false); }
  };
  const send = (event: FormEvent) => { event.preventDefault(); void sendMessage(input); };

  return <>
    {!open && <Button className="fixed bottom-5 right-5 z-50 size-14 rounded-full shadow-lg" aria-label="Buka chat rekomendasi" onClick={() => setOpen(true)}><MessageCircle className="size-6" /></Button>}
    {open && <div className="fixed bottom-5 right-5 z-50 flex items-end gap-3">
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Tanya langsung ke admin lewat WhatsApp" title="Tanya langsung lewat WhatsApp" className="mb-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2">
        <MessageCircle className="size-6" />
      </a>
      <section aria-label="Chat rekomendasi produk" className="flex h-[min(680px,calc(100vh-40px))] w-[min(400px,calc(100vw-104px))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <header className="flex items-center justify-between bg-primary p-4 text-primary-foreground"><div className="flex items-center gap-2"><Bot className="size-5" /><div><h2 className="font-semibold">Next Assistant</h2><p className="text-xs opacity-80">Asisten AI Next Solution</p></div></div><Button variant="ghost" size="icon-sm" className="text-primary-foreground hover:bg-white/15" aria-label="Tutup chat" onClick={() => setOpen(false)}><X className="size-4" /></Button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <div key={index} className={`max-w-[92%] rounded-xl p-3 text-sm ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}><ReactMarkdown components={markdownComponents}>{message.text}</ReactMarkdown>{message.products?.map((product) => <Link key={product.id} href={`/product/${product.id}`} className="mt-3 flex gap-3 rounded-lg border bg-background p-2 text-foreground hover:border-primary">{product.image && <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted"><Image src={product.image} alt={product.name} fill className="object-cover" sizes="64px" /></div>}<span className="min-w-0"><span className="block truncate font-semibold">{product.name}</span><span className="block text-xs text-muted-foreground">{product.brands?.name || ""} · stok {product.stock}</span><span className="block text-sm font-semibold text-primary">Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}</span></span></Link>)}</div>)}{messages.length === 1 && <div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={busy} onClick={() => void sendMessage(suggestion)} className="rounded-full border bg-background px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50">{suggestion}</button>)}</div>}{busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Memikirkan jawaban...</div>}</div>
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mx-3 mb-2 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-sm text-emerald-950 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70">
        <span><span className="block font-semibold">Mau tanya langsung ke admin?</span><span className="mt-0.5 block text-xs opacity-80">Lanjutkan percakapan lewat WhatsApp</span></span>
        <ExternalLink className="size-4 shrink-0" />
      </a>
      <form onSubmit={send} className="flex gap-2 border-t p-3"><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} placeholder="Contoh: laptop Asus 6 jutaan" className="min-w-0 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary" /><Button type="submit" size="icon" aria-label="Kirim pesan" disabled={busy || !input.trim()}><Send className="size-4" /></Button></form>
      </section>
    </div>}
  </>;
}
