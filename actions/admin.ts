'use server'

import { AdminService } from '@/services/admin.service'
import { getAdminAccess } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { EcommerceReport } from '@/lib/admin-reports'
import { hasConfirmedImportPriceMapping, isValidImportPrices } from '@/lib/admin-product-import'

const adminService = new AdminService()

export async function getDashboardStatsAction() {
  const { user, isAdmin } = await getAdminAccess()
  if (!user) throw new Error("Unauthorized")
  if (!isAdmin) throw new Error("Forbidden")
  
  return await adminService.getDashboardStats()
}

export async function getAdminEcommerceReportAction(days: number): Promise<EcommerceReport> {
  await requireAdmin()
  if (![7, 30, 90, 365].includes(days)) throw new Error('Periode laporan tidak valid.')
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_admin_ecommerce_report', { p_days: days })
  if (error) throw new Error('Laporan belum tersedia. Pastikan migrasi analitik ecommerce sudah diterapkan.')
  return data as EcommerceReport
}

async function requireAdmin() {
  const { user, isAdmin } = await getAdminAccess()
  if (!user || !isAdmin) throw new Error('Forbidden')
  return { user }
}

async function requireSuperAdmin() {
  const { user, role } = await getAdminAccess()
  if (!user || role !== 'super_admin') throw new Error('Forbidden')
  return { user }
}

