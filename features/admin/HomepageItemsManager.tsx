"use client";

import { useState, useTransition, useMemo, type FormEvent } from "react";
import Image from "next/image";
import { Check, CheckCircle2, MessageSquareQuote, Package, Pencil, Plus, Search, Sparkles, Star, Trash, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteHomepageItemAction, getAdminHomepageItemsAction, saveHomepageItemAction } from "@/actions/admin";
import { getAllReviewsForAdminAction, type AdminReviewWithDetails } from "@/actions/review";

type FAQ = {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
};

type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number | null;
  display_order: number;
  is_active: boolean;
};

type Item = FAQ | Testimonial;

export function HomepageItemsManager({
  initialFaqs,
  initialTestimonials,
  initialReviews = [],
}: {
  initialFaqs: FAQ[];
  initialTestimonials: Testimonial[];
  initialReviews?: AdminReviewWithDetails[];
}) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [reviewsList, setReviewsList] = useState<AdminReviewWithDetails[]>(initialReviews);

  const [editing, setEditing] = useState<{
    type: "faq" | "testimonial";
    item?: Partial<Testimonial> | Partial<FAQ>;
    isFromReview?: boolean;
    reviewProductName?: string;
  } | null>(null);

  const [isReviewPickerOpen, setIsReviewPickerOpen] = useState(false);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | "all">("all");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();

  const refresh = async () => {
    try {
      const [data, reviews] = await Promise.all([
        getAdminHomepageItemsAction(),
        getAllReviewsForAdminAction(),
      ]);
      setFaqs(data.faqs as FAQ[]);
      setTestimonials(data.testimonials as Testimonial[]);
      if (reviews && reviews.length > 0) {
        setReviewsList(reviews);
      }
    } catch (err) {
      console.error("Gagal refresh data homepage items:", err);
    }
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    data.set("type", editing.type);
    setError("");
    setNotice("");

    startTransition(async () => {
      try {
        await saveHomepageItemAction(data);
        await refresh();
        setEditing(null);
        setNotice(
          editing.type === "testimonial"
            ? "Testimoni berhasil disimpan dan diperbarui di halaman depan."
            : "FAQ berhasil disimpan."
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Konten gagal disimpan.");
      }
    });
  };

  const quickAddReviewAsTestimonial = (review: AdminReviewWithDetails) => {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("type", "testimonial");
        data.set("name", review.user_name || "Pelanggan Terverifikasi");
        data.set("role", `Pembeli ${review.product_name || "Produk"}`);
        data.set("content", review.comment || "-");
        data.set("rating", String(review.rating || 5));
        data.set("display_order", String(testimonials.length));
        data.set("is_active", "on");

        await saveHomepageItemAction(data);
        await refresh();
        setNotice(
          `Ulasan dari "${review.user_name}" untuk produk "${review.product_name}" berhasil dijadikan testimoni!`
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Gagal menambahkan ulasan ke testimoni.");
      }
    });
  };

  const customizeReviewAsTestimonial = (review: AdminReviewWithDetails) => {
    setIsReviewPickerOpen(false);
    setEditing({
      type: "testimonial",
      item: {
        name: review.user_name || "Pelanggan Terverifikasi",
        role: `Pembeli ${review.product_name || "Produk"}`,
        content: review.comment || "",
        rating: review.rating || 5,
        display_order: testimonials.length,
        is_active: true,
      },
      isFromReview: true,
      reviewProductName: review.product_name,
    });
  };

  const remove = (type: "faq" | "testimonial", item: Item) => {
    if (!window.confirm("Hapus konten ini dari website?")) return;
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        await deleteHomepageItemAction(type, item.id);
        await refresh();
        setNotice("Konten berhasil dihapus.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Konten gagal dihapus.");
      }
    });
  };

  // Filtered reviews for picker modal
  const filteredReviews = useMemo(() => {
    return reviewsList.filter((rev) => {
      const matchesSearch =
        !reviewSearch ||
        rev.user_name.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        rev.product_name.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        rev.comment.toLowerCase().includes(reviewSearch.toLowerCase());

      const matchesRating =
        reviewRatingFilter === "all" ||
        (reviewRatingFilter === 3 ? rev.rating <= 3 : rev.rating === reviewRatingFilter);

      return matchesSearch && matchesRating;
    });
  }, [reviewsList, reviewSearch, reviewRatingFilter]);

  const isReviewAlreadyTestimonial = (review: AdminReviewWithDetails) => {
    return testimonials.some(
      (t) =>
        t.content.trim().toLowerCase() === review.comment.trim().toLowerCase() ||
        (t.name.trim().toLowerCase() === review.user_name.trim().toLowerCase() &&
          t.role?.toLowerCase().includes(review.product_name.toLowerCase()))
    );
  };

  const editingFaq = editing?.item && "question" in editing.item ? (editing.item as FAQ) : null;
  const editingTestimonial =
    editing?.item && "content" in editing.item ? (editing.item as Partial<Testimonial>) : null;

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          <span>{error}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setError("")}>
            <X className="size-4" />
          </Button>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {notice}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setNotice("")}>
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* SECTION 1: FAQ */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">FAQ</h2>
            <p className="text-sm text-muted-foreground">Kelola pertanyaan umum yang tampil di halaman depan.</p>
          </div>
          <Button onClick={() => setEditing({ type: "faq" })}>
            <Plus className="mr-2 size-4" /> Tambah FAQ
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {faqs.map((item) => (
            <article key={item.id} className="min-w-0 rounded-xl border p-4 hover:border-foreground/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-foreground">{item.question}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.is_active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.is_active ? "Tayang" : "Disembunyikan"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.answer}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => setEditing({ type: "faq", item })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Hapus" disabled={busy} onClick={() => remove("faq", item)}>
                    <Trash className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {!faqs.length && (
            <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Belum ada FAQ. Tambahkan FAQ baru untuk pembeli.
            </p>
          )}
        </div>
      </section>

      {/* SECTION 2: TESTIMONI PELANGGAN */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Testimoni pelanggan</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {testimonials.length} Testimoni
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Kelola testimoni yang tampil di halaman depan. Ambil otomatis dari review pembeli produk atau buat manual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setError("");
                setIsReviewPickerOpen(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Sparkles className="mr-2 size-4 text-amber-300" />
              Ambil Dari Review Produk
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing({ type: "testimonial" })}
            >
              <Plus className="mr-2 size-4" />
              Tambah Manual
            </Button>
          </div>
        </div>

        <div className="grid gap-3.5 md:grid-cols-2">
          {testimonials.map((item) => {
            const rating = item.rating ?? 5;
            return (
              <article
                key={item.id}
                className="min-w-0 rounded-xl border p-4.5 bg-card hover:border-foreground/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        {item.role && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            <Package className="size-3 shrink-0" />
                            {item.role}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.is_active ? "Tayang" : "Disembunyikan"}
                        </span>
                      </div>

                      {/* Stars */}
                      <div className="mt-1.5 flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${
                              i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          {rating}.0
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit"
                        onClick={() => setEditing({ type: "testimonial", item })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Hapus"
                        disabled={busy}
                        onClick={() => remove("testimonial", item)}
                      >
                        <Trash className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-foreground/90 italic leading-relaxed">
                    &ldquo;{item.content}&rdquo;
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                  <span>Urutan tampil: #{item.display_order}</span>
                  <span className="text-[11px] text-muted-foreground/80">
                    {item.role?.startsWith("Pembeli ") ? "Diambil dari ulasan produk" : "Testimoni manual"}
                  </span>
                </div>
              </article>
            );
          })}

          {!testimonials.length && (
            <div className="col-span-full rounded-2xl border border-dashed p-8 text-center">
              <MessageSquareQuote className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-foreground">Belum ada testimoni pelanggan</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                Tampilkan kepuasan pembeli di halaman depan dengan mengambil langsung dari ulasan produk yang telah dibeli atau menambahkan testimoni manual.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => setIsReviewPickerOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Sparkles className="mr-2 size-4 text-amber-300" />
                  Ambil Dari Review Produk
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditing({ type: "testimonial" })}
                >
                  <Plus className="mr-2 size-4" />
                  Tambah Manual
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MODAL 1: PICKER REVIEW PRODUK */}
      {isReviewPickerOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-picker-title"
            className="max-h-[90vh] w-full max-w-3xl flex flex-col rounded-2xl bg-card border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b flex items-start justify-between gap-4 bg-muted/20">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Sparkles className="size-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 id="review-picker-title" className="text-lg sm:text-xl font-bold text-foreground">
                      Ambil Dari Review Pembeli Produk
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Pilih ulasan produk nyata dari pembeli terverifikasi untuk otomatis dijadikan testimoni di halaman depan.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsReviewPickerOpen(false)}
                aria-label="Tutup"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* Filter and Search */}
            <div className="p-4 sm:p-5 border-b space-y-3 bg-background">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Cari nama pembeli, nama produk yang dibeli, atau isi ulasan..."
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground mr-1 font-medium">Filter Rating:</span>
                <Button
                  type="button"
                  variant={reviewRatingFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setReviewRatingFilter("all")}
                >
                  Semua ({reviewsList.length})
                </Button>
                <Button
                  type="button"
                  variant={reviewRatingFilter === 5 ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5 text-amber-500"
                  onClick={() => setReviewRatingFilter(5)}
                >
                  ⭐ 5 Bintang ({reviewsList.filter((r) => r.rating === 5).length})
                </Button>
                <Button
                  type="button"
                  variant={reviewRatingFilter === 4 ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5 text-amber-500"
                  onClick={() => setReviewRatingFilter(4)}
                >
                  ⭐ 4 Bintang ({reviewsList.filter((r) => r.rating === 4).length})
                </Button>
                <Button
                  type="button"
                  variant={reviewRatingFilter === 3 ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5 text-amber-500"
                  onClick={() => setReviewRatingFilter(3)}
                >
                  ⭐ ≤ 3 Bintang ({reviewsList.filter((r) => r.rating <= 3).length})
                </Button>
              </div>
            </div>

            {/* Reviews list */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 max-h-[55vh]">
              {filteredReviews.map((rev) => {
                const alreadyAdded = isReviewAlreadyTestimonial(rev);
                return (
                  <div
                    key={rev.id}
                    className="rounded-xl border p-4 bg-card hover:border-primary/40 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div>
                      {/* Top info */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {rev.user_avatar ? (
                            <Image
                              src={rev.user_avatar}
                              alt={rev.user_name}
                              width={32}
                              height={32}
                              className="size-8 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                              {rev.user_name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-foreground">{rev.user_name}</span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                <Check className="size-3" />
                                Terverifikasi Beli
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3.5 ${
                                i < rev.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-semibold ml-1 text-muted-foreground">
                            {rev.rating}.0
                          </span>
                        </div>
                      </div>

                      {/* Product details */}
                      <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1 text-xs text-foreground font-medium border border-border/50">
                        {rev.product_image ? (
                          <Image
                            src={rev.product_image}
                            alt={rev.product_name}
                            width={20}
                            height={20}
                            className="size-5 rounded object-cover border"
                          />
                        ) : (
                          <Package className="size-3.5 text-primary" />
                        )}
                        <span>Barang yang dibeli:</span>
                        <strong className="text-primary">{rev.product_name}</strong>
                      </div>

                      {/* Review comment */}
                      <p className="mt-2.5 text-sm text-foreground/90 italic bg-muted/20 p-3 rounded-lg border border-border/40">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
                      {alreadyAdded ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <Check className="size-3.5" />
                          Sudah ada di testimoni
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Siap ditambahkan sebagai testimoni
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => customizeReviewAsTestimonial(rev)}
                        >
                          <Pencil className="mr-1.5 size-3" />
                          Sesuaikan Dulu
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => quickAddReviewAsTestimonial(rev)}
                        >
                          <Sparkles className="mr-1.5 size-3 text-amber-300" />
                          {alreadyAdded ? "Tambah Lagi" : "Jadikan Testimoni"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!filteredReviews.length && (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                  <p className="font-medium text-foreground">Tidak ada review yang cocok</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coba ganti kata kunci pencarian atau ubah filter bintang.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Menampilkan {filteredReviews.length} dari {reviewsList.length} ulasan pembeli
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewPickerOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL 2: FORM TAMBAH / EDIT (MANUAL ATAU PRE-FILLED REVIEW) */}
      {editing && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="homepage-item-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl border"
          >
            <div className="mb-5 flex items-center justify-between border-b pb-4">
              <div>
                <h2 id="homepage-item-title" className="text-xl font-bold">
                  {editing.type === "faq"
                    ? editing.item?.id
                      ? "Edit FAQ"
                      : "Tambah FAQ"
                    : editing.isFromReview
                    ? "✨ Jadikan Testimoni dari Review"
                    : editing.item?.id
                    ? "Edit Testimoni"
                    : "Tambah Testimoni Manual"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editing.type === "faq"
                    ? "Informasi pertanyaan dan jawaban untuk halaman depan."
                    : editing.isFromReview
                    ? `Otomatis diambil dari ulasan produk ${editing.reviewProductName ?? ""}. Anda dapat menyesuaikannya sebelum menyimpan.`
                    : "Formulir input testimoni pelanggan untuk halaman depan."}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(null)} aria-label="Tutup">
                <X className="size-4" />
              </Button>
            </div>

            {editing.isFromReview && (
              <div className="mb-4 rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-primary flex items-start gap-2">
                <Sparkles className="size-4 shrink-0 text-amber-500 mt-0.5" />
                <span>
                  <strong>Mode Otomatis:</strong> Data nama pembeli, barang yang dibeli, rating, dan ulasan sudah diisikan secara otomatis. Anda bisa langsung klik <strong>Simpan</strong> atau menyunting sesuai kebutuhan.
                </span>
              </div>
            )}

            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              {editing.item?.id && <input type="hidden" name="id" value={editing.item.id} />}

              {editing.type === "faq" ? (
                <>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    Pertanyaan
                    <Input name="question" defaultValue={editingFaq?.question ?? ""} required placeholder="Misal: Berapa lama garansi produk?" />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    Jawaban
                    <textarea
                      name="answer"
                      defaultValue={editingFaq?.answer ?? ""}
                      required
                      placeholder="Jawaban lengkap untuk pertanyaan ini..."
                      className="min-h-32 w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="space-y-1 text-sm">
                    Nama pelanggan
                    <Input
                      name="name"
                      defaultValue={editingTestimonial?.name ?? ""}
                      required
                      placeholder="Nama pembeli"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    Peran / Barang yang dibeli
                    <Input
                      name="role"
                      defaultValue={editingTestimonial?.role ?? ""}
                      placeholder="Contoh: Pembeli Ideapad slim 3"
                    />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    Ulasan / Testimoni
                    <textarea
                      name="content"
                      defaultValue={editingTestimonial?.content ?? ""}
                      required
                      placeholder="Tulis ulasan pembeli..."
                      className="min-h-28 w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    Rating
                    <select
                      name="rating"
                      defaultValue={editingTestimonial?.rating ?? 5}
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    >
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} Bintang {rating === 5 ? "⭐⭐⭐⭐⭐" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <label className="space-y-1 text-sm">
                Urutan tampil
                <Input
                  name="display_order"
                  type="number"
                  min="0"
                  defaultValue={editingFaq?.display_order ?? editingTestimonial?.display_order ?? (editing.type === "testimonial" ? testimonials.length : faqs.length)}
                />
              </label>

              <label className="flex items-center gap-2 pt-6 text-sm sm:col-span-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editingFaq?.is_active ?? editingTestimonial?.is_active ?? true}
                  className="size-4 rounded border-gray-300 text-primary"
                />
                <span>Tampilkan di halaman depan website</span>
              </label>

              {error && (
                <p role="alert" className="text-sm text-destructive sm:col-span-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 sm:col-span-2 border-t mt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
