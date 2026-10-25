#!/usr/bin/env node
/* Read-only catalog snapshot for image review. This script never writes to Supabase. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

loadEnvConfig(process.cwd());
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Supabase URL and read credentials are required.');
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function readAll(table, select) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`Read ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

const posterPattern = /(?:promo|campaign|poster|banner|official-acer-aspire-lite-(?:silver|gray|pink)\.webp|official-acer-nitro-(?:lite-white|v15-black)\.webp)/i;
const visualReviewPattern = /(?:63b6f9f5-1e86-4b5f-a3fd-08f98ff13f91\.webp|official-asus-gaming-v16\.png)/i;
function assessUrl(url) {
  if (!url) return { status: 'missing', reason: 'No image URL is stored.' };
  if (!/^https:\/\//i.test(url)) return { status: 'needs_review', reason: 'URL is not HTTPS.' };
  if (posterPattern.test(url)) return { status: 'needs_review', reason: 'Visual audit identified promotional artwork; do not use as a product photo.' };
  if (visualReviewPattern.test(url)) return { status: 'needs_review', reason: 'Visual audit found a likely logo or cross-family image; replace only after exact model verification.' };
  return { status: 'needs_review', reason: 'Image content and exact model/SKU match have not been independently verified.' };
}

async function verifyDirectUrls(manifest) {
  const entries = [...manifest.products.flatMap((product) => product.images), ...manifest.variants.flatMap((variant) => variant.images)];
  const uniqueUrls = [...new Set(entries.map((entry) => entry.image_url).filter(Boolean))];
  let cursor = 0;
  const results = new Map();
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < uniqueUrls.length) {
      const url = uniqueUrls[cursor++];
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'follow' });
        const contentType = response.headers.get('content-type')?.split(';')[0] ?? null;
        const buffer = Buffer.from(await response.arrayBuffer());
        let imageDecodable = false;
        try { const metadata = await sharp(buffer).metadata(); imageDecodable = Boolean(metadata.format && metadata.width && metadata.height); } catch {}
        results.set(url, { http_status: response.status, content_type: contentType, image_decodable: imageDecodable });
      } catch (error) {
        results.set(url, { http_status: null, content_type: null, fetch_error: error.message });
      }
    }
  }));
  for (const entry of entries) {
    if (entry.image_url) Object.assign(entry, results.get(entry.image_url));
  }
  return { uniqueUrls: uniqueUrls.length, results: [...results.values()] };
}

async function main() {
  const products = await readAll('products', 'id,name,sku,status,product_images(id,url,is_primary,display_order),brands(name),categories(name)');
  const variants = await readAll('product_variants', 'id,product_id,sku,color,ram,storage,image_url,product_variant_images(id,url,display_order),products(name,sku,brands(name))');
  const manifest = {
    version: 1,
    generated_at: new Date().toISOString(),
    source: 'Read-only Supabase catalog snapshot; URLs require independent verification before use.',
    summary: {
      products: products.length,
      products_with_image_rows: products.filter((product) => product.product_images?.length).length,
      products_missing_images: products.filter((product) => !product.product_images?.length).length,
      variants: variants.length,
      variants_with_image_rows: variants.filter((variant) => variant.image_url || variant.product_variant_images?.length).length,
      variants_missing_images: variants.filter((variant) => !variant.image_url && !variant.product_variant_images?.length).length,
    },
    products: products.map((product) => {
      const images = (product.product_images || []).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const candidates = images.length ? images.map((image) => ({
        id: image.id,
        image_url: image.url,
        alt_text: image.alt_text,
        display_order: image.display_order ?? 0,
        is_primary: Boolean(image.is_primary),
        source_url: null,
        ...assessUrl(image.url),
      })) : [{ id: null, image_url: null, display_order: 0, is_primary: false, source_url: null, ...assessUrl(null) }];
      return {
        product_id: product.id,
        model: product.name,
        brand: product.brands?.name ?? null,
        product_sku_mtm: product.sku,
        status: 'needs_review',
        images: candidates,
      };
    }),
    variants: variants.map((variant) => {
      const images = (variant.product_variant_images || []).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const urls = images.map((image) => ({ id: image.id, image_url: image.url, display_order: image.display_order ?? 0 }));
      if (variant.image_url && !urls.some((image) => image.image_url === variant.image_url)) {
        urls.unshift({ id: null, image_url: variant.image_url, display_order: -1 });
      }
      if (!urls.length) urls.push({ id: null, image_url: null, display_order: 0 });
      return {
        product_id: variant.product_id,
        variant_id: variant.id,
        model: variant.products?.name ?? null,
        brand: variant.products?.brands?.name ?? null,
        product_sku_mtm: variant.products?.sku ?? null,
        variant_sku_mtm: variant.sku,
        color: variant.color,
        ram: variant.ram,
        storage: variant.storage,
        status: 'needs_review',
        images: urls.map((image) => ({ ...image, source_url: null, ...assessUrl(image.image_url) })),
      };
    }),
  };
  const urlOwners = new Map();
  for (const product of manifest.products) for (const image of product.images) {
    if (!image.image_url) continue;
    const owners = urlOwners.get(image.image_url) || new Set();
    owners.add(`product:${product.product_id}`);
    urlOwners.set(image.image_url, owners);
  }
  for (const variant of manifest.variants) for (const image of variant.images) {
    if (!image.image_url) continue;
    const owners = urlOwners.get(image.image_url) || new Set();
    owners.add(`variant:${variant.variant_id}`);
    urlOwners.set(image.image_url, owners);
  }
  for (const entity of [...manifest.products, ...manifest.variants]) for (const image of entity.images) {
    if (!image.image_url) continue;
    const count = urlOwners.get(image.image_url)?.size || 1;
    image.shared_catalog_assignments = count;
    if (count > 1 && image.status === 'needs_review' && !image.reason.startsWith('Visually audit')) {
      image.reason += ` This direct URL is assigned to ${count} products/variants; verify each exact SKU and model before reusing it.`;
    }
  }
  const catalogImages = [...manifest.products.flatMap((product) => product.images), ...manifest.variants.flatMap((variant) => variant.images)];
  manifest.summary.unique_direct_urls = urlOwners.size;
  manifest.summary.verified_mappings = 0;
  manifest.summary.entities_needing_review = manifest.products.length + manifest.variants.length;
  manifest.summary.visually_flagged_entries = catalogImages.filter((image) => /Visual audit/i.test(image.reason || '')).length;
  manifest.summary.shared_direct_urls = [...urlOwners.values()].filter((owners) => owners.size > 1).length;
  let urlCheck = null;
  if (process.argv.includes('--verify-urls')) urlCheck = await verifyDirectUrls(manifest);
  const output = path.resolve(process.cwd(), 'data/product-image-audit-manifest.json');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const existing = [...manifest.products.flatMap((p) => p.images), ...manifest.variants.flatMap((v) => v.images)];
  console.log(JSON.stringify({
    manifest: path.relative(process.cwd(), output),
    products: manifest.products.length,
    variants: manifest.variants.length,
    existingImageEntries: existing.filter((image) => image.image_url).length,
    missingImageEntries: existing.filter((image) => image.status === 'missing').length,
    needsReview: existing.filter((image) => image.status === 'needs_review').length,
    visuallyFlaggedEntries: manifest.summary.visually_flagged_entries,
    sharedDirectUrls: manifest.summary.shared_direct_urls,
    urlCheck: urlCheck ? {
      uniqueUrls: urlCheck.uniqueUrls,
      httpFailures: urlCheck.results.filter((result) => !result.http_status || result.http_status >= 400).length,
      nonImageResponses: urlCheck.results.filter((result) => result.content_type && !result.content_type.startsWith('image/')).length,
      undecodableImages: urlCheck.results.filter((result) => !result.image_decodable).length,
    } : 'not requested',
    writesToDatabase: false,
  }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
