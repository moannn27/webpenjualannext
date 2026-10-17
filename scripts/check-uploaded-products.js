const { createClient } = require('@supabase/supabase-js');
try {
  require('dotenv').config({ path: '.env.local' });
} catch {}

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyhooykvidzstnmaggku.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUpload() {
  const [{ data: brands }, { data: categories }, { data: products }] = await Promise.all([
    client.from('brands').select('id, name, slug'),
    client.from('categories').select('id, name, slug'),
    client.from('products').select('id, name, sku, stock, price, status, created_at, brand_id, category_id').order('created_at', { ascending: false }),
  ]);

  console.log('=== BRANDS ===');
  brands?.forEach(b => console.log(`- ${b.name} (${b.slug})`));

  console.log('\n=== CATEGORIES ===');
  categories?.forEach(c => console.log(`- ${c.name} (${c.slug})`));

  console.log('\n=== TOTAL PRODUCTS IN DB ===:', products?.length);

  const brandMap = new Map((brands || []).map(b => [b.id, b.name]));
  const catMap = new Map((categories || []).map(c => [c.id, c.name]));

  const byBrand = {};
  for (const p of (products || [])) {
    const bName = brandMap.get(p.brand_id) || 'Tanpa Brand';
    if (!byBrand[bName]) byBrand[bName] = [];
    byBrand[bName].push(p);
  }

  console.log('\n=== PRODUCTS BY BRAND ===');
  for (const [b, items] of Object.entries(byBrand)) {
    console.log(`\nBrand: ${b} (${items.length} produk)`);
    items.slice(0, 5).forEach(i => {
      console.log(`  - [${i.sku}] ${i.name} | Stok: ${i.stock} | Harga: Rp ${i.price.toLocaleString('id-ID')} | Status: ${i.status} | Dibuat: ${i.created_at.slice(0, 16)}`);
    });
    if (items.length > 5) console.log(`  ...dan ${items.length - 5} produk lainnya.`);
  }

  // Monitor check
  const monitors = (products || []).filter(p => p.name.toLowerCase().includes('monitor') || (catMap.get(p.category_id) || '').toLowerCase().includes('monitor'));
  console.log('\n=== MONITOR PRODUCTS === (Total: ' + monitors.length + ')');
  monitors.forEach(m => console.log(`  - [${m.sku}] ${m.name} | Stok: ${m.stock} | Brand: ${brandMap.get(m.brand_id)}`));
}

checkUpload().catch(console.error);

