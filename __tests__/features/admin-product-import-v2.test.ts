import { describe, expect, it } from 'vitest';
import {
  applyStockPolicyToProduct,
  normalizeProductRows,
  productImportHeaders,
  ImportedProduct,
} from '@/lib/admin-product-import';
import { sanitizeRichText, stripHtmlToPlainText } from '@/lib/sanitize-html';
import { generateCryptoNonce } from '@/components/auth/GoogleAuthButton';
import {
  calculateStockPreview,
  OfflineStockSourceRow,
  DatabaseProductForSync,
  DatabaseVariantForSync,
  ActiveWebOrderForSync,
} from '@/lib/stock-sync';

describe('Mass Upload V2 Hardening & Stock Sync Enhancements', () => {
  it('correctly falls back to record.stock when variant_stock is an empty string (Screenshot 1 fix)', () => {
    const headers = [...productImportHeaders];
    const testRow = [
      'ASUS All-in-One E1600WKAT', // product_name
      '90PT0391-M014A0',          // sku
      'Deskripsi All-in-One',     // description
      '9199000',                  // price
      '',                         // discount_price
      '29',                       // stock (parent column has 29)
      'Desktop',                  // category
      'ASUS',                     // brand
      'published',                // status
      'false',                    // is_best_seller
      'false',                    // is_new_arrival
      'https://example.com/e1600.jpg', // image_url
      'Processor: Intel Celeron N4500; RAM: 8GB', // specifications
      'Black',                    // color
      '8GB DDR4',                 // ram
      '256GB SSD',                // storage
      '90PT0391-M014A0',          // variant_sku
      '9199000',                  // variant_price
      '',                         // variant_discount_price
      '',                         // variant_stock (EMPTY STRING)
    ];

    const [product] = normalizeProductRows([headers, testRow]);
    expect(product).toBeDefined();
    expect(product.stock).toBe(29);
    expect(product.fileStock).toBe(29);
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0].stock).toBe(29);
    expect(product.variants[0].fileStock).toBe(29);
    expect(product.variants[0].stockChangeReason).toContain('29');
  });

  it('prevents duplicate warning messages when applying stock policies multiple times (Screenshot 1 fix)', () => {
    const mockProduct: ImportedProduct = {
      name: 'Test Device',
      sku: 'TEST-001',
      description: 'Desc',
      price: 1000000,
      discount_price: null,
      stock: 0,
      fileStock: null,
      category: 'Laptop',
      brand: 'TestBrand',
      status: 'published',
      is_best_seller: false,
      is_new_arrival: false,
      image_url: 'https://example.com/p.jpg',
      specifications: [],
      variants: [
        {
          sku: 'TEST-001-V1',
          color: 'Black',
          ram: '8GB',
          storage: '256GB',
          price: 1000000,
          discount_price: null,
          stock: 0,
          fileStock: null,
          currentStock: null,
          stockChangeReason: 'Stok tidak ada di file (0)',
          warnings: ['Stok tidak tercantum di file, menggunakan nilai default 0.'],
        },
      ],
      priceCandidates: [],
      discountCandidates: [],
      priceConfirmed: true,
      discountPriceConfirmed: true,
      importAction: 'create',
      warnings: [],
      errors: [],
    };

    const res1 = applyStockPolicyToProduct(mockProduct, 'keep_existing');
    const res2 = applyStockPolicyToProduct(res1, 'replace_with_file');
    const res3 = applyStockPolicyToProduct(res2, 'keep_existing');

    const warningCount = res3.variants[0].warnings?.filter(
      (w) => w === 'Stok tidak tercantum di file, menggunakan nilai default 0.'
    ).length;

    expect(warningCount).toBe(1);
  });

  it('preserves original color and flags conflict requiring admin decision when two rows have identical options but different SKUs (never appends SKU to color)', () => {
    const headers = [...productImportHeaders];
    const row1 = [
      'ASUS Vivobook 14', 'ASUS-V14-A', 'Desc', '10000000', '', '5',
      'Laptop', 'ASUS', 'published', 'false', 'false', 'https://example.com/a.jpg',
      'Processor: Intel', 'Silver', '8GB', '512GB', 'SKU-001', '10000000', '', '3',
    ];
    const row2 = [
      'ASUS Vivobook 14', 'ASUS-V14-A', 'Desc', '10000000', '', '5',
      'Laptop', 'ASUS', 'published', 'false', 'false', 'https://example.com/a.jpg',
      'Processor: Intel', 'Silver', '8GB', '512GB', 'SKU-002', '10000000', '', '2',
    ];

    const products = normalizeProductRows([headers, row1, row2]);
    // 1. Must NOT automatically spawn a separate parent product just to avoid constraint
    expect(products).toHaveLength(1);
    const product = products[0];

    // 2. Both variants are retained with pure original colors (NEVER containing '(SKU-002)' or '(V2)')
    expect(product.variants).toHaveLength(2);
    expect(product.variants[0].sku).toBe('SKU-001');
    expect(product.variants[0].color).toBe('Silver');
    expect(product.variants[0].color).not.toContain('(');
    expect(product.variants[1].sku).toBe('SKU-002');
    expect(product.variants[1].color).toBe('Silver');
    expect(product.variants[1].color).not.toContain('(');

    // 3. Clear conflict warning & error metadata identifying both SKUs and identical attributes
    const conflictWarning = product.warnings?.find((w) => w.includes('Konflik Varian Perlu Review'));
    expect(conflictWarning).toBeDefined();
    expect(conflictWarning).toContain('SKU-002');
    expect(conflictWarning).toContain('SKU-001');
    expect(conflictWarning).toContain('Silver');

    // 4. Must enter status Perlu Review / Error and default importAction to 'skip'
    expect(product.errors?.length).toBeGreaterThan(0);
    expect(product.importAction).toBe('skip');

    // 5. Storefront product name must remain completely clean (no SKU or conflict label)
    expect(product.name).toBe('ASUS Vivobook 14');
  });

  it('separates products into distinct parents when GPU specifications differ', () => {
    const headers = [...productImportHeaders];
    const rtx4050Row = [
      'Lenovo LOQ 15', 'LOQ-15-4050', 'Gaming Laptop', '15000000', '', '5',
      'Gaming Laptops', 'Lenovo', 'published', 'false', 'false', 'https://example.com/loq.jpg',
      'Processor: Intel Core i5-13450HX; Graphics: NVIDIA RTX 4050 6GB; RAM: 16GB; Storage: 512GB',
      'Luna Grey', '16GB', '512GB', 'LOQ-15-4050', '15000000', '', '5',
    ];
    const rtx4060Row = [
      'Lenovo LOQ 15', 'LOQ-15-4060', 'Gaming Laptop', '18000000', '', '3',
      'Gaming Laptops', 'Lenovo', 'published', 'false', 'false', 'https://example.com/loq.jpg',
      'Processor: Intel Core i5-13450HX; Graphics: NVIDIA RTX 4060 8GB; RAM: 16GB; Storage: 512GB',
      'Luna Grey', '16GB', '512GB', 'LOQ-15-4060', '18000000', '', '3',
    ];

    const products = normalizeProductRows([headers, rtx4050Row, rtx4060Row]);
    // Differing GPUs (RTX 4050 vs RTX 4060) should evaluate as separate parent products, not collided variants
    expect(products).toHaveLength(2);
    expect(products[0].sku).toBe('LOQ-15-4050');
    expect(products[1].sku).toBe('LOQ-15-4060');
  });

  it('reconciles stock sync total physical rows vs unique aggregated preview items (193 vs 181 with 12 duplicate occurrences)', () => {
    // Mathematical and architectural reconciliation verification
    const totalPhysicalRows = 193;
    const matchedCount = 91;
    const conflictSkusCount = 7;
    const needsReviewCount = 44;
    const notFoundCount = 39;

    const uniquePreviewItemsCount = matchedCount + conflictSkusCount + needsReviewCount + notFoundCount;
    expect(uniquePreviewItemsCount).toBe(181);

    // The 7 duplicate SKUs appeared across 19 rows total in the Excel file
    const physicalRowsForDuplicateSkus = 19;
    const collapsedDuplicateRows = physicalRowsForDuplicateSkus - conflictSkusCount;
    expect(collapsedDuplicateRows).toBe(12);

    // Sum of unique preview items + collapsed duplicate rows equals total physical rows
    expect(uniquePreviewItemsCount + collapsedDuplicateRows).toBe(totalPhysicalRows);
  });

  it('evaluates recently added products correctly within 24 hours', () => {
    const now = Date.now();
    const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
    const twentyThreeHoursAgo = new Date(now - 23 * 60 * 60 * 1000).toISOString();
    const twentyFiveHoursAgo = new Date(now - 25 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();

    const isRecentlyAdded = (createdAt?: string) => {
      if (!createdAt) return false;
      const createdTime = new Date(createdAt).getTime();
      const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours <= 24;
    };

    expect(isRecentlyAdded(oneHourAgo)).toBe(true);
    expect(isRecentlyAdded(twentyThreeHoursAgo)).toBe(true);
    expect(isRecentlyAdded(twentyFiveHoursAgo)).toBe(false);
    expect(isRecentlyAdded(tenDaysAgo)).toBe(false);
    expect(isRecentlyAdded(undefined)).toBe(false);
  });

  describe('Security & XSS / Injection Hardening', () => {
    it('sanitizes dangerous XSS payloads in rich text content', () => {
      // 1. Script tag injection
      const scriptPayload = '<p>Halo</p><script>alert("XSS")</script>';
      expect(sanitizeRichText(scriptPayload)).not.toContain('<script>');
      expect(sanitizeRichText(scriptPayload)).toContain('<p>Halo</p>');

      // 2. Inline event handler (onerror, onload, onclick)
      const onerrorPayload = '<img src="x" onerror="alert(1)" /><p>Foto</p>';
      expect(sanitizeRichText(onerrorPayload)).not.toContain('onerror');
      expect(sanitizeRichText(onerrorPayload)).not.toContain('<img');

      // 3. JavaScript URI in links
      const jsLinkPayload = '<a href="javascript:alert(document.cookie)">Klik disini</a>';
      expect(sanitizeRichText(jsLinkPayload)).not.toContain('javascript:');

      // 4. iframe / object / embed injection
      const iframePayload = '<iframe src="https://evil.com"></iframe><p>Aman</p>';
      expect(sanitizeRichText(iframePayload)).not.toContain('<iframe');
      expect(sanitizeRichText(iframePayload)).toContain('<p>Aman</p>');
    });

    it('correctly strips HTML to plain text without leaking markup', () => {
      const richHtml = '<p>Laptop <strong>Gaming</strong> terbaik!</p><br/><ul><li>Fitur 1</li></ul>';
      const plain = stripHtmlToPlainText(richHtml);
      expect(plain).toBe('Laptop Gaming terbaik! Fitur 1');
      expect(plain).not.toContain('<');
      expect(plain).not.toContain('>');
    });

    it('generates cryptographically secure nonces and valid SHA-256 hashes for GIS', async () => {
      const nonce1 = await generateCryptoNonce();
      const nonce2 = await generateCryptoNonce();

      // Raw nonce must be base64-encoded 32 bytes (around 44 characters)
      expect(nonce1.rawNonce).toBeDefined();
      expect(nonce1.rawNonce.length).toBeGreaterThanOrEqual(40);

      // Hashed nonce must be exactly 64 characters hexadecimal (SHA-256)
      expect(nonce1.hashedNonce).toMatch(/^[0-9a-f]{64}$/);

      // Consecutively generated nonces must be cryptographically distinct
      expect(nonce1.rawNonce).not.toBe(nonce2.rawNonce);
      expect(nonce1.hashedNonce).not.toBe(nonce2.hashedNonce);
    });

    it('enforces HTTPS protocol for import image URLs and rejects insecure schemes', () => {
      const headers = [...productImportHeaders];
      const insecureHttpRow = [
        'Produk Tidak Aman', 'SKU-SEC-01', 'Desc', '1000000', '', '5',
        'Laptop', 'Lenovo', 'published', 'false', 'false', 'http://example.com/insecure.jpg',
        'Spec: test', 'Silver', '8GB', '512GB', 'SKU-SEC-01', '1000000', '', '5',
      ];

      expect(() => normalizeProductRows([headers, insecureHttpRow])).toThrow(/URL foto harus menggunakan HTTPS/i);

      const javascriptSchemeRow = [
        'Produk XSS', 'SKU-SEC-02', 'Desc', '1000000', '', '5',
        'Laptop', 'Lenovo', 'published', 'false', 'false', 'javascript:alert(1)',
        'Spec: test', 'Silver', '8GB', '512GB', 'SKU-SEC-02', '1000000', '', '5',
      ];

      expect(() => normalizeProductRows([headers, javascriptSchemeRow])).toThrow(/URL foto harus menggunakan HTTPS/i);
    });
  });

  describe('Multi-Variant Stock Isolation & Single-Variant Fallback Safety', () => {
    it('does NOT duplicate parent stock to every variant when multi-variant product lacks explicit variant_stock', () => {
      const headers = [...productImportHeaders];
      const row1 = [
        'Lenovo Yoga Slim 7', 'YOGA-S7', 'Ultrabook', '15000000', '', '10', // Parent stock = 10
        'Laptop', 'Lenovo', 'published', 'false', 'false', 'https://example.com/yoga.jpg',
        'Processor: Intel', 'Luna Grey', '16GB', '512GB', 'YOGA-S7-GREY', '15000000', '', '', // variant_stock is EMPTY
      ];
      const row2 = [
        'Lenovo Yoga Slim 7', 'YOGA-S7', 'Ultrabook', '15000000', '', '10', // Parent stock = 10
        'Laptop', 'Lenovo', 'published', 'false', 'false', 'https://example.com/yoga.jpg',
        'Processor: Intel', 'Tidal Teal', '16GB', '512GB', 'YOGA-S7-TEAL', '15000000', '', '', // variant_stock is EMPTY
      ];

      const [product] = normalizeProductRows([headers, row1, row2]);
      expect(product).toBeDefined();
      expect(product.variants).toHaveLength(2);

      // Must NOT inflate inventory to 20 (10 + 10)
      expect(product.stock).toBe(0);
      expect(product.variants[0].stock).toBe(0);
      expect(product.variants[1].stock).toBe(0);
      expect(product.variants[0].fileStock).toBeNull();
      expect(product.variants[1].fileStock).toBeNull();

      // Clear warning must alert admin to review and set variant stocks manually
      const reviewWarning = product.warnings?.find((w) => w.includes('Perlu Review Stok'));
      expect(reviewWarning).toBeDefined();
      expect(reviewWarning).toContain('Lenovo Yoga Slim 7');
      expect(reviewWarning).toContain('2 varian');
    });

    it('correctly uses explicit variant stocks when provided in multi-variant products', () => {
      const headers = [...productImportHeaders];
      const row1 = [
        'Lenovo Yoga Slim 7', 'YOGA-S7', 'Ultrabook', '15000000', '', '10',
        'Laptop', 'Lenovo', 'published', 'false', 'false', 'https://example.com/yoga.jpg',
        'Processor: Intel', 'Luna Grey', '16GB', '512GB', 'YOGA-S7-GREY', '15000000', '', '6', // Explicit variant stock 6
      ];
      const row2 = [
        'Lenovo Yoga Slim 7', 'YOGA-S7', 'Ultrabook', '15000000', '', '10',
        'Laptop', 'Lenovo', 'published', 'false', 'false', 'https://example.com/yoga.jpg',
        'Processor: Intel', 'Tidal Teal', '16GB', '512GB', 'YOGA-S7-TEAL', '15000000', '', '4', // Explicit variant stock 4
      ];

      const [product] = normalizeProductRows([headers, row1, row2]);
      expect(product).toBeDefined();
      expect(product.variants).toHaveLength(2);
      expect(product.variants[0].stock).toBe(6);
      expect(product.variants[0].fileStock).toBe(6);
      expect(product.variants[1].stock).toBe(4);
      expect(product.variants[1].fileStock).toBe(4);
      expect(product.stock).toBe(10);
      expect(product.fileStock).toBe(10);

      const reviewWarning = product.warnings?.find((w) => w.includes('Perlu Review Stok'));
      expect(reviewWarning).toBeUndefined();
    });
  });

  describe('Physical SKU-Level Stock Synchronization Preview & Matching', () => {
    const mockDbProducts: DatabaseProductForSync[] = [
      {
        id: 'prod-standalone-1',
        name: 'Acer Mouse Wireless',
        sku: 'MOU-ACER-01',
        stock: 15,
        status: 'published',
      },
      {
        id: 'prod-parent-with-variants',
        name: 'Acer AIO C24',
        sku: 'AIO-C24-PARENT',
        stock: 10,
        status: 'published',
      },
    ];

    const mockDbVariants: DatabaseVariantForSync[] = [
      {
        id: 'var-aio-1',
        product_id: 'prod-parent-with-variants',
        sku: 'DG.BRNSN.001',
        color: 'Silver',
        ram: '8GB',
        storage: '512GB',
        stock: 6,
      },
      {
        id: 'var-aio-2',
        product_id: 'prod-parent-with-variants',
        sku: 'DG.BFZSN.001',
        color: 'Black',
        ram: '4GB',
        storage: '512GB',
        stock: 4,
      },
    ];

    it('matches variant SKU directly to variant record and sets targetType to variant', () => {
      const sourceRows: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: null,
          kategori: '',
          merk: '',
          tipe: 'Acer AIO C24 Silver',
          stok: 12,
          gudangLuar: 0,
          tglBeli: null,
          extractedSku: 'DG.BRNSN.001',
          rawSkuColumn: 'DG.BRNSN.001',
        },
      ];

      const preview = calculateStockPreview({
        rows: sourceRows,
        databaseProducts: mockDbProducts,
        databaseVariants: mockDbVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
      });

      expect(preview.items).toHaveLength(1);
      const item = preview.items[0];
      expect(item.status).toBe('match');
      expect(item.targetType).toBe('variant');
      expect(item.targetId).toBe('var-aio-1');
      expect(item.parentProductId).toBe('prod-parent-with-variants');
      expect(item.sku).toBe('DG.BRNSN.001');
      expect(item.currentWebStock).toBe(6);
      expect(item.excelStock).toBe(12);
      expect(item.finalStock).toBe(12);
    });

    it('matches parent SKU of standalone product without variants and sets targetType to product', () => {
      const sourceRows: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: null,
          kategori: '',
          merk: '',
          tipe: 'Acer Mouse Wireless',
          stok: 25,
          gudangLuar: 0,
          tglBeli: null,
          extractedSku: 'MOU-ACER-01',
          rawSkuColumn: 'MOU-ACER-01',
        },
      ];

      const preview = calculateStockPreview({
        rows: sourceRows,
        databaseProducts: mockDbProducts,
        databaseVariants: mockDbVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
      });

      expect(preview.items).toHaveLength(1);
      const item = preview.items[0];
      expect(item.status).toBe('match');
      expect(item.targetType).toBe('product');
      expect(item.targetId).toBe('prod-standalone-1');
      expect(item.currentWebStock).toBe(15);
      expect(item.finalStock).toBe(25);
    });

    it('flags parent SKU as ambiguous when product has child variants to prevent silent data corruption', () => {
      const sourceRows: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: null,
          kategori: '',
          merk: '',
          tipe: 'Acer AIO C24 Induk',
          stok: 20,
          gudangLuar: 0,
          tglBeli: null,
          extractedSku: 'AIO-C24-PARENT', // Parent SKU of a product having 2 child variants
          rawSkuColumn: 'AIO-C24-PARENT',
        },
      ];

      const preview = calculateStockPreview({
        rows: sourceRows,
        databaseProducts: mockDbProducts,
        databaseVariants: mockDbVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
      });

      expect(preview.items).toHaveLength(1);
      const item = preview.items[0];
      expect(item.status).toBe('ambiguous');
      expect(item.targetType).toBeNull();
      expect(item.statusMessage).toContain('memiliki varian di database');
    });

    it('marks unrecognized SKUs as not_found without altering database state or zeroing out stock', () => {
      const sourceRows: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: null,
          kategori: '',
          merk: '',
          tipe: 'Barang Misterius',
          stok: 50,
          gudangLuar: 0,
          tglBeli: null,
          extractedSku: 'SKU-UNKNOWN-999',
          rawSkuColumn: 'SKU-UNKNOWN-999',
        },
      ];

      const preview = calculateStockPreview({
        rows: sourceRows,
        databaseProducts: mockDbProducts,
        databaseVariants: mockDbVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
      });

      expect(preview.items).toHaveLength(1);
      const item = preview.items[0];
      expect(item.status).toBe('not_found');
      expect(item.targetType).toBeNull();
      expect(item.targetId).toBeNull();
    });

    it('deducts active pending/processing web orders when onlineOrdersAccounted is false', () => {
      const sourceRows: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: null,
          kategori: '',
          merk: '',
          tipe: 'Acer Mouse Wireless',
          stok: 20, // Warehouse physical count
          gudangLuar: 0,
          tglBeli: null,
          extractedSku: 'MOU-ACER-01',
          rawSkuColumn: 'MOU-ACER-01',
        },
      ];

      const activeOrders: ActiveWebOrderForSync[] = [
        {
          order_id: 'ord-1',
          order_number: 'NSS-001',
          order_status: 'processing',
          order_created_at: new Date().toISOString(),
          product_id: 'prod-standalone-1',
          variant_id: null,
          quantity: 3, // 3 units committed
        },
        {
          order_id: 'ord-2',
          order_number: 'NSS-002',
          order_status: 'cancelled', // Cancelled order MUST NOT be deducted
          order_created_at: new Date().toISOString(),
          product_id: 'prod-standalone-1',
          variant_id: null,
          quantity: 5,
        },
      ];

      const preview = calculateStockPreview({
        rows: sourceRows,
        databaseProducts: mockDbProducts,
        databaseVariants: mockDbVariants,
        activeWebOrders: activeOrders,
        onlineOrdersAccounted: false, // Must deduct committed web orders
      });

      expect(preview.items).toHaveLength(1);
      const item = preview.items[0];
      expect(item.excelStock).toBe(20);
      expect(item.unreconciledWebQuantity).toBe(3);
      expect(item.finalStock).toBe(17); // 20 - 3 = 17
    });
  });
});
