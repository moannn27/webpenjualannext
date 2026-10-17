const https = require('https');
const http = require('http');
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
  // === LENOVO LAPTOPS, DESKTOPS & TABLETS ===
  lenovo_loq_laptop: {
    fileName: 'official-lenovo-loq-15.png',
    url: 'https://p4-ofp.static.pub//fes/cms/2024/05/20/bck35fhess1td0jtxhbqx1a2s9ofzk318843.png',
    contentType: 'image/png',
  },
  lenovo_legion_laptop: {
    fileName: 'official-lenovo-legion-pro-5.png',
    url: 'https://p1-ofp.static.pub//fes/cms/2025/04/04/95ictst7gj332wfl11t7z3e8zfceti849742.png',
    contentType: 'image/png',
  },
  lenovo_ideapad_slim_3_grey: {
    fileName: 'official-lenovo-ideapad-slim-3.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaPad/IdeaPad_Slim_3_14IRU8/Compressedimage/IdeaPad_Slim_3_14IRU8_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_ideapad_slim_3_blue: {
    fileName: 'official-lenovo-ideapad-slim-3-blue.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaPad/IdeaPad_Slim_3_14IRU8/IdeaPad_Slim_3_14IRU8_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_ideapad_slim_5: {
    fileName: 'official-lenovo-ideapad-slim-5.png',
    url: 'https://p2-ofp.static.pub/fes/cms/2023/04/04/daydsw0oor3slavvgy9a5dk003m4pw941937.png',
    contentType: 'image/png',
  },
  lenovo_ideapad_slim_5_blue: {
    fileName: 'official-lenovo-ideapad-slim-5-blue.png',
    url: 'https://p2-ofp.static.pub/fes/cms/2023/04/04/daydsw0oor3slavvgy9a5dk003m4pw941937.png',
    contentType: 'image/png',
  },
  lenovo_yoga_teal: {
    fileName: 'official-lenovo-yoga-7-2in1.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Yoga/Yoga_7_2_in_1_14IML9/Compressedimage/Yoga_7_2_in_1_14IML9_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_yoga_seashell: {
    fileName: 'official-lenovo-yoga-7-seashell.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Yoga/Yoga_Slim_7_14ILL11/Yoga_Slim_7_14ILL11_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_aio_lunagrey: {
    fileName: 'official-lenovo-ideacentre-aio-24irh9.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaCentre/IdeaCentre_AIO_24IRH9/Compressedimage/IdeaCentre_AIO_24IRH9_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_aio_cloudgrey: {
    fileName: 'official-lenovo-ideacentre-aio-24irh9-cloudgrey.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/IdeaCentre/IdeaCentre_AIO_24IRH9/IdeaCentre_AIO_24IRH9_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_tower: {
    fileName: 'official-lenovo-ideacentre-tower.png',
    url: 'https://psrefstuff.lenovo.com/syspool//Sys/Image/IdeaCentre/IdeaCentre_Tower_14IRR9/Compressedimage/IdeaCentre_Tower_14IRR9_CT3_02.png',
    contentType: 'image/png',
  },
  lenovo_tab_plus: {
    fileName: 'official-lenovo-tab-plus.jpg',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/PDF/Lenovo_Tablets/Tab_Plus/Tab_Plus_OverViewPic.jpg',
    contentType: 'image/jpeg',
  },
  lenovo_legion_tab: {
    fileName: 'official-lenovo-legion-tab.jpg',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/PDF/Lenovo_Tablets/Legion_Tab_8_8_5/Legion_Tab_8_8_5_OverViewPic.jpg',
    contentType: 'image/jpeg',
  },
  lenovo_legion_tab_white: {
    fileName: 'official-lenovo-legion-tab-white.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/PDF/Lenovo_Tablets/Legion_Tab_8_8_5/Legion_Tab_8_8_5_OverViewPic.jpg',
    contentType: 'image/png',
  },

  // === LENOVO MONITORS (OFFICIAL PSREF RENDERS) ===
  lenovo_monitor_l22: {
    fileName: 'official-lenovo-monitor-l22-4e.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_L22_4e/Lenovo_L22_4e_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_l24: {
    fileName: 'official-lenovo-monitor-l24-4e.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_L24_4e/Lenovo_L24_4e_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_l24d: {
    fileName: 'official-lenovo-monitor-l24d-4c.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_L24d_4C/Lenovo_L24d_4C_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_l27: {
    fileName: 'official-lenovo-monitor-l27-4e.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_L27_4e/Lenovo_L27_4e_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_l27q: {
    fileName: 'official-lenovo-monitor-l27q-4a.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_L27q_4A/Lenovo_L27q_4A_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_d19: {
    fileName: 'official-lenovo-monitor-d19-10.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_D19_10/Lenovo_D19_10_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_portable: {
    fileName: 'official-lenovo-monitor-l16-portable.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_L15/Lenovo_L15_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_legion_25: {
    fileName: 'official-lenovo-monitor-legion-25.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_Legion_Y25_30/Lenovo_Legion_Y25_30_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_legion_27q: {
    fileName: 'official-lenovo-monitor-legion-27q.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_Legion_Y27q_30/Lenovo_Legion_Y27q_30_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_loq_27: {
    fileName: 'official-lenovo-monitor-loq-27.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_G27_30/Lenovo_G27_30_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_loq_27q: {
    fileName: 'official-lenovo-monitor-loq-27q.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_G27q_30/Lenovo_G27q_30_CT1_01.png',
    contentType: 'image/png',
  },
  lenovo_monitor_ultrawide: {
    fileName: 'official-lenovo-monitor-ultrawide-34.png',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Monitors/Lenovo_G34w_30/Lenovo_G34w_30_CT1_01.png',
    contentType: 'image/png',
  },

  // === ADVAN (OFFICIAL ADVAN INDONESIA ASSETS) ===
  advan_360_go: {
    fileName: 'official-advan-360-go.jpg',
    url: 'https://advandigital.com/wp-content/uploads/2026/04/03-scaled.jpg',
    contentType: 'image/jpeg',
  },
  advan_workplus: {
    fileName: 'official-advan-workplus.png',
    url: 'https://advandigital.com/wp-content/uploads/2026/04/Group-37.png',
    contentType: 'image/png',
  },
  advan_workmate: {
    fileName: 'official-advan-workmate.png',
    url: 'https://advandigital.com/wp-content/uploads/2026/04/Group-27-1.png',
    contentType: 'image/png',
  },
  advan_soulmate_n: {
    fileName: 'official-advan-soulmate-n.png',
    url: 'https://advandigital.com/wp-content/uploads/2026/08/Soulmate-N-1.png',
    contentType: 'image/png',
  },
  advan_soulmate_x: {
    fileName: 'official-advan-soulmate-x.webp',
    url: 'https://advandigital.com/wp-content/uploads/2025/09/soulmate-X.webp',
    contentType: 'image/webp',
  },
  advan_one_pc: {
    fileName: 'official-advan-one-pc.png',
    url: 'https://advandigital.com/wp-content/uploads/2026/09/Air-Neo-Front-1.png',
    contentType: 'image/png',
  },

  // === ACER (OFFICIAL ACER INDONESIA ASSETS) ===
  acer_aspire_lite_silver: {
    fileName: 'official-acer-aspire-lite-silver.webp',
    url: 'https://d21ijl4iqs0z04.cloudfront.net/public/t7zgh9uxxnjexm03svuy.webp',
    contentType: 'image/webp',
  },
  acer_aspire_lite_gray: {
    fileName: 'official-acer-aspire-lite-gray.webp',
    url: 'https://d21ijl4iqs0z04.cloudfront.net/public/t7zgh9uxxnjexm03svuy.webp',
    contentType: 'image/webp',
  },
  acer_aspire_lite_pink: {
    fileName: 'official-acer-aspire-lite-pink.webp',
    url: 'https://d21ijl4iqs0z04.cloudfront.net/public/h70oklb3lndf5dptnzoo.webp',
    contentType: 'image/webp',
  },
  acer_nitro_lite_white: {
    fileName: 'official-acer-nitro-lite-white.webp',
    url: 'https://d21ijl4iqs0z04.cloudfront.net/public/lis3rvtvdwoewu5ev4qs.webp',
    contentType: 'image/webp',
  },
  acer_nitro_v15_black: {
    fileName: 'official-acer-nitro-v15-black.webp',
    url: 'https://d21ijl4iqs0z04.cloudfront.net/public/onah110ycytgdhhmkphh.webp',
    contentType: 'image/webp',
  },
  acer_aspire_c24: {
    fileName: 'official-acer-aspire-c24.webp',
    url: 'https://d21ijl4iqs0z04.cloudfront.net/public/vdxnrmoxrni8r5olfobk.webp',
    contentType: 'image/webp',
  },

  // === ASUS (OFFICIAL ASUS STORE & GLOBAL CDN) ===
  asus_rog_zephyrus: {
    fileName: 'official-asus-rog-zephyrus-g14.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/707DEA47-F3C6-43E7-9DA3-97DB5189F409/w1000/h732',
    contentType: 'image/png',
  },
  asus_tuf_gray: {
    fileName: 'official-asus-tuf-gaming-gray.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/5b03a41b-4a51-4db6-9ad6-5628c01201c0/w1000',
    contentType: 'image/png',
  },
  asus_tuf_black: {
    fileName: 'official-asus-tuf-gaming-black.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/5b03a41b-4a51-4db6-9ad6-5628c01201c0/w1000',
    contentType: 'image/png',
  },
  asus_gaming_v16: {
    fileName: 'official-asus-gaming-v16.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/5b03a41b-4a51-4db6-9ad6-5628c01201c0/w1000',
    contentType: 'image/png',
  },
  asus_zenbook_14_blue: {
    fileName: 'official-asus-zenbook-14-blue.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/caf912a5-5bc2-4a81-ac8f-6339e488f549/w1000',
    contentType: 'image/png',
  },
  asus_zenbook_s14_white: {
    fileName: 'official-asus-zenbook-s14-white.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/827c5809-1d54-487a-aad4-9b5c0aee3fb8/w1000',
    contentType: 'image/png',
  },
  asus_zenbook_flip_grey: {
    fileName: 'official-asus-zenbook-flip-grey.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/caf912a5-5bc2-4a81-ac8f-6339e488f549/w1000',
    contentType: 'image/png',
  },
  asus_vivobook_go_silver: {
    fileName: 'official-asus-vivobook-go-silver.png',
    url: 'https://id.store.asus.com/media/catalog/product/v/i/vivobook_go_14_e1404f_e1404g_product_photo_1s_cool_silver_05_fingerprint_backlit_3_1.png',
    contentType: 'image/png',
  },
  asus_vivobook_go_black: {
    fileName: 'official-asus-vivobook-go-black.png',
    url: 'https://id.store.asus.com/media/catalog/product/v/i/vivobook_go_14_e1404f_e1404g_product_photo_1k_mixed_black_05_fingerprint_backlit_3.png',
    contentType: 'image/png',
  },
  asus_vivobook_14_blue: {
    fileName: 'official-asus-vivobook-14-blue.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/8e05f618-e30b-4f59-8970-09d828d23b9d/w1000',
    contentType: 'image/png',
  },
  asus_vivobook_s14_silver: {
    fileName: 'official-asus-vivobook-s14-silver.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/2e205f20-7e5e-48a5-99a2-ab30ce28948a/w1000',
    contentType: 'image/png',
  },
  asus_vivobook_flip_grey: {
    fileName: 'official-asus-vivobook-flip-grey.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/2e205f20-7e5e-48a5-99a2-ab30ce28948a/w1000',
    contentType: 'image/png',
  },
  asus_expertbook_mistygrey: {
    fileName: 'official-asus-expertbook-mistygrey.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/8278cea6-079e-4bb1-9c72-c39611d25dc6/w1000',
    contentType: 'image/png',
  },
  asus_expertbook_starblack: {
    fileName: 'official-asus-expertbook-starblack.png',
    url: 'https://dlcdnwebimgs.asus.com/gain/4956de96-549b-453a-8bc6-c419e98a969b/w1000',
    contentType: 'image/png',
  },
};

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const clientLib = url.startsWith('https') ? https : http;
    clientLib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
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

