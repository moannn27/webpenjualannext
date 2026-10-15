"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileUp,
  Filter,
  HelpCircle,
  Info,
  Laptop,
  Layers,
  LoaderCircle,
  Monitor,
  RotateCcw,
  Search,
  Tablet,
  Tag,
  X,
  XCircle,
  FolderPlus,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bulkImportAdminProductsAction, getMissingImportTaxonomiesAction } from "@/actions/admin";
import {
  hasConfirmedImportPriceMapping,
  isValidImportPrices,
  applyStockPolicyToProduct,
  calculateProductTotalStock,
  type ImportedProduct,
  type ImportSheetSummary,
  type StockPolicy,
} from "@/lib/admin-product-import";
import { BulkImageUploadTab } from "./BulkImageUploadTab";

type ActiveTab = "upload" | "images" | "guide" | "columns" | "faq";

export function ProductBulkImporter({ onImported }: { onImported: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("upload");
  const [products, setProducts] = useState<ImportedProduct[]>([]);
  const [sheetSummary, setSheetSummary] = useState<ImportSheetSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const [downloadingFormat, setDownloadingFormat] = useState<"xlsx" | "csv" | null>(null);

  // Filter states
  const [filterType, setFilterType] = useState<"all" | "laptop" | "desktop" | "tablet" | "promo">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unconfirmed" | "ready" | "error" | "skip">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Import Scope: "all" (semua produk dalam file) atau "filtered" (hanya produk pada filter/tampilan aktif)
  const [importScope, setImportScope] = useState<"all" | "filtered">("all");

  // Missing taxonomies (kategori & brand) modal state
  type MissingTaxonomyModalConfig = {
    categories: string[];
    brands: string[];
    onConfirm: () => void;
  };
  const [missingTaxonomyModal, setMissingTaxonomyModal] = useState<MissingTaxonomyModalConfig | null>(null);

  // Pricing Scheme Alert Modal state (Normal vs Promo)
  type PricingChoiceModalConfig = {
    targetCount: number;
    unconfirmedCount: number;
  };
  const [pricingChoiceModal, setPricingChoiceModal] = useState<PricingChoiceModalConfig | null>(null);
  const [selectedPricingScheme, setSelectedPricingScheme] = useState<"normal" | "promo">("normal");

  // Confirmation alert modal state
  type ConfirmModalConfig = {
    title: string;
    description: string;
    badgeText: string;
    affectedCount: number;
    onConfirm: () => void;
  };
  const [confirmModalConfig, setConfirmModalConfig] = useState<ConfirmModalConfig | null>(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  // Import Summary modal state before saving
  type ImportSummaryModalConfig = {
    targetToImport: ImportedProduct[];
    createCount: number;
    updateCount: number;
    consolidateCount: number;
    skipCount: number;
    totalUnits: number;
    stockPolicy: StockPolicy;
  };
  const [importSummaryModal, setImportSummaryModal] = useState<ImportSummaryModalConfig | null>(null);

  // Global Stock Policy state
  const [globalStockPolicy, setGlobalStockPolicy] = useState<StockPolicy>("keep_existing");
  const [stockAdjustmentDelta, setStockAdjustmentDelta] = useState<number>(0);

  const applyStockPolicy = (policy: StockPolicy, delta: number = 0) => {
    setGlobalStockPolicy(policy);
    setStockAdjustmentDelta(delta);
    setProducts((current) =>
      current.map((product) => applyStockPolicyToProduct(product, policy, delta))
    );
    setNotice(
      policy === "keep_existing"
        ? "Kebijakan stok: Pertahankan stok saat ini pada produk & varian yang sudah ada."
        : policy === "replace_with_file"
        ? "Kebijakan stok: Perbarui stok sesuai angka pada file Excel."
        : `Kebijakan stok: Penyesuaian stok (${delta >= 0 ? `+${delta}` : delta}) diterapkan ke semua produk.`
    );
  };

  const update = (index: number, patch: Partial<ImportedProduct>) =>
    setProducts((current) => current.map((product, row) => (row === index ? { ...product, ...patch } : product)));

  const updateVariantStock = (productIndex: number, variantIndex: number, newStock: number) => {
    setProducts((current) =>
      current.map((product, pIdx) => {
        if (pIdx !== productIndex) return product;
        const variants = (product.variants || []).map((v, vIdx) => {
          if (vIdx !== variantIndex) return v;
          const validStock = Math.max(0, Number.isFinite(newStock) ? Math.floor(newStock) : 0);
          return {
            ...v,
            stock: validStock,
            stockPolicy: "manual" as StockPolicy,
            stockChangeReason: `Diedit manual (${v.currentStock != null ? `DB: ${v.currentStock}` : "baru"} -> ${validStock})`,
          };
        });
        const totalStock = calculateProductTotalStock({ stock: product.stock, variants });
        return {
          ...product,
          variants,
          stock: totalStock,
          stockPolicy: "manual" as StockPolicy,
          stockChangeReason: `Total dari ${variants.length} varian (${totalStock} unit)`,
        };
      })
    );
  };

  const updateProductStock = (productIndex: number, newStock: number) => {
    setProducts((current) =>
      current.map((product, pIdx) => {
        if (pIdx !== productIndex) return product;
        const validStock = Math.max(0, Number.isFinite(newStock) ? Math.floor(newStock) : 0);
        return {
          ...product,
          stock: validStock,
          stockPolicy: "manual" as StockPolicy,
          stockChangeReason: `Diedit manual (${product.currentStock != null ? `DB: ${product.currentStock}` : "baru"} -> ${validStock})`,
        };
      })
    );
  };

  // Detection helper functions
  const isDesktopProduct = (category = "", name = "") => {
    const c = category.toLowerCase();
    const n = name.toLowerCase();
    return (
      c.includes("desktop") ||
      c.includes("tower") ||
      c.includes("aio") ||
      c.includes("all-in-one") ||
      c.includes("all in one") ||
      c.includes("pc") ||
      n.includes("ideacentre") ||
      n.includes("thinkcentre") ||
      n.includes("legion tower")
    );
  };

  const isLaptopProduct = (category = "", name = "") => {
    const c = category.toLowerCase();
    const n = name.toLowerCase();
    return (
      c.includes("laptop") ||
      c.includes("notebook") ||
      n.includes("thinkpad") ||
      n.includes("ideapad") ||
      n.includes("yoga") ||
      n.includes("legion slim") ||
      n.includes("legion pro") ||
      n.includes("loq")
    );
  };

  const isTabletProduct = (category = "", name = "") => {
    const c = category.toLowerCase();
    const n = name.toLowerCase();
    return (
      c.includes("tablet") ||
      c.includes("tab") ||
      c.includes("pad") ||
      n.includes("tab ") ||
      n.includes("pad")
    );
  };

  const hasPromoPrice = (product: ImportedProduct) => {
    return Boolean(
      (product.discount_price !== null && product.discount_price > 0) ||
      (product.discountCandidates &&
        product.discountCandidates.some(
          (candidate) => candidate.amount !== null && candidate.amount > 0 && candidate.amount < product.price
        ))
    );
  };

  // Distinct categories detected from current product list
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category?.trim()) set.add(p.category.trim());
    }
    return Array.from(set).sort();
  }, [products]);

  // Aggregate counts for quick filters
  const counts = useMemo(() => {
    let desktop = 0;
    let laptop = 0;
    let tablet = 0;
    let promo = 0;
    let unconfirmed = 0;
    let ready = 0;
    let errors = 0;

    for (const p of products) {
      if (isDesktopProduct(p.category, p.name)) desktop++;
      if (isLaptopProduct(p.category, p.name)) laptop++;
      if (isTabletProduct(p.category, p.name)) tablet++;
      if (hasPromoPrice(p)) promo++;
      if (!hasConfirmedImportPriceMapping(p)) unconfirmed++;
      else if (p.importAction !== "skip" && !(p.errors?.length)) ready++;
      if ((p.errors?.length ?? 0) > 0) errors++;
    }

    return { desktop, laptop, tablet, promo, unconfirmed, ready, errors };
  }, [products]);

  // Filtered product items preserving their original index in the main products state
  const filteredProductItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products
      .map((product, originalIndex) => ({ product, originalIndex }))
      .filter(({ product }) => {
        // 1. Filter Type (Laptop, Desktop, Tablet, Promo)
        if (filterType === "laptop" && !isLaptopProduct(product.category, product.name)) return false;
        if (filterType === "desktop" && !isDesktopProduct(product.category, product.name)) return false;
        if (filterType === "tablet" && !isTabletProduct(product.category, product.name)) return false;
        if (filterType === "promo" && !hasPromoPrice(product)) return false;

        // 2. Filter Category Dropdown
        if (filterCategory !== "all" && product.category?.trim().toLowerCase() !== filterCategory.toLowerCase()) {
          return false;
        }

        // 3. Filter Status
        if (filterStatus === "unconfirmed" && hasConfirmedImportPriceMapping(product)) return false;
        if (
          filterStatus === "ready" &&
          (!hasConfirmedImportPriceMapping(product) ||
            product.importAction === "skip" ||
            (product.errors?.length ?? 0) > 0)
        )
          return false;
        if (filterStatus === "error" && (product.errors?.length ?? 0) === 0) return false;
        if (filterStatus === "skip" && product.importAction !== "skip") return false;

        // 4. Search query
        if (query) {
          const matchName = product.name?.toLowerCase().includes(query);
          const matchSku = product.sku?.toLowerCase().includes(query);
          const matchCat = product.category?.toLowerCase().includes(query);
          const matchBrand = product.brand?.toLowerCase().includes(query);
          if (!matchName && !matchSku && !matchCat && !matchBrand) return false;
        }

        return true;
      });
  }, [products, filterType, filterCategory, filterStatus, searchQuery]);

  // Helper to apply pricing mode: "normal" (Normal SRP only) or "promo" (Promo + Normal)
  const applyPricingModeToProduct = (product: ImportedProduct, mode: "normal" | "promo"): ImportedProduct => {
    // 1. Primary price (Harga User / SRP)
    let selectedPriceCol = product.selectedPriceColumn;
    let priceAmount = product.price;

    const matchingMainCandidate = product.priceCandidates?.find(
      (candidate) => candidate.column === selectedPriceCol && candidate.amount === priceAmount
    );

    if (!selectedPriceCol || !matchingMainCandidate) {
      const validCandidate = product.priceCandidates?.find(
        (candidate) => candidate.amount !== null && candidate.amount > 0
      );
      if (validCandidate && validCandidate.amount !== null) {
        selectedPriceCol = validCandidate.column;
        priceAmount = validCandidate.amount;
      } else if (product.price > 0 && product.priceCandidates?.[0]) {
        selectedPriceCol = product.priceCandidates[0].column;
        priceAmount = product.priceCandidates[0].amount ?? product.price;
      } else if (product.price > 0) {
        selectedPriceCol = "price";
        priceAmount = product.price;
      }
    }

    // 2. Discount / promo price
    let selectedDiscountCol: string;
    let discountAmount: number | null;

    if (mode === "normal") {
      // Skema Harga Normal Saja: tidak ada harga promo
      selectedDiscountCol = "none";
      discountAmount = null;
    } else {
      // Skema Promo: jika ada diskon valid (< price), aktifkan promo. Jika tidak, set "none".
      const validDiscount = product.discountCandidates?.find(
        (candidate) => candidate.amount !== null && candidate.amount > 0 && candidate.amount < priceAmount
      );
      if (validDiscount && validDiscount.amount !== null) {
        selectedDiscountCol = validDiscount.column;
        discountAmount = validDiscount.amount;
      } else {
        selectedDiscountCol = "none";
        discountAmount = null;
      }
    }

    return {
      ...product,
      price: priceAmount,
      selectedPriceColumn: selectedPriceCol,
      priceConfirmed: Boolean(selectedPriceCol && priceAmount > 0),
      discount_price: discountAmount,
      selectedDiscountColumn: selectedDiscountCol,
      discountPriceConfirmed: true,
    };
  };

  const confirmProductPrices = (product: ImportedProduct): ImportedProduct => {
    return applyPricingModeToProduct(product, "promo");
  };

  const applyPricingMode = (mode: "normal" | "promo", targetIndices?: number[]) => {
    const indices =
      targetIndices ??
      (isFiltered && importScope === "filtered"
        ? filteredProductItems.map((item) => item.originalIndex)
        : products.map((_, i) => i));

    const targetSet = new Set(indices);
    let count = 0;
    setProducts((current) =>
      current.map((product, idx) => {
        if (!targetSet.has(idx) || product.importAction === "skip") return product;
        count++;
        return applyPricingModeToProduct(product, mode);
      })
    );
    setNotice(
      mode === "normal"
        ? `Berhasil: ${count} produk disetel menggunakan Harga Normal Saja (tanpa diskon promo).`
        : `Berhasil: ${count} produk disetel menggunakan Skema Promo (diskon aktif jika ada, lainnya harga normal).`
    );
  };

  const isFiltered =
    filterType !== "all" ||
    filterCategory !== "all" ||
    filterStatus !== "all" ||
    Boolean(searchQuery.trim());

  let mainButtonLabel = `Konfirmasi Semua Harga (${products.length})`;
  let currentSegmentTarget: "all" | "desktop" | "laptop" | "tablet" | "promo" | "filtered" | string = "all";

  if (filterType === "desktop") {
    mainButtonLabel = `Konfirmasi ${counts.desktop} Produk Desktop`;
    currentSegmentTarget = "desktop";
  } else if (filterType === "laptop") {
    mainButtonLabel = `Konfirmasi ${counts.laptop} Produk Laptop`;
    currentSegmentTarget = "laptop";
  } else if (filterType === "tablet") {
    mainButtonLabel = `Konfirmasi ${counts.tablet} Produk Tablet`;
    currentSegmentTarget = "tablet";
  } else if (filterType === "promo") {
    mainButtonLabel = `Konfirmasi ${counts.promo} Produk Promo`;
    currentSegmentTarget = "promo";
  } else if (filterCategory !== "all") {
    const catCount = products.filter((p) => p.category?.trim().toLowerCase() === filterCategory.toLowerCase()).length;
    mainButtonLabel = `Konfirmasi ${catCount} Produk "${filterCategory}"`;
    currentSegmentTarget = filterCategory;
  } else if (isFiltered) {
    mainButtonLabel = `Konfirmasi ${filteredProductItems.length} Produk Ditampilkan`;
    currentSegmentTarget = "filtered";
  }

  // Segment confirmation with alert dialog
  const requestConfirmSegment = (segment: "all" | "desktop" | "laptop" | "tablet" | "promo" | "filtered" | string) => {
    let targetIndices: number[] = [];
    let title = "";
    let badgeText = "";
    let desc = "";

    if (segment === "all") {
      targetIndices = products.map((_, i) => i);
      title = `Konfirmasi Semua Harga (${products.length} Produk)?`;
      badgeText = "Seluruh Katalog Excel";
      desc = "Sistem akan otomatis menyetujui harga utama (SRP/User) dan status promo untuk seluruh produk yang terdeteksi.";
    } else if (segment === "desktop") {
      targetIndices = products.map((p, i) => (isDesktopProduct(p.category, p.name) ? i : -1)).filter((i) => i >= 0);
      title = `Konfirmasi Hanya Produk Desktop (${targetIndices.length} Produk)?`;
      badgeText = "Segmen Desktop / PC";
      desc = "Sistem akan otomatis menyetujui harga utama dan status promo khusus untuk produk kategori Desktop / PC.";
    } else if (segment === "laptop") {
      targetIndices = products.map((p, i) => (isLaptopProduct(p.category, p.name) ? i : -1)).filter((i) => i >= 0);
      title = `Konfirmasi Hanya Produk Laptop (${targetIndices.length} Produk)?`;
      badgeText = "Segmen Laptop / Notebook";
      desc = "Sistem akan otomatis menyetujui harga utama dan status promo khusus untuk produk kategori Laptop / Notebook.";
    } else if (segment === "tablet") {
      targetIndices = products.map((p, i) => (isTabletProduct(p.category, p.name) ? i : -1)).filter((i) => i >= 0);
      title = `Konfirmasi Hanya Produk Tablet (${targetIndices.length} Produk)?`;
      badgeText = "Segmen Tablet";
      desc = "Sistem akan otomatis menyetujui harga utama dan status promo khusus untuk produk kategori Tablet.";
    } else if (segment === "promo") {
      targetIndices = products.map((p, i) => (hasPromoPrice(p) ? i : -1)).filter((i) => i >= 0);
      title = `Konfirmasi Hanya Produk Promo (${targetIndices.length} Produk)?`;
      badgeText = "Khusus Produk Berdiskon";
      desc = "Sistem akan otomatis menyetujui harga utama dan mengaktifkan harga promo khusus untuk produk yang memiliki diskon.";
    } else if (segment === "filtered") {
      targetIndices = filteredProductItems.map((item) => item.originalIndex);
      title = `Konfirmasi ${targetIndices.length} Produk yang Sedang Difilter?`;
      badgeText = "Produk Tampilan Aktif";
      desc = "Sistem akan otomatis menyetujui harga utama dan status promo untuk seluruh produk yang sedang ditampilkan sesuai filter saat ini.";
    } else {
      targetIndices = products.map((p, i) => (p.category?.trim().toLowerCase() === segment.toLowerCase() ? i : -1)).filter((i) => i >= 0);
      title = `Konfirmasi Kategori "${segment}" (${targetIndices.length} Produk)?`;
      badgeText = `Kategori ${segment}`;
      desc = `Sistem akan otomatis menyetujui harga utama dan status promo khusus untuk produk kategori "${segment}".`;
    }

    if (targetIndices.length === 0) {
      setError("Tidak ada produk yang sesuai dengan segmen yang dipilih.");
      return;
    }

    setConfirmModalConfig({
      title,
      description: desc,
      badgeText,
      affectedCount: targetIndices.length,
      onConfirm: () => {
        const targetSet = new Set(targetIndices);
        let count = 0;
        setProducts((current) =>
          current.map((product, idx) => {
            const isTarget = targetSet.has(idx);
            if (!isTarget) {
              return segment !== "all" ? { ...product, importAction: "skip" } : product;
            }
            if (product.importAction === "skip" && segment === "all") return product;
            count++;
            const confirmed = confirmProductPrices(product);
            return {
              ...confirmed,
              importAction: product.duplicateInDatabase ? "update" : "create",
            };
          })
        );
        setConfirmModalConfig(null);
        setNotice(
          segment !== "all"
            ? `Berhasil: ${count} produk pada segmen ${badgeText} telah dikonfirmasi dan dipilih untuk impor (produk lainnya disetel "Lewati").`
            : `Berhasil: ${count} produk telah dikonfirmasi harga utama & promonya.`
        );
      },
    });
  };

  // Apply normal prices only (Harga Normal Saja - Tanpa Promo)
  const requestCheckNormalPricesOnly = (scope: "all" | "filtered" = "filtered") => {
    const targetIndices =
      scope === "filtered" && isFiltered
        ? filteredProductItems.map((item) => item.originalIndex)
        : products.map((_, i) => i);

    setConfirmModalConfig({
      title: `Gunakan Harga Normal Saja (${targetIndices.length} Produk)?`,
      description:
        "Sistem akan otomatis mengonfirmasi Harga Utama (SRP / User) dan menyetel status promo ke 'Tanpa harga promo'. Produk akan diimpor dengan harga reguler tanpa diskon coret.",
      badgeText: scope === "filtered" && isFiltered ? "Produk Terfilter" : "Seluruh Produk",
      affectedCount: targetIndices.length,
      onConfirm: () => {
        applyPricingMode("normal", targetIndices);
        setConfirmModalConfig(null);
      },
    });
  };

  // Apply promo prices (Promo + Harga Normal)
  const requestCheckPromoPricesOnly = (scope: "all" | "filtered" = "filtered") => {
    const targetIndices =
      scope === "filtered" && isFiltered
        ? filteredProductItems.map((item) => item.originalIndex)
        : products.map((_, i) => i);

    setConfirmModalConfig({
      title: `Gunakan Skema Promo (+ Harga Normal) (${targetIndices.length} Produk)?`,
      description:
        "Sistem akan otomatis mengonfirmasi harga utama dan mengaktifkan harga promo untuk produk yang memiliki diskon di file. Produk yang tidak memiliki diskon tetap menggunakan harga normal.",
      badgeText: scope === "filtered" && isFiltered ? "Produk Terfilter" : "Seluruh Produk",
      affectedCount: targetIndices.length,
      onConfirm: () => {
        applyPricingMode("promo", targetIndices);
        setConfirmModalConfig(null);
      },
    });
  };

  // Reset confirmations back to unchecked state
  const resetConfirmations = (type: "all" | "price" | "promo" = "all") => {
    setProducts((current) =>
      current.map((product) => ({
        ...product,
        ...(type === "all" || type === "price" ? { priceConfirmed: false } : {}),
        ...(type === "all" || type === "promo" ? { discountPriceConfirmed: false } : {}),
      }))
    );
    setNotice(
      type === "all"
        ? "Seluruh centang konfirmasi harga telah di-reset."
        : type === "price"
        ? "Centang harga normal telah di-reset."
        : "Centang harga promo telah di-reset."
    );
  };

  // Set action 'create'/'update' for specific segment, and optionally set other products to 'skip'
  const setSegmentImportAction = (
    segment: "all" | "desktop" | "laptop" | "tablet" | "promo" | "filtered" | string,
    onlyThisSegment: boolean = false
  ) => {
    let isMatch: (p: ImportedProduct, idx: number) => boolean;
    let label = segment;

    if (segment === "all") {
      isMatch = () => true;
      label = "Semua";
    } else if (segment === "desktop") {
      isMatch = (p) => isDesktopProduct(p.category, p.name);
      label = "Desktop";
    } else if (segment === "laptop") {
      isMatch = (p) => isLaptopProduct(p.category, p.name);
      label = "Laptop";
    } else if (segment === "tablet") {
      isMatch = (p) => isTabletProduct(p.category, p.name);
      label = "Tablet";
    } else if (segment === "promo") {
      isMatch = (p) => hasPromoPrice(p);
      label = "Promo";
    } else if (segment === "filtered") {
      const targetIndices = new Set(filteredProductItems.map((item) => item.originalIndex));
      isMatch = (_, idx) => targetIndices.has(idx);
      label = "Terfilter";
    } else {
      isMatch = (p) => p.category?.trim().toLowerCase() === segment.toLowerCase();
      label = `Kategori "${segment}"`;
    }

    let targetCount = 0;
    let skippedCount = 0;

    setProducts((current) =>
      current.map((product, idx) => {
        const matches = isMatch(product, idx);
        if (matches) {
          targetCount++;
          return {
            ...product,
            importAction: product.duplicateInDatabase ? "update" : "create",
          };
        } else if (onlyThisSegment) {
          skippedCount++;
          return {
            ...product,
            importAction: "skip",
          };
        }
        return product;
      })
    );

    setNotice(
      onlyThisSegment
        ? `Diatur: ${targetCount} produk ${label} dipilih untuk impor. Sebanyak ${skippedCount} produk lainnya disetel ke "Lewati".`
        : `Diatur: ${targetCount} produk ${label} diaktifkan untuk impor.`
    );
  };

  // Bulk update action for currently displayed products
  const bulkSetAction = (action: "create" | "skip") => {
    const targetIndices = new Set(filteredProductItems.map((item) => item.originalIndex));
    setProducts((current) =>
      current.map((product, idx) => {
        if (!targetIndices.has(idx)) return product;
        return {
          ...product,
          importAction: action === "create" && product.duplicateInDatabase ? "update" : action,
        };
      })
    );
    setNotice(
      `Tindakan untuk ${targetIndices.size} produk yang ditampilkan diubah menjadi "${action === "create" ? "Produk baru" : "Lewati"}".`
    );
  };

  // Target produk yang akan diimpor berdasarkan importScope
  const targetProductsToImport = useMemo(() => {
    if (isFiltered && importScope === "filtered") {
      const filteredOriginalIndices = new Set(filteredProductItems.map((item) => item.originalIndex));
      return products.filter((p, idx) => filteredOriginalIndices.has(idx) && p.importAction !== "skip");
    }
    return products.filter((p) => p.importAction !== "skip");
  }, [isFiltered, importScope, filteredProductItems, products]);

  const hasFatalErrors = targetProductsToImport.some((product) => (product.errors?.length ?? 0) > 0);
  const hasUnconfirmedPrices = targetProductsToImport.some(
    (product) => !isValidImportPrices(product.price, product.discount_price) || !hasConfirmedImportPriceMapping(product)
  );
  const hasMissingBasics = targetProductsToImport.some(
    (product) => !product.name || !product.sku || !product.description || !product.category || !product.brand
  );
  const hasNegativeStock = targetProductsToImport.some(
    (product) => product.stock < 0 || (product.variants?.some((v) => v.stock < 0) ?? false)
  );
  const ready = targetProductsToImport.length > 0 && !hasFatalErrors && !hasUnconfirmedPrices && !hasMissingBasics && !hasNegativeStock;
  const canInitiateImport = targetProductsToImport.length > 0 && !hasFatalErrors && !hasMissingBasics && !hasNegativeStock;

  const downloadTemplate = async (format: "xlsx" | "csv") => {
    try {
      setDownloadingFormat(format);
      setError("");
      const response = await fetch(`/api/admin/products/import/template?format=${format}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Gagal mengunduh template produk.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = format === "xlsx" ? "template-produk-next-solution.xlsx" : "template-produk-next-solution.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh template produk.");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setNotice("");
    setProducts([]);
    setSheetSummary(null);
    setFileName(file.name);

    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      setError("Ukuran file harus antara 1 byte dan maksimal 10 MB.");
      return;
    }

    const form = new FormData();
    form.set("file", file);

    try {
      const response = await fetch("/api/admin/products/import/preview", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "File gagal dibaca.");
      }
      const rawProducts: ImportedProduct[] = result.products || [];
      const initialized = rawProducts.map((p) => {
        let selPrice = p.selectedPriceColumn;
        if (!selPrice && p.priceCandidates?.length) {
          const valid = p.priceCandidates.find((c) => c.amount !== null && c.amount > 0);
          selPrice = valid ? valid.column : p.priceCandidates[0].column;
        } else if (!selPrice && p.price > 0) {
          selPrice = "price";
        }

        let selDiscount = p.selectedDiscountColumn;
        if (!selDiscount) {
          const validPromo = p.discountCandidates?.find(
            (c) => c.amount !== null && c.amount > 0 && c.amount < (p.price || 9999999999)
          );
          selDiscount = validPromo ? validPromo.column : "none";
        }

        return applyStockPolicyToProduct(
          {
            ...p,
            selectedPriceColumn: selPrice,
            selectedDiscountColumn: selDiscount,
          },
          p.stockPolicy || "keep_existing"
        );
      });
      setProducts(initialized);
      setGlobalStockPolicy("keep_existing");
      setStockAdjustmentDelta(0);
      setSheetSummary(result.summary?.sheetSummary || null);
      setNotice(
        `Preview berhasil: ${result.summary.productCount} produk ditemukan. Silakan periksa pemetaan kolom, konfirmasi harga, dan tindakan produk sebelum impor.`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "File gagal dibaca.");
    }
  };

  const executeFinalImport = (itemsToImport: ImportedProduct[]) =>
    startTransition(async () => {
      setError("");
      try {
        const result = await bulkImportAdminProductsAction(itemsToImport);
        await onImported();
        setNotice(`Sukses: ${result.count} produk berhasil disimpan ke katalog toko.`);
        setProducts([]);
        setSheetSummary(null);
        setFileName("");
        setOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impor produk ke database gagal.");
      }
    });

  const checkTaxonomiesAndExecute = async (targetToImport: ImportedProduct[]) => {
    const categoriesToCheck = [...new Set(targetToImport.map((p) => p.category?.trim()).filter(Boolean) as string[])];
    const brandsToCheck = [...new Set(targetToImport.map((p) => p.brand?.trim()).filter(Boolean) as string[])];

    try {
      const { missingCategories, missingBrands } = await getMissingImportTaxonomiesAction(
        categoriesToCheck,
        brandsToCheck
      );

      if (missingCategories.length > 0 || missingBrands.length > 0) {
        setMissingTaxonomyModal({
          categories: missingCategories,
          brands: missingBrands,
          onConfirm: () => {
            setMissingTaxonomyModal(null);
            executeFinalImport(targetToImport);
          },
        });
        return;
      }

      executeFinalImport(targetToImport);
    } catch {
      executeFinalImport(targetToImport);
    }
  };

  const showImportSummary = (targetToImport: ImportedProduct[]) => {
    const createCount = targetToImport.filter((p) => p.importAction === "create").length;
    const updateCount = targetToImport.filter((p) => p.importAction === "update").length;
    const consolidateCount = targetToImport.filter((p) => p.importAction === "consolidate").length;
    const skipCount = products.filter((p) => p.importAction === "skip").length;
    const totalUnits = targetToImport.reduce((sum, p) => sum + (p.stock || 0), 0);

    setImportSummaryModal({
      targetToImport,
      createCount,
      updateCount,
      consolidateCount,
      skipCount,
      totalUnits,
      stockPolicy: globalStockPolicy,
    });
  };

  const initiateImport = async () => {
    if (!canInitiateImport || busy) return;
    setError("");

    const targetToImport = targetProductsToImport;
    if (!targetToImport.length) {
      setError("Tidak ada produk yang dipilih untuk diimpor.");
      return;
    }

    // Jika masih ada harga yang belum dikonfirmasi, buka dialog pemilihan skema harga (Normal vs Promo)
    if (hasUnconfirmedPrices) {
      const unconfirmedCount = targetToImport.filter(
        (p) => !isValidImportPrices(p.price, p.discount_price) || !hasConfirmedImportPriceMapping(p)
      ).length;
      setPricingChoiceModal({
        targetCount: targetToImport.length,
        unconfirmedCount,
      });
      return;
    }

    showImportSummary(targetToImport);
  };

  const handleApplyPricingSchemeAndImport = (mode: "normal" | "promo") => {
    setPricingChoiceModal(null);

    const targetIndices = new Set(targetProductsToImport.map((p) => products.indexOf(p)));

    const updatedProducts = products.map((product, idx) => {
      if (!targetIndices.has(idx) || product.importAction === "skip") return product;
      return applyPricingModeToProduct(product, mode);
    });

    setProducts(updatedProducts);

    const updatedTargetToImport = isFiltered && importScope === "filtered"
      ? (() => {
          const filteredOriginalIndices = new Set(filteredProductItems.map((item) => item.originalIndex));
          return updatedProducts.filter((p, idx) => filteredOriginalIndices.has(idx) && p.importAction !== "skip");
        })()
      : updatedProducts.filter((p) => p.importAction !== "skip");

    setNotice(
      mode === "normal"
        ? `Skema Harga Normal Saja diterapkan untuk ${updatedTargetToImport.length} produk.`
        : `Skema Promo (+ Harga Normal) diterapkan untuk ${updatedTargetToImport.length} produk.`
    );

    showImportSummary(updatedTargetToImport);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        <FileUp className="mr-2 size-4" />
        Upload produk massal
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-import-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-5xl space-y-4 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-6"
          >
            {/* Header Dialog */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <h2 id="bulk-import-title" className="text-xl font-bold">
                  Upload Produk Massal
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Impor data produk dari file spreadsheet XLSX atau CSV. Dilengkapi deteksi otomatis pricelist Lenovo &amp; template resmi Next Solution Store.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate("xlsx")}
                  disabled={downloadingFormat !== null}
                >
                  {downloadingFormat === "xlsx" ? (
                    <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-1.5 size-4 text-emerald-600" />
                  )}
                  Download Template Excel (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadTemplate("csv")}
                  disabled={downloadingFormat !== null}
                  title="Template CSV klasik untuk teks generator"
                >
                  {downloadingFormat === "csv" ? (
                    <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 size-4" />
                  )}
                  Template CSV
                </Button>
              </div>
            </div>

            {/* Nav Tabs */}
            <div className="flex border-b text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                  activeTab === "upload"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileUp className="size-4" />
                Upload &amp; Preview
                {products.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {products.length}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("images")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                  activeTab === "images"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileArchive className="size-4" />
                Upload Foto (ZIP)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("guide")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                  activeTab === "guide"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Info className="size-4" />
                Panduan &amp; Batas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("columns")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                  activeTab === "columns"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="size-4" />
                Penjelasan 20 Kolom
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("faq")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                  activeTab === "faq"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <HelpCircle className="size-4" />
                FAQ
              </button>
            </div>

            {/* TAB 1: UPLOAD & PREVIEW */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                {/* Upload Action Area */}
                <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-center">
                  <input
                    ref={input}
                    type="file"
                    accept=".xlsx,.csv,.docx,.pdf"
                    className="sr-only"
                    onChange={(event) => {
                      void chooseFile(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileSpreadsheet className="size-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Pilih file spreadsheet produk</p>
                      <p className="text-xs text-muted-foreground">
                        Mendukung .xlsx, .csv, .docx (tabel), dan .pdf (tabel teks). Maksimal 10 MB atau 2.000 baris.
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => input.current?.click()}
                      >
                        {busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <FileUp className="mr-2 size-4" />}
                        Pilih File
                      </Button>
                      {fileName && (
                        <span className="max-w-xs truncate rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                          {fileName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                {notice && (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <p>{notice}</p>
                  </div>
                )}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {/* Sheet Summary if available */}
                {sheetSummary && (
                  <div className="rounded-xl border bg-muted/30 p-3 text-xs">
                    <p className="font-semibold text-foreground">
                      Hasil Analisis Lembar Kerja ({sheetSummary.totalTables} sheet/tabel ditemukan):
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sheetSummary.detectedSheets.map((sheet, i) => (
                        <span
                          key={`detected-${i}`}
                          className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="size-3" />
                          Worksheet &quot;{sheet.name}&quot;: {sheet.productCount} produk terdeteksi ({sheet.vendor})
                        </span>
                      ))}
                      {sheetSummary.skippedSheets.map((sheet, i) => (
                        <span
                          key={`skipped-${i}`}
                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-muted-foreground"
                          title={sheet.reason}
                        >
                          <Info className="size-3" />
                          Dilewati &quot;{sheet.name}&quot;: {sheet.reason}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product List */}
                {products.length > 0 && (
                  <div className="space-y-3.5">
                    {/* Top Badges & Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {products.length} produk terdeteksi
                        </Badge>
                        <Badge variant="outline" className="font-medium">
                          {targetProductsToImport.length} dipilih untuk impor
                          {isFiltered && importScope === "filtered" ? " (terfilter)" : ""}
                        </Badge>
                        {hasFatalErrors && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="size-3" /> Ada error validasi baris ({counts.errors})
                          </Badge>
                        )}
                        {hasUnconfirmedPrices ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1"
                          >
                            <Info className="size-3" />
                            {counts.unconfirmed} harga belum dikonfirmasi
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1">
                            <CheckCheck className="size-3" />
                            Semua harga terkonfirmasi ({targetProductsToImport.length})
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Preview belum menyimpan produk ke database toko.
                      </p>
                    </div>

                    {/* Filter & Bulk Actions Control Center */}
                    <div className="rounded-xl border bg-muted/20 p-3 space-y-3 shadow-2xs">
                      {/* Baris 1: Pencarian & Tombol Konfirmasi Semua */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="relative flex-1 min-w-[220px] max-w-md">
                          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama produk, SKU, atau MTM..."
                            className="h-8.5 w-full rounded-lg border bg-background pl-8 pr-7 text-xs outline-none focus:ring-1 focus:ring-primary"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              aria-label="Hapus pencarian"
                              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Kelompok Tombol Aksi Konfirmasi Massal */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Tombol Utama Adaptif Sesuai Filter Aktif */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => requestConfirmSegment(currentSegmentTarget)}
                            className="h-8.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                            title="Konfirmasi harga utama dan promo untuk target aktif dengan alert verifikasi"
                          >
                            <CheckCheck className="mr-1.5 size-4" />
                            {mainButtonLabel}
                          </Button>

                          {/* Tombol Dropdown Opsi Konfirmasi Cepat */}
                          <div className="relative">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                              className="h-8.5 px-2.5 text-xs text-foreground font-medium flex items-center gap-1"
                              title="Pilih segmen atau jenis konfirmasi lainnya"
                            >
                              <span>Opsi Cepat</span>
                              <ChevronDown className="size-3.5 text-muted-foreground" />
                            </Button>

                            {quickMenuOpen && (
                              <div
                                className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border bg-card p-1.5 text-xs shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-150"
                                onMouseLeave={() => setQuickMenuOpen(false)}
                              >
                                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Tentukan Produk untuk Diimpor
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    setSegmentImportAction("laptop", true);
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between text-emerald-600 dark:text-emerald-400"
                                >
                                  <span>Hanya Impor Laptop ({counts.laptop} - Lewati Lainnya)</span>
                                  <Laptop className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    setSegmentImportAction("desktop", true);
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between text-blue-600 dark:text-blue-400"
                                >
                                  <span>Hanya Impor Desktop ({counts.desktop} - Lewati Lainnya)</span>
                                  <Monitor className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    setSegmentImportAction("tablet", true);
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between text-purple-600 dark:text-purple-400"
                                >
                                  <span>Hanya Impor Tablet ({counts.tablet} - Lewati Lainnya)</span>
                                  <Tablet className="size-3" />
                                </button>
                                {isFiltered && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickMenuOpen(false);
                                      setSegmentImportAction("filtered", true);
                                    }}
                                    className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between text-primary font-semibold"
                                  >
                                    <span>Hanya Impor Terfilter ({filteredProductItems.length} - Lewati Lainnya)</span>
                                    <Filter className="size-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    setSegmentImportAction("all", false);
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between"
                                >
                                  <span>Aktifkan Semua Produk ({products.length})</span>
                                  <CheckCheck className="size-3 text-muted-foreground" />
                                </button>

                                <div className="border-t my-1 pt-1" />
                                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Konfirmasi Harga Massal
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    requestConfirmSegment("all");
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between"
                                >
                                  <span>Semua Produk ({products.length})</span>
                                  <Badge variant="secondary" className="text-[10px] h-4">Semua</Badge>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    requestConfirmSegment("desktop");
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between"
                                >
                                  <span>Hanya Desktop ({counts.desktop})</span>
                                  <Monitor className="size-3 text-muted-foreground" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    requestConfirmSegment("laptop");
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between"
                                >
                                  <span>Hanya Laptop ({counts.laptop})</span>
                                  <Laptop className="size-3 text-muted-foreground" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    requestConfirmSegment("tablet");
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between"
                                >
                                  <span>Hanya Tablet ({counts.tablet})</span>
                                  <Tablet className="size-3 text-muted-foreground" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    requestConfirmSegment("promo");
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors flex items-center justify-between"
                                >
                                  <span>Hanya Produk Promo ({counts.promo})</span>
                                  <Tag className="size-3 text-amber-600" />
                                </button>

                                {uniqueCategories.map((cat) => (
                                  <button
                                    key={`quick-${cat}`}
                                    type="button"
                                    onClick={() => {
                                      setQuickMenuOpen(false);
                                      requestConfirmSegment(cat);
                                    }}
                                    className="w-full rounded-lg px-2 py-1.5 text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors truncate"
                                  >
                                    Kategori &quot;{cat}&quot;
                                  </button>
                                ))}

                                <div className="border-t my-1 pt-1" />
                                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Koreksi Kolom Spesifik
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    requestCheckNormalPricesOnly(isFiltered ? "filtered" : "all");
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors text-blue-600 dark:text-blue-400"
                                >
                                  Gunakan Harga Normal Saja (Tanpa Promo)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    requestCheckPromoPricesOnly(isFiltered ? "filtered" : "all");
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium hover:bg-muted transition-colors text-amber-600 dark:text-amber-400"
                                >
                                  Gunakan Skema Promo (+ Harga Normal)
                                </button>

                                <div className="border-t my-1 pt-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMenuOpen(false);
                                    resetConfirmations("all");
                                  }}
                                  className="w-full rounded-lg px-2 py-1.5 text-left text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  Reset Semua Centang Konfirmasi
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Tombol Langsung: Gunakan Harga Normal Saja */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => requestCheckNormalPricesOnly(isFiltered ? "filtered" : "all")}
                            title="Gunakan dan konfirmasi seluruh harga normal (SRP/User), abaikan promo"
                            className="h-8.5 text-xs text-foreground font-medium"
                          >
                            <Tag className="mr-1 size-3 text-blue-600" />
                            Harga Normal Saja
                          </Button>

                          {/* Tombol Langsung: Gunakan Skema Promo */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => requestCheckPromoPricesOnly(isFiltered ? "filtered" : "all")}
                            title="Gunakan harga promo jika tersedia, dan harga normal untuk produk lainnya"
                            className="h-8.5 text-xs text-foreground font-medium"
                          >
                            <Tag className="mr-1 size-3 text-amber-600" />
                            Gunakan Promo
                          </Button>

                          {/* Tombol Reset Cepat */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => resetConfirmations("all")}
                            title="Reset seluruh centang konfirmasi harga ke status awal"
                            className="h-8.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="mr-1 size-3" />
                            Reset
                          </Button>
                        </div>
                      </div>

                      {/* Baris 2: Quick Filter Chips (Promo, Desktop, Laptop, Tablet, dll) */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                        <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                          <Filter className="size-3" /> Filter:
                        </span>

                        {/* Filter Tipe Cepat */}
                        <button
                          type="button"
                          onClick={() => setFilterType("all")}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            filterType === "all"
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-background border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          Semua ({products.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType(filterType === "desktop" ? "all" : "desktop")}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            filterType === "desktop"
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-background border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Monitor className="size-3" />
                          Desktop ({counts.desktop})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType(filterType === "laptop" ? "all" : "laptop")}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            filterType === "laptop"
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-background border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Laptop className="size-3" />
                          Laptop ({counts.laptop})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType(filterType === "tablet" ? "all" : "tablet")}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            filterType === "tablet"
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-background border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Tablet className="size-3" />
                          Tablet ({counts.tablet})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType(filterType === "promo" ? "all" : "promo")}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            filterType === "promo"
                              ? "bg-amber-600 text-white font-semibold"
                              : "bg-background border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Tag className="size-3" />
                          Promo Saja ({counts.promo})
                        </button>

                        {/* Dropdown Kategori Tambahan / Spesifik */}
                        {uniqueCategories.length > 0 && (
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            aria-label="Filter kategori spesifik"
                            className="h-7 rounded-lg border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary ml-auto sm:ml-1"
                          >
                            <option value="all">Kategori: Semua ({uniqueCategories.length})</option>
                            {uniqueCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                Kategori: {cat}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Dropdown Status Konfirmasi */}
                        <select
                          value={filterStatus}
                          onChange={(e) =>
                            setFilterStatus(e.target.value as "all" | "unconfirmed" | "ready" | "error" | "skip")
                          }
                          aria-label="Filter status produk"
                          className="h-7 rounded-lg border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="all">Status: Semua</option>
                          <option value="unconfirmed">Belum Dikonfirmasi ({counts.unconfirmed})</option>
                          <option value="ready">Siap Diimpor ({counts.ready})</option>
                          {counts.errors > 0 && <option value="error">Ada Error ({counts.errors})</option>}
                          <option value="skip">Dilewati</option>
                        </select>
                      </div>

                      {/* Baris 3: Status Filter Aktif & Aksi Batch Terfilter */}
                      {(filterType !== "all" ||
                        filterCategory !== "all" ||
                        filterStatus !== "all" ||
                        Boolean(searchQuery.trim())) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              Menampilkan <b>{filteredProductItems.length}</b> dari {products.length} produk
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setFilterType("all");
                                setFilterCategory("all");
                                setFilterStatus("all");
                                setSearchQuery("");
                              }}
                            >
                              <RotateCcw className="mr-1 size-3" />
                              Reset Filter
                            </Button>
                          </div>

                          {/* Opsi Ubah Tindakan Sekaligus untuk Produk yang Sedang Ditampilkan */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>Pilih untuk impor:</span>
                            <button
                              type="button"
                              onClick={() => setSegmentImportAction("filtered", true)}
                              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-500/20 transition-colors"
                              title="Hanya impor produk yang sedang difilter ini, otomatis set seluruh produk lainnya ke 'Lewati'"
                            >
                              Hanya {filteredProductItems.length} Ini (Lewati Lainnya)
                            </button>
                            <button
                              type="button"
                              onClick={() => bulkSetAction("skip")}
                              className="rounded border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                            >
                              Lewati {filteredProductItems.length} Ini
                            </button>
                            <button
                              type="button"
                              onClick={() => setSegmentImportAction("all", false)}
                              className="rounded border bg-background px-2 py-0.5 text-xs text-foreground hover:border-primary hover:text-primary transition-colors"
                            >
                              Aktifkan Semua ({products.length})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Baris Kebijakan Stok Sebelum Import */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Layers className="size-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Kebijakan Stok Sebelum Import</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {products.filter((p) => p.duplicateInDatabase || p.currentStock !== null).length} Produk Database
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex rounded-lg border bg-background p-0.5 text-xs shadow-sm">
                            <button
                              type="button"
                              onClick={() => applyStockPolicy("keep_existing")}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                globalStockPolicy === "keep_existing"
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              title="Stok lama tidak berubah (Pilihan default untuk re-import)"
                            >
                              Pertahankan Stok Saat Ini
                            </button>
                            <button
                              type="button"
                              onClick={() => applyStockPolicy("replace_with_file")}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                globalStockPolicy === "replace_with_file"
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              title="Stok diganti sesuai nilai yang tertera pada file"
                            >
                              Perbarui Sesuai Excel
                            </button>
                            <button
                              type="button"
                              onClick={() => applyStockPolicy("adjustment", stockAdjustmentDelta || 0)}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                globalStockPolicy === "adjustment"
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              title="Tambah atau kurangi stok dengan angka tertentu"
                            >
                              Penyesuaian (+ / -)
                            </button>
                          </div>
                          {globalStockPolicy === "adjustment" && (
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] font-medium text-muted-foreground">Delta:</label>
                              <input
                                type="number"
                                className="w-16 rounded border bg-background px-1.5 py-0.5 text-xs text-right font-semibold"
                                placeholder="0"
                                value={stockAdjustmentDelta}
                                onChange={(e) => {
                                  const delta = parseInt(e.target.value, 10) || 0;
                                  setStockAdjustmentDelta(delta);
                                  applyStockPolicy("adjustment", delta);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {globalStockPolicy === "keep_existing" && "ℹ️ Stok produk/varian yang sudah ada di database dipertahankan (tidak berubah). Varian baru menggunakan nilai file atau 0."}
                        {globalStockPolicy === "replace_with_file" && "⚠️ Stok diperbarui sesuai angka kolom stok di file. Jika baris produk lama kosong di file, stok lama tetap dipertahankan."}
                        {globalStockPolicy === "adjustment" && `🔄 Seluruh stok produk dan varian disesuaikan sebesar ${stockAdjustmentDelta >= 0 ? `+${stockAdjustmentDelta}` : stockAdjustmentDelta}. Stok akhir divalidasi tidak negatif.`}
                        {globalStockPolicy === "manual" && "✏️ Mode edit manual: Anda dapat mengedit stok tiap produk atau varian langsung di tabel preview di bawah."}
                      </p>
                    </div>

                    {/* Scrollable Cards Container */}
                    <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                      {filteredProductItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10 space-y-2">
                          <Filter className="mx-auto size-8 text-muted-foreground/50" />
                          <p className="font-semibold text-sm">Tidak ada produk yang cocok</p>
                          <p className="text-xs text-muted-foreground">
                            Tidak ditemukan produk dengan kombinasi filter atau kata kunci saat ini.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setFilterType("all");
                              setFilterCategory("all");
                              setFilterStatus("all");
                              setSearchQuery("");
                            }}
                          >
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Tampilkan Semua Produk
                          </Button>
                        </div>
                      ) : (
                        filteredProductItems.map(({ product, originalIndex }) => (
                          <article
                            key={`${product.sku}-${originalIndex}`}
                            className={`space-y-3 rounded-xl border p-3 transition-colors ${
                              product.importAction === "skip"
                                ? "bg-muted/30 opacity-70"
                                : product.errors?.length
                                ? "border-destructive/40 bg-destructive/5"
                                : "bg-card"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold">
                                    {product.name || <span className="text-destructive">(Nama produk kosong)</span>}{" "}
                                    <span className="font-normal text-muted-foreground">
                                      · {product.sku || <span className="text-destructive">SKU kosong</span>}
                                    </span>
                                  </p>
                                  {product.importAction === "consolidate" ? (
                                    <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px]">
                                      Konsolidasi
                                    </Badge>
                                  ) : product.importAction === "update" ? (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Update
                                    </Badge>
                                  ) : product.importAction === "skip" ? (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                      Lewati
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">
                                      Baru
                                    </Badge>
                                  )}
                                  {product.variants?.length > 0 && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                      {product.variants.length} Varian
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Baris sumber: {product.sourceRow ?? "template"} · {product.specifications.length} spesifikasi
                                  {product.variants?.length > 0 && ` · Total Stok Varian: ${product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)}`}
                                </p>
                              </div>
                              <label className="text-xs font-medium">
                                Tindakan:
                                <select
                                  className="ml-2 rounded-md border bg-background p-1 text-xs"
                                  value={product.importAction ?? "create"}
                                  onChange={(event) =>
                                    update(originalIndex, {
                                      importAction: event.target.value as ImportedProduct["importAction"],
                                    })
                                  }
                                >
                                  <option value="create" disabled={Boolean(product.duplicateInDatabase && !product.consolidationInfo)}>
                                    Produk baru
                                  </option>
                                  <option value="update" disabled={!product.targetProductId}>
                                    Update produk cocok
                                  </option>
                                  {product.consolidationInfo && (
                                    <option value="consolidate">
                                      Konsolidasi ({product.consolidationInfo.separateProductCount} produk lama)
                                    </option>
                                  )}
                                  <option value="skip">Lewati</option>
                                </select>
                              </label>
                            </div>

                            {/* Banner Opsi Konsolidasi */}
                            {product.consolidationInfo && (
                              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold flex items-center gap-1.5">
                                    <FolderPlus className="size-4 text-amber-600" />
                                    Opsi Konsolidasi Tersedia
                                  </span>
                                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">
                                    {product.consolidationInfo.separateProductCount} Produk Terpisah
                                  </Badge>
                                </div>
                                <p className="mt-1">
                                  {product.consolidationInfo.separateProductCount} produk lama di database (SKU: {product.consolidationInfo.matchedProducts.map((p) => p.sku).join(", ")}) terdeteksi cocok dengan varian produk ini. Memilih tindakan <b>Konsolidasi</b> akan menyatukannya ke dalam produk induk ini tanpa menghapus histori pesanan.
                                </p>
                              </div>
                            )}

                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              <label className="text-xs">
                                Nama Produk
                                <input
                                  className="mt-1 w-full rounded border bg-background p-1.5 text-xs"
                                  value={product.name}
                                  onChange={(event) => update(originalIndex, { name: event.target.value })}
                                />
                              </label>
                              <label className="text-xs">
                                SKU / MTM
                                <input
                                  className="mt-1 w-full rounded border bg-background p-1.5 text-xs"
                                  value={product.sku}
                                  onChange={(event) => update(originalIndex, { sku: event.target.value })}
                                />
                              </label>
                              <label className="text-xs">
                                Brand
                                <input
                                  className="mt-1 w-full rounded border bg-background p-1.5 text-xs"
                                  value={product.brand}
                                  onChange={(event) => update(originalIndex, { brand: event.target.value })}
                                />
                              </label>
                              <label className="text-xs">
                                Kategori
                                <input
                                  className="mt-1 w-full rounded border bg-background p-1.5 text-xs"
                                  value={product.category}
                                  onChange={(event) => update(originalIndex, { category: event.target.value })}
                                />
                              </label>
                            </div>

                            <label className="block text-xs">
                              Deskripsi
                              <textarea
                                className="mt-1 w-full rounded border bg-background p-1.5 text-xs"
                                rows={2}
                                value={product.description}
                                onChange={(event) => update(originalIndex, { description: event.target.value })}
                              />
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {/* Main Price */}
                              <div className="rounded-lg bg-muted/40 p-2.5">
                                <p className="mb-1.5 text-xs font-semibold">Harga User / SRP (Harga Utama)</p>
                                {product.priceCandidates?.map((candidate, candidateIndex) => (
                                  <label
                                    key={`${candidate.column}-${candidateIndex}`}
                                    className="mb-1 flex items-center gap-1.5 text-xs cursor-pointer"
                                  >
                                    <input
                                      type="radio"
                                      name={`price-${originalIndex}`}
                                      checked={product.selectedPriceColumn === candidate.column}
                                      onChange={() => {
                                        const newPrice = candidate.amount ?? -1;
                                        update(originalIndex, {
                                          price: newPrice,
                                          selectedPriceColumn: candidate.column,
                                          priceConfirmed: Boolean(candidate.column && newPrice > 0),
                                          ...(!product.discountPriceConfirmed
                                            ? {
                                                selectedDiscountColumn: product.selectedDiscountColumn || "none",
                                                discount_price:
                                                  product.selectedDiscountColumn === "none" ? null : product.discount_price,
                                                discountPriceConfirmed: true,
                                              }
                                            : {}),
                                        });
                                      }}
                                    />
                                    <span>
                                      {candidate.column}: <b>{candidate.raw}</b>
                                    </span>
                                  </label>
                                ))}
                                {!product.priceCandidates?.length && (
                                  <p className="text-xs text-destructive">Harga User/SRP tidak ditemukan.</p>
                                )}
                                <label className="mt-2 flex items-center gap-2 border-t pt-2 text-xs font-medium cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={product.priceConfirmed ?? false}
                                    disabled={!product.selectedPriceColumn || product.price <= 0}
                                    onChange={(event) => {
                                      const isChecked = event.target.checked;
                                      update(originalIndex, {
                                        priceConfirmed: isChecked,
                                        ...(isChecked && !product.discountPriceConfirmed
                                          ? {
                                              selectedDiscountColumn: product.selectedDiscountColumn || "none",
                                              discount_price:
                                                product.selectedDiscountColumn === "none" ? null : product.discount_price,
                                              discountPriceConfirmed: true,
                                            }
                                          : {}),
                                      });
                                    }}
                                  />
                                  Saya mengonfirmasi harga utama Rp {Number(product.price).toLocaleString("id-ID")}
                                </label>
                              </div>

                              {/* Discount Price */}
                              <div className="rounded-lg bg-muted/40 p-2.5">
                                <p className="mb-1.5 text-xs font-semibold">Harga Promo / Diskon (Opsional)</p>
                                {product.discountCandidates?.map((candidate, candidateIndex) => (
                                  <label
                                    key={`${candidate.column}-${candidateIndex}`}
                                    className="mb-1 flex items-center gap-1.5 text-xs cursor-pointer"
                                  >
                                    <input
                                      type="radio"
                                      name={`promo-${originalIndex}`}
                                      checked={product.selectedDiscountColumn === candidate.column}
                                      onChange={() =>
                                        update(originalIndex, {
                                          discount_price: candidate.amount,
                                          selectedDiscountColumn: candidate.column,
                                          discountPriceConfirmed: Boolean(
                                            candidate.amount !== null &&
                                            candidate.amount > 0 &&
                                            candidate.amount < product.price
                                          ),
                                        })
                                      }
                                    />
                                    <span>
                                      {candidate.column}: <b>{candidate.raw}</b>
                                    </span>
                                  </label>
                                ))}
                                <label className="mb-1 flex items-center gap-1.5 text-xs cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`promo-${originalIndex}`}
                                    checked={!product.selectedDiscountColumn || product.selectedDiscountColumn === "none"}
                                    onChange={() =>
                                      update(originalIndex, {
                                        discount_price: null,
                                        selectedDiscountColumn: "none",
                                        discountPriceConfirmed: true,
                                      })
                                    }
                                  />
                                  <span>Tidak ada harga promo</span>
                                </label>

                                <label className="mt-2 flex items-center gap-2 border-t pt-2 text-xs font-medium cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={product.discountPriceConfirmed ?? false}
                                    disabled={
                                      (!product.selectedDiscountColumn || product.selectedDiscountColumn === "none")
                                        ? false
                                        : (!product.discount_price ||
                                            product.discount_price <= 0 ||
                                            product.discount_price >= product.price)
                                    }
                                    onChange={(event) =>
                                      update(originalIndex, { discountPriceConfirmed: event.target.checked })
                                    }
                                  />
                                  Saya mengonfirmasi{" "}
                                  {!product.selectedDiscountColumn ||
                                  product.selectedDiscountColumn === "none" ||
                                  !product.discount_price
                                    ? "tanpa harga promo"
                                    : `promo Rp ${Number(product.discount_price ?? 0).toLocaleString("id-ID")}`}
                                </label>
                                {product.discountCandidates?.some(
                                  (candidate) =>
                                    candidate.amount === null ||
                                    candidate.amount <= 0 ||
                                    candidate.amount >= product.price
                                ) &&
                                  product.selectedDiscountColumn !== "none" && (
                                    <p className="mt-1 text-xs text-destructive">
                                      Harga promo harus bernilai positif dan lebih rendah dari harga utama.
                                    </p>
                                  )}
                              </div>
                            </div>

                            {/* Product Variants Table */}
                            {product.variants && product.variants.length > 0 ? (
                              <div className="rounded-lg border bg-card/60 p-2.5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-foreground">
                                      Daftar Varian Produk ({product.variants.length})
                                    </span>
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                      Total Stok Induk: {product.stock}
                                    </span>
                                    <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                      Stok di File: {product.fileStock != null ? `${product.fileStock} unit` : "Tidak ada di file"}
                                    </span>
                                    {product.currentStock != null && (
                                      <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                        Stok DB: {product.currentStock} unit
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground">
                                    Setiap varian memiliki MTM/SKU, harga, dan stok mandiri (Stok Induk = total stok varian)
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/50 text-[11px] text-muted-foreground">
                                      <tr>
                                        <th className="p-1.5 font-medium">Warna</th>
                                        <th className="p-1.5 font-medium">RAM / Storage</th>
                                        <th className="p-1.5 font-medium">SKU / MTM Varian</th>
                                        <th className="p-1.5 font-medium text-right">Harga Varian</th>
                                        <th className="p-1.5 font-medium text-right">Promo Varian</th>
                                        <th className="p-1.5 font-medium text-center">Stok DB</th>
                                        <th className="p-1.5 font-medium text-center">Stok File</th>
                                        <th className="p-1.5 font-medium text-center">Stok Akhir</th>
                                        <th className="p-1.5 font-medium">Keterangan</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                      {product.variants.map((v, vIdx) => (
                                        <tr key={`${v.sku || vIdx}-${vIdx}`} className="hover:bg-muted/20">
                                          <td className="p-1.5 font-medium text-foreground">
                                            {v.color || <span className="text-muted-foreground italic">Standar</span>}
                                          </td>
                                          <td className="p-1.5 text-muted-foreground">
                                            {[v.ram, v.storage].filter(Boolean).join(" / ") || "-"}
                                          </td>
                                          <td className="p-1.5 font-mono text-[11px] text-foreground font-semibold">
                                            {v.sku || <span className="text-muted-foreground italic">Auto</span>}
                                          </td>
                                          <td className="p-1.5 text-right font-medium">
                                            {v.price != null
                                              ? `Rp ${Number(v.price).toLocaleString("id-ID")}`
                                              : `Rp ${Number(product.price).toLocaleString("id-ID")}`}
                                          </td>
                                          <td className="p-1.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                            {v.discount_price != null ? `Rp ${Number(v.discount_price).toLocaleString("id-ID")}` : "-"}
                                          </td>
                                          <td className="p-1.5 text-center text-muted-foreground font-mono text-xs">
                                            {v.currentStock != null ? v.currentStock : <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30">Baru</Badge>}
                                          </td>
                                          <td className="p-1.5 text-center text-muted-foreground font-mono text-xs">
                                            {v.fileStock != null ? v.fileStock : <span className="text-amber-600 dark:text-amber-400 italic text-[10px]">Tidak ada di file</span>}
                                          </td>
                                          <td className="p-1.5 text-center">
                                            <input
                                              type="number"
                                              min={0}
                                              value={v.stock}
                                              onChange={(e) => updateVariantStock(originalIndex, vIdx, Number(e.target.value))}
                                              className="w-16 rounded border bg-background px-1.5 py-0.5 text-center text-xs font-semibold"
                                            />
                                          </td>
                                          <td className="p-1.5 text-[11px] text-muted-foreground">
                                            {v.isNewVariant && (
                                              <span className="inline-block mr-1 rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-semibold text-emerald-600">
                                                Varian Baru
                                              </span>
                                            )}
                                            <span>{v.stockChangeReason || (v.currentStock != null && v.stock === v.currentStock ? "Tetap" : "Disesuaikan")}</span>
                                            {v.warnings?.map((w, wi) => (
                                              <span key={wi} className="text-amber-600 dark:text-amber-400 block text-[10px]">⚠️ {w}</span>
                                            ))}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border bg-muted/20 p-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <span className="text-muted-foreground block text-[11px]">Stok Database:</span>
                                      <span className="font-semibold text-foreground font-mono">
                                        {product.currentStock != null ? `${product.currentStock} unit` : <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">Produk Baru</Badge>}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block text-[11px]">Stok di File:</span>
                                      <span className="font-semibold text-foreground font-mono">
                                        {product.fileStock != null ? `${product.fileStock} unit` : <span className="text-muted-foreground italic">Tidak ada di file</span>}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <label className="text-[11px] font-medium text-foreground">
                                      Stok Akhir:
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={product.stock}
                                      onChange={(e) => updateProductStock(originalIndex, Number(e.target.value))}
                                      className="w-20 rounded border bg-background px-2 py-1 text-center font-bold text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground">unit</span>
                                  </div>
                                </div>
                                {product.stockChangeReason && (
                                  <p className="mt-1.5 text-[11px] text-muted-foreground border-t pt-1">
                                    Status Stok: {product.stockChangeReason}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Details / Warnings / Errors */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Spesifikasi:{" "}
                                {product.specifications.map((spec) => `${spec.key}: ${spec.value}`).join(" · ") ||
                                  "tidak terbaca"}
                              </span>
                            </div>

                            {product.warnings?.map((warning, i) => (
                              <p
                                key={`w${i}`}
                                className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
                              >
                                <Info className="size-3.5 shrink-0" />
                                Peringatan: {warning}
                              </p>
                            ))}
                            {product.errors?.map((message, i) => (
                              <p key={`e${i}`} className="flex items-center gap-1 text-xs text-destructive">
                                <XCircle className="size-3.5 shrink-0" />
                                Error: {message}
                              </p>
                            ))}
                            {product.duplicateInDatabase && (
                              <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                <Info className="size-3.5 shrink-0" />
                                SKU cocok dengan produk di database; pilih &quot;Update produk cocok&quot; atau &quot;Lewati&quot;.
                              </p>
                            )}
                            {product.duplicateInFile && (
                              <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                <Info className="size-3.5 shrink-0" />
                                SKU muncul lebih dari sekali di file; baris duplikat perlu dilewati.
                              </p>
                            )}
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BULK UPLOAD FOTO (ZIP) */}
            {activeTab === "images" && (
              <BulkImageUploadTab onImagesImported={onImported} />
            )}

            {/* TAB: PANDUAN & ATURAN SKU */}
            {activeTab === "guide" && (
              <div className="space-y-5 text-sm">
                {/* 8 Langkah */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <h3 className="text-base font-semibold">1. Cara Menggunakan Fitur Mass Upload (8 Langkah)</h3>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
                    <li>
                      <b className="text-foreground">Download template resmi:</b> Unduh template Excel (.xlsx) dengan tombol di kanan atas.
                    </li>
                    <li>
                      <b className="text-foreground">Isi data produk:</b> Buka template dan lengkapi kolom yang dibutuhkan (nama, SKU, harga, kategori, brand).
                    </li>
                    <li>
                      <b className="text-foreground">Simpan dalam format didukung:</b> Simpan file dalam ekstensi .xlsx atau .csv.
                    </li>
                    <li>
                      <b className="text-foreground">Upload file:</b> Pilih file spreadsheet pada tab &quot;Upload &amp; Preview&quot;.
                    </li>
                    <li>
                      <b className="text-foreground">Periksa preview dan warning:</b> Tinjau baris data, status error merah, dan catatan peringatan kuning.
                    </li>
                    <li>
                      <b className="text-foreground">Periksa SKU, spesifikasi, serta sumber harga:</b> Pastikan harga User/SRP dan promo sesuai.
                    </li>
                    <li>
                      <b className="text-foreground">Pilih tindakan create, update, atau skip:</b> Tentukan apakah produk baru, diperbarui, atau dilewati.
                    </li>
                    <li>
                      <b className="text-foreground">Konfirmasi import dan periksa hasilnya:</b> Tekan tombol &quot;Konfirmasi impor&quot; untuk menyimpan ke katalog.
                    </li>
                  </ol>
                  <p className="mt-3 rounded bg-amber-500/10 p-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                    Catatan Penting: Tahap preview hanya membaca file di peramban dan belum mengubah database toko Anda.
                  </p>
                </div>

                {/* Aturan SKU */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <h3 className="text-base font-semibold">2. Aturan SKU / MTM &amp; Penanganan Konflik</h3>
                  <p className="mt-1 text-muted-foreground">
                    SKU (Stock Keeping Unit) atau MTM (Machine Type Model) adalah kode unik identifikasi produk. Tidak boleh ada dua produk dengan SKU yang sama di toko.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-card p-3">
                      <p className="font-semibold text-foreground">Produk Baru (Create)</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Digunakan ketika SKU belum terdaftar di database toko. Sistem akan membuat entitas produk dan varian baru.
                      </p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="font-semibold text-foreground">Update Produk Cocok</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Digunakan ketika SKU sudah terdaftar di database. Sistem akan memperbarui harga, stok, dan deskripsi produk lama.
                      </p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="font-semibold text-foreground">Lewati (Skip)</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Baris data diabaikan dan tidak dimasukkan ke database. Gunakan jika baris duplikat atau produk belum ingin dijual.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Format & Batas */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <h3 className="text-base font-semibold">3. Format File dan Batas Sistem Aktual</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                    <li><b>Format file yang didukung:</b> XLSX (semua worksheet), CSV (UTF-8), DOCX (tabel teks), dan PDF (tabel berbasis teks, bukan foto scan).</li>
                    <li><b>Batas ukuran file:</b> Maksimal 10 MB per berkas upload.</li>
                    <li><b>Batas baris data:</b> Maksimal 2.000 baris total per berkas.</li>
                    <li><b>Batas jumlah produk:</b> Maksimal 500 produk per satu kali impor.</li>
                    <li><b>Batas varian &amp; spesifikasi:</b> Maksimal 50 varian dan 50 poin spesifikasi per satu produk.</li>
                    <li><b>Master data toko:</b> Nama Brand dan Kategori wajib sudah dibuat terlebih dahulu di menu manajemen toko.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 3: PENJELASAN 20 KOLOM */}
            {activeTab === "columns" && (
              <div className="space-y-5 text-sm">
                <div>
                  <h3 className="text-base font-semibold">Penjelasan Header Kolom Importer Resmi (20 Kolom)</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Parser membaca kolom berikut (termasuk alias bahasa Indonesia dan format pabrikan Lenovo seperti TYPE, MTM, NEW PRICE USER/SRP).
                  </p>
                </div>

                <div className="max-h-[50vh] overflow-x-auto rounded-xl border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b bg-muted/50 font-semibold">
                      <tr>
                        <th className="p-2.5">Nama Kolom Resmi</th>
                        <th className="p-2.5">Sifat</th>
                        <th className="p-2.5">Fungsi &amp; Alias</th>
                        <th className="p-2.5">Contoh Nilai</th>
                        <th className="p-2.5">Kesalahan Umum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">product_name</td>
                        <td className="p-2.5 text-destructive font-semibold">Wajib</td>
                        <td className="p-2.5">Nama/model produk (Alias: TYPE, nama, nama_produk)</td>
                        <td className="p-2.5">AIO 24IRH9</td>
                        <td className="p-2.5 text-muted-foreground">Kolom dikosongkan</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">sku</td>
                        <td className="p-2.5 text-destructive font-semibold">Wajib</td>
                        <td className="p-2.5">Kode unik SKU / MTM pabrikan (Alias: MTM, product_sku)</td>
                        <td className="p-2.5">F0HN00Q3ID</td>
                        <td className="p-2.5 text-muted-foreground">SKU kosong atau duplikat tanpa update</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">description</td>
                        <td className="p-2.5 text-destructive font-semibold">Wajib</td>
                        <td className="p-2.5">Deskripsi produk di katalog (Alias: deskripsi)</td>
                        <td className="p-2.5">All-in-One PC 23.8 inci FHD Core i5</td>
                        <td className="p-2.5 text-muted-foreground">Kolom dikosongkan</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">price</td>
                        <td className="p-2.5 text-destructive font-semibold">Wajib</td>
                        <td className="p-2.5">Harga utama/SRP user (Alias: NEW PRICE USER/SRP, harga_user)</td>
                        <td className="p-2.5">12799000</td>
                        <td className="p-2.5 text-muted-foreground">Diisi 0, minus, atau salah ambil harga lama</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">discount_price</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Harga promo diskon (Alias: HARGA JUAL, promo_price)</td>
                        <td className="p-2.5">10800000</td>
                        <td className="p-2.5 text-muted-foreground">Lebih tinggi atau sama dengan harga utama</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">stock</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Stok awal produk (default 0)</td>
                        <td className="p-2.5">15</td>
                        <td className="p-2.5 text-muted-foreground">Angka negatif</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">category</td>
                        <td className="p-2.5 text-destructive font-semibold">Wajib</td>
                        <td className="p-2.5">Kategori produk yang terdaftar di toko</td>
                        <td className="p-2.5">Desktop</td>
                        <td className="p-2.5 text-muted-foreground">Kategori belum dibuat di admin</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">brand</td>
                        <td className="p-2.5 text-destructive font-semibold">Wajib</td>
                        <td className="p-2.5">Brand/merek yang terdaftar di toko</td>
                        <td className="p-2.5">Lenovo</td>
                        <td className="p-2.5 text-muted-foreground">Brand belum dibuat di admin</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">status</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Status tayang (published, draft, archived)</td>
                        <td className="p-2.5">published</td>
                        <td className="p-2.5 text-muted-foreground">Typo nilai status</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">is_best_seller</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Penanda produk terlaris (true / false)</td>
                        <td className="p-2.5">false</td>
                        <td className="p-2.5 text-muted-foreground">Bukan nilai boolean</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">is_new_arrival</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Penanda produk baru (true / false)</td>
                        <td className="p-2.5">true</td>
                        <td className="p-2.5 text-muted-foreground">Bukan nilai boolean</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">image_url</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">URL foto utama produk (https://...)</td>
                        <td className="p-2.5">https://.../foto.jpg</td>
                        <td className="p-2.5 text-muted-foreground">Path file lokal (C:\...)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">specifications</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Kombinasi spec atau KETERANGAN Lenovo</td>
                        <td className="p-2.5">Processor: Core i5; Garansi: 2 Tahun</td>
                        <td className="p-2.5 text-muted-foreground">Format titik dua terbalik</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">color</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Varian warna produk (Alias: warna)</td>
                        <td className="p-2.5">Luna Grey</td>
                        <td className="p-2.5 text-muted-foreground">-</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">ram</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Varian kapasitas RAM (Alias: memory)</td>
                        <td className="p-2.5">8GB</td>
                        <td className="p-2.5 text-muted-foreground">-</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">storage</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Varian penyimpanan (Alias: penyimpanan)</td>
                        <td className="p-2.5">512GB SSD</td>
                        <td className="p-2.5 text-muted-foreground">-</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">variant_sku</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">SKU unik varian produk</td>
                        <td className="p-2.5">F0HN00Q3ID-GRY</td>
                        <td className="p-2.5 text-muted-foreground">Sama persis dengan SKU induk</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">variant_price</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Harga reguler varian</td>
                        <td className="p-2.5">12799000</td>
                        <td className="p-2.5 text-muted-foreground">Angka negatif atau 0</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">variant_discount_price</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Harga promo varian</td>
                        <td className="p-2.5">10800000</td>
                        <td className="p-2.5 text-muted-foreground">Lebih besar dari harga varian</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-semibold">variant_stock</td>
                        <td className="p-2.5 text-muted-foreground">Opsional</td>
                        <td className="p-2.5">Stok varian produk</td>
                        <td className="p-2.5">5</td>
                        <td className="p-2.5 text-muted-foreground">Angka negatif</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Contoh Baris Tidak Valid */}
                <div className="rounded-xl border bg-destructive/5 p-4">
                  <h4 className="font-semibold text-destructive">Contoh Baris Tidak Valid yang Akan Ditolak:</h4>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
                    <li>
                      <b className="text-foreground">SKU Kosong:</b> TYPE = &quot;IdeaPad 1&quot;, MTM = &quot;&quot;, HARGA = 6500000.
                      <span className="text-destructive"> -&gt; Ditolak: SKU/MTM wajib ada untuk setiap produk.</span>
                    </li>
                    <li>
                      <b className="text-foreground">Harga Utama Nol / Negatif:</b> MTM = &quot;82R4000UID&quot;, NEW PRICE USER/SRP = 0.
                      <span className="text-destructive"> -&gt; Ditolak: Harga utama wajib bernilai lebih besar dari 0.</span>
                    </li>
                    <li>
                      <b className="text-foreground">Harga Promo Tidak Valid:</b> NEW PRICE USER = 12799000, HARGA JUAL = 13500000.
                      <span className="text-destructive"> -&gt; Ditolak: Harga promo harus lebih rendah dari harga utama.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: FAQ */}
            {activeTab === "faq" && (
              <div className="space-y-4 text-sm">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="font-semibold text-foreground">1. Kenapa file Excel gagal dibaca?</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pastikan file berformat <b>.xlsx</b> modern (bukan .xls lama), ukuran di bawah 10 MB, tidak diproteksi kata sandi, serta memiliki setidaknya satu lembar kerja tabel dengan kolom header produk yang dikenali (seperti <code>sku</code>, <code>price</code>, atau <code>MTM</code>).
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="font-semibold text-foreground">2. Kenapa produk tidak lolos preview?</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Produk akan ditandai error merah jika: nama kosong, SKU kosong, kategori/brand tidak cocok dengan daftar master di toko, atau harga bernilai 0. Periksa pesan error di bawah masing-masing kartu produk.
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="font-semibold text-foreground">3. Apa perbedaan harga utama dan harga promo?</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <b>Harga utama</b> (User SRP / price) adalah harga retail normal yang wajib diisi. <b>Harga promo</b> (HARGA JUAL / discount_price) bersifat opsional untuk diskon khusus dan harus selalu lebih murah dari harga utama serta memerlukan konfirmasi manual admin.
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="font-semibold text-foreground">4. Apa yang harus dilakukan jika MTM/SKU sudah terdaftar?</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pilih opsi <b>Update produk cocok</b> jika ingin memperbarui harga atau stok produk yang sudah ada di toko. Jika tidak ingin mengubah produk lama, pilih opsi <b>Lewati</b>.
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="font-semibold text-foreground">5. Kenapa produk belum langsung muncul di katalog pembeli?</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Produk baru yang diimpor menggunakan status bawaan <code>draft</code> atau memiliki stok 0 tidak akan ditampilkan pada halaman depan pembeli sampai admin mengubah statusnya menjadi <code>published</code> dan memastikan stok tersedia.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="space-y-1.5">
                {isFiltered && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-muted-foreground">Pilihan Target Impor:</span>
                    <button
                      type="button"
                      onClick={() => setImportScope("filtered")}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        importScope === "filtered"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Hanya {filterType !== "all" ? filterType.toUpperCase() : "TERFILTER"} (
                      {filteredProductItems.filter((i) => i.product.importAction !== "skip").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportScope("all")}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        importScope === "all"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Semua Produk File ({products.filter((p) => p.importAction !== "skip").length})
                    </button>
                  </div>
                )}

                {targetProductsToImport.length > 0 && hasFatalErrors && (
                  <p className="text-xs text-destructive">
                    Tidak dapat konfirmasi: Masih ada baris dengan pesan error merah. Perbaiki atau ubah tindakan ke &apos;Lewati&apos;.
                  </p>
                )}
                {targetProductsToImport.length > 0 && !hasFatalErrors && hasMissingBasics && (
                  <p className="text-xs text-destructive">
                    Tidak dapat konfirmasi: Pastikan nama, SKU, kategori, dan brand terisi lengkap.
                  </p>
                )}
                {targetProductsToImport.length > 0 && !hasFatalErrors && !hasMissingBasics && hasUnconfirmedPrices && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Info className="size-3.5" />
                    {counts.unconfirmed} harga belum dikonfirmasi. Tekan &quot;Konfirmasi impor&quot; untuk memilih skema (Normal / Promo) dalam 1 klik.
                  </p>
                )}
                {targetProductsToImport.length > 0 && ready && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    {targetProductsToImport.length} produk siap diimpor ke database katalog toko.
                  </p>
                )}
                {targetProductsToImport.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Tidak ada produk yang dipilih untuk diimpor pada lingkup ini.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
                  Tutup
                </Button>
                <Button
                  type="button"
                  disabled={busy || !canInitiateImport}
                  onClick={initiateImport}
                  className="min-w-36 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  {busy && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                  {busy ? "Mengimpor..." : `Konfirmasi impor (${targetProductsToImport.length})`}
                </Button>
              </div>
            </div>

            {/* Alert Dialog Pilihan Skema Harga (Normal vs Promo) */}
            {pricingChoiceModal && (
              <div
                className="fixed inset-0 z-[125] grid place-items-center bg-black/60 p-4 animate-in fade-in duration-200"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setPricingChoiceModal(null);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pricing-modal-title"
                  className="w-full max-w-xl flex flex-col rounded-2xl bg-card border shadow-2xl overflow-hidden max-h-[90vh]"
                >
                  <div className="flex items-start gap-3 p-5 sm:p-6 pb-4 border-b bg-muted/10">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Tag className="size-5" />
                    </div>
                    <div>
                      <h3 id="pricing-modal-title" className="text-lg font-bold text-foreground">
                        Pilih Skema Harga Produk
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Pilih bagaimana harga produk akan diunggah ke katalog toko untuk {pricingChoiceModal.targetCount} produk.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                    <div className="space-y-3">
                      {/* Pilihan 1: Harga Normal Saja */}
                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                          selectedPricingScheme === "normal"
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                            : "border-border/70 bg-card hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pricing_scheme_choice"
                          value="normal"
                          checked={selectedPricingScheme === "normal"}
                          onChange={() => setSelectedPricingScheme("normal")}
                          className="mt-0.5 size-4 text-primary"
                        />
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">Gunakan Harga Normal Saja</span>
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                              Tanpa Promo
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            Seluruh produk akan diunggah menggunakan <b>Harga Normal (SRP / Harga User)</b> dari file. Kolom diskon/promo diabaikan sehingga produk tampil dengan harga standar.
                          </p>
                        </div>
                      </label>

                      {/* Pilihan 2: Harga Promo + Normal */}
                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                          selectedPricingScheme === "promo"
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                            : "border-border/70 bg-card hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pricing_scheme_choice"
                          value="promo"
                          checked={selectedPricingScheme === "promo"}
                          onChange={() => setSelectedPricingScheme("promo")}
                          className="mt-0.5 size-4 text-primary"
                        />
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">Gunakan Harga Promo (+ Harga Normal)</span>
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              Promo Aktif
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            Produk yang memiliki kolom promo valid akan menampilkan <b>harga promo sebagai harga aktif</b>, dengan harga normal sebagai harga coret. Produk tanpa promo otomatis menggunakan harga normal.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                      <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <p>
                        Anda tidak perlu mencentang satu per satu. Sistem akan otomatis memvalidasi seluruh produk sesuai skema yang dipilih dan langsung melanjutkan proses impor.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 p-4 px-5 sm:px-6 border-t bg-muted/20 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPricingChoiceModal(null)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                      onClick={() => handleApplyPricingSchemeAndImport(selectedPricingScheme)}
                    >
                      <CheckCheck className="mr-1.5 size-4" />
                      Terapkan &amp; Lanjutkan
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Ringkasan & Konfirmasi Sebelum Simpan ke Katalog */}
            {importSummaryModal && (
              <div
                className="fixed inset-0 z-[125] grid place-items-center bg-black/60 p-4 animate-in fade-in duration-200"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setImportSummaryModal(null);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="summary-modal-title"
                  className="w-full max-w-xl flex flex-col rounded-2xl bg-card border shadow-2xl overflow-hidden max-h-[90vh]"
                >
                  <div className="flex items-start gap-3 p-5 sm:p-6 pb-4 border-b bg-muted/10">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h3 id="summary-modal-title" className="text-lg font-bold text-foreground">
                        Ringkasan Konfirmasi Impor Produk
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Periksa rincian data dan kebijakan stok sebelum dieksekusi ke katalog toko.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                    {/* Ringkasan Tindakan */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="rounded-xl border bg-muted/20 p-2.5 text-center">
                        <span className="text-[11px] text-muted-foreground block">Produk Baru</span>
                        <span className="text-lg font-bold text-emerald-600">{importSummaryModal.createCount}</span>
                      </div>
                      <div className="rounded-xl border bg-muted/20 p-2.5 text-center">
                        <span className="text-[11px] text-muted-foreground block">Update Cocok</span>
                        <span className="text-lg font-bold text-blue-600">{importSummaryModal.updateCount}</span>
                      </div>
                      <div className="rounded-xl border bg-muted/20 p-2.5 text-center">
                        <span className="text-[11px] text-muted-foreground block">Konsolidasi</span>
                        <span className="text-lg font-bold text-amber-600">{importSummaryModal.consolidateCount}</span>
                      </div>
                      <div className="rounded-xl border bg-muted/20 p-2.5 text-center">
                        <span className="text-[11px] text-muted-foreground block">Dilewati</span>
                        <span className="text-lg font-bold text-muted-foreground">{importSummaryModal.skipCount}</span>
                      </div>
                    </div>

                    {/* Kebijakan Stok yang Berlaku */}
                    <div className="rounded-xl border p-3.5 bg-background space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Kebijakan Stok:</span>
                        <Badge variant="secondary" className="font-semibold text-[11px]">
                          {importSummaryModal.stockPolicy === "keep_existing" && "Pertahankan Stok Database (Aman)"}
                          {importSummaryModal.stockPolicy === "replace_with_file" && "Perbarui Sesuai Excel"}
                          {importSummaryModal.stockPolicy === "adjustment" && `Penyesuaian Stok (${stockAdjustmentDelta >= 0 ? `+${stockAdjustmentDelta}` : stockAdjustmentDelta})`}
                          {importSummaryModal.stockPolicy === "manual" && "Edit Manual"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {importSummaryModal.stockPolicy === "keep_existing" &&
                          "Stok produk & varian yang sudah ada di database TIDAK akan berubah. Varian baru menggunakan nilai file atau 0."}
                        {importSummaryModal.stockPolicy === "replace_with_file" &&
                          "Stok produk & varian diganti dengan nilai kolom file Excel. Kolom kosong tidak men-nol-kan produk lama."}
                        {importSummaryModal.stockPolicy === "adjustment" &&
                          `Semua stok disesuaikan sebesar ${stockAdjustmentDelta >= 0 ? `+${stockAdjustmentDelta}` : stockAdjustmentDelta} unit.`}
                        {importSummaryModal.stockPolicy === "manual" &&
                          "Nilai stok yang disimpan adalah hasil kustomisasi langsung Anda di tabel preview."}
                      </p>
                      <div className="flex items-center justify-between border-t pt-2 text-muted-foreground font-mono">
                        <span>Total Stok Disimpan:</span>
                        <span className="font-bold text-foreground">{importSummaryModal.totalUnits} unit</span>
                      </div>
                    </div>

                    {/* Jaminan Keamanan Sistem */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCheck className="size-3.5" /> Jaminan Keamanan Database:
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px]">
                        <li>Histori transaksi, keranjang pelanggan, dan pesanan lama tetap utuh.</li>
                        <li>Produk tidak akan terduplikasi pada proses re-import file yang sama.</li>
                        <li>Stok induk otomatis disinkronkan dengan total stok varian tanpa double count.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 p-4 px-5 sm:px-6 border-t bg-muted/20 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setImportSummaryModal(null)}
                    >
                      Batal / Periksa Lagi
                    </Button>
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                      onClick={() => {
                        const target = importSummaryModal.targetToImport;
                        setImportSummaryModal(null);
                        void checkTaxonomiesAndExecute(target);
                      }}
                    >
                      <CheckCheck className="mr-1.5 size-4" />
                      Proses Impor Sekarang ({importSummaryModal.targetToImport.length} Produk)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Dialog Konfirmasi Cepat & Segmen */}
            {confirmModalConfig && (
              <div
                className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4 animate-in fade-in duration-200"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setConfirmModalConfig(null);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirm-modal-title"
                  className="w-full max-w-xl flex flex-col rounded-2xl bg-card border shadow-2xl overflow-hidden max-h-[90vh]"
                >
                  <div className="flex items-start gap-3 p-5 sm:p-6 pb-4 border-b bg-muted/10">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-5" />
                    </div>
                    <div>
                      <h3 id="confirm-modal-title" className="text-lg font-bold text-foreground">
                        {confirmModalConfig.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Pemberitahuan konfirmasi otomatis sebelum menyimpan ke daftar impor.
                      </p>
                      <span className="inline-block mt-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        {confirmModalConfig.badgeText} ({confirmModalConfig.affectedCount} Produk)
                      </span>
                    </div>
                  </div>

                  {/* Alert Notification Box */}
                  <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs space-y-2.5 text-amber-950 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <Info className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Pemberitahuan Sistem:</span>
                          <span>{confirmModalConfig.description}</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-background/80 p-3 space-y-1.5 border border-border/50 text-foreground">
                        <p className="font-semibold text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" /> Ketentuan Konfirmasi Otomatis:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-[11px]">
                          <li>
                            <b>Harga Normal:</b> Menggunakan kolom harga resmi SRP / Harga User dari file spreadsheet tanpa perubahan nominal.
                          </li>
                          <li>
                            <b>Harga Promo:</b> Jika file memiliki kolom diskon/promo yang valid di bawah harga utama, promo tersebut otomatis disetujui. Jika tidak ada kolom diskon, otomatis disetel <i>&quot;Tanpa harga promo&quot;</i>.
                          </li>
                          <li>
                            <b>Fleksibilitas Penuh:</b> Seluruh produk terpilih akan langsung siap di-push ke katalog. Namun Anda <b>tetap bebas</b> mengubah tindakan produk (<i>Produk Baru / Update / Lewati</i>) atau mengedit nominal harga per produk sebelum menekan tombol &quot;Konfirmasi impor&quot;.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 p-4 px-5 sm:px-6 border-t bg-muted/20 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmModalConfig(null)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                      onClick={confirmModalConfig.onConfirm}
                    >
                      <CheckCheck className="mr-1.5 size-4" />
                      Ya, Konfirmasi ({confirmModalConfig.affectedCount} Produk)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Dialog Kategori & Brand Baru Terdeteksi */}
            {missingTaxonomyModal && (
              <div
                className="fixed inset-0 z-[130] grid place-items-center bg-black/60 p-4 animate-in fade-in duration-200"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setMissingTaxonomyModal(null);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="missing-taxonomy-title"
                  className="w-full max-w-xl flex flex-col rounded-2xl bg-card border shadow-2xl overflow-hidden max-h-[90vh]"
                >
                  <div className="flex items-start gap-3 p-5 sm:p-6 pb-4 border-b bg-muted/10">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <FolderPlus className="size-5" />
                    </div>
                    <div>
                      <h3 id="missing-taxonomy-title" className="text-lg font-bold text-foreground">
                        Kategori &amp; Brand Baru Terdeteksi
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Pemberitahuan sebelum menambahkan kategori &amp; merk baru ke database toko.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs space-y-3 text-blue-950 dark:text-blue-200">
                      <div className="flex items-start gap-2">
                        <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Konfirmasi Pembuatan Kategori &amp; Brand:</span>
                          <span>
                            Sistem mendeteksi bahwa produk yang akan diimpor menggunakan kategori atau brand berikut yang saat ini belum terdaftar di database toko:
                          </span>
                        </div>
                      </div>

                      {missingTaxonomyModal.categories.length > 0 && (
                        <div className="rounded-lg bg-background/90 p-3 border border-border/50 text-foreground space-y-1.5">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                            <Layers className="size-3.5" /> Kategori Baru ({missingTaxonomyModal.categories.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {missingTaxonomyModal.categories.map((cat) => (
                              <span
                                key={cat}
                                className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs"
                              >
                                📁 {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {missingTaxonomyModal.brands.length > 0 && (
                        <div className="rounded-lg bg-background/90 p-3 border border-border/50 text-foreground space-y-1.5">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                            <Tag className="size-3.5" /> Brand / Merk Baru ({missingTaxonomyModal.brands.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {missingTaxonomyModal.brands.map((brand) => (
                              <span
                                key={brand}
                                className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs"
                              >
                                🏷️ {brand}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg bg-background/80 p-2.5 border border-border/50 text-foreground text-[11px] space-y-1">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Ketentuan Otomatis:
                        </p>
                        <p className="text-muted-foreground">
                          Jika Anda melanjutkan, sistem akan otomatis membuat kategori &amp; brand di atas beserta slug URL resmi sebelum mengimpor seluruh produk. Anda tidak perlu membuat kategori secara manual satu per satu.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 p-4 px-5 sm:px-6 border-t bg-muted/20 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMissingTaxonomyModal(null)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                      onClick={missingTaxonomyModal.onConfirm}
                    >
                      <CheckCheck className="mr-1.5 size-4" />
                      Ya, Buat Kategori/Brand &amp; Lanjutkan
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
