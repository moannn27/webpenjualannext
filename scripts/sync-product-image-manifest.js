#!/usr/bin/env node
/* Idempotent manifest sync. Read-only by default; --apply is required for writes. */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');
const { verifiedMappings, planImageChanges, isHttpsUrl } = require('./product-image-manifest-utils');

loadEnvConfig(process.cwd());
const manifestPath = path.resolve(process.cwd(), process.env.PRODUCT_IMAGE_MANIFEST || 'data/product-image-audit-manifest.json');
const apply = process.argv.includes('--apply');

function detectMime(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(buffer.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}

async function verifyImage(url) {
  if (!isHttpsUrl(url)) throw new Error(`Image URL must use HTTPS: ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
  if (!response.ok) throw new Error(`Image URL returned HTTP ${response.status}: ${url}`);
  const declaredMime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const buffer = Buffer.from(await response.arrayBuffer());
  const detectedMime = detectMime(buffer);
  if (!declaredMime.startsWith('image/') || detectedMime !== declaredMime) {
    throw new Error(`Image URL content type/signature mismatch (${declaredMime}/${detectedMime || 'unknown'}): ${url}`);
  }
  await sharp(buffer).metadata();
}

async function readRows(client, table, select, ids, idColumn) {
  const rows = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await client.from(table).select(select).in(idColumn, ids.slice(i, i + 100));
    if (error) throw new Error(`Read ${table}: ${error.message}`);
    rows.push(...(data || []));
  }
  return rows;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const mappings = verifiedMappings(manifest);
  for (const url of new Set(mappings.map((mapping) => mapping.image.image_url))) await verifyImage(url);
  if (!mappings.length) {
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', verifiedMappings: 0, plannedChanges: 0, note: 'No manifest entries meet verification requirements.', databaseWrites: false }, null, 2));
    return;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to read/apply mappings.');
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const productIds = [...new Set(mappings.filter((mapping) => mapping.kind === 'product').map((mapping) => mapping.id))];
  const variantIds = [...new Set(mappings.filter((mapping) => mapping.kind === 'variant').map((mapping) => mapping.id))];
  const [products, variants] = await Promise.all([
    productIds.length ? readRows(supabase, 'products', 'id,name,sku,product_images(id,url,is_primary,display_order)', productIds, 'id') : [],
    variantIds.length ? readRows(supabase, 'product_variants', 'id,product_id,sku,image_url,product_variant_images(id,url,display_order)', variantIds, 'id') : [],
  ]);
  for (const mapping of mappings) {
    const row = (mapping.kind === 'product' ? products : variants).find((item) => item.id === mapping.id);
    if (!row || row.sku !== mapping.sku) throw new Error(`${mapping.kind} SKU/ID changed since manifest review: ${mapping.sku}`);
  }
  const { productChanges, variantChanges } = planImageChanges(mappings, products, variants);
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    verifiedMappings: mappings.length,
    productImageRowsToInsert: productChanges.filter((change) => change.action === 'insert').length,
    variantGalleryRowsToInsert: variantChanges.filter((change) => change.action === 'insert' && !change.preserve_legacy).length,
    validLegacyVariantImagesToMirror: variantChanges.filter((change) => change.preserve_legacy).length,
    existingProductImagesToPromote: productChanges.filter((change) => change.action === 'promote_existing').length,
    variantPrimaryUrlsToRepair: variantChanges.filter((change) => change.action === 'sync_legacy').length,
    knownInvalidPrimariesToDemote: productChanges.filter((change) => change.demote_primary_id).length,
    variantLegacyImageUrlsToSync: variantChanges.filter((change) => change.legacy_image_url).length,
    plannedChanges: productChanges.length + variantChanges.length,
    databaseWrites: false,
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const insertedProducts = [];
  const insertedVariants = [];
  const restoredImageStates = [];
  const restoredVariantUrls = [];
  try {
    for (const change of productChanges) {
      if (change.demote_primary_id) {
        const { error } = await supabase.from('product_images').update({ is_primary: false }).eq('id', change.demote_primary_id);
        if (error) throw error;
        restoredImageStates.push({ id: change.demote_primary_id, is_primary: true });
      }
      if (change.action === 'promote_existing') {
        const { error } = await supabase.from('product_images').update({ is_primary: true }).eq('id', change.existing_image_id);
        if (error) throw error;
        restoredImageStates.push({ id: change.existing_image_id, is_primary: false });
        continue;
      }
      const { data, error } = await supabase.from('product_images').insert({
        product_id: change.product_id, url: change.url, alt_text: change.alt_text,
        display_order: change.display_order, is_primary: change.is_primary,
      }).select('id').single();
      if (error) throw error;
      insertedProducts.push(data.id);
    }
    for (const change of variantChanges) {
      if (change.action !== 'sync_legacy') {
        const { data, error } = await supabase.from('product_variant_images').insert({
          variant_id: change.variant_id, url: change.url, display_order: change.display_order,
        }).select('id').single();
        if (error) throw error;
        insertedVariants.push(data.id);
      }
      if (change.legacy_image_url) {
        const variant = variants.find((item) => item.id === change.variant_id);
        const { error: updateError } = await supabase.from('product_variants').update({ image_url: change.legacy_image_url }).eq('id', change.variant_id).eq('sku', change.sku);
        if (updateError) throw updateError;
        restoredVariantUrls.push({ id: change.variant_id, sku: change.sku, image_url: variant.image_url });
      }
    }
  } catch (error) {
    const rollbackErrors = [];
    if (insertedProducts.length) {
      const { error: rollbackError } = await supabase.from('product_images').delete().in('id', insertedProducts);
      if (rollbackError) rollbackErrors.push(rollbackError.message);
    }
    if (insertedVariants.length) {
      const { error: rollbackError } = await supabase.from('product_variant_images').delete().in('id', insertedVariants);
      if (rollbackError) rollbackErrors.push(rollbackError.message);
    }
    for (const previous of restoredImageStates) {
      const { error: rollbackError } = await supabase.from('product_images').update({ is_primary: previous.is_primary }).eq('id', previous.id);
      if (rollbackError) rollbackErrors.push(rollbackError.message);
    }
    for (const previous of restoredVariantUrls) {
      const { error: rollbackError } = await supabase.from('product_variants').update({ image_url: previous.image_url }).eq('id', previous.id).eq('sku', previous.sku);
      if (rollbackError) rollbackErrors.push(rollbackError.message);
    }
    throw new Error(`Image manifest sync failed: ${error.message}${rollbackErrors.length ? `; rollback errors: ${rollbackErrors.join('; ')}` : ''}`);
  }
  summary.databaseWrites = true;
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