export async function getAdminProductsAction() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('products')
    .select('*, categories(name), brands(name), product_images(*), product_specifications(*), product_variants(*)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAdminProductOptionsAction() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('products')
    .select('id, name, status, categories(name), brands(name)')
    .eq('status', 'published')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAdminOrdersAction() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('orders')
    .select('id, order_number, status, total_amount, shipping_amount, grand_total, created_at, courier, shipping_address, users(full_name, phone), order_items(id, product_name, price, quantity, variant_details, products(product_images(url, is_primary))), payments(id, amount, status, payment_method)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAdminOrderNotificationsAction() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ count, error: countError }, { data: latest, error: latestError }] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('id, order_number').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (countError || latestError) throw new Error(countError?.message ?? latestError?.message)
  return { count: count ?? 0, latestId: latest?.id ?? null, latestOrderNumber: latest?.order_number ?? null }
}

export async function updateAdminOrderStatusAction(formData: FormData) {
  const statusCorrection = formData.get('status_correction') === 'on'
  if (statusCorrection) {
    await requireSuperAdmin()
    if (formData.get('confirm_correction') !== 'on') throw new Error('Konfirmasi koreksi status terlebih dahulu.')
  } else {
    await requireAdmin()
  }
  const id = String(formData.get('id') ?? '').trim()
  const status = String(formData.get('status') ?? '')
  if (!id || !['pending', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'].includes(status)) throw new Error('Status pesanan tidak valid.')
  const requestedPickup = statusCorrection && formData.get('fulfillment_correction') === 'pickup'
  const supabase = await createClient()
  const { data: current, error: readError } = await supabase.from('orders').select('status, courier, payments(status)').eq('id', id).single()
  if (readError || !current) throw new Error('Pesanan tidak ditemukan.')
  // In a super-admin correction, choosing "Siap diambil di toko" also sets
  // pickup fulfillment. This avoids rejecting the form because its default
  // fulfillment choice was still "keep delivery".
  const correctToPickup = statusCorrection && current.courier !== 'pickup' && (requestedPickup || status === 'ready_for_pickup')
  if (correctToPickup) {
    const { error } = await supabase.rpc('super_admin_correct_order_pickup', { p_order_id: id, p_status: status })
    if (error) throw new Error(error.message)
    revalidatePath('/admin/orders')
    revalidatePath('/admin/reports')
    revalidatePath('/admin')
    revalidatePath('/profile')
    return
  }
  if (status === 'ready_for_pickup' && current.courier !== 'pickup') throw new Error('Untuk mengubah pesanan menjadi siap diambil, pilih koreksi penerimaan ke ambil di toko.')
  if (status === 'shipped' && current.courier === 'pickup') throw new Error('Pesanan ambil di toko tidak dapat ditandai sebagai dikirim.')
  const allowed: Record<string, string[]> = current.courier === 'pickup'
    ? { pending: ['cancelled'], processing: ['ready_for_pickup', 'cancelled'], ready_for_pickup: ['delivered'], delivered: [], cancelled: [] }
    : { pending: ['cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] }
  if (!statusCorrection && current.status !== status && !allowed[current.status]?.includes(status)) throw new Error('Perubahan status tidak valid. Gunakan koreksi khusus Super Admin jika status pesanan salah.')
  const paymentRows = Array.isArray(current.payments) ? current.payments : []
  if (['processing', 'shipped', 'ready_for_pickup', 'delivered'].includes(status) && !paymentRows.some((payment) => payment.status === 'success')) throw new Error('Konfirmasi pembayaran berhasil sebelum memproses atau mengirim pesanan.')
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/orders')
  revalidatePath('/admin/reports')
  revalidatePath('/admin')
  revalidatePath('/profile')
}

export async function updateAdminOrderDetailsAction(formData: FormData) {
  await requireSuperAdmin()
  const id = String(formData.get('order_id') ?? '').trim()
  const recipientName = String(formData.get('recipient_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (!id || recipientName.length < 2 || !/^[0-9+()\s-]{8,24}$/.test(phone)) throw new Error('Nama penerima dan nomor telepon harus diisi dengan benar.')
  const supabase = await createClient()
  const { data: order, error: readError } = await supabase.from('orders').select('courier, shipping_address').eq('id', id).single()
  if (readError || !order) throw new Error('Pesanan tidak ditemukan.')
  const current = order.shipping_address && typeof order.shipping_address === 'object' ? order.shipping_address as Record<string, unknown> : {}
  const updatedAddress: Record<string, unknown> = { ...current, recipient_name: recipientName, phone }
  if (order.courier === 'pickup') {
    updatedAddress.pickup_location = String(formData.get('pickup_location') ?? '').trim() || 'Toko Next Solution'
  } else {
    const streetAddress = String(formData.get('street_address') ?? '').trim()
    const city = String(formData.get('city') ?? '').trim()
    const province = String(formData.get('province') ?? '').trim()
    const postalCode = String(formData.get('postal_code') ?? '').trim()
    if (streetAddress.length < 5 || city.length < 2 || province.length < 2 || postalCode.length < 3) throw new Error('Alamat pengiriman belum lengkap.')
    Object.assign(updatedAddress, { street_address: streetAddress, city, province, postal_code: postalCode })
  }
  const { error } = await supabase.from('orders').update({ shipping_address: updatedAddress }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/orders')
  revalidatePath('/profile')
}

export async function updateAdminPaymentStatusAction(formData: FormData) {
  await requireAdmin()
  const orderId = String(formData.get('order_id') ?? '').trim()
  const nextStatus = String(formData.get('payment_status') ?? '')
  if (!orderId || !['success', 'failed', 'refunded'].includes(nextStatus)) throw new Error('Status pembayaran tidak valid.')
  const supabase = await createClient()
  const { data: order, error: orderError } = await supabase.from('orders').select('status').eq('id', orderId).single()
  if (orderError || !order) throw new Error('Pesanan tidak ditemukan.')
  const allowedPreviousStatuses = nextStatus === 'success'
    ? ['pending', 'failed', 'success']
    : nextStatus === 'failed' ? ['pending'] : ['success']
  const expectedOrderStatus = nextStatus === 'refunded' ? 'cancelled' : 'pending'
  if (order.status !== expectedOrderStatus) throw new Error('Status pembayaran tidak cocok dengan status pesanan.')
  const { data: payment, error: paymentReadError } = await supabase.from('payments').select('id, status').eq('order_id', orderId).in('status', allowedPreviousStatuses).limit(1).maybeSingle()
  if (paymentReadError || !payment) throw new Error('Pembayaran tidak ditemukan atau sudah diproses.')
  if (payment.status !== nextStatus) {
    const { data: updatedPayment, error } = await supabase.from('payments').update({ status: nextStatus }).eq('id', payment.id).eq('status', payment.status).select('id').maybeSingle()
    if (error) throw new Error(error.message)
    if (!updatedPayment) throw new Error('Status pembayaran baru saja berubah. Muat ulang pesanan lalu coba lagi.')
  }
  if (nextStatus === 'success') {
    const { error: orderUpdateError } = await supabase.from('orders').update({ status: 'processing' }).eq('id', orderId).eq('status', 'pending')
    if (orderUpdateError) throw new Error(`Pembayaran terkonfirmasi, tetapi status pesanan gagal diperbarui: ${orderUpdateError.message}`)
  }
  revalidatePath('/admin/orders')
  revalidatePath('/admin/reports')
  revalidatePath('/admin')
  revalidatePath('/profile')
}

export async function getAdminCustomersAction() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('users')
    .select('id, full_name, phone, role, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createAdminManagedAccountAction(input: { fullName: string; email: string; phone: string; role: string }) {
  await requireSuperAdmin()
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()
  const role = input.role
  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['customer', 'admin', 'super_admin'].includes(role)) {
    return { error: 'Periksa nama, email, dan role yang dipilih.' }
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return { error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di environment server.' }
  const adminClient = createSupabaseAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } })
  if (error || !data.user) return { error: error?.message ?? 'Undangan akun gagal dibuat.' }
  const { error: profileError } = await adminClient.from('users').update({ full_name: fullName, phone: phone || null, role }).eq('id', data.user.id)
  if (profileError) return { error: `Akun terbuat, tetapi profil gagal diperbarui: ${profileError.message}` }
  revalidatePath('/admin/customers')
  return { success: true }
}

export async function updateAdminManagedAccountRoleAction(formData: FormData) {
  try {
    const { user } = await requireSuperAdmin()
    const id = String(formData.get('id') ?? '')
    const role = String(formData.get('role') ?? '')
    if (!id || !['customer', 'admin', 'super_admin'].includes(role)) return { error: 'Role akun tidak valid.' }
    if (id === user.id && role !== 'super_admin') return { error: 'Role akun yang sedang digunakan tidak dapat diturunkan dari halaman ini.' }
    const supabase = await createClient()
    let { error } = await supabase.rpc('admin_update_user_role', {
      p_user_id: id,
      p_role: role,
    })
    if (error && (error.code === 'PGRST202' || error.message?.includes('admin_update_user_role'))) {
      const fallback = await supabase.from('users').update({ role }).eq('id', id)
      error = fallback.error
    }
    if (error) return { error: error.message }
    revalidatePath('/admin/customers')
    return { success: true }
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : 'Role gagal diperbarui.' }
  }
}

export async function saveAdminProductAction(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const sku = String(formData.get('sku') ?? '').trim()
  const price = Number(formData.get('price'))
  const discountEnabled = formData.get('discount_enabled') === 'on'
  const discountRaw = String(formData.get('discount_price') ?? '').trim()
  const discountPrice = discountEnabled && discountRaw ? Number(discountRaw) : null
  const stock = Number(formData.get('stock'))
  const categoryId = String(formData.get('category_id') ?? '')
  const brandId = String(formData.get('brand_id') ?? '')
  const status = String(formData.get('status') ?? 'published')
  const isBestSeller = formData.get('is_best_seller') === 'on'
  const isNewArrival = formData.get('is_new_arrival') === 'on'
  const imageUrl = String(formData.get('image_url') ?? '').trim()
  let imageUrls: string[] | null = null
  const imageUrlsRaw = formData.get('image_urls')
  if (typeof imageUrlsRaw === 'string') {
    try {
      const parsed: unknown = JSON.parse(imageUrlsRaw)
      if (!Array.isArray(parsed) || parsed.some((url) => typeof url !== 'string' || !/^https:\/\//i.test(url))) throw new Error()
      imageUrls = [...new Set(parsed.map((url: string) => url.trim()).filter(Boolean))].slice(0, 8)
    } catch { throw new Error('Daftar foto produk tidak valid. Gunakan tautan HTTPS atau upload gambar.') }
  }
  let specifications: { key: string; value: string }[] = []
  const specificationsRaw = formData.get('specifications')
  if (typeof specificationsRaw === 'string') {
    try {
      const parsed: unknown = JSON.parse(specificationsRaw)
      if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item.key !== 'string' || typeof item.value !== 'string')) throw new Error()
      specifications = parsed.map((item) => ({ key: item.key.trim(), value: item.value.trim() })).filter((item) => item.key && item.value).slice(0, 50)
    } catch { throw new Error('Daftar spesifikasi tidak valid.') }
  }
  type VariantInput = { id?: string; sku?: string; color: string; ram: string; storage: string; price: number | null; discount_price: number | null; stock: number }
  let variants: VariantInput[] = []
  const variantsRaw = formData.get('variants')
  if (typeof variantsRaw === 'string') {
    try {
      const parsed: unknown = JSON.parse(variantsRaw)
      if (!Array.isArray(parsed) || parsed.length > 50 || parsed.some((item) => !item || typeof item.color !== 'string' || typeof item.ram !== 'string' || typeof item.storage !== 'string' || typeof item.stock !== 'number')) throw new Error()
      variants = parsed.map((item) => ({
        ...(typeof item.id === 'string' ? { id: item.id } : {}),
        sku: typeof item.sku === 'string' ? item.sku.trim() : '',
        color: item.color.trim(), ram: item.ram.trim(), storage: item.storage.trim(),
        price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null,
        discount_price: typeof item.discount_price === 'number' && Number.isFinite(item.discount_price) ? item.discount_price : null,
        stock: item.stock,
      }))
      if (variants.some((item) => (!item.color && !item.ram && !item.storage) || !Number.isInteger(item.stock) || item.stock < 0 || (item.price !== null && item.price < 0) || (item.discount_price !== null && (item.discount_price <= 0 || item.discount_price >= (item.price ?? price))))) throw new Error()
      const optionKeys = variants.map((item) => [item.color, item.ram, item.storage].map((value) => value.toLowerCase()).join('|'))
      if (new Set(optionKeys).size !== optionKeys.length) throw new Error()
      const variantSkus = variants.map((item) => item.sku?.toLowerCase()).filter(Boolean)
      if (new Set(variantSkus).size !== variantSkus.length) throw new Error()
    } catch { throw new Error('Daftar varian tidak valid. Pastikan setiap varian punya warna, RAM, atau storage dan stok yang benar.') }
  }
  const id = String(formData.get('id') ?? '').trim()
  if (!name || !description || !categoryId || !brandId || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (discountEnabled && (!discountRaw || discountPrice === null || !Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= price)) || !['draft', 'published', 'archived'].includes(status)) {
    throw new Error('Periksa nama, deskripsi, kategori, brand, harga, stok, dan status produk.')
  }
  const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const supabase = await createClient()
  const totalStock = variants.length ? variants.reduce((sum, variant) => sum + variant.stock, 0) : stock
  let existingVariants: { id: string; sku: string | null }[] = []
  if (typeof variantsRaw === 'string' && id) {
    const { data, error } = await supabase.from('product_variants').select('id, sku').eq('product_id', id)
    if (error) throw new Error(error.message)
    existingVariants = data ?? []
    const existingIds = new Set(existingVariants.map((variant) => variant.id))
    if (variants.some((variant) => variant.id && !existingIds.has(variant.id))) throw new Error('Varian produk tidak dikenal.')
    const retainedIds = new Set(variants.map((variant) => variant.id).filter((variantId): variantId is string => Boolean(variantId)))
    const removedIds = existingVariants.map((variant) => variant.id).filter((variantId) => !retainedIds.has(variantId))
    if (removedIds.length) {
      const { data: referencedOrderItem, error: orderItemError } = await supabase.from('order_items').select('id').in('variant_id', removedIds).limit(1).maybeSingle()
      if (orderItemError) throw new Error(orderItemError.message)
      if (referencedOrderItem) throw new Error('Varian ini sudah tercatat di riwayat pesanan, jadi tidak dapat dihapus. Ubah stoknya menjadi 0 atau arsipkan produknya.')
    }
  }
  const variantSkus = [...new Set(variants.map((variant) => variant.sku).filter((value): value is string => Boolean(value)))]
  if (variantSkus.length) {
    const { data: matchingSkus, error: skuReadError } = await supabase.from('product_variants').select('id, sku').in('sku', variantSkus)
    if (skuReadError) throw new Error(skuReadError.message)
    if ((matchingSkus ?? []).some((existing) => {
      const submitted = variants.find((variant) => variant.sku?.toLowerCase() === existing.sku?.toLowerCase())
      return !submitted || submitted.id !== existing.id
    })) throw new Error('SKU varian sudah dipakai varian lain. Gunakan SKU unik untuk setiap varian.')
  }
  const payload = { name, slug: id ? undefined : `${slug}-${crypto.randomUUID().slice(0, 8)}`, description, sku: sku || null, price, discount_price: discountPrice, stock: totalStock, category_id: categoryId, brand_id: brandId, status, is_best_seller: isBestSeller, is_new_arrival: isNewArrival }
  let productId = id
  if (id) {
    const { error } = await supabase.from('products').update({ ...payload, slug: undefined }).eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select('id').single()
    if (error) throw new Error(error.message)
    productId = data.id
  }
  if (imageUrls !== null || imageUrl) {
    const urls = imageUrls ?? [imageUrl]
    const { data: existingImages, error: readImagesError } = await supabase.from('product_images').select('id, url').eq('product_id', productId)
    if (readImagesError) throw new Error(readImagesError.message)
    const retainedIds: string[] = []
    for (const [display_order, url] of urls.entries()) {
      const existing = existingImages?.find((image) => image.url === url && !retainedIds.includes(image.id))
      if (existing) {
        const { error } = await supabase.from('product_images').update({ is_primary: display_order === 0, display_order }).eq('id', existing.id)
        if (error) throw new Error(error.message)
        retainedIds.push(existing.id)
      } else {
        const { data, error } = await supabase.from('product_images').insert({ product_id: productId, url, is_primary: display_order === 0, display_order }).select('id').single()
        if (error) throw new Error(error.message)
        retainedIds.push(data.id)
      }
    }
    const removedIds = existingImages?.filter((image) => !retainedIds.includes(image.id)).map((image) => image.id) ?? []
    if (removedIds.length) {
      const { error } = await supabase.from('product_images').delete().in('id', removedIds)
      if (error) throw new Error(error.message)
    }
  }
  if (typeof specificationsRaw === 'string') {
    const { error: deleteSpecificationsError } = await supabase.from('product_specifications').delete().eq('product_id', productId)
    if (deleteSpecificationsError) throw new Error(deleteSpecificationsError.message)
    if (specifications.length) {
      const { error: insertSpecificationsError } = await supabase.from('product_specifications').insert(specifications.map((specification, display_order) => ({ product_id: productId, ...specification, display_order })))
      if (insertSpecificationsError) throw new Error(insertSpecificationsError.message)
    }
  }
  if (typeof variantsRaw === 'string') {
    const existingIds = new Set((existingVariants ?? []).map((variant) => variant.id))
    const retainedIds: string[] = []
    for (const variant of variants) {
      const variantPayload = { sku: variant.sku || null, color: variant.color, ram: variant.ram, storage: variant.storage, price: variant.price, discount_price: variant.discount_price, stock: variant.stock }
      if (variant.id) {
        if (!existingIds.has(variant.id)) throw new Error('Varian produk tidak dikenal.')
        const { error } = await supabase.from('product_variants').update(variantPayload).eq('id', variant.id).eq('product_id', productId)
        if (error) throw new Error(error.message)
        retainedIds.push(variant.id)
      } else {
        const { data, error } = await supabase.from('product_variants').insert({ ...variantPayload, product_id: productId }).select('id').single()
        if (error) throw new Error(error.message)
        retainedIds.push(data.id)
      }
    }
    const removedIds = (existingVariants ?? []).map((variant) => variant.id).filter((variantId) => !retainedIds.includes(variantId))
    if (removedIds.length) {
      const { error } = await supabase.from('product_variants').delete().in('id', removedIds).eq('product_id', productId)
      if (error) throw new Error(error.message)
    }
  }
  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/')
  return { success: true }
}

export async function bulkImportAdminProductsAction(products: unknown) {
  await requireAdmin()
  if (!Array.isArray(products) || products.length < 1 || products.length > 500) throw new Error('Impor dapat memuat 1 sampai 500 produk sekaligus.')
  for (const product of products) {
    if (!product || typeof product !== 'object' || typeof product.name !== 'string' || !product.name.trim() || typeof product.sku !== 'string' || typeof product.description !== 'string' || !product.description.trim() || typeof product.category !== 'string' || !product.category.trim() || typeof product.brand !== 'string' || !product.brand.trim() || !isValidImportPrices(product.price, product.discount_price ?? null) || !hasConfirmedImportPriceMapping(product) || !Array.isArray(product.variants) || !Array.isArray(product.specifications) || !['create', 'update'].includes(product.importAction)) throw new Error('Data impor tidak valid, harga promo tidak valid, atau konfirmasi harga belum lengkap. Periksa setiap baris preview.')
    if (product.errors?.length || product.variants.length > 50 || product.specifications.length > 50) throw new Error('Data memiliki error atau jumlah varian/spesifikasi melewati batas.')
    if (product.importAction === 'update' && !product.targetProductId) throw new Error('Pilih produk database yang cocok sebelum update.')
  }
  const supabase = await createClient()
  let { data, error } = await supabase.rpc('bulk_import_products_v2', { p_products: products })
  if (error && (error.code === 'PGRST202' || error.message?.includes('bulk_import_products_v2'))) {
    const onlyCreates = products.every((p: { importAction?: string }) => !p.importAction || p.importAction === 'create')
    if (onlyCreates) {
      const v1Result = await supabase.rpc('bulk_import_products', { p_products: products })
      data = v1Result.data
      error = v1Result.error
    }
  }
  if (error) throw new Error(error.message)
  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/')
  return { success: true, count: Number(data) }
}

export async function deleteAdminProductAction(productId: string) {
  await requireAdmin()
  if (!productId) throw new Error('ID produk tidak valid.')
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/')
  return { success: true }
}

export async function getAdminCategoriesAction() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveAdminCategoryAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const imageUrl = String(formData.get('image_url') ?? '').trim()
  if (name.length < 2 || (imageUrl && !/^https:\/\//i.test(imageUrl))) throw new Error('Nama kategori atau URL gambar tidak valid.')
  const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const supabase = await createClient()
  const payload = { name, description: description || null, image_url: imageUrl || null }
  const result = id
    ? await supabase.from('categories').update(payload).eq('id', id)
    : await supabase.from('categories').insert({ ...payload, slug })
  if (result.error) throw new Error(result.error.message)
  revalidatePath('/admin/categories')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteAdminCategoryAction(id: string) {
  await requireAdmin()
  if (!id) throw new Error('ID kategori tidak valid.')
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/categories')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getAdminBrandsAction() {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('brands').select('id,name,slug,logo_url').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveAdminBrandAction(formData: FormData) {
  await requireSuperAdmin()
  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const logoUrl = String(formData.get('logo_url') ?? '').trim()
  if (name.length < 2 || name.length > 80 || (logoUrl && !/^https:\/\//i.test(logoUrl))) throw new Error('Nama brand atau URL logo tidak valid.')
  const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const supabase = await createClient()
  const result = id
    ? await supabase.from('brands').update({ name, logo_url: logoUrl || null }).eq('id', id)
    : await supabase.from('brands').insert({ name, slug, logo_url: logoUrl || null })
  if (result.error) throw new Error(result.error.message)
  revalidatePath('/admin/brands')
  revalidatePath('/')
  revalidatePath('/brands')
  return { success: true }
}

export async function deleteAdminBrandAction(id: string) {
  await requireSuperAdmin()
  if (!id) throw new Error('ID brand tidak valid.')
  const supabase = await createClient()
  const { error } = await supabase.from('brands').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/brands')
  revalidatePath('/')
  return { success: true }
}

export async function getLandingContentAction() {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('banners').select('*').order('placement').order('display_order')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveStorefrontSettingsAction(settings: unknown) {
  await requireSuperAdmin()
  if (!settings || typeof settings !== 'object' || JSON.stringify(settings).length > 30000) throw new Error('Pengaturan toko tidak valid.')
  const catalogPageSize = (settings as { admin?: { catalogPageSize?: unknown } }).admin?.catalogPageSize
  if (catalogPageSize !== undefined && ![24, 48, 100, 200].includes(Number(catalogPageSize))) throw new Error('Jumlah produk per halaman harus 24, 48, 100, atau 200.')
  const store = (settings as { store?: { branches?: unknown; email?: unknown } }).store
  if (typeof store?.email === 'string' && store.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.email)) throw new Error('Email toko tidak valid.')
  if (Array.isArray(store?.branches)) {
    for (const branch of store.branches) {
      if (!branch || typeof branch !== 'object') throw new Error('Data cabang tidak valid.')
      const item = branch as { name?: unknown; address?: unknown; maps_url?: unknown }
      if (typeof item.name !== 'string' || !item.name.trim() || typeof item.address !== 'string' || !item.address.trim()) throw new Error('Setiap cabang perlu nama dan alamat.')
      if (typeof item.maps_url === 'string' && item.maps_url) {
        let url: URL
        try { url = new URL(item.maps_url) } catch { throw new Error('Link Maps tidak valid.') }
        if (url.protocol !== 'https:' || !['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) throw new Error('Gunakan link Google Maps HTTPS yang valid.')
      }
    }
  }
  const pickupInfo = (settings as { pickup_info?: { store_name?: unknown; store_address?: unknown; maps_url?: unknown } }).pickup_info
  if (pickupInfo) {
    if (typeof pickupInfo.store_name !== 'string' || pickupInfo.store_name.length > 80 || typeof pickupInfo.store_address !== 'string' || pickupInfo.store_address.length > 300 || typeof pickupInfo.maps_url !== 'string') throw new Error('Informasi lokasi pickup tidak valid.')
    if (pickupInfo.maps_url) {
      let url: URL
      try { url = new URL(pickupInfo.maps_url) } catch { throw new Error('Link Maps pickup tidak valid.') }
      if (url.protocol !== 'https:' || !['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) throw new Error('Gunakan link Google Maps HTTPS yang valid.')
    }
  }
  const bankTransfer = (settings as { bank_transfer?: unknown }).bank_transfer
  if (bankTransfer !== undefined && !Array.isArray(bankTransfer)) throw new Error('Data rekening bank tidak valid.')
  if (Array.isArray(bankTransfer)) {
    for (const b of bankTransfer) {
      if (!b || typeof b !== 'object') throw new Error('Data rekening tidak valid.')
      const item = b as { bank_name?: unknown; account_number?: unknown; account_holder?: unknown }
      if (typeof item.bank_name !== 'string' || !item.bank_name.trim()) throw new Error('Nama bank harus diisi.')
      if (typeof item.account_number !== 'string' || !item.account_number.trim()) throw new Error('Nomor rekening harus diisi.')
      if (typeof item.account_holder !== 'string' || !item.account_holder.trim()) throw new Error('Nama pemilik rekening harus diisi.')
    }
  }
  const supabase = await createClient()
  const { error } = await supabase.from('storefront_settings').upsert({ id: 'main', settings }, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/promo')
  revalidatePath('/admin/content')
  revalidatePath('/checkout')
  return { success: true }
}

export async function getAdminHomepageItemsAction() {
  await requireSuperAdmin()
  const supabase = await createClient()
  const [faqs, testimonials] = await Promise.all([
    supabase.from('faqs').select('*').order('display_order'),
    supabase.from('testimonials').select('*').order('display_order'),
  ])
  if (faqs.error) throw new Error(faqs.error.message)
  if (testimonials.error) throw new Error(testimonials.error.message)
  return { faqs: faqs.data ?? [], testimonials: testimonials.data ?? [] }
}

export async function saveHomepageItemAction(formData: FormData) {
  await requireSuperAdmin()
  const type = String(formData.get('type') ?? '')
  const id = String(formData.get('id') ?? '').trim()
  const isActive = formData.get('is_active') === 'on'
  const order = Number(formData.get('display_order') ?? 0)
  if (!['faq', 'testimonial'].includes(type) || !Number.isInteger(order) || order < 0) throw new Error('Jenis konten atau urutan tidak valid.')
  const supabase = await createClient()
  let result
  if (type === 'faq') {
    const question = String(formData.get('question') ?? '').trim()
    const answer = String(formData.get('answer') ?? '').trim()
    if (!question || !answer) throw new Error('Pertanyaan dan jawaban wajib diisi.')
    const payload = { question, answer, display_order: order, is_active: isActive }
    result = id ? await supabase.from('faqs').update(payload).eq('id', id) : await supabase.from('faqs').insert(payload)
  } else {
    const name = String(formData.get('name') ?? '').trim()
    const role = String(formData.get('role') ?? '').trim()
    const content = String(formData.get('content') ?? '').trim()
    const rating = Number(formData.get('rating') ?? 5)
    if (!name || !content || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Nama, ulasan, dan rating 1–5 wajib diisi.')
    const payload = { name, role: role || null, content, rating, display_order: order, is_active: isActive }
    result = id ? await supabase.from('testimonials').update(payload).eq('id', id) : await supabase.from('testimonials').insert(payload)
  }
  if (result.error) throw new Error(result.error.message)
  revalidatePath('/admin/content')
  revalidatePath('/')
  return { success: true }
}

export async function deleteHomepageItemAction(type: 'faq' | 'testimonial', id: string) {
  await requireSuperAdmin()
  const table = type === 'faq' ? 'faqs' : type === 'testimonial' ? 'testimonials' : null
  if (!table || !id) throw new Error('Konten tidak valid.')
  const supabase = await createClient()
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
  revalidatePath('/')
  return { success: true }
}

export async function saveLandingBannerAction(formData: FormData) {
  await requireSuperAdmin()
  const id = String(formData.get('id') ?? '').trim()
  const placement = String(formData.get('placement') ?? 'hero')
  const title = String(formData.get('title') ?? '').trim()
  const subtitle = String(formData.get('subtitle') ?? '').trim()
  const headline = String(formData.get('headline') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const buttonLabel = String(formData.get('button_label') ?? '').trim()
  const imageUrl = String(formData.get('image_url') ?? '').trim()
  const targetUrl = String(formData.get('target_url') ?? '').trim()
  const displayOrder = Number(formData.get('display_order') ?? 0)
  const isActive = formData.get('is_active') === 'on'
  if (!['hero', 'promo'].includes(placement) || !title || !headline || !description || !buttonLabel || !/^https:\/\//i.test(imageUrl) || !Number.isInteger(displayOrder) || displayOrder < 0 || (targetUrl && !targetUrl.startsWith('/'))) {
    throw new Error('Lengkapi judul, konten, gambar HTTPS, urutan, dan tautan lokal yang valid.')
  }
  const supabase = await createClient()
  const payload = { placement, title, subtitle: subtitle || null, headline, description, button_label: buttonLabel, image_url: imageUrl, target_url: targetUrl || null, display_order: displayOrder, is_active: isActive }
  const result = id ? await supabase.from('banners').update(payload).eq('id', id) : await supabase.from('banners').insert(payload)
  if (result.error) throw new Error(result.error.message)
  revalidatePath('/admin/content')
  revalidatePath('/')
  return { success: true }
}

export async function deleteLandingBannerAction(id: string) {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
  revalidatePath('/')
  return { success: true }
}

export async function uploadAdminImageAction(formData: FormData) {
  await requireAdmin()
  const file = formData.get('file')
  const bucket = String(formData.get('bucket') ?? '')
  if (!(file instanceof File) || !['products', 'brands', 'banners'].includes(bucket)) throw new Error('File gambar tidak valid.')
  if (file.type !== 'image/webp' || file.size > 800 * 1024) throw new Error('Gambar harus WebP hasil kompresi dengan ukuran maksimal 800 KB.')
  const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${crypto.randomUUID()}.${extension}`
  const supabase = await createClient()
  const { error } = await supabase.storage.from(bucket).upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, cacheControl: '3600', upsert: false })
  if (error) throw new Error(error.message)
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  let publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  if (!publicUrl.startsWith('http')) {
    publicUrl = `${baseUrl.replace(/\/$/, '')}/storage/${publicUrl.replace(/^\//, '')}`
  }
  return { url: publicUrl }
}

export async function cleanupUnusedStorageAction() {
  await requireSuperAdmin()
  const supabase = await createClient()
  const buckets = ['products', 'brands', 'banners'] as const
  const [categories, brands, banners, productImages] = await Promise.all([
    supabase.from('categories').select('image_url').not('image_url', 'is', null),
    supabase.from('brands').select('logo_url').not('logo_url', 'is', null),
    supabase.from('banners').select('image_url').not('image_url', 'is', null),
    supabase.from('product_images').select('url').not('url', 'is', null),
  ])

  const referenceError = categories.error ?? brands.error ?? banners.error ?? productImages.error
  if (referenceError) throw new Error(`Gagal memeriksa referensi gambar: ${referenceError.message}`)

  const usedUrls = new Set([
    ...(categories.data?.map(c => c.image_url) || []),
    ...(brands.data?.map(b => b.logo_url) || []),
    ...(banners.data?.map(b => b.image_url) || []),
    ...(productImages.data?.map(p => p.url) || []),
  ].filter(Boolean))

  let deletedCount = 0

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const getAbsoluteUrl = (bucket: string, path: string) => {
    let url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    if (!url.startsWith('http')) {
      url = `${baseUrl.replace(/\/$/, '')}/storage/${url.replace(/^\//, '')}`
    }
    return url
  }

  // Paginate because Storage.list returns at most one page by default.
  for (const bucket of buckets) {
    const files: { name: string }[] = []
    const pageSize = 100
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.storage.from(bucket).list('', { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new Error(`Gagal membaca bucket ${bucket}: ${error.message}`)
      const page = data ?? []
      files.push(...page.filter(file => file.name && file.name !== '.emptyFolderPlaceholder'))
      if (page.length < pageSize) break
    }

    const unused = files.filter(file => !usedUrls.has(getAbsoluteUrl(bucket, file.name))).map(file => file.name)
    for (let index = 0; index < unused.length; index += 100) {
      const { data, error } = await supabase.storage.from(bucket).remove(unused.slice(index, index + 100))
      if (error) throw new Error(`Gagal menghapus file di bucket ${bucket}: ${error.message}`)
      deletedCount += data?.length ?? Math.min(100, unused.length - index)
    }
  }
  return { success: true, deletedCount }
}
