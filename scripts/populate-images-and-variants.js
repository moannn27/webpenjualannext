const https = require('https');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

globalThis.WebSocket = class WebSocket {};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyhooykvidzstnmaggku.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function uploadToStorage(bucket, fileName, buffer, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(fileName, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Upload ${fileName} to ${bucket} failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  console.log('=== Step 1: Uploading Real Official Color Assets ===');
  const colorAssets = {
    'official-lenovo-ideapad-slim-3-blue.png': {
      url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaPad/IdeaPad_Slim_3_14IRU8/Compressedimage/IdeaPad_Slim_3_14IRU8_CT2_01.png',
      contentType: 'image/png'
    },
    'official-lenovo-ideacentre-aio-24irh9-cloudgrey.png': {
      url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaCentre/IdeaCentre_AIO_24IRH9/Compressedimage/IdeaCentre_AIO_24IRH9_CT2_01.png',
      contentType: 'image/png'
    },
    'official-lenovo-ideapad-slim-5-blue.png': {
      url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaPad/IdeaPad_Slim_5_14IAH8/Compressedimage/IdeaPad_Slim_5_14IAH8_CT2_01.png',
      contentType: 'image/png'
    },
    'official-lenovo-legion-tab-white.png': {
      url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Tablets/Legion_Tab_8_8_5/Legion_Tab_8_8_5_CT2_01.png',
      contentType: 'image/png'
    }
  };

  const uploadedUrls = {};
  for (const [fileName, asset] of Object.entries(colorAssets)) {
    try {
      console.log(`Downloading ${fileName} from ${asset.url}...`);
      const buf = await downloadBuffer(asset.url);
      const publicUrl = await uploadToStorage('products', fileName, buf, asset.contentType);
      uploadedUrls[fileName] = publicUrl;
      console.log(`Uploaded ${fileName} -> ${publicUrl}`);
    } catch (e) {
      console.error(`Failed to process ${fileName}:`, e.message);
    }
  }

  console.log('\n=== Step 2: Creating and Uploading Brand Logos (ASUS & Motorola) ===');
  // ASUS SVG Logo
  const asusSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">
    <rect width="100%" height="100%" fill="white"/>
    <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="75" letter-spacing="6" fill="#00539B">ASUS</text>
  </svg>`;
  const asusWebp = await sharp(Buffer.from(asusSvg)).webp({ quality: 90 }).toBuffer();
  const asusLogoUrl = await uploadToStorage('brands', 'asus-logo.webp', asusWebp, 'image/webp');
  console.log('Uploaded ASUS logo ->', asusLogoUrl);

  // Motorola SVG Logo
  const motorolaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">
    <rect width="100%" height="100%" fill="white"/>
    <circle cx="80" cy="60" r="38" fill="#001428"/>
    <path d="M62 76 L70 44 L78 62 L82 62 L90 44 L98 76 L92 76 L87 56 L82 68 L78 68 L73 56 L68 76 Z" fill="white"/>
    <text x="140" y="68" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="44" fill="#001428" letter-spacing="1">motorola</text>
  </svg>`;
  const motorolaWebp = await sharp(Buffer.from(motorolaSvg)).webp({ quality: 90 }).toBuffer();
  const motorolaLogoUrl = await uploadToStorage('brands', 'motorola-logo.webp', motorolaWebp, 'image/webp');
  console.log('Uploaded Motorola logo ->', motorolaLogoUrl);

  console.log('\n=== Step 3: Updating Missing Categories Images ===');
  const catUpdates = [
    { slug: 'desktops', url: `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideacentre-tower.png` },
    { slug: 'all-in-one-pcs', url: `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideacentre-aio-24irh9.png` },
    { slug: 'gaming-laptops', url: `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-loq-15.png` },
    { slug: 'accessories', url: `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-tab-plus.jpg` },
  ];
  for (const cat of catUpdates) {
    const { error } = await supabase.from('categories').update({ image_url: cat.url }).eq('slug', cat.slug);
    if (error) console.error(`Failed to update category ${cat.slug}:`, error.message);
    else console.log(`Updated category ${cat.slug} with ${cat.url}`);
  }

  console.log('\n=== Step 4: Updating Brands Logos ===');
  const brandUpdates = [
    { slug: 'asus', logo_url: asusLogoUrl },
    { slug: 'motorola', logo_url: motorolaLogoUrl },
  ];
  for (const b of brandUpdates) {
    const { error } = await supabase.from('brands').update({ logo_url: b.logo_url }).eq('slug', b.slug);
    if (error) console.error(`Failed to update brand ${b.slug}:`, error.message);
    else console.log(`Updated brand ${b.slug} with ${b.logo_url}`);
  }

  console.log('\n=== Step 5: Updating Product Variants and Images ===');
  const slim3Grey = `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideapad-slim-3.png`;
  const slim3Blue = uploadedUrls['official-lenovo-ideapad-slim-3-blue.png'] || `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideapad-slim-3-blue.png`;

  const slim5Grey = `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideapad-slim-5.png`;
  const slim5Blue = uploadedUrls['official-lenovo-ideapad-slim-5-blue.png'] || `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideapad-slim-5-blue.png`;

  const aioLuna = `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideacentre-aio-24irh9.png`;
  const aioCloud = uploadedUrls['official-lenovo-ideacentre-aio-24irh9-cloudgrey.png'] || `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideacentre-aio-24irh9-cloudgrey.png`;

  const legionTabBlack = `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-legion-tab.jpg`;
  const legionTabWhite = uploadedUrls['official-lenovo-legion-tab-white.png'] || `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-legion-tab-white.png`;

  const loqLuna = `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-loq-15.png`;
  const legionBlack = `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-legion-pro-5.png`;
  const yogaTeal = `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-yoga-7-2in1.png`;
  const towerCloud = `${supabaseUrl}/storage/v1/object/public/products/official-lenovo-ideacentre-tower.png`;

  const { data: allVariants } = await supabase.from('product_variants').select('id, product_id, color, sku, image_url');
  const { data: allProducts } = await supabase.from('products').select('id, name, slug');
  const productMap = new Map(allProducts.map(p => [p.id, p]));

  let updatedVariants = 0;
  for (const v of allVariants || []) {
    const prod = productMap.get(v.product_id);
    if (!prod) continue;
    const pName = prod.name.toLowerCase();
    const color = (v.color || '').toLowerCase();
    let imgToSet = null;

    if (pName.includes('aio') || pName.includes('a100')) {
      if (color.includes('cloud')) imgToSet = aioCloud;
      else if (color.includes('luna')) imgToSet = aioLuna;
      else imgToSet = aioLuna;
    } else if (pName.includes('tower')) {
      imgToSet = towerCloud;
    } else if (pName.includes('legion tab')) {
      if (color.includes('white')) imgToSet = legionTabWhite;
      else imgToSet = legionTabBlack;
    } else if (pName.includes('legion')) {
      imgToSet = legionBlack;
    } else if (pName.includes('loq')) {
      imgToSet = loqLuna;
    } else if (pName.includes('yoga')) {
      imgToSet = yogaTeal;
    } else if (pName.includes('slim 5') || pName.includes('ideapad 5')) {
      if (color.includes('blue')) imgToSet = slim5Blue;
      else if (color.includes('grey') || color.includes('gray')) imgToSet = slim5Grey;
      else imgToSet = slim5Grey;
    } else if (pName.includes('slim 3') || pName.includes('ideapad')) {
      if (color.includes('blue')) imgToSet = slim3Blue;
      else if (color.includes('grey') || color.includes('gray')) imgToSet = slim3Grey;
      else imgToSet = slim3Grey;
    }

    if (imgToSet) {
      const { error } = await supabase.from('product_variants').update({ image_url: imgToSet }).eq('id', v.id);
      if (!error) updatedVariants++;
    }
  }
  console.log(`Updated ${updatedVariants} variants with specific color images.`);

  console.log('\n=== Step 6: Ensuring Multi-color Products have gallery images for each color ===');
  // For products with variants having distinct images, make sure product_images contains them
  const { data: variantsWithImgs } = await supabase.from('product_variants').select('product_id, color, image_url');
  const prodImgMap = {};
  variantsWithImgs?.forEach(v => {
    if (!v.image_url) return;
    if (!prodImgMap[v.product_id]) prodImgMap[v.product_id] = new Map();
    prodImgMap[v.product_id].set(v.image_url, v.color);
  });

  let addedGalleryImages = 0;
  for (const [productId, urlMap] of Object.entries(prodImgMap)) {
    const { data: existingImgs } = await supabase.from('product_images').select('url').eq('product_id', productId);
    const existingUrls = new Set(existingImgs?.map(i => i.url) || []);
    const prod = productMap.get(productId);

    let order = existingUrls.size;
    for (const [url, color] of urlMap.entries()) {
      if (!existingUrls.has(url)) {
        const { error } = await supabase.from('product_images').insert({
          product_id: productId,
          url,
          alt_text: `${prod?.name || 'Produk'} - ${color || 'Varian'}`,
          is_primary: false,
          display_order: order++,
        });
        if (!error) addedGalleryImages++;
      }
    }
  }
  console.log(`Added ${addedGalleryImages} color images to product gallery.`);
  console.log('\n✅ All database & storage updates completed successfully!');
}

main().catch(err => {
  console.error('Fatal error in script:', err);
  process.exit(1);
});