function determineFamily(product) {
  const brand = (product.brand?.name || '').toLowerCase();
  const category = (product.category?.slug || '').toLowerCase();
  const n = (product.name || '').toLowerCase();
  const sku = (product.sku || '').toLowerCase();

  // 1. BRAND: ADVAN
  if (brand === 'advan') {
    if (n.includes('360 go')) return 'advan_360_go';
    if (n.includes('one pc') || category === 'all-in-one-pcs') return 'advan_one_pc';
    if (n.includes('workplus')) return 'advan_workplus';
    if (n.includes('workmate')) return 'advan_workmate';
    if (n.includes('soulmate n') || n.includes('dark grey')) return 'advan_soulmate_n';
    if (n.includes('soulmate')) return 'advan_soulmate_x';
    return 'advan_workplus';
  }

  // 2. BRAND: ACER
  if (brand === 'acer') {
    if (category === 'all-in-one-pcs' || n.includes('aio') || n.includes('c24') || n.includes('acx22')) {
      return 'acer_aspire_c24';
    }
    if (n.includes('nitro lite') || (n.includes('nitro') && n.includes('white'))) {
      return 'acer_nitro_lite_white';
    }
    if (n.includes('nitro')) {
      return 'acer_nitro_v15_black';
    }
    if (n.includes('pink') || n.includes('sakura')) {
      return 'acer_aspire_lite_pink';
    }
    if (n.includes('gray') || n.includes('grey') || n.includes('al14-36p')) {
      return 'acer_aspire_lite_gray';
    }
    return 'acer_aspire_lite_silver';
  }

  // 3. BRAND: ASUS
  if (brand === 'asus') {
    if (n.includes('rog') || n.includes('zephyrus')) {
      return 'asus_rog_zephyrus';
    }
    if (n.includes('tuf')) {
      if (n.includes('black')) return 'asus_tuf_black';
      return 'asus_tuf_gray';
    }
    if (n.includes('gaming v16') || n.includes('v16')) {
      return 'asus_gaming_v16';
    }
    if (n.includes('zenbook')) {
      if (n.includes('scandinavian white') || n.includes('white') || n.includes('s14') || n.includes('ux5406')) {
        return 'asus_zenbook_s14_white';
      }
      if (n.includes('flip') || n.includes('pine grey')) {
        return 'asus_zenbook_flip_grey';
      }
      return 'asus_zenbook_14_blue';
    }
    if (n.includes('p1403') || n.includes('p3406') || n.includes('pm1403') || n.includes('b3402') || sku.startsWith('90nx')) {
      if (n.includes('misty grey') || n.includes('grey') || n.includes('gray')) {
        return 'asus_expertbook_mistygrey';
      }
      return 'asus_expertbook_starblack';
    }
    if (n.includes('vivobook flip')) {
      return 'asus_vivobook_flip_grey';
    }
    if (n.includes('vivobook s14') || n.includes('s 14')) {
      return 'asus_vivobook_s14_silver';
    }
    if (n.includes('vivobook go')) {
      if (n.includes('black') || n.includes('green grey')) {
        return 'asus_vivobook_go_black';
      }
      return 'asus_vivobook_go_silver';
    }
    if (n.includes('vivobook 14') || n.includes('vivobook')) {
      if (n.includes('quiet blue') || n.includes('blue')) {
        return 'asus_vivobook_14_blue';
      }
      return 'asus_vivobook_go_silver';
    }
    return 'asus_vivobook_go_silver';
  }

  // 4. BRAND: LENOVO
  if (brand === 'lenovo') {
    // 4A. Lenovo Monitors
    if (category === 'monitors' || n.includes('monitor') || sku.startsWith('67') || sku.startsWith('68') || sku.startsWith('61')) {
      if (n.includes('portable') || n.includes('l16')) return 'lenovo_monitor_portable';
      if (n.includes('34w') || n.includes('34wd')) return 'lenovo_monitor_ultrawide';
      if (n.includes('loq 27q') || n.includes('loq 32q')) return 'lenovo_monitor_loq_27q';
      if (n.includes('loq')) return 'lenovo_monitor_loq_27';
      if (n.includes('legion 27q') || n.includes('pro 27') || n.includes('oled')) return 'lenovo_monitor_legion_27q';
      if (n.includes('legion') || n.includes('r27s')) return 'lenovo_monitor_legion_25';
      if (n.includes('l22')) return 'lenovo_monitor_l22';
      if (n.includes('l24d')) return 'lenovo_monitor_l24d';
      if (n.includes('l24')) return 'lenovo_monitor_l24';
      if (n.includes('l27q')) return 'lenovo_monitor_l27q';
      if (n.includes('l27')) return 'lenovo_monitor_l27';
      if (n.includes('d19')) return 'lenovo_monitor_d19';
      return 'lenovo_monitor_l24';
    }

    // 4B. Lenovo All-in-One & Desktops
    if (category === 'all-in-one-pcs' || n.includes('aio') || n.includes('a100')) {
      if (n.includes('cloud grey') || n.includes('cloud')) return 'lenovo_aio_cloudgrey';
      return 'lenovo_aio_lunagrey';
    }
    if (category === 'desktops' || n.includes('tower')) {
      return 'lenovo_tower';
    }

    // 4C. Lenovo Tablets & Stylus
    if (category === 'tablets' || n.includes('tab') || n.includes('motopad') || n.includes('pen')) {
      if (n.includes('legion tab')) {
        if (n.includes('glacier white') || n.includes('white')) return 'lenovo_legion_tab_white';
        return 'lenovo_legion_tab';
      }
      return 'lenovo_tab_plus';
    }

    // 4D. Lenovo Laptops
    if (n.includes('yoga')) {
      if (n.includes('seashell') || n.includes('silver') || n.includes('aura edition')) {
        return 'lenovo_yoga_seashell';
      }
      return 'lenovo_yoga_teal';
    }
    if (n.includes('legion')) {
      return 'lenovo_legion_laptop';
    }
    if (n.includes('loq')) {
      return 'lenovo_loq_laptop';
    }
    if (n.includes('ideapad 5') || n.includes('flex 5') || n.includes('slim 5')) {
      if (n.includes('blue') || n.includes('abyss')) return 'lenovo_ideapad_slim_5_blue';
      return 'lenovo_ideapad_slim_5';
    }
    if (n.includes('ideapad 3') || n.includes('slim 3') || n.includes('ideapad')) {
      if (n.includes('cosmic blue') || n.includes('abyss blue') || n.includes('blue')) {
        return 'lenovo_ideapad_slim_3_blue';
      }
      return 'lenovo_ideapad_slim_3_grey';
    }
    return 'lenovo_ideapad_slim_3_grey';
  }

  // 5. OTHER BRANDS
  if (brand === 'motorola') return 'lenovo_tab_plus';
  return 'lenovo_ideapad_slim_3_grey';
}

