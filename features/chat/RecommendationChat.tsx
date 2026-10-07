"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Bot, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Product = { id: string; name: string; description: string; price: number; discount_price: number | null; stock: number; image: string | null; brands: { name: string } | null };
type Message = { role: "user" | "assistant"; text: string; products?: Product[] };

export function RecommendationChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hai! Cari produk apa? Sebutkan merek, kisaran harga, atau minta saya bandingkan beberapa produk. Saya hanya menampilkan barang yang stoknya tersedia." }]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim(); if (!message || busy) return;
    setInput(""); setMessages((current) => [...current, { role: "user", text: message }]); setBusy(true);
    try {
      const response = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chat tidak dapat menjawab saat ini.");
      setMessages((current) => [...current, { role: "assistant", text: result.answer, products: result.products }]);
    } catch (error) { setMessages((current) => [...current, { role: "assistant", text: error instanceof Error ? error.message : "Koneksi chat bermasalah." }]); }
    finally { setBusy(false); }
  };

  return <>
    <Button className="fixed bottom-5 right-5 z-40 size-14 rounded-full shadow-lg" aria-label="Buka chat rekomendasi" onClick={() => setOpen(true)}><MessageCircle className="size-6" /></Button>
    {open && <section aria-label="Chat rekomendasi produk" className="fixed bottom-5 right-5 z-50 flex h-[min(680px,calc(100vh-40px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <header className="flex items-center justify-between bg-primary p-4 text-primary-foreground"><div className="flex items-center gap-2"><Bot className="size-5" /><div><h2 className="font-semibold">Asisten produk</h2><p className="text-xs opacity-80">Rekomendasi dari stok tersedia</p></div></div><Button variant="ghost" size="icon-sm" className="text-primary-foreground hover:bg-white/15" aria-label="Tutup chat" onClick={() => setOpen(false)}><X className="size-4" /></Button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <div key={index} className={`max-w-[92%] rounded-xl p-3 text-sm ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}><p className="whitespace-pre-line">{message.text}</p>{message.products?.map((product) => <Link key={product.id} href={`/product/${product.id}`} className="mt-3 flex gap-3 rounded-lg border bg-background p-2 text-foreground hover:border-primary">{product.image && <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted"><Image src={product.image} alt={product.name} fill className="object-cover" sizes="64px" /></div>}<span className="min-w-0"><span className="block truncate font-semibold">{product.name}</span><span className="block text-xs text-muted-foreground">{product.brands?.name || ""} · stok {product.stock}</span><span className="block text-sm font-semibold text-primary">Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}</span></span></Link>)}</div>)}{busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Mencari produk yang cocok...</div>}</div>
      <form onSubmit={send} className="flex gap-2 border-t p-3"><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} placeholder="Contoh: laptop Asus 6 jutaan" className="min-w-0 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary" /><Button size="icon" aria-label="Kirim pesan" disabled={busy || !input.trim()}><Send className="size-4" /></Button></form>
    </section>}
  </>;
}
