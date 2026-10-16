const https = require('https');
const { createClient } = require('@supabase/supabase-js');

try {
  require('dotenv').config({ path: '.env.local' });
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyhooykvidzstnmaggku.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required in environment.');
  process.exit(1);
}
const client = createClient(SUPABASE_URL, SERVICE_KEY);

// Official manufacturer CDN real-pictures verified with HTTP 200
const FAMILY_ASSETS = {
  loq: {
    fileName: 'official-lenovo-loq-15.png',
    url: 'https://p4-ofp.static.pub//fes/cms/2024/05/20/bck35fhess1td0jtxhbqx1a2s9ofzk318843.png',
    contentType: 'image/png',
  },
  legion: {
    fileName: 'official-lenovo-legion-pro-5.png',
    url: 'https://p1-ofp.static.pub//fes/cms/2025/04/04/95ictst7gj332wfl11t7z3e8zfceti849742.png',
    contentType: 'image/png',
  },
  ideapad_slim_3: {
    fileName: 'official-lenovo-ideapad-slim-3.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaPad/IdeaPad_Slim_3_14IRU8/Compressedimage/IdeaPad_Slim_3_14IRU8_CT1_01.png',
    contentType: 'image/png',
  },
  ideapad_slim_5: {
    fileName: 'official-lenovo-ideapad-slim-5.png',
    url: 'https://p2-ofp.static.pub/fes/cms/2023/04/04/daydsw0oor3slavvgy9a5dk003m4pw941937.png',
    contentType: 'image/png',
  },
  yoga: {
    fileName: 'official-lenovo-yoga-7-2in1.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Yoga/Yoga_7_2_in_1_14IML9/Compressedimage/Yoga_7_2_in_1_14IML9_CT1_01.png',
    contentType: 'image/png',
  },
  aio: {
    fileName: 'official-lenovo-ideacentre-aio-24irh9.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaCentre/IdeaCentre_AIO_24IRH9/Compressedimage/IdeaCentre_AIO_24IRH9_CT1_01.png',
    contentType: 'image/png',
  },
  tower: {
    fileName: 'official-lenovo-ideacentre-tower.png',
    url: 'https://psrefstuff.lenovo.com/syspool//Sys/Image/IdeaCentre/IdeaCentre_Tower_14IRR9/Compressedimage/IdeaCentre_Tower_14IRR9_CT3_02.png',
    contentType: 'image/png',
  },
  tab_plus: {
    fileName: 'official-lenovo-tab-plus.jpg',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/PDF/Lenovo_Tablets/Tab_Plus/Tab_Plus_OverViewPic.jpg',
    contentType: 'image/jpeg',
  },
  legion_tab: {
    fileName: 'official-lenovo-legion-tab.jpg',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/PDF/Lenovo_Tablets/Legion_Tab_8_8_5/Legion_Tab_8_8_5_OverViewPic.jpg',
    contentType: 'image/jpeg',
  },
  rog: {
    fileName: 'official-asus-rog-zephyrus-g14.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/707DEA47-F3C6-43E7-9DA3-97DB5189F409/w1000/h732',
    contentType: 'image/png',
  },
};

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

function determineFamily(productName) {
  const n = productName.toLowerCase();
  if (n.includes('rog') || n.includes('zephyrus')) return 'rog';
  if (n.includes('legion tab')) return 'legion_tab';
  if (n.includes('legion')) return 'legion';
  if (n.includes('loq')) return 'loq';
  if (n.includes('yoga')) return 'yoga';
  if (n.includes('aio') || n.includes('a100')) return 'aio';
  if (n.includes('ideacentre tower')) return 'tower';
  if (n.includes('tab') || n.includes('pen') || n.includes('motopad')) return 'tab_plus';
  if (n.includes('ideapad slim 5')) return 'ideapad_slim_5';
  if (n.includes('ideapad 5') || n.includes('flex 5')) return 'ideapad_slim_5';
  if (n.includes('ideapad slim 3') || n.includes('ideapad')) return 'ideapad_slim_3';
  return 'ideapad_slim_3';
}

async function run() {
  console.log('--- Step 1: Uploading Real Official Photos to Supabase Storage ---');
  const uploadedUrls = {};

  for (const [key, asset] of Object.entries(FAMILY_ASSETS)) {
    try {
      console.log(`Downloading ${key} from ${asset.url}...`);
      const buffer = await downloadBuffer(asset.url);
      console.log(`  Downloaded ${buffer.length} bytes. Uploading to Supabase as ${asset.fileName}...`);
      const { error: uploadError } = await client.storage.from('products').upload(asset.fileName, buffer, {
        contentType: asset.contentType,
        upsert: true,
      });
      if (uploadError) {
        console.error(`  Upload error for ${key}:`, uploadError.message);
      } else {
        const { data: pubUrlData } = client.storage.from('products').getPublicUrl(asset.fileName);
        uploadedUrls[key] = pubUrlData.publicUrl;
        console.log(`  Uploaded successfully: ${uploadedUrls[key]}`);
      }
    } catch (err) {
      console.error(`  Error processing ${key}:`, err.message);
    }
  }

  console.log('\n--- Step 2: Querying Products Without Images ---');
  const { data: products, error: prodErr } = await client.from('products').select('id, name, sku');
  if (prodErr) throw prodErr;

  const { data: existingImages, error: imgErr } = await client.from('product_images').select('product_id');
  if (imgErr) throw imgErr;

  const existingSet = new Set(existingImages.map(i => i.product_id));
  const missingProducts = products.filter(p => !existingSet.has(p.id));
  console.log(`Found ${missingProducts.length} products without images.`);

  console.log('\n--- Step 3: Inserting Matching Real Images into product_images ---');
  let insertedCount = 0;
  for (const p of missingProducts) {
    const familyKey = determineFamily(p.name);
    const imageUrl = uploadedUrls[familyKey];
    if (!imageUrl) {
      console.warn(`No image URL found for family: ${familyKey}`);
      continue;
    }

    const { error: insertErr } = await client.from('product_images').insert({
      product_id: p.id,
      url: imageUrl,
      alt_text: p.name,
      is_primary: true,
      display_order: 0,
    });

    if (insertErr) {
      console.error(`Failed to attach image to ${p.sku} (${p.name}):`, insertErr.message);
    } else {
      insertedCount++;
      console.log(`[${insertedCount}/${missingProducts.length}] Attached ${familyKey} image to: [${p.sku}] ${p.name}`);
    }
  }

  console.log(`\n🎉 FINISHED: Successfully attached real official pictures to ${insertedCount} products!`);
}

run().catch(console.error);

