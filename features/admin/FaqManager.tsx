"use client";

import { confirmAction } from "@/store/useConfirmStore";

import { useState, useTransition, useMemo, type FormEvent } from "react";
import Link from "next/link";
import {
  MessageCircleQuestion,
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
  saveHomepageItemAction,
  deleteHomepageItemAction,
  seedDefaultFaqsAction,
  getAdminHomepageItemsAction,
} from "@/actions/admin";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  display_order: number;
  is_active: boolean;
}

const COMMON_CATEGORIES = [
  "Produk & Garansi",
  "Pengiriman",
  "Pengambilan",
  "Pembayaran",
  "Layanan Purna Jual",
  "Konsultasi",
  "Akun & Keamanan",
];

export function FaqManager({ initialFaqs }: { initialFaqs: FAQItem[] }) {
  const [faqs, setFaqs] = useState<FAQItem[]>(initialFaqs);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingFaq, setEditingFaq] = useState<Partial<FAQItem> | null>(null);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshFaqs = async () => {
    try {
      const data = await getAdminHomepageItemsAction();
      setFaqs((data.faqs as FAQItem[]) || []);
    } catch (err) {
      console.error("Gagal refresh FAQ:", err);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    faqs.forEach((faq) => {
      if (faq.category?.trim()) set.add(faq.category.trim());
    });
    return Array.from(set);
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesSearch =
        !search.trim() ||
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase());
      const matchesCat =
        selectedCategory === "all" ||
        (selectedCategory === "uncategorized"
          ? !faq.category?.trim()
          : faq.category === selectedCategory);
      return matchesSearch && matchesCat;
    });
  }, [faqs, search, selectedCategory]);

  const groupedFaqs = useMemo(() => {
    const groups: Record<string, FAQItem[]> = {};
    filteredFaqs.forEach((faq) => {
      const cat = faq.category?.trim() || "Informasi Umum";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(faq);
    });
    return groups;
  }, [filteredFaqs]);

  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingFaq) return;

    const data = new FormData(e.currentTarget);
    data.set("type", "faq");
    setError("");
    setNotice("");

    startTransition(async () => {
      try {
        await saveHomepageItemAction(data);
        await refreshFaqs();
        setEditingFaq(null);
        setNotice("Pertanyaan FAQ berhasil disimpan.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan FAQ.");
      }
    });
  };

  const handleDelete = (id: string, question: string) => {
    if (!window.confirm(`Hapus FAQ: "${question}"?`)) return;

    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        await deleteHomepageItemAction("faq", id);
        await refreshFaqs();
        setNotice("Pertanyaan FAQ berhasil dihapus.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menghapus FAQ.");
      }
    });
  };

  const handleSeedDefaults = async () => {
    const confirmed = await confirmAction({
      title: "Muat FAQ Standar Toko",
      message: "Muat pertanyaan FAQ default bawaan toko? Tindakan ini akan menambahkan daftar pertanyaan umum standar jika database FAQ belum terisi.",
      confirmText: "Muat Default",
      cancelText: "Batal",
      variant: "info",
      icon: "info",
    });
    if (!confirmed) return;
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const res = await seedDefaultFaqsAction();
        if (res.success) {
          await refreshFaqs();
          setNotice("FAQ default berhasil dimuat ke database.");
        } else {
          setNotice(res.message || "FAQ sudah ada di database.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat FAQ default.");
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Kelola Tanya Jawab (FAQ)</span>
            <span className="rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-0.5 text-xs font-semibold">
              {faqs.length} Pertanyaan
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tambah, edit, atau kelompokkan pertanyaan umum yang sering ditanyakan pembeli. Tampil di halaman beranda dan halaman /faq.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/faq"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <span>Lihat Halaman /faq</span>
            <ExternalLink className="size-3.5" />
          </Link>

          <Button
            type="button"
            onClick={() =>
              setEditingFaq({
                question: "",
                answer: "",
                category: "Produk & Garansi",
                display_order: faqs.length + 1,
                is_active: true,
              })
            }
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 px-4 shadow-sm shadow-blue-500/25 cursor-pointer text-xs"
          >
            <Plus className="size-4" />
            <span>Tambah FAQ</span>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {notice && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-5 shrink-0" />
          <p>{notice}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-700 dark:text-rose-300">
          <AlertCircle className="size-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pertanyaan atau kata kunci..."
            className="pl-9.5 h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Semua ({faqs.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List grouped by Category */}
      {Object.keys(groupedFaqs).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedFaqs).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-blue-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {category}
                </h2>
                <span className="text-xs text-slate-400">({items.length} pertanyaan)</span>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 shadow-sm hover:border-slate-300 dark:hover:border-white/15 transition-all"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs">
                          {item.display_order}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-foreground">
                          {item.question}
                        </h3>
                        {item.is_active ? (
                          <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                            Aktif
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2 py-0.5 text-[10px] font-bold">
                            Nonaktif
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-8">
                        {item.answer}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-start pl-8 sm:pl-0 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingFaq(item)}
                        className="rounded-xl border-slate-200 dark:border-white/10 text-xs gap-1.5 h-8 px-3 cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id, item.question)}
                        className="rounded-xl border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs h-8 px-3 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Hapus</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] p-12 text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
            <MessageCircleQuestion className="size-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {search || selectedCategory !== "all"
                ? "Tidak Ada FAQ yang Cocok"
                : "Belum Ada Pertanyaan FAQ"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {search || selectedCategory !== "all"
                ? "Coba ubah kata kunci pencarian atau pilih kategori lain."
                : "Anda dapat menambahkan pertanyaan baru secara mandiri atau memuat template FAQ standar toko."}
            </p>
          </div>

          {!search && selectedCategory === "all" && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                onClick={handleSeedDefaults}
                disabled={isPending}
                variant="outline"
                className="rounded-xl border-slate-300 dark:border-white/10 text-xs gap-2 cursor-pointer"
              >
                <Sparkles className="size-4 text-amber-500" />
                <span>Muat FAQ Default Toko</span>
              </Button>

              <Button
                type="button"
                onClick={() =>
                  setEditingFaq({
                    question: "",
                    answer: "",
                    category: "Produk & Garansi",
                    display_order: 1,
                    is_active: true,
                  })
                }
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Buat Pertanyaan Pertama</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal Dialog */}
      {editingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2028] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <MessageCircleQuestion className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {editingFaq.id ? "Edit Pertanyaan FAQ" : "Tambah Pertanyaan FAQ Baru"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Masukkan pertanyaan dan jawaban yang jelas bagi pembeli.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingFaq(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <input type="hidden" name="id" value={editingFaq.id || ""} />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pertanyaan (Question)
                </label>
                <Input
                  name="question"
                  defaultValue={editingFaq.question || ""}
                  required
                  placeholder="Misal: Apakah semua laptop di Next Solution bergaransi resmi?"
                  className="h-10 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kategori FAQ
                </label>
                <Input
                  name="category"
                  defaultValue={editingFaq.category || ""}
                  placeholder="Misal: Produk & Garansi, Pengiriman, Pembayaran..."
                  className="h-10 text-sm"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400">Pilih cepat:</span>
                  {COMMON_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('input[name="category"]') as HTMLInputElement;
                        if (input) input.value = cat;
                      }}
                      className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <RichTextEditor
                  name="answer"
                  defaultValue={editingFaq.answer || ""}
                  label="Jawaban (Answer)"
                  placeholder="Tuliskan jawaban yang rinci, ramah, dan solutif..."
                  required
                  minHeight="180px"
                  helperText="Dukung teks tebal (bold), miring (italic), warna, poin/daftar bernomor, serta tautan ke halaman produk atau kontak."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Urutan Tampilan
                  </label>
                  <Input
                    type="number"
                    name="display_order"
                    min={0}
                    defaultValue={editingFaq.display_order ?? 1}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_active_faq"
                    name="is_active"
                    defaultChecked={editingFaq.is_active !== false}
                    className="size-4 rounded-md text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active_faq" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Status Tayang (Aktif)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/5 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingFaq(null)}
                  className="rounded-xl border-slate-300 dark:border-white/10 text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 shadow-sm shadow-blue-500/25 cursor-pointer"
                >
                  {isPending ? "Menyimpan..." : "Simpan Pertanyaan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
