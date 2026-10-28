"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  RemoveFormatting,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Highlighter,
  Palette,
  Check,
  X,
} from "lucide-react";
import { normalizeRichTextContent, sanitizeRichText } from "@/lib/sanitize-html";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Palet warna teks terbatas yang aman & nyaman dibaca
const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Gelap / Hitam", value: "#0f172a" },
  { name: "Biru", value: "#2563eb" },
  { name: "Hijau", value: "#16a34a" },
  { name: "Merah", value: "#dc2626" },
  { name: "Amber / Oranye", value: "#d97706" },
  { name: "Ungu", value: "#7c3aed" },
  { name: "Abu-abu", value: "#64748b" },
];

// Palet warna highlight (stabilo)
const HIGHLIGHT_COLORS = [
  { name: "Tanpa Stabilo", value: "" },
  { name: "Kuning", value: "#fef08a" },
  { name: "Hijau", value: "#bbf7d0" },
  { name: "Biru", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Oranye", value: "#fed7aa" },
];

export interface RichTextEditorProps {
  value?: string;
  defaultValue?: string;
  onChange?: (html: string) => void;
  name?: string;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  minHeight?: string | number;
  required?: boolean;
  className?: string;
  helperText?: string;
}

export function RichTextEditor({
  value,
  defaultValue = "",
  onChange,
  name,
  label,
  placeholder = "Tulis konten atau deskripsi lengkap di sini...",
  error,
  disabled = false,
  minHeight = "160px",
  required = false,
  className,
  helperText,
}: RichTextEditorProps) {
  const targetPropValue = value !== undefined ? value : defaultValue;
  const initialContent = normalizeRichTextContent(targetPropValue);
  const [contentHtml, setContentHtml] = useState<string>(initialContent);
  const [prevPropValue, setPrevPropValue] = useState<string>(targetPropValue);

  // Synchronize state when prop value changes externally during render (React recommended pattern)
  if (targetPropValue !== prevPropValue) {
    setPrevPropValue(targetPropValue);
    setContentHtml(normalizeRichTextContent(targetPropValue));
  }

  // Link popover state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  // Color & Highlight picker popover states
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setColorMenuOpen(false);
        setHighlightMenuOpen(false);
        setLinkModalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editor = useEditor({
    immediatelyRender: false, // Penting untuk mencegah hydration mismatch di Next.js SSR
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        dropcursor: {
          color: "#2563eb",
          width: 2,
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
          class: "text-primary underline hover:opacity-80 transition-opacity",
        },
        validate: (href) => /^https?:\/\/|^\/|^mailto:|^tel:/.test(href),
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : sanitizeRichText(ed.getHTML());
      setContentHtml(html);
      onChange?.(html);
    },
  });

  // Sync external controlled value changes to editor instance (e.g. form reset or editing switch)
  useEffect(() => {
    if (!editor) return;
    const targetValue = value !== undefined ? value : defaultValue;
    const normalized = normalizeRichTextContent(targetValue);
    const current = editor.isEmpty ? "" : sanitizeRichText(editor.getHTML());

    if (normalized !== current && (normalized || current !== "")) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [value, defaultValue, editor]);

  // Sync disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  const handleOpenLinkModal = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setLinkError("");
    setLinkModalOpen(true);
    setColorMenuOpen(false);
    setHighlightMenuOpen(false);
  }, [editor]);

  const handleApplyLink = useCallback(() => {
    if (!editor) return;
    const trimmed = linkUrl.trim();

    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkModalOpen(false);
      return;
    }

    // Blokir protokol berbahaya
    if (/^(javascript|vbscript|data):/i.test(trimmed)) {
      setLinkError("URL dengan protokol javascript atau data tidak diizinkan demi keamanan.");
      return;
    }

    // Auto-prefix jika pengguna hanya mengetik domain biasa
    let finalUrl = trimmed;
    if (!/^https?:\/\/|^\/|^mailto:|^tel:/i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: finalUrl })
      .run();

    setLinkModalOpen(false);
    setLinkUrl("");
    setLinkError("");
  }, [editor, linkUrl]);

  const handleRemoveLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setLinkModalOpen(false);
    setLinkUrl("");
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {label && <label className="block text-sm font-semibold text-foreground">{label}</label>}
        <div
          style={{ minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}
          className="w-full rounded-xl border border-input bg-muted/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground"
        >
          Memuat Editor...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("space-y-1.5 text-left", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-foreground">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        </div>
      )}

      {/* Hidden input agar FormData otomatis mengenali value pada formulir native / server action */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={contentHtml}
          required={required}
        />
      )}

      <div
        className={cn(
          "relative rounded-xl border border-input bg-background transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs overflow-hidden",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive",
          disabled && "opacity-60 pointer-events-none bg-muted/30"
        )}
      >
        {/* WORD-LIKE TOOLBAR */}
        <div
          role="toolbar"
          aria-label="Format Teks"
          className="flex flex-wrap items-center gap-0.5 border-b border-border bg-slate-50/80 dark:bg-slate-900/60 p-1.5 text-foreground backdrop-blur-xs select-none"
        >
          {/* GRUP 1: Teks & Heading */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-border/80">
            <button
              type="button"
              title="Paragraf Normal (Teks Biasa)"
              aria-label="Paragraf"
              aria-pressed={editor.isActive("paragraph") && !editor.isActive("heading")}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setParagraph().run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("paragraph") && !editor.isActive("heading") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <Pilcrow className="size-4" />
            </button>
            <button
              type="button"
              title="Heading 2 (Judul Bagian)"
              aria-label="Heading 2"
              aria-pressed={editor.isActive("heading", { level: 2 })}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleHeading({ level: 2 }).run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("heading", { level: 2 }) && "bg-primary/10 text-primary font-bold"
              )}
            >
              <Heading2 className="size-4" />
            </button>
            <button
              type="button"
              title="Heading 3 (Sub-Judul)"
              aria-label="Heading 3"
              aria-pressed={editor.isActive("heading", { level: 3 })}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleHeading({ level: 3 }).run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("heading", { level: 3 }) && "bg-primary/10 text-primary font-bold"
              )}
            >
              <Heading3 className="size-4" />
            </button>
          </div>

          {/* GRUP 2: Format Inline (Bold, Italic, Underline, Strike, Clear) */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border/80">
            <button
              type="button"
              title="Tebal / Bold (Ctrl+B)"
              aria-label="Tebal"
              aria-pressed={editor.isActive("bold")}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBold().run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("bold") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <Bold className="size-4" />
            </button>
            <button
              type="button"
              title="Miring / Italic (Ctrl+I)"
              aria-label="Miring"
              aria-pressed={editor.isActive("italic")}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleItalic().run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("italic") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <Italic className="size-4" />
            </button>
            <button
              type="button"
              title="Garis Bawah / Underline (Ctrl+U)"
              aria-label="Garis Bawah"
              aria-pressed={editor.isActive("underline")}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleUnderline().run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("underline") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <UnderlineIcon className="size-4" />
            </button>
            <button
              type="button"
              title="Coret / Strikethrough"
              aria-label="Coret"
              aria-pressed={editor.isActive("strike")}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleStrike().run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("strike") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <Strikethrough className="size-4" />
            </button>
            <button
              type="button"
              title="Hapus Pemformatan (Clear Formatting)"
              aria-label="Hapus Pemformatan"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetAllMarks().clearNodes().run();
              }}
              className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <RemoveFormatting className="size-4" />
            </button>
          </div>

          {/* GRUP 3: Perataan Teks (Alignment) */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border/80">
            <button
              type="button"
              title="Rata Kiri (Align Left)"
              aria-label="Rata Kiri"
              aria-pressed={editor.isActive({ textAlign: "left" })}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setTextAlign("left").run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive({ textAlign: "left" }) && "bg-primary/10 text-primary font-bold"
              )}
            >
              <AlignLeft className="size-4" />
            </button>
            <button
              type="button"
              title="Rata Tengah (Align Center)"
              aria-label="Rata Tengah"
              aria-pressed={editor.isActive({ textAlign: "center" })}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setTextAlign("center").run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive({ textAlign: "center" }) && "bg-primary/10 text-primary font-bold"
              )}
            >
              <AlignCenter className="size-4" />
            </button>
            <button
              type="button"
              title="Rata Kanan (Align Right)"
              aria-label="Rata Kanan"
              aria-pressed={editor.isActive({ textAlign: "right" })}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setTextAlign("right").run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive({ textAlign: "right" }) && "bg-primary/10 text-primary font-bold"
              )}
            >
              <AlignRight className="size-4" />
            </button>
            <button
              type="button"
              title="Rata Kanan-Kiri (Justify)"
              aria-label="Rata Kanan Kiri"
              aria-pressed={editor.isActive({ textAlign: "justify" })}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setTextAlign("justify").run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive({ textAlign: "justify" }) && "bg-primary/10 text-primary font-bold"
              )}
            >
              <AlignJustify className="size-4" />
            </button>
          </div>

          {/* GRUP 4: List, Blockquote, Divider */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border/80">
            <button
              type="button"
              title="Daftar Bullet (Bullet List)"
              aria-label="Daftar Bullet"
              aria-pressed={editor.isActive("bulletList")}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBulletList().run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("bulletList") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              title="Daftar Bernomor (Numbered List)"
              aria-label="Daftar Bernomor"
              aria-pressed={editor.isActive("orderedList")}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleOrderedList().run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("orderedList") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <ListOrdered className="size-4" />
            </button>
            <button
              type="button"
              title="Kutipan (Blockquote)"
              aria-label="Kutipan"
              aria-pressed={editor.isActive("blockquote")}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBlockquote().run();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("blockquote") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <Quote className="size-4" />
            </button>
            <button
              type="button"
              title="Garis Pemisah (Horizontal Rule)"
              aria-label="Garis Pemisah"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setHorizontalRule().run();
              }}
              className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Minus className="size-4" />
            </button>
          </div>

          {/* GRUP 5: Warna Teks & Highlight */}
          <div className="relative flex items-center gap-0.5 px-1 border-r border-border/80">
            {/* Tombol Warna Teks */}
            <button
              type="button"
              title="Warna Teks"
              aria-label="Warna Teks"
              aria-expanded={colorMenuOpen}
              onMouseDown={(e) => {
                e.preventDefault();
                setColorMenuOpen((prev) => !prev);
                setHighlightMenuOpen(false);
                setLinkModalOpen(false);
              }}
              className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Palette className="size-4" />
            </button>

            {colorMenuOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 p-2 rounded-xl border border-border bg-card shadow-lg flex flex-col gap-1 w-36">
                <span className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-wider">
                  Warna Teks
                </span>
                {TEXT_COLORS.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (col.value) {
                        editor.chain().focus().setColor(col.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                      setColorMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1 rounded-md text-xs hover:bg-muted text-foreground w-full text-left"
                  >
                    <span
                      className="size-3.5 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: col.value || "currentColor" }}
                    />
                    <span className="truncate">{col.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Tombol Stabilo / Highlight */}
            <button
              type="button"
              title="Warna Penanda (Highlight / Stabilo)"
              aria-label="Warna Penanda"
              aria-expanded={highlightMenuOpen}
              onMouseDown={(e) => {
                e.preventDefault();
                setHighlightMenuOpen((prev) => !prev);
                setColorMenuOpen(false);
                setLinkModalOpen(false);
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("highlight") && "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold"
              )}
            >
              <Highlighter className="size-4" />
            </button>

            {highlightMenuOpen && (
              <div className="absolute top-full left-6 mt-1 z-50 p-2 rounded-xl border border-border bg-card shadow-lg flex flex-col gap-1 w-36">
                <span className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-wider">
                  Warna Stabilo
                </span>
                {HIGHLIGHT_COLORS.map((hl) => (
                  <button
                    key={hl.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (hl.value) {
                        editor.chain().focus().setHighlight({ color: hl.value }).run();
                      } else {
                        editor.chain().focus().unsetHighlight().run();
                      }
                      setHighlightMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1 rounded-md text-xs hover:bg-muted text-foreground w-full text-left"
                  >
                    <span
                      className="size-3.5 rounded-sm border border-border shrink-0"
                      style={{ backgroundColor: hl.value || "transparent" }}
                    />
                    <span className="truncate">{hl.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GRUP 6: Hyperlink */}
          <div className="relative flex items-center gap-0.5 px-1 border-r border-border/80">
            <button
              type="button"
              title="Sisipkan / Edit Link"
              aria-label="Sisipkan Link"
              aria-pressed={editor.isActive("link")}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOpenLinkModal();
              }}
              className={cn(
                "size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground",
                editor.isActive("link") && "bg-primary/10 text-primary font-bold"
              )}
            >
              <LinkIcon className="size-4" />
            </button>
            {editor.isActive("link") && (
              <button
                type="button"
                title="Hapus Link"
                aria-label="Hapus Link"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleRemoveLink();
                }}
                className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-destructive"
              >
                <Unlink className="size-4" />
              </button>
            )}

            {/* Link Input Dialog Popover */}
            {linkModalOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 p-3 rounded-xl border border-border bg-card shadow-xl w-72 sm:w-80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Sisipkan Tautan (Link)</span>
                  <button
                    type="button"
                    onClick={() => setLinkModalOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="https://contoh.com atau /promo"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setLinkError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyLink();
                    }
                  }}
                  className="h-8 text-xs"
                  autoFocus
                />
                {linkError && <p className="text-[11px] text-destructive leading-tight">{linkError}</p>}
                <div className="flex justify-end gap-1.5 pt-1">
                  {editor.isActive("link") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLink}
                      className="h-7 text-xs text-destructive hover:text-destructive px-2"
                    >
                      Hapus
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLinkModalOpen(false)}
                    className="h-7 text-xs px-2"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyLink}
                    className="h-7 text-xs px-3 font-semibold"
                  >
                    <Check className="mr-1 size-3" />
                    Terapkan
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* GRUP 7: History (Undo & Redo) */}
          <div className="flex items-center gap-0.5 pl-1 ml-auto">
            <button
              type="button"
              title="Urungkan / Undo (Ctrl+Z)"
              aria-label="Undo"
              disabled={!editor.can().undo()}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().undo().run();
              }}
              className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              <Undo className="size-4" />
            </button>
            <button
              type="button"
              title="Ulangi / Redo (Ctrl+Y / Ctrl+Shift+Z)"
              aria-label="Redo"
              disabled={!editor.can().redo()}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().redo().run();
              }}
              className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              <Redo className="size-4" />
            </button>
          </div>
        </div>

        {/* EDITOR EDITABLE CONTENT AREA */}
        <div
          className="p-3.5 sm:p-4 text-sm leading-relaxed overflow-y-auto"
          style={{ minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}
          onClick={() => {
            if (!editor.isFocused) {
              editor.commands.focus();
            }
          }}
        >
          <EditorContent editor={editor} className="tiptap prose prose-slate dark:prose-invert max-w-none focus:outline-none" />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}

