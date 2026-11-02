"use client";

import { confirmAction } from "@/store/useConfirmStore";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveLegalContentAction } from "@/actions/legal";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
  DEFAULT_TERMS_CONTENT,
  DEFAULT_PRIVACY_CONTENT,
  type LegalDocument,
  type LegalSection,
} from "@/lib/legal-content";

interface LegalContentManagerProps {
  initialTerms: LegalDocument;
  initialPrivacy: LegalDocument;
}

export function LegalContentManager({
  initialTerms,
  initialPrivacy,
}: LegalContentManagerProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const [terms, setTerms] = useState<LegalDocument>(initialTerms);
  const [privacy, setPrivacy] = useState<LegalDocument>(initialPrivacy);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentDoc = activeTab === "terms" ? terms : privacy;
  const setCurrentDoc = activeTab === "terms" ? setTerms : setPrivacy;

  const handleUpdateField = (field: keyof Omit<LegalDocument, "sections">, value: string) => {
    setCurrentDoc((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateSection = (
    index: number,
    field: keyof LegalSection,
    value: string
  ) => {
    setCurrentDoc((prev) => {
      const nextSections = [...prev.sections];
      nextSections[index] = {
        ...nextSections[index],
        [field]: value,
      };
      return {
        ...prev,
        sections: nextSections,
      };
    });
  };

  const handleAddSection = () => {
    setCurrentDoc((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `section-${Date.now()}`,
          title: `${prev.sections.length + 1}. Judul Bagian Baru`,
          content: "<p>Tulis isi ketentuan atau kebijakan di sini.</p>",
        },
      ],
    }));
  };

  const handleRemoveSection = async (index: number) => {
    if (currentDoc.sections.length <= 1) {
      setError("Dokumen harus memiliki minimal 1 bagian.");
      return;
    }
    const sectionToRemove = currentDoc.sections[index];
    const confirmed = await confirmAction({
      title: "Hapus Bagian Klausul",
      message: `Hapus bagian "${sectionToRemove.title}"?`,
      confirmText: "Hapus Bagian",
      cancelText: "Batal",
      variant: "danger",
      icon: "trash",
    });
    if (!confirmed) return;
    setCurrentDoc((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentDoc.sections.length) return;

    setCurrentDoc((prev) => {
      const nextSections = [...prev.sections];
      const temp = nextSections[index];
      nextSections[index] = nextSections[targetIndex];
      nextSections[targetIndex] = temp;
      return {
        ...prev,
        sections: nextSections,
      };
    });
  };

  const handleResetToDefault = async () => {
    const docName = activeTab === "terms" ? "Syarat & Ketentuan" : "Kebijakan Privasi";
    const confirmed = await confirmAction({
      title: `Reset ${docName}`,
      message: `Reset dokumen "${docName}" ke template bawaan standar? Perubahan yang belum disimpan akan hilang.`,
      confirmText: "Ya, Reset Standar",
      cancelText: "Batal",
      variant: "warning",
      icon: "alert",
    });
    if (!confirmed) return;
    const defaultData = activeTab === "terms" ? DEFAULT_TERMS_CONTENT : DEFAULT_PRIVACY_CONTENT;
    setCurrentDoc(defaultData);
    setNotice(`${docName} berhasil di-reset ke draf template standar. Klik "Simpan Dokumen" untuk menerapkan.`);
  };

  const handleSave = () => {
    setError("");
    setNotice("");

    startTransition(async () => {
      try {
        const result = await saveLegalContentAction(activeTab, currentDoc);
        if (result.success) {
          setNotice(result.message);
          setCurrentDoc(result.data);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan dokumen hukum.");
      }
    });
  };

  const publicUrl = activeTab === "terms" ? "/terms" : "/privacy-policy";
  const docLabel = activeTab === "terms" ? "Syarat & Ketentuan" : "Kebijakan Privasi";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Kelola Syarat, Ketentuan &amp; Kebijakan Privasi
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Atur isi halaman Syarat &amp; Ketentuan dan Kebijakan Privasi resmi toko Anda tanpa harus mengubah kode.
          </p>
        </div>

        <Link
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <span>Lihat Halaman Publik ({docLabel})</span>
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("terms");
            setNotice("");
            setError("");
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
            activeTab === "terms"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <FileText className="size-4" />
          <span>Syarat &amp; Ketentuan (Terms)</span>
          <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {terms.sections.length} bagian
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("privacy");
            setNotice("");
            setError("");
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
            activeTab === "privacy"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <ShieldCheck className="size-4" />
          <span>Kebijakan Privasi (Privacy)</span>
          <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {privacy.sections.length} bagian
          </span>
        </button>
      </div>

      {/* Notice & Error Alerts */}
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

      {/* Main Document Form */}
      <div className="space-y-6">
        {/* Document Header Metadata Card */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Informasi Dokumen</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              (Header &amp; Tanggal Pembaruan)
            </span>
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Judul Utama Dokumen
              </label>
              <Input
                value={currentDoc.title}
                onChange={(e) => handleUpdateField("title", e.target.value)}
                placeholder="Misal: Syarat & Ketentuan (Terms & Conditions)"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tanggal Terakhir Diperbarui
              </label>
              <Input
                value={currentDoc.last_updated}
                onChange={(e) => handleUpdateField("last_updated", e.target.value)}
                placeholder="Misal: 28 Oktober 2026"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Domain Toko yang Berlaku
              </label>
              <Input
                value={currentDoc.effective_domain}
                onChange={(e) => handleUpdateField("effective_domain", e.target.value)}
                placeholder="Misal: https://nextsolution.web.id"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <RichTextEditor
                label="Pengantar / Subtitle Dokumen"
                value={currentDoc.subtitle}
                onChange={(html) => handleUpdateField("subtitle", html)}
                placeholder="Tulis ringkasan atau pengantar hukum di sini..."
                minHeight="120px"
                helperText="Teks pengantar yang tampil tepat di bawah judul dokumen publik."
              />
            </div>
          </div>
        </div>

        {/* Sections List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Daftar Bagian &amp; Klausul ({currentDoc.sections.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur judul klausul dan detail ketentuannya. Gunakan tombol panah untuk mengatur urutan bagian.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleAddSection}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Tambah Bagian</span>
            </Button>
          </div>

          <div className="space-y-4">
            {currentDoc.sections.map((section, index) => (
              <div
                key={section.id || index}
                className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-3 transition-all"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-xs">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Bagian {index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveSection(index, "up")}
                      aria-label="Pindah ke atas"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Geser ke atas"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === currentDoc.sections.length - 1}
                      onClick={() => handleMoveSection(index, "down")}
                      aria-label="Pindah ke bawah"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Geser ke bawah"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(index)}
                      aria-label="Hapus bagian ini"
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer ml-1"
                      title="Hapus bagian"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Judul Klausul
                  </label>
                  <Input
                    value={section.title}
                    onChange={(e) => handleUpdateSection(index, "title", e.target.value)}
                    placeholder="Misal: 1. Pendaftaran Akun dan Autentikasi Pengguna"
                    className="h-10 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <RichTextEditor
                    label="Isi Klausul / Ketentuan"
                    value={section.content}
                    onChange={(html) => handleUpdateSection(index, "content", html)}
                    placeholder="Tulis rincian ketentuan klausul ini..."
                    minHeight="180px"
                    helperText="Gunakan toolbar di atas untuk format teks tebal (bold), miring (italic), daftar poin (bullet), nomor, atau tautan."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Bar */}
        <div className="sticky bottom-6 z-20 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#1E2028]/95 p-4 shadow-xl backdrop-blur-md">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetToDefault}
            className="rounded-xl border-slate-300 dark:border-white/10 gap-2 cursor-pointer text-xs"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset ke Standar</span>
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 px-6 shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <Save className="size-4" />
            <span>{isPending ? "Menyimpan Dokumen..." : `Simpan ${docLabel}`}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

