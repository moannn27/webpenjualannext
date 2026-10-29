"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { AlertTriangle, ImagePlus, LoaderCircle, Pencil, Plus, Trash } from "lucide-react";
import {
  deleteAdminBrandAction,
  getAdminBrandsAction,
  getBrandUsageAction,
  saveAdminBrandAction,
  uploadAdminImageAction,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";

type Brand = { id: string; name: string; slug: string; logo_url: string | null };
type Draft = { id?: string; name: string; logo_url: string };

type DeleteBrandModalState = {
  brand: Brand;
  productCount: number;
  sampleProducts: { id: string; name: string }[];
  reassignToId: string;
};

export function BrandManager({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteBrandModalState | null>(null);
  const [checkingUsageId, setCheckingUsageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoScale, setLogoScale] = useState(100);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    if (!draft && !deleteModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setDraft(null);
        setDeleteModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draft, deleteModal, busy]);

  const refresh = async () => setBrands(await getAdminBrandsAction());

  const save = () => {
    if (!draft) return;
    const data = new FormData();
    if (draft.id) data.set("id", draft.id);
    data.set("name", draft.name);
    data.set("logo_url", draft.logo_url);
    setError("");
    startTransition(async () => {
      try {
        await saveAdminBrandAction(data);
        await refresh();
        setDraft(null);
        setNotice("Brand berhasil disimpan.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Brand gagal disimpan.");
      }
    });
  };

  const upload = async (file: File) => {
    try {
      const data = new FormData();
      data.set("file", await prepareImageUpload(file));
      data.set("bucket", "brands");
      const result = await uploadAdminImageAction(data);
      setDraft((current) => (current ? { ...current, logo_url: result.url } : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload logo gagal.");
    }
  };

  const openDeleteModal = async (brand: Brand) => {
    setError("");
    setCheckingUsageId(brand.id);
    try {
      const usage = await getBrandUsageAction(brand.id);
      const otherBrands = brands.filter((b) => b.id !== brand.id);
      setDeleteModal({
        brand,
        productCount: usage.productCount,
        sampleProducts: usage.sampleProducts,
        reassignToId: otherBrands.length > 0 ? otherBrands[0].id : "",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memeriksa relasi brand terhadap produk.");
    } finally {
      setCheckingUsageId(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    const { brand, productCount, reassignToId } = deleteModal;
    if (productCount > 0 && !reassignToId) {
      setError("Pilih brand pengganti untuk memindahkan produk terlebih dahulu.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await deleteAdminBrandAction(brand.id, productCount > 0 ? reassignToId : undefined);
        await refresh();
        setDeleteModal(null);
        setNotice(`Brand "${brand.name}" berhasil dihapus.`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Brand gagal dihapus.");
      }
    });
  };

  const otherBrands = deleteModal ? brands.filter((b) => b.id !== deleteModal.brand.id) : [];

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {notice}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          className="rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 shadow-sm"
          onClick={() => {
            setError("");
            setLogoScale(100);
            setDraft({ name: "", logo_url: "" });
          }}
        >
          <Plus className="mr-1.5 size-3.5" />
          Tambah brand
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {brands.map((brand) => {
          const isChecking = checkingUsageId === brand.id;
          return (
            <article
              key={brand.id}
              className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-4 shadow-xs hover:shadow-md transition-all"
            >
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-2">
                {brand.logo_url ? (
                  <Image
                    src={brand.logo_url}
                    alt={`${brand.name} logo`}
                    width={64}
                    height={64}
                    unoptimized
                    className="size-full object-contain"
                  />
                ) : (
                  <span className="font-bold text-[#2563EB] text-xl">{brand.name.slice(0, 1)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold text-slate-900 dark:text-white text-base">
                  {brand.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {brand.logo_url ? "Logo aktif" : "Belum ada logo"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${brand.name}`}
                  onClick={() => {
                    setDraft({ id: brand.id, name: brand.name, logo_url: brand.logo_url || "" });
                    setError("");
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus ${brand.name}`}
                  disabled={busy || isChecking}
                  onClick={() => openDeleteModal(brand)}
                >
                  {isChecking ? (
                    <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Trash className="size-4 text-destructive" />
                  )}
                </Button>
              </div>
            </article>
          );
        })}
        {!brands.length && (
          <p className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-sm text-slate-500 text-center col-span-full">
            Belum ada brand.
          </p>
        )}
      </div>

      {/* Modal Tambah/Edit Brand */}
      {draft && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDraft(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="brand-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-card p-5 sm:p-6 shadow-xl"
          >
            <h2 id="brand-dialog-title" className="text-xl font-bold">
              {draft.id ? "Edit brand" : "Tambah brand"}
            </h2>
            <label className="block space-y-1 text-sm">
              Nama brand
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              URL logo
              <Input
                type="url"
                value={draft.logo_url}
                onChange={(event) => setDraft({ ...draft, logo_url: event.target.value })}
                placeholder="https://..."
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
              <ImagePlus className="size-4" />
              Upload logo
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
            <p className="text-xs text-muted-foreground">
              Gambar JPG, PNG, WebP, atau AVIF hingga 15 MB; akan dioptimalkan sebelum disimpan.
            </p>
            {draft.logo_url && (
              <>
                <div className="grid h-40 w-full place-items-center overflow-hidden rounded-xl border bg-white p-3">
                  <Image
                    src={draft.logo_url}
                    alt={`Pratinjau logo ${draft.name || "brand"}`}
                    width={400}
                    height={240}
                    unoptimized
                    className="max-h-full max-w-full object-contain"
                    style={{ transform: `scale(${logoScale / 100})` }}
                  />
                </div>
                <label className="block space-y-1 text-xs">
                  Ukuran logo <span className="font-medium">{logoScale}%</span>
                  <input
                    aria-label="Ukuran logo"
                    className="w-full accent-primary"
                    type="range"
                    min="40"
                    max="140"
                    step="5"
                    value={logoScale}
                    onChange={(event) => setLogoScale(Number(event.target.value))}
                  />
                </label>
              </>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>
                Batal
              </Button>
              <Button onClick={save} disabled={busy}>
                {busy ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* Modal Konfirmasi Hapus & Pemindahan Produk Brand */}
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
            aria-labelledby="delete-brand-title"
            className="w-full max-w-md rounded-2xl bg-card border shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 id="delete-brand-title" className="text-base font-bold text-foreground">
                  Hapus Brand &quot;{deleteModal.brand.name}&quot;
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Konfirmasi penghapusan brand dari database toko.
                </p>
              </div>
            </div>

            {deleteModal.productCount === 0 ? (
              <p className="text-xs text-muted-foreground">
                Brand ini tidak digunakan oleh produk mana pun di etalase. Apakah Anda yakin ingin menghapusnya?
              </p>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-950 dark:text-amber-200">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  ⚠️ Perhatian: Brand ini masih digunakan oleh {deleteModal.productCount} produk!
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
                    Pindahkan semua produk ke brand pengganti:
                  </label>
                  {otherBrands.length > 0 ? (
                    <select
                      value={deleteModal.reassignToId}
                      onChange={(e) =>
                        setDeleteModal((prev) =>
                          prev ? { ...prev, reassignToId: e.target.value } : null
                        )
                      }
                      className="w-full text-xs rounded-lg border bg-background px-3 py-2 font-medium focus:ring-2 focus:ring-primary text-foreground"
                    >
                      {otherBrands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-destructive font-semibold text-[11px]">
                      Tidak ada brand lain untuk pemindahan. Buat brand baru terlebih dahulu sebelum menghapus brand ini.
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
                  : "Ya, Hapus Brand"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
