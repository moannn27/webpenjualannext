const PROMO_OR_PLACEHOLDER = /(?:promo|campaign|poster|banner|official-acer-aspire-lite-(?:silver|gray|pink)\.webp|official-acer-nitro-(?:lite-white|v15-black)\.webp)/i;

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isKnownBadImage(image) {
  return image?.status === 'known_invalid' || PROMO_OR_PLACEHOLDER.test(image?.image_url || '');
}

function isReplacementTarget(manifestImage, existingImage) {
  return PROMO_OR_PLACEHOLDER.test(existingImage?.url || '') ||
    (manifestImage.replaces_status === 'known_invalid' &&
      (manifestImage.replaces_image_url === existingImage?.url || manifestImage.replaces_image_id === existingImage?.id));
}

function verifiedMappings(manifest) {
  const mappings = [];
  for (const product of manifest.products || []) {
    for (const image of product.images || []) {
      if (image.status !== 'verified') continue;
      validateMapping(image, product.product_id, product.product_sku_mtm, 'product');
      mappings.push({ kind: 'product', id: product.product_id, sku: product.product_sku_mtm, image });
    }
  }
  for (const variant of manifest.variants || []) {
    for (const image of variant.images || []) {
      if (image.status !== 'verified') continue;
      validateMapping(image, variant.variant_id, variant.variant_sku_mtm, 'variant');
      mappings.push({ kind: 'variant', id: variant.variant_id, sku: variant.variant_sku_mtm, image });
    }
  }
  return mappings;
}

function validateMapping(image, id, sku, kind) {
  if (!id || !sku) throw new Error(`Verified ${kind} mapping is missing its ID or SKU.`);
  if (!isHttpsUrl(image.image_url)) throw new Error(`Verified ${kind} image URL must use HTTPS.`);
  if (!isHttpsUrl(image.source_url)) throw new Error(`Verified ${kind} source URL must use HTTPS.`);
  if (image.model_match !== true) throw new Error(`Verified ${kind} mapping must record model_match: true.`);
  if (image.verified_sku !== sku) throw new Error(`Verified ${kind} SKU mismatch: expected ${sku}.`);
}

function planImageChanges(mappings, products, variants) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const productChanges = [];
  const variantChanges = [];

  for (const mapping of mappings) {
    if (mapping.kind === 'product') {
      const product = productById.get(mapping.id);
      if (!product) throw new Error(`Product ${mapping.id} is no longer present.`);
      const images = (product.product_images || []).slice();
      const primary = images.find((image) => image.is_primary);
      const demotePrimary = primary && isReplacementTarget(mapping.image, primary);
      const existingImage = images.find((image) => image.url === mapping.image.image_url);
      if (existingImage) {
        if ((demotePrimary || !primary) && !existingImage.is_primary) {
          productChanges.push({
            action: 'promote_existing', product_id: product.id, sku: mapping.sku,
            existing_image_id: existingImage.id, is_primary: true,
            demote_primary_id: demotePrimary ? primary.id : null,
          });
          if (demotePrimary) primary.is_primary = false;
          existingImage.is_primary = true;
        }
        continue;
      }
      productChanges.push({
        action: 'insert',
        product_id: product.id,
        sku: mapping.sku,
        url: mapping.image.image_url,
        alt_text: mapping.image.alt_text || product.name,
        display_order: images.length ? Math.max(...images.map((image) => Number(image.display_order) || 0)) + 1 : 0,
        is_primary: !primary || Boolean(demotePrimary),
        demote_primary_id: demotePrimary ? primary.id : null,
      });
      if (demotePrimary) primary.is_primary = false;
      images.push({ id: `planned-${productChanges.length}`, url: mapping.image.image_url, is_primary: !primary || Boolean(demotePrimary), display_order: images.length ? Math.max(...images.map((image) => Number(image.display_order) || 0)) + 1 : 0 });
      product.product_images = images;
    } else {
      const variant = variantById.get(mapping.id);
      if (!variant) throw new Error(`Variant ${mapping.id} is no longer present.`);
      const images = (variant.product_variant_images || []).slice();
      const validLegacyImage = isHttpsUrl(variant.image_url) && !PROMO_OR_PLACEHOLDER.test(variant.image_url || '');
      if (validLegacyImage && !images.some((image) => image.url === variant.image_url)) {
        variantChanges.push({ variant_id: variant.id, sku: mapping.sku, url: variant.image_url, display_order: 0, legacy_image_url: null, preserve_legacy: true });
        images.push({ id: `planned-legacy-${variantChanges.length}`, url: variant.image_url, display_order: 0 });
      }
      const existingImage = images.find((image) => image.url === mapping.image.image_url);
      if (existingImage) {
        const currentPrimary = images.find((image) => image.display_order === 0)?.url;
        const syncUrl = currentPrimary && (!validLegacyImage || (mapping.image.replaces_status === 'known_invalid' && mapping.image.replaces_image_url === variant.image_url) || isKnownBadImage({ image_url: variant.image_url }))
          ? currentPrimary
          : null;
        if (syncUrl) {
          variantChanges.push({ action: 'sync_legacy', variant_id: variant.id, sku: mapping.sku, existing_image_id: existingImage.id, url: existingImage.url, display_order: existingImage.display_order, legacy_image_url: syncUrl });
          variant.image_url = syncUrl;
        }
        continue;
      }
      const imagePrimary = images.find((image) => image.display_order === 0)?.url;
      const legacyNeedsSync = !validLegacyImage ||
        (mapping.image.replaces_status === 'known_invalid' && mapping.image.replaces_image_url === variant.image_url) ||
        isKnownBadImage({ image_url: variant.image_url });
      variantChanges.push({
        action: 'insert',
        variant_id: variant.id,
        sku: mapping.sku,
        url: mapping.image.image_url,
        display_order: images.length ? Math.max(...images.map((image) => Number(image.display_order) || 0)) + 1 : 0,
        legacy_image_url: legacyNeedsSync ? (imagePrimary || mapping.image.image_url) : null,
      });
      if (legacyNeedsSync) variant.image_url = imagePrimary || mapping.image.image_url;
      images.push({ id: `planned-${variantChanges.length}`, url: mapping.image.image_url, display_order: images.length ? Math.max(...images.map((image) => Number(image.display_order) || 0)) + 1 : 0 });
      variant.product_variant_images = images;
    }
  }

  return { productChanges, variantChanges };
}

module.exports = { isHttpsUrl, isKnownBadImage, verifiedMappings, planImageChanges };