async function run() {
  console.log('=== Step 1: Uploading Real Official Photos to Supabase Storage ===');
  const uploadedUrls = {};

  for (const [key, asset] of Object.entries(FAMILY_ASSETS)) {
    try {
      // Check if file is already in storage public url
      const { data: pubUrlData } = client.storage.from('products').getPublicUrl(asset.fileName);
      uploadedUrls[key] = pubUrlData.publicUrl;

      // Always download and upsert to guarantee freshness & availability
      const buffer = await downloadBuffer(asset.url);
      const { error: uploadError } = await client.storage.from('products').upload(asset.fileName, buffer, {
        contentType: asset.contentType,
        upsert: true,
      });

      if (uploadError) {
        console.warn(`  Warning on upload for ${key}:`, uploadError.message);
      } else {
        console.log(`  Uploaded ${key} -> ${asset.fileName}`);
      }
    } catch (err) {
      console.error(`  Error processing ${key}:`, err.message);
    }
  }

  console.log('\n=== Step 2: Querying Products and Existing Images ===');
  const { data: products, error: prodErr } = await client
    .from('products')
    .select('id, name, sku, brand:brands(name), category:categories(slug)')
    .order('name');
  if (prodErr) throw prodErr;

  const { data: existingImages, error: imgErr } = await client
    .from('product_images')
    .select('id, product_id, url, is_primary');
  if (imgErr) throw imgErr;

  const imageByProductId = {};
  for (const img of existingImages) {
    if (!imageByProductId[img.product_id] || img.is_primary) {
      imageByProductId[img.product_id] = img;
    }
  }

  console.log(`Total Products: ${products.length}`);
  console.log(`Existing Images: ${existingImages.length}`);

  console.log('\n=== Step 3: Attaching & Correcting Product Images ===');
  let insertedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  for (const p of products) {
    const familyKey = determineFamily(p);
    const expectedUrl = uploadedUrls[familyKey];
    if (!expectedUrl) {
      continue;
    }

    const currentImage = imageByProductId[p.id];

    if (!currentImage) {
      // Insert new image
      const { error: insErr } = await client.from('product_images').insert({
        product_id: p.id,
        url: expectedUrl,
        alt_text: p.name,
        is_primary: true,
        display_order: 0,
      });

      if (insErr) {
        console.error(`Failed to insert for [${p.sku}] ${p.name}:`, insErr.message);
      } else {
        insertedCount++;
        console.log(`[INSERT ${insertedCount}] [${p.sku}] ${p.name} -> ${familyKey}`);
      }
    } else {
      // Check if URL matches expected variant
      const currentFileName = currentImage.url.split('/').pop();
      const expectedFileName = expectedUrl.split('/').pop();

      // Don't override special one-offs (like Apple/Samsung or user-defined uuid filenames) unless it's a known generic lenovo that needs color fix
      const isKnownMismatch = (
        (p.name.toLowerCase().includes('seashell') && currentFileName.includes('yoga-7-2in1')) ||
        (p.name.toLowerCase().includes('glacier white') && currentFileName.includes('legion-tab.jpg')) ||
        (p.name.toLowerCase().includes('cloud grey') && currentFileName === 'official-lenovo-ideacentre-aio-24irh9.png') ||
        ((p.name.toLowerCase().includes('cosmic blue') || p.name.toLowerCase().includes('abyss blue')) && currentFileName === 'official-lenovo-ideapad-slim-3.png')
      );

      if (isKnownMismatch) {
        const { error: updErr } = await client
          .from('product_images')
          .update({ url: expectedUrl, alt_text: p.name })
          .eq('id', currentImage.id);

        if (updErr) {
          console.error(`Failed to update for [${p.sku}] ${p.name}:`, updErr.message);
        } else {
          updatedCount++;
          console.log(`[UPDATE COLOR VARIANT ${updatedCount}] [${p.sku}] ${p.name}`);
          console.log(`   From: ${currentFileName}`);
          console.log(`   To:   ${expectedFileName}`);
        }
      } else {
        unchangedCount++;
      }
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 FINISHED PRODUCT IMAGE PROCESSING`);
  console.log(`- New Images Inserted: ${insertedCount}`);
  console.log(`- Color Variant Corrections: ${updatedCount}`);
  console.log(`- Preserved / Already Correct: ${unchangedCount}`);
  console.log(`- Total Products Processed: ${products.length}`);
  console.log('======================================================');
}

run().catch(console.error);
