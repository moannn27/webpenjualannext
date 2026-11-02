"use client";

import { useMemo, useState, useTransition } from "react";
import { MessageSquare, Search, Send, Star, Trash2 } from "lucide-react";
import {
  deleteAdminReviewAction,
  getAdminReviewsPageAction,
  saveAdminReviewReplyAction,
  type AdminReviewWithDetails,
} from "@/actions/review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReviewManager({
  initialReviews,
  initialTotal,
}: {
  initialReviews: AdminReviewWithDetails[];
  initialTotal: number;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [totalReviews, setTotalReviews] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialReviews.map((review) => [review.id, review.admin_reply ?? ""]))
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return reviews;
    return reviews.filter((review) =>
      [
        review.user_name,
        review.product_name,
        review.order_number ?? "",
        review.comment ?? "",
        review.admin_reply ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(query))
    );
  }, [reviews, search]);

  const saveReply = (review: AdminReviewWithDetails) => {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await saveAdminReviewReplyAction(review.id, drafts[review.id] ?? "");
        setReviews((current) =>
          current.map((item) =>
            item.id === review.id
              ? { ...item, admin_reply: result.reply, admin_replied_at: result.repliedAt }
              : item
          )
        );
        setDrafts((current) => ({ ...current, [review.id]: result.reply ?? "" }));
        setNotice(result.reply ? "Balasan admin berhasil dipublikasikan." : "Balasan admin berhasil dihapus.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Balasan gagal disimpan.");
      }
    });
  };

  const removeReview = (review: AdminReviewWithDetails) => {
    if (!window.confirm(`Hapus ulasan "${review.product_name}" dari ${review.user_name}?`)) return;
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        await deleteAdminReviewAction(review.id);
        setReviews((current) => current.filter((item) => item.id !== review.id));
        setTotalReviews((current) => Math.max(0, current - 1));
        setNotice("Ulasan berhasil dihapus.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Ulasan gagal dihapus.");
      }
    });
  };

  const loadMore = () => {
    setError("");
    startTransition(async () => {
      try {
        const nextPage = page + 1;
        const result = await getAdminReviewsPageAction(nextPage);
        setReviews((current) => {
          const knownIds = new Set(current.map((review) => review.id));
          return [...current, ...result.reviews.filter((review) => !knownIds.has(review.id))];
        });
        setPage(nextPage);
        setTotalReviews(result.total);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Ulasan berikutnya gagal dimuat.");
      }
    });
  };

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {reviews.length} dari {totalReviews} ulasan · hanya ulasan pembelian terverifikasi yang tampil pada produk.
        </p>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari pelanggan, produk, pesanan..."
            aria-label="Cari ulasan"
            className="pl-9"
          />
        </div>
      </div>

      {filteredReviews.length ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-foreground">{review.product_name}</h2>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      Pesanan #{review.order_number ?? "riwayat lama"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{review.user_name}</span>
                    <span>{new Date(review.created_at).toLocaleString("id-ID")}</span>
                    <span className="inline-flex items-center gap-1" aria-label={`Rating ${review.rating} dari 5`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={`size-3.5 ${index < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                    {review.comment || "Pelanggan tidak menambahkan komentar tertulis."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => removeReview(review)}
                  aria-label={`Hapus ulasan ${review.product_name}`}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 size-4" />
                  Hapus
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4">
                <label htmlFor={`review-reply-${review.id}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4 text-primary" />
                  Balasan admin
                </label>
                <textarea
                  id={`review-reply-${review.id}`}
                  value={drafts[review.id] ?? ""}
                  onChange={(event) => setDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                  maxLength={1000}
                  rows={3}
                  placeholder="Tulis balasan yang akan terlihat oleh semua pengunjung..."
                  className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {(drafts[review.id] ?? "").length}/1000 karakter
                  </span>
                  <Button type="button" size="sm" disabled={busy} onClick={() => saveReply(review)}>
                    <Send className="mr-1.5 size-3.5" />
                    {review.admin_reply ? "Perbarui balasan" : "Kirim balasan"}
                  </Button>
                </div>
                {review.admin_reply && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Balasan ditampilkan pada halaman produk
                    {review.admin_replied_at ? ` · ${new Date(review.admin_replied_at).toLocaleString("id-ID")}` : ""}.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <MessageSquare className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 font-semibold">Belum ada ulasan yang cocok.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ulasan pelanggan yang memenuhi syarat pembelian akan muncul di sini.
          </p>
        </div>
      )}
      {reviews.length < totalReviews && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" disabled={busy} onClick={loadMore}>
            {busy ? "Memuat..." : "Muat ulasan berikutnya"}
          </Button>
        </div>
      )}
    </div>
  );
}
