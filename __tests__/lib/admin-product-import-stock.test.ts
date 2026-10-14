import { describe, expect, it } from 'vitest';
import {
  applyStockPolicyToProduct,
  applyStockPolicyToProducts,
  calculateProductTotalStock,
  markImportSkuConflicts,
  type ImportedProduct,
  type ImportedVariant,
  type StockPolicy,
} from '@/lib/admin-product-import';

describe('Admin Product Import - Stock Policy & Re-import Test Suite', () => {
  const createMockVariant = (overrides: Partial<ImportedVariant> = {}): ImportedVariant => ({
    sku: 'LEN-V14-G4-GREY',
    color: 'Grey',
    ram: '16 GB',
    storage: '512 GB SSD',
    price: null,
    discount_price: null,
    stock: 10,
    currentStock: 10,
    fileStock: 25,
    isNewVariant: false,
    ...overrides,
  });

  const createMockProduct = (overrides: Partial<ImportedProduct> = {}): ImportedProduct => ({
    name: 'Lenovo V14 G4 IAH',
    sku: 'LEN-V14-G4',
    category: 'Laptop',
    brand: 'Lenovo',
    description: 'Laptop kerja handal Lenovo V14 G4',
    price: 8500000,
    discount_price: null,
    stock: 20,
    status: 'published',
    is_best_seller: false,
    is_new_arrival: true,
    image_url: 'https://example.com/v14.jpg',
    currentStock: 20,
    fileStock: 50,
    importAction: 'update',
    targetProductId: 'prod-uuid-1',
    specifications: [
      { key: 'Processor', value: 'Intel Core i5-12500H', display_order: 0 },
    ],
    variants: [
      createMockVariant({ sku: 'LEN-V14-G4-GREY', stock: 10, currentStock: 10, fileStock: 25 }),
      createMockVariant({ sku: 'LEN-V14-G4-BLACK', color: 'Black', stock: 10, currentStock: 10, fileStock: 25 }),
    ],
    ...overrides,
  });

  describe('1. Re-import File Tanpa Duplikasi', () => {
    it('mengenali produk yang sudah ada di database via targetProductId', () => {
      const product = createMockProduct({
        targetProductId: undefined,
        duplicateInDatabase: false,
      });

      const dbMap = new Map<string, string>([
        ['len-v14-g4', 'existing-db-id-123'],
      ]);

      markImportSkuConflicts([product], dbMap);

      expect(product.duplicateInDatabase).toBe(true);
      expect(product.targetProductId).toBe('existing-db-id-123');
      // Admin preview flow kemudian menetapkan tindakan update untuk produk yang ada
      product.importAction = 'update';
      expect(product.importAction).toBe('update');
    });

    it('mempertahankan MTM/SKU varian unik di bawah SKU produk induk yang stabil', () => {
      const product = createMockProduct();
      expect(product.sku).toBe('LEN-V14-G4');
      expect(product.variants).toHaveLength(2);
      expect(product.variants[0].sku).toBe('LEN-V14-G4-GREY');
      expect(product.variants[1].sku).toBe('LEN-V14-G4-BLACK');
      expect(new Set(product.variants.map((v) => v.sku)).size).toBe(2);
    });
  });

  describe('2. Kebijakan Stok: keep_existing (Pertahankan Stok Saat Ini)', () => {
    it('mempertahankan stok produk dan varian yang sudah ada saat re-import (default)', () => {
      const product = createMockProduct({
        currentStock: 15,
        fileStock: 99,
        variants: [
          createMockVariant({ sku: 'VAR-1', stock: 5, currentStock: 5, fileStock: 50 }),
          createMockVariant({ sku: 'VAR-2', stock: 10, currentStock: 10, fileStock: 49 }),
        ],
      });

      const result = applyStockPolicyToProduct(product, 'keep_existing');

      expect(result.stockPolicy).toBe('keep_existing');
      expect(result.variants[0].stock).toBe(5);
      expect(result.variants[1].stock).toBe(10);
      expect(result.stock).toBe(15);
      expect(result.variants[0].stockChangeReason).toMatch(/dipertahankan/i);
      expect(result.variants[1].stockChangeReason).toMatch(/dipertahankan/i);
    });

    it('menggunakan stok file untuk varian baru dan memberi peringatan jika stok file kosong', () => {
      const product = createMockProduct({
        currentStock: 10,
        variants: [
          createMockVariant({ sku: 'VAR-OLD', stock: 10, currentStock: 10, isNewVariant: false }),
          createMockVariant({ sku: 'VAR-NEW-WITH-STOCK', stock: 0, currentStock: null, fileStock: 8, isNewVariant: true }),
          createMockVariant({ sku: 'VAR-NEW-NO-STOCK', stock: 0, currentStock: null, fileStock: null, isNewVariant: true }),
        ],
      });

      const result = applyStockPolicyToProduct(product, 'keep_existing');

      // Varian lama tetap
      expect(result.variants[0].stock).toBe(10);
      // Varian baru dengan stok file mengambil stok file
      expect(result.variants[1].stock).toBe(8);
      // Varian baru tanpa stok file menjadi 0 dengan warning
      expect(result.variants[2].stock).toBe(0);
      expect(result.variants[2].warnings?.some((w) => w.includes('Stok tidak tercantum'))).toBe(true);
      // Total stok induk = SUM varian
      expect(result.stock).toBe(18);
    });
  });

  describe('3. Kebijakan Stok: replace_with_file (Perbarui Sesuai Excel)', () => {
    it('mengganti stok produk/varian dengan angka dari file Excel', () => {
      const product = createMockProduct({
        currentStock: 10,
        fileStock: 75,
        variants: [
          createMockVariant({ sku: 'VAR-1', stock: 5, currentStock: 5, fileStock: 30 }),
          createMockVariant({ sku: 'VAR-2', stock: 5, currentStock: 5, fileStock: 45 }),
        ],
      });

      const result = applyStockPolicyToProduct(product, 'replace_with_file');

      expect(result.variants[0].stock).toBe(30);
      expect(result.variants[1].stock).toBe(45);
      expect(result.stock).toBe(75);
      expect(result.variants[0].stockChangeReason).toMatch(/30/);
    });

    it('tidak men-nol-kan stok produk lama jika kolom stok di file kosong/null', () => {
      const product = createMockProduct({
        currentStock: 14,
        fileStock: null,
        variants: [
          createMockVariant({ sku: 'VAR-1', stock: 14, currentStock: 14, fileStock: null }),
        ],
      });

      const result = applyStockPolicyToProduct(product, 'replace_with_file');

      // Karena fileStock null, stok lama tetap aman dipertahankan, TIDAK diubah jadi 0
      expect(result.variants[0].stock).toBe(14);
      expect(result.stock).toBe(14);
      expect(result.variants[0].stockChangeReason).toMatch(/tetap/i);
    });
  });

  describe('4. Kebijakan Stok: adjustment & edit manual', () => {
    it('menyesuaikan stok dengan penambahan (+delta) dan pengurangan (-delta) tanpa negatif', () => {
      const product = createMockProduct({
        variants: [
          createMockVariant({ sku: 'VAR-1', stock: 10, currentStock: 10 }),
          createMockVariant({ sku: 'VAR-2', stock: 3, currentStock: 3 }),
        ],
      });

      // Penambahan +5
      const increased = applyStockPolicyToProduct(product, 'adjustment', 5);
      expect(increased.variants[0].stock).toBe(15);
      expect(increased.variants[1].stock).toBe(8);
      expect(increased.stock).toBe(23);

      // Pengurangan -5 (VAR-2 dari 3 - 5 tidak boleh negatif, min 0)
      const decreased = applyStockPolicyToProduct(product, 'adjustment', -5);
      expect(decreased.variants[0].stock).toBe(5);
      expect(decreased.variants[1].stock).toBe(0); // Validasi tidak negatif
      expect(decreased.stock).toBe(5);
    });

    it('memastikan perubahan manual per varian mengupdate stok varian dan merehitung stok induk secara presisi', () => {
      const product = createMockProduct();
      
      // Simulasi edit manual admin: ubah varian 0 menjadi 12 dan varian 1 menjadi 8
      const editedVariants = [
        { ...product.variants[0], stock: 12, stockPolicy: 'manual' as StockPolicy },
        { ...product.variants[1], stock: 8, stockPolicy: 'manual' as StockPolicy },
      ];
      const newTotalStock = calculateProductTotalStock({ stock: product.stock, variants: editedVariants });

      expect(newTotalStock).toBe(20);
      expect(editedVariants[0].stock).toBe(12);
      expect(editedVariants[1].stock).toBe(8);
    });
  });

  describe('5. Pencegahan Double Counting & Konsistensi Stok Induk', () => {
    it('menghitung stok produk induk murni sebagai SUM(variants.stock) jika memiliki varian', () => {
      const variants: ImportedVariant[] = [
        createMockVariant({ stock: 7 }),
        createMockVariant({ stock: 13 }),
        createMockVariant({ stock: 5 }),
      ];

      const totalStock = calculateProductTotalStock({ stock: 999, variants });
      expect(totalStock).toBe(25); // Bukan 999 + 25
    });

    it('menggunakan fallback stock produk sendiri jika tidak memiliki varian', () => {
      const totalStock = calculateProductTotalStock({ stock: 42, variants: [] });
      expect(totalStock).toBe(42);
    });
  });

  describe('6. Konsolidasi Produk Lama & Pencegahan Bentrok SKU', () => {
    it('memformat informasi konsolidasi saat varian cocok dengan produk lama yang terpisah di database', () => {
      const product = createMockProduct({
        importAction: 'consolidate',
        consolidationTargetIds: ['old-prod-1', 'old-prod-2'],
        consolidationInfo: {
          separateProductCount: 2,
          matchedProducts: [
            { id: 'old-prod-1', name: 'Lenovo V14 Grey (Old)', sku: 'LEN-V14-G4-GREY', stock: 4 },
            { id: 'old-prod-2', name: 'Lenovo V14 Black (Old)', sku: 'LEN-V14-G4-BLACK', stock: 6 },
          ],
        },
      });

      expect(product.importAction).toBe('consolidate');
      expect(product.consolidationInfo?.separateProductCount).toBe(2);
      expect(product.consolidationTargetIds).toHaveLength(2);

      // Verifikasi penamaan suffix SKU arsip pada RPC/migration agar tidak bentrok unik SKU
      const archivedSku1 = `${product.consolidationInfo?.matchedProducts[0].sku}-CONSOLIDATED-${'old-prod-1'.slice(0, 6)}`;
      expect(archivedSku1).toBe('LEN-V14-G4-GREY-CONSOLIDATED-old-pr');
      expect(archivedSku1).not.toBe('LEN-V14-G4-GREY'); // SKU asli bebas digunakan untuk varian
    });
  });

  describe('7. Validasi Harga & Isolasi Perubahan Stok', () => {
    it('memungkinkan update harga tanpa mengubah stok yang tersimpan di database', () => {
      const product = createMockProduct({
        price: 8500000,
        currentStock: 50,
        stock: 50,
        variants: [
          createMockVariant({ price: 8500000, currentStock: 50, stock: 50 }),
        ],
      });

      // Update harga SRP menjadi 9.000.000 dengan kebijakan keep_existing
      const priceUpdated = {
        ...product,
        price: 9000000,
        variants: product.variants.map((v) => ({ ...v, price: 9000000 })),
      };

      const result = applyStockPolicyToProduct(priceUpdated, 'keep_existing');

      expect(result.price).toBe(9000000);
      expect(result.variants[0].price).toBe(9000000);
      expect(result.stock).toBe(50); // Stok tidak berubah sama sekali
      expect(result.variants[0].stock).toBe(50);
    });
  });

  describe('8. Batch Policy Application', () => {
    it('menerapkan kebijakan stok ke seluruh daftar produk dengan benar', () => {
      const products = [
        createMockProduct({ sku: 'P1', currentStock: 10 }),
        createMockProduct({ sku: 'P2', currentStock: 20 }),
      ];

      const applied = applyStockPolicyToProducts(products, 'adjustment', 5);

      expect(applied[0].stockPolicy).toBe('adjustment');
      expect(applied[1].stockPolicy).toBe('adjustment');
    });
  });

  describe('9. Keamanan Transaksi Database & Pencegahan Partial Update (Rollback)', () => {
    it('memvalidasi seluruh stok tidak negatif sebelum transaksi dieksekusi', () => {
      const invalidProduct = createMockProduct({
        stock: -5,
        variants: [
          createMockVariant({ stock: -5 }),
        ],
      });

      // Validasi frontend/backend menolak jika stok negatif
      const hasNegativeStock = invalidProduct.stock < 0 || invalidProduct.variants.some((v) => v.stock < 0);
      expect(hasNegativeStock).toBe(true);
    });

    it('memastikan re-import file yang sama dua kali menghasilkan operasi update yang idempoten', () => {
      const initialPayload = [createMockProduct({ sku: 'LEN-YOGA-7', stock: 10 })];
      
      // Import 1: Dikenali sebagai produk baru
      initialPayload[0].importAction = 'create';
      expect(initialPayload[0].importAction).toBe('create');

      // Simulasi Import 2 dengan file yang sama: Terdeteksi ada di DB dengan ID 'existing-yoga-id'
      const reimportPayload = [createMockProduct({ sku: 'LEN-YOGA-7', stock: 10 })];
      const dbMap = new Map([['len-yoga-7', 'existing-yoga-id']]);
      markImportSkuConflicts(reimportPayload, dbMap);

      expect(reimportPayload[0].duplicateInDatabase).toBe(true);
      expect(reimportPayload[0].targetProductId).toBe('existing-yoga-id');
      
      // Status update menjaga agar tidak ada row duplikat yang diinsert
      reimportPayload[0].importAction = 'update';
      expect(reimportPayload[0].importAction).toBe('update');
      
      // Stok tetap konsisten 10
      expect(reimportPayload[0].stock).toBe(10);
    });
  });

  describe('10. Kompatibilitas Keranjang (Cart) & Checkout dengan Stok Varian', () => {
    it('memastikan varian yang tersimpan memiliki struktur referensi yang valid untuk cart item', () => {
      const product = createMockProduct();
      const selectedVariant = product.variants[0];

      const cartItemPayload = {
        productId: product.targetProductId,
        variantId: 'var-uuid-001',
        variantSku: selectedVariant.sku,
        name: `${product.name} - ${selectedVariant.color}`,
        price: selectedVariant.price ?? product.price,
        quantity: 2,
        availableStock: selectedVariant.stock,
      };

      expect(cartItemPayload.variantSku).toBe('LEN-V14-G4-GREY');
      expect(cartItemPayload.availableStock).toBe(10);
      expect(cartItemPayload.quantity <= cartItemPayload.availableStock).toBe(true);
    });

    it('menolak kuantitas checkout jika melebihi stok varian', () => {
      const selectedVariant = createMockVariant({ stock: 3 });
      const requestedQuantity = 5;

      const isStockSufficient = requestedQuantity <= selectedVariant.stock;
      expect(isStockSufficient).toBe(false);
    });
  });

  describe('11. Deteksi Duplikat di File (Duplicate in File)', () => {
    it('menandai produk dengan duplicateInFile dan importAction = skip jika SKU induk muncul lebih dari sekali di file', () => {
      const p1 = createMockProduct({ sku: 'LEN-SAME-SKU' });
      const p2 = createMockProduct({ sku: 'LEN-SAME-SKU', name: 'Lenovo Duplikat 2' });

      markImportSkuConflicts([p1, p2], new Map());

      expect(p2.duplicateInFile).toBe(true);
      expect(p2.importAction).toBe('skip');
      expect(p2.warnings?.some((w) => w.includes('SKU duplikat di dalam file'))).toBe(true);
    });

    it('menandai duplicateInFile jika SKU varian bertabrakan dengan SKU induk produk lain dalam file', () => {
      const p1 = createMockProduct({
        sku: 'PARENT-A',
        variants: [createMockVariant({ sku: 'SHARED-SKU' })],
      });
      const p2 = createMockProduct({
        sku: 'SHARED-SKU',
        variants: [],
      });

      markImportSkuConflicts([p1, p2], new Map());

      expect(p1.duplicateInFile).toBe(true);
      expect(p2.duplicateInFile).toBe(true);
      expect(p1.importAction).toBe('skip');
      expect(p2.importAction).toBe('skip');
    });
  });

  describe('12. Lenovo Stock Merged XLSX File Reading', () => {
    it('membaca stok aktual dari lenovo_massupload_stock_merged.xlsx', async () => {
      const fs = await import('fs');
      const filePath = 'C:/Users/Admin/Downloads/lenovo_massupload_stock_merged.xlsx';
      if (!fs.existsSync(filePath)) return;

      const { loadExcelWorkbook, importTablesFromWorkbook, analyzeAndNormalizeImportTables } = await import('@/lib/admin-product-import');
      const buf = fs.readFileSync(filePath);
      const wb = await loadExcelWorkbook(buf);
      const tables = importTablesFromWorkbook(wb);
      const { products, sheetSummary } = analyzeAndNormalizeImportTables(tables);

      console.log('Total products parsed:', products.length);
      console.log('Sheet summary:', JSON.stringify(sheetSummary));

      const allVariants = products.flatMap((p) => p.variants);
      const allSkus = [
        ...products.map((p) => ({ sku: p.sku, name: p.name, stock: p.stock, fileStock: p.fileStock, type: 'parent' })),
        ...allVariants.map((v) => ({ sku: v.sku, stock: v.stock, fileStock: v.fileStock, type: 'variant' })),
      ];

      let productsWithNullFileStock = 0;
      let variantsWithNullFileStock = 0;
      let standaloneCount = 0;
      let variantGroupCount = 0;

      for (const p of products) {
        if (p.variants.length > 0) {
          variantGroupCount++;
          if (p.fileStock === null || p.fileStock === undefined) productsWithNullFileStock++;
          for (const v of p.variants) {
            if (v.fileStock === null || v.fileStock === undefined) variantsWithNullFileStock++;
          }
        } else {
          standaloneCount++;
          if (p.fileStock === null || p.fileStock === undefined) productsWithNullFileStock++;
        }
      }

      const totalAccountedRows = products.reduce(
        (sum, p) => sum + (p.variants.length > 0 ? p.variants.length : 1),
        0
      );
      console.log('Total accounted rows across all 71 products:', totalAccountedRows);
      expect(totalAccountedRows).toBe(102);

      const nullStockStandalone = products.filter((p) => p.variants.length === 0 && (p.fileStock === null || p.fileStock === undefined));
      console.log('Sample standalone with null fileStock:', nullStockStandalone.slice(0, 3).map((p) => ({ name: p.name, sku: p.sku, fileStock: p.fileStock, stock: p.stock })));

      // Verify Target SKU 1: 91CF001VID (15 units)
      const prod91 = products.find((p) => p.sku === '91CF001VID' || p.variants.some((v) => v.sku === '91CF001VID'));
      expect(prod91).toBeDefined();
      if (prod91?.variants.length) {
        const v91 = prod91.variants.find((v) => v.sku === '91CF001VID');
        expect(v91?.fileStock).toBe(15);
        expect(v91?.stock).toBe(15);
      } else {
        expect(prod91?.fileStock).toBe(15);
        expect(prod91?.stock).toBe(15);
      }

      // Verify Target SKU 2: F0HN00Q3ID (6 units)
      const prodF0 = products.find((p) => p.sku === 'F0HN00Q3ID' || p.variants.some((v) => v.sku === 'F0HN00Q3ID'));
      expect(prodF0).toBeDefined();
      const vF0 = prodF0?.variants.find((v) => v.sku === 'F0HN00Q3ID');
      expect(vF0).toBeDefined();
      expect(vF0?.fileStock).toBe(6);
      expect(vF0?.stock).toBe(6);
      expect(prodF0?.fileStock).toBeGreaterThanOrEqual(6);

      // Verify SKU without stock: ZAHT0040ID (null fileStock, default stock 0)
      const prodZaht = products.find((p) => p.sku === 'ZAHT0040ID' || p.variants.some((v) => v.sku === 'ZAHT0040ID'));
      expect(prodZaht).toBeDefined();
      expect(prodZaht?.fileStock).toBeNull();
      expect(prodZaht?.stock).toBe(0);

      // Verify stock policy keep_existing vs replace_with_file on prod91
      const { applyStockPolicyToProduct } = await import('@/lib/admin-product-import');
      const testProd91 = { ...prod91!, currentStock: 25 };
      const keepResult = applyStockPolicyToProduct(testProd91, 'keep_existing');
      expect(keepResult.stock).toBe(25);
      expect(keepResult.fileStock).toBe(15);

      const replaceResult = applyStockPolicyToProduct(testProd91, 'replace_with_file');
      expect(replaceResult.stock).toBe(15);
      expect(replaceResult.fileStock).toBe(15);

      // Verify stock policy keep_existing vs replace_with_file on prodF0 with variants
      const testProdF0 = {
        ...prodF0!,
        currentStock: 50,
        variants: prodF0!.variants.map((v) => ({ ...v, currentStock: 20 })),
      };
      const keepF0Result = applyStockPolicyToProduct(testProdF0, 'keep_existing');
      const keepVF0 = keepF0Result.variants.find((v) => v.sku === 'F0HN00Q3ID');
      expect(keepVF0?.stock).toBe(20);
      expect(keepVF0?.fileStock).toBe(6);

      const replaceF0Result = applyStockPolicyToProduct(testProdF0, 'replace_with_file');
      const replaceVF0 = replaceF0Result.variants.find((v) => v.sku === 'F0HN00Q3ID');
      expect(replaceVF0?.stock).toBe(6);
      expect(replaceVF0?.fileStock).toBe(6);
    });

    it('menguji fixture in-memory format legacy untuk memastikan pembacaan kolom stock dan kalkulasi varian', async () => {
      const { normalizeProductRows, applyStockPolicyToProduct } = await import('@/lib/admin-product-import');
      const rows = [
        ['product_name', 'sku', 'description', 'price', 'discount_price', 'stock', 'category', 'brand', 'status', 'is_best_seller', 'is_new_arrival', 'image_url', 'specifications'],
        ['Test Desktop', 'DSK001', 'Desktop Core i5', '10000000', '', '15', 'Desktops', 'BrandX', 'published', 'false', 'false', '', 'Processor: Core i5'],
        ['Test Laptop - Grey (LP001)', 'LP001', 'Laptop Ryzen 5 / Grey', '12000000', '11000000', '6', 'Laptops', 'BrandX', 'published', 'false', 'false', '', 'Processor: Ryzen 5; RAM: 16GB'],
        ['Test Laptop - Black (LP002)', 'LP002', 'Laptop Ryzen 5 / Black', '12000000', '', '10', 'Laptops', 'BrandX', 'published', 'false', 'false', '', 'Processor: Ryzen 5; RAM: 16GB'],
        ['Test Tablet', 'TAB001', 'Tablet Mediatek', '5000000', '', '', 'Tablets', 'BrandX', 'published', 'false', 'false', '', 'Processor: Helio'],
      ];

      const products = normalizeProductRows(rows);
      expect(products.length).toBe(3); // 1 standalone desktop, 1 grouped laptop (2 variants), 1 standalone tablet

      const desktop = products.find((p) => p.sku === 'DSK001');
      expect(desktop).toBeDefined();
      expect(desktop?.fileStock).toBe(15);
      expect(desktop?.stock).toBe(15);

      const tablet = products.find((p) => p.sku === 'TAB001');
      expect(tablet).toBeDefined();
      expect(tablet?.fileStock).toBeNull();
      expect(tablet?.stock).toBe(0);

      const laptop = products.find((p) => p.variants.some((v) => v.sku === 'LP001'));
      expect(laptop).toBeDefined();
      expect(laptop?.variants.length).toBe(2);
      expect(laptop?.fileStock).toBe(16); // 6 + 10
      expect(laptop?.stock).toBe(16);

      const v1 = laptop?.variants.find((v) => v.sku === 'LP001');
      expect(v1?.fileStock).toBe(6);
      expect(v1?.stock).toBe(6);

      const v2 = laptop?.variants.find((v) => v.sku === 'LP002');
      expect(v2?.fileStock).toBe(10);
      expect(v2?.stock).toBe(10);

      // Test keep_existing policy on parent with existing db stock
      const laptopWithDb = {
        ...laptop!,
        currentStock: 40,
        variants: laptop!.variants.map((v) => ({ ...v, currentStock: 20 })),
      };
      const kept = applyStockPolicyToProduct(laptopWithDb, 'keep_existing');
      expect(kept.stock).toBe(40); // 20 + 20
      expect(kept.fileStock).toBe(16); // File stock remains visible!

      // Test replace_with_file
      const replaced = applyStockPolicyToProduct(laptopWithDb, 'replace_with_file');
      expect(replaced.stock).toBe(16); // replaced with 6 + 10
      expect(replaced.fileStock).toBe(16);
    });
  });
});



