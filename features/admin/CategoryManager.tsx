"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Edit, ImagePlus, LoaderCircle, Plus, Trash } from "lucide-react";
import {
  deleteAdminCategoryAction,
  getAdminCategoriesAction,
  getCategoryUsageAction,
  saveAdminCategoryAction,
  uploadAdminImageAction,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

type Category = { id: string; name: string; description: string | null; image_url: string | null };

type DeleteModalState = {
  category: Category;
  productCount: number;
  sampleProducts: { id: string; name: string }[];
  reassignToId: string;
};

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<Category | null | false>(false);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
  const [checkingUsageId, setCheckingUsageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageScale, setImageScale] = useState(100);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    if (editing === false && !deleteModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setEditing(false);
        setDeleteModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editing, deleteModal, busy]);

  const refresh = async () => setCategories(await getAdminCategoriesAction());

  const save = (data: FormData) => {
    data.set("image_url", imageUrl);
    setError("");
    startTransition(async () => {
      try {
        await saveAdminCategoryAction(data);
        await refresh();
        setEditing(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Kategori gagal disimpan.");
      }
    });
  };

  const openDeleteModal = async (category: Category) => {
    setError("");
    setCheckingUsageId(category.id);
    try {
      const usage = await getCategoryUsageAction(category.id);
      const otherCategories = categories.filter((c) => c.id !== category.id);
      setDeleteModal({
        category,
        productCount: usage.productCount,
        sampleProducts: usage.sampleProducts,
        reassignToId: otherCategories.length > 0 ? otherCategories[0].id : "",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memeriksa relasi kategori terhadap produk.");
    } finally {
      setCheckingUsageId(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    const { category, productCount, reassignToId } = deleteModal;
    if (productCount > 0 && !reassignToId) {
      setError("Pilih kategori pengganti untuk memindahkan produk terlebih dahulu.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await deleteAdminCategoryAction(category.id, productCount > 0 ? reassignToId : undefined);
        await refresh();
        setDeleteModal(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Kategori gagal dihapus.");
      }
    });
  };

  const upload = async (file: File) => {
    const data = new FormData();
    data.set("file", await prepareImageUpload(file));
    data.set("bucket", "products");
    try {
      const result = await uploadAdminImageAction(data);
      setImageUrl(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload gambar gagal.");
    }
  };

  const otherCategories = deleteModal
    ? categories.filter((c) => c.id !== deleteModal.category.id)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 shadow-sm"
          onClick={() => {
            setEditing(null);
            setImageUrl("");
            setImageScale(100);
            setError("");
          }}
        >
          <Plus className="mr-1.5 size-3.5" />
          Tambah kategori
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const isChecking = checkingUsageId === category.id;
          return (
            <article
              key={category.id}
              className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] shadow-xs hover:shadow-md transition-all"
            >
              <div className="relative h-44 bg-slate-100 dark:bg-white/5">
                {category.image_url && (
                  <Image
                    src={category.image_url}
                    alt={category.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(min-width: 1024px) 33vw, 50vw"
                  />
                )}
              </div>
              <div className="flex items-start justify-between gap-3 p-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{category.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {category.description || "Belum ada deskripsi."}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${category.name}`}
                    onClick={() => {
                      setEditing(category);
                      setImageUrl(category.image_url || "");
                      setError("");
                    }}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus ${category.name}`}
                    disabled={busy || isChecking}
                    onClick={() => openDeleteModal(category)}
                  >
                    {isChecking ? (
                      <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Trash className="size-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
        {!categories.length && (
          <p className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-sm text-slate-500 text-center col-span-full">
            Belum ada kategori.
          </p>
        )}
      </div>

      {/* Modal Edit / Tambah Kategori */}
      {editing !== false && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setEditing(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-title"
            onClick={(e) => e.stopPropagation()}
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-6"
          >
            <h3 id="category-title" className="mb-5 text-xl font-bold">
              {editing ? "Edit kategori" : "Tambah kategori"}
            </h3>
            <form action={save} className="space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <label className="block space-y-1 text-sm">
                Nama
                <Input name="name" required minLength={2} defaultValue={editing?.name || ""} />
              </label>
              <div>
                <RichTextEditor
                  name="description"
                  defaultValue={editing?.description || ""}
                  label="Deskripsi"
                  placeholder="Tuliskan deskripsi kategori..."
                  minHeight="140px"
                />
              </div>
              <label className="block space-y-1 text-sm">
                URL gambar
                <Input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  type="url"
                  placeholder="https://..."
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
                <ImagePlus className="size-4" />
                Upload gambar
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
              </label>
              {imageUrl && (
                <>
                  <div className="grid h-44 w-full place-items-center overflow-hidden rounded-xl border bg-muted">
                    <Image
                      src={imageUrl}
                      alt="Pratinjau gambar kategori"
                      width={640}
                      height={360}
                      unoptimized
                      sizes="(min-width: 512px) 448px, 100vw"
                      className="max-h-full max-w-full object-contain"
                      style={{ transform: `scale(${imageScale / 100})` }}
                    />
                  </div>
                  <label className="block space-y-1 text-xs">
                    Ukuran gambar <span className="font-medium">{imageScale}%</span>
                    <input
                      aria-label="Ukuran gambar"
                      className="w-full accent-primary"
                      type="range"
                      min="40"
                      max="140"
                      step="5"
                      value={imageScale}
                      onChange={(event) => setImageScale(Number(event.target.value))}
                    />
                  </label>
                </>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
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

      {/* Modal Konfirmasi Hapus & Pemindahan Produk Kategori */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-[110] grid place-items-center bg-black/60 p-4 animate-in fade-in duration-200"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDeleteModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            className="w-full max-w-md rounded-2xl bg-card border shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 id="delete-category-title" className="text-base font-bold text-foreground">
                  Hapus Kategori &quot;{deleteModal.category.name}&quot;
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Konfirmasi penghapusan kategori dari database toko.
                </p>
              </div>
            </div>

            {deleteModal.productCount === 0 ? (
              <p className="text-xs text-muted-foreground">
                Kategori ini tidak terhubung ke produk mana pun. Apakah Anda yakin ingin menghapusnya?
              </p>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-950 dark:text-amber-200">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  ⚠️ Perhatian: Kategori ini masih digunakan oleh {deleteModal.productCount} produk!
                </p>
                {deleteModal.sampleProducts.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Contoh produk:{" "}
                    <span className="font-medium text-foreground">
                      {deleteModal.sampleProducts.map((p) => p.name).join(", ")}
                    </span>
                  </p>
                )}
                <div className="space-y-1 pt-1">
                  <label className="font-medium text-[11px] block text-foreground">
                    Pindahkan semua produk ke kategori pengganti:
                  </label>
                  {otherCategories.length > 0 ? (
                    <select
                      value={deleteModal.reassignToId}
                      onChange={(e) =>
                        setDeleteModal((prev) =>
                          prev ? { ...prev, reassignToId: e.target.value } : null
                        )
                      }
                      className="w-full text-xs rounded-lg border bg-background px-3 py-2 font-medium focus:ring-2 focus:ring-primary text-foreground"
                    >
                      {otherCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-destructive font-semibold text-[11px]">
                      Tidak ada kategori lain untuk pemindahan. Buat kategori baru terlebih dahulu sebelum menghapus kategori ini.
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && <p role="alert" className="text-xs text-destructive font-medium">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setDeleteModal(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy || (deleteModal.productCount > 0 && !deleteModal.reassignToId)}
                onClick={confirmDelete}
              >
                {busy && <LoaderCircle className="mr-1.5 size-4 animate-spin" />}
                {deleteModal.productCount > 0
                  ? "Pindahkan Produk & Hapus"
                  : "Ya, Hapus Kategori"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
