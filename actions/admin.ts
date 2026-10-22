'use server'

import { AdminService } from '@/services/admin.service'
import { getAdminAccess } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient, type User } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { EcommerceReport } from '@/lib/admin-reports'
import { hasConfirmedImportPriceMapping, isValidImportPrices } from '@/lib/admin-product-import'
import { requireModulePermission, getCurrentAdminPermissions } from '@/lib/auth/permissions'
import { recordAdminActivity } from '@/lib/audit-log'
import { DEFAULT_FAQS } from '@/constants/defaultFaqs'

const adminService = new AdminService()

export async function getDashboardStatsAction(lowStockThreshold?: number) {
  const { user, isAdmin } = await getAdminAccess()
  if (!user) throw new Error("Unauthorized")
  if (!isAdmin) throw new Error("Forbidden")
  
  return await adminService.getDashboardStats(lowStockThreshold)
}

export async function getAdminEcommerceReportAction(days: number): Promise<EcommerceReport> {
  await requireModulePermission('reports')
  if (![7, 30, 90, 365].includes(days)) throw new Error('Periode laporan tidak valid.')
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_admin_ecommerce_report', { p_days: days })
  if (error) throw new Error('Laporan belum tersedia. Pastikan migrasi analitik ecommerce sudah diterapkan.')
  return data as EcommerceReport
}

export type AdminSaleItemDetail = {
  id: string
  orderId: string
  orderNumber: string
  orderCreatedAt: string
  day: string
  time: string
  orderStatus: string
  customerName: string
  customerPhone: string
  productId: string
  productName: string
  variantDetails?: string
  brandId?: string
  brandName?: string
  categoryId?: string
  categoryName?: string
  price: number
  quantity: number
  subtotal: number
  grandTotal: number
}

export type AdminSalesChartData = {
  points: {
    day: string
    orders: number
    revenue: number
    details: AdminSaleItemDetail[]
  }[]
  filterOptions: {
    brands: { id: string; name: string }[]
    categories: { id: string; name: string }[]
    products: { id: string; name: string }[]
  }
}

export async function getAdminSalesChartDetailsAction(params?: {
  days?: number
  startDate?: string
  endDate?: string
}): Promise<AdminSalesChartData> {
  await requireAdmin()
  const supabase = await createClient()

  const requestedDays = params?.days && [7, 14, 30, 90].includes(params.days) ? params.days : 30
  const now = new Date()
  let startIso: string
  let endIso: string

  if (params?.startDate && params?.endDate) {
    startIso = `${params.startDate}T00:00:00+07:00`
    endIso = `${params.endDate}T23:59:59+07:00`
  } else {
    const cutoff = new Date(now.getTime() - (requestedDays - 1) * 24 * 60 * 60 * 1000)
    cutoff.setHours(0, 0, 0, 0)
    startIso = cutoff.toISOString()
    endIso = now.toISOString()
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      grand_total,
      created_at,
      shipping_address,
      users(full_name, phone),
      order_items(
        id,
        product_id,
        product_name,
        price,
        quantity,
        variant_details,
        products(
          id,
          name,
          brand_id,
          category_id,
          brands(id, name),
          categories(id, name)
        )
      )
    `)
    .eq('status', 'delivered')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const getWibDateStr = (date: Date): string => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date)
  }

  const dayMap = new Map<string, { ordersSet: Set<string>; revenue: number; details: AdminSaleItemDetail[] }>()

  const startDateObj = new Date(startIso)
  const endDateObj = new Date(endIso)
  const iterDate = new Date(startDateObj)
  while (iterDate <= endDateObj) {
    const dayStr = getWibDateStr(iterDate)
    if (!dayMap.has(dayStr)) {
      dayMap.set(dayStr, { ordersSet: new Set(), revenue: 0, details: [] })
    }
    iterDate.setDate(iterDate.getDate() + 1)
  }

  const brandsMap = new Map<string, { id: string; name: string }>()
  const categoriesMap = new Map<string, { id: string; name: string }>()
  const productsMap = new Map<string, { id: string; name: string }>()

  for (const order of (orders ?? [])) {
    const orderCreatedAt = order.created_at
    const orderDate = new Date(orderCreatedAt)
    const dayStr = getWibDateStr(orderDate)

    const userObj = Array.isArray(order.users) ? order.users[0] : order.users
    const addressObj = order.shipping_address && typeof order.shipping_address === 'object' ? (order.shipping_address as Record<string, unknown>) : {}
    const customerName = String(userObj?.full_name || addressObj.recipient_name || 'Pelanggan')
    const customerPhone = String(userObj?.phone || addressObj.phone || '-')

    const timeFormatter = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    })
    const timeStr = `${timeFormatter.format(orderDate)} WIB`

    const items = Array.isArray(order.order_items) ? order.order_items : []

    let entry = dayMap.get(dayStr)
    if (!entry) {
      entry = { ordersSet: new Set(), revenue: 0, details: [] }
      dayMap.set(dayStr, entry)
    }

    entry.ordersSet.add(order.id)
    entry.revenue += Number(order.grand_total) || 0

    for (const item of items) {
      type OrderItemProduct = {
        id?: string
        name?: string
        brand_id?: string
        category_id?: string
        brands?: { id?: string; name?: string } | { id?: string; name?: string }[] | null
        categories?: { id?: string; name?: string } | { id?: string; name?: string }[] | null
      }
      const prodObj = (Array.isArray(item.products) ? item.products[0] : item.products) as OrderItemProduct | null
      const brandObj = prodObj ? (Array.isArray(prodObj.brands) ? prodObj.brands[0] : prodObj.brands) : null
      const catObj = prodObj ? (Array.isArray(prodObj.categories) ? prodObj.categories[0] : prodObj.categories) : null

      const brandId = String(brandObj?.id || prodObj?.brand_id || '')
      const brandName = String(brandObj?.name || '')
      const categoryId = String(catObj?.id || prodObj?.category_id || '')
      const categoryName = String(catObj?.name || '')
      const productId = String(item.product_id || prodObj?.id || '')
      const productName = String(item.product_name || prodObj?.name || 'Produk')

      if (brandId && brandName) brandsMap.set(brandId, { id: brandId, name: brandName })
      if (categoryId && categoryName) categoriesMap.set(categoryId, { id: categoryId, name: categoryName })
      if (productId && productName) productsMap.set(productId, { id: productId, name: productName })

      let variantText = ''
      if (item.variant_details) {
        if (typeof item.variant_details === 'string') {
          variantText = item.variant_details
        } else if (typeof item.variant_details === 'object') {
          const vd = item.variant_details as Record<string, unknown>
          variantText = [vd.color, vd.ram, vd.storage].filter(Boolean).join(' / ') || ''
        }
      }

      const itemPrice = Number(item.price) || 0
      const itemQty = Number(item.quantity) || 1
      const itemSubtotal = itemPrice * itemQty

      entry.details.push({
        id: String(item.id),
        orderId: String(order.id),
        orderNumber: String(order.order_number),
        orderCreatedAt,
        day: dayStr,
        time: timeStr,
        orderStatus: String(order.status),
        customerName,
        customerPhone,
        productId,
        productName,
        variantDetails: variantText,
        brandId,
        brandName,
        categoryId,
        categoryName,
        price: itemPrice,
        quantity: itemQty,
        subtotal: itemSubtotal,
        grandTotal: Number(order.grand_total) || 0,
      })
    }
  }

  const [{ data: allBrands }, { data: allCats }] = await Promise.all([
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('categories').select('id, name').order('name'),
  ])

  for (const b of (allBrands ?? [])) brandsMap.set(b.id, { id: b.id, name: b.name })
  for (const c of (allCats ?? [])) categoriesMap.set(c.id, { id: c.id, name: c.name })

  const sortedDays = Array.from(dayMap.keys()).sort()
  const points = sortedDays.map((day) => {
    const data = dayMap.get(day)!
    return {
      day,
      orders: data.ordersSet.size,
      revenue: data.revenue,
      details: data.details,
    }
  })

  return {
    points,
    filterOptions: {
      brands: Array.from(brandsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      categories: Array.from(categoriesMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      products: Array.from(productsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    },
  }
}

async function requireAdmin() {
  const { user, isAdmin, adminName, role } = await getAdminAccess()
  if (!user || !isAdmin) throw new Error('Forbidden')
  return { user, adminName, role: role || 'admin' }
}

async function requireSuperAdmin() {
  const { user, role, adminName } = await getAdminAccess()
  if (!user || role !== 'super_admin') throw new Error('Forbidden')
  return { user, adminName, role: 'super_admin' }
}

async function requireUserManagementAccess() {
  const { user, isSuperAdmin, isAdmin, permissions, adminName, role } = await getCurrentAdminPermissions()
  if (!user || !isAdmin) throw new Error('Forbidden')
  if (isSuperAdmin) return { user, adminName, isSuperAdmin: true, role: 'super_admin' }
  if (permissions.includes('customers')) {
    return { user, adminName, isSuperAdmin: false, role: role || 'admin' }
  }
  throw new Error('Akses ditolak: Anda tidak memiliki izin kelola akun pengguna.')
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
    .select('id, name, status, categories(name), brands(name), product_images(url, is_primary)')
    .eq('status', 'published')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAdminOrdersAction() {
  await requireAdmin()
  const supabase = await createClient()

  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('orders')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('status', 'shipped')
    .neq('courier', 'pickup')
    .lte('updated_at', twoDaysAgo)

  const { data, error } = await supabase.from('orders')
    .select('id, user_id, order_number, status, total_amount, discount_amount, shipping_amount, grand_total, created_at, updated_at, courier, shipping_address, users(full_name, phone), order_items(id, product_id, product_name, price, quantity, variant_details, products(product_images(url, is_primary))), payments(id, amount, status, payment_method)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const orders = data ?? []
  const userIdsWithoutSnapshotEmail = new Set(
    orders.flatMap((order) => {
      const address = order.shipping_address && typeof order.shipping_address === 'object'
        ? order.shipping_address as Record<string, unknown>
        : {}
      const snapshot = address.customer_snapshot && typeof address.customer_snapshot === 'object'
        ? address.customer_snapshot as Record<string, unknown>
        : {}
      return order.user_id && !snapshot.email ? [order.user_id] : []
    })
  )
  const emailByUserId = new Map<string, string>()

  if (userIdsWithoutSnapshotEmail.size > 0) {
    try {
      const adminClient = getSupabaseAdminClient()
      let page = 1
      while (userIdsWithoutSnapshotEmail.size > 0) {
        const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
        if (authError) break
        for (const authUser of authData.users) {
          if (authUser.email && userIdsWithoutSnapshotEmail.has(authUser.id)) {
            emailByUserId.set(authUser.id, authUser.email)
            userIdsWithoutSnapshotEmail.delete(authUser.id)
          }
        }
        if (authData.users.length < 1000) break
        page += 1
      }
    } catch {
      // Historical email may be unavailable when Auth lookup is unavailable.
    }
  }

  return orders.map((order) => ({
    ...order,
    customer_email: order.user_id ? emailByUserId.get(order.user_id) ?? null : null,
  }))
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

const statusLabels: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  processing: 'Diproses',
  ready_for_pickup: 'Siap Diambil',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
}

export async function updateAdminOrderStatusAction(formData: FormData) {
  const statusCorrection = formData.get('status_correction') === 'on'
  let user: User | null = null;
  let adminName = 'Admin';
  let adminRole = 'admin';

  if (statusCorrection) {
    const auth = await requireSuperAdmin()
    user = auth.user;
    adminName = auth.adminName;
    adminRole = auth.role;
    if (formData.get('confirm_correction') !== 'on') throw new Error('Konfirmasi koreksi status terlebih dahulu.')
  } else {
    const auth = await requireModulePermission('orders')
    user = auth.user;
    adminName = auth.adminName;
    adminRole = auth.role;
  }
  const id = String(formData.get('id') ?? '').trim()
  const status = String(formData.get('status') ?? '')
  if (!id || !['pending', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'].includes(status)) throw new Error('Status pesanan tidak valid.')
  const requestedPickup = statusCorrection && formData.get('fulfillment_correction') === 'pickup'
  const supabase = await createClient()
  const { data: current, error: readError } = await supabase.from('orders').select('status, courier, order_number, payments(status)').eq('id', id).single()
  if (readError || !current) throw new Error('Pesanan tidak ditemukan.')
  const correctToPickup = statusCorrection && current.courier !== 'pickup' && (requestedPickup || status === 'ready_for_pickup')
  if (correctToPickup) {
    const { error } = await supabase.rpc('super_admin_correct_order_pickup', { p_order_id: id, p_status: status })
    if (error) throw new Error(error.message)
    await recordAdminActivity({
      admin_id: user.id,
      admin_name: adminName,
      admin_role: adminRole,
      action: 'status_change',
      entity_type: 'order',
      entity_name: current.order_number || id,
      details: `Koreksi metode pesanan #${current.order_number || id} menjadi Ambil di Toko dengan status "${statusLabels[status] ?? status}"`,
    })
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

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: adminRole,
    action: 'status_change',
    entity_type: 'order',
    entity_name: current.order_number || id,
    details: `Mengubah status pesanan #${current.order_number || id} menjadi "${statusLabels[status] ?? status}"`,
  })

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
  const { user, adminName, role } = await requireModulePermission('orders')
  const orderId = String(formData.get('order_id') ?? '').trim()
  const nextStatus = String(formData.get('payment_status') ?? '')
  if (!orderId || !['success', 'failed', 'refunded'].includes(nextStatus)) throw new Error('Status pembayaran tidak valid.')
  const supabase = await createClient()
  const { data: order, error: orderError } = await supabase.from('orders').select('status, order_number').eq('id', orderId).single()
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

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'status_change',
    entity_type: 'order',
    entity_name: order.order_number || orderId,
    details: `Memperbarui status pembayaran pesanan #${order.order_number || orderId} menjadi "${nextStatus === 'success' ? 'Terkonfirmasi' : nextStatus}"`,
  })

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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (serviceKey && url) {
    try {
      const adminClient = createSupabaseAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const userMetaMap = new Map(
        authData?.users?.map((u) => [
          u.id,
          {
            email: u.email ?? null,
            is_password_locked: Boolean(u.app_metadata?.is_password_locked ?? u.user_metadata?.is_password_locked),
            failed_attempts: Number(u.app_metadata?.failed_password_attempts ?? u.user_metadata?.failed_password_attempts ?? 0),
            locked_at: (u.app_metadata?.password_locked_at as string) || (u.user_metadata?.password_locked_at as string) || null,
          },
        ]) ?? []
      )
      return (data ?? []).map((row) => ({
        ...row,
        email: userMetaMap.get(row.id)?.email ?? null,
        is_password_locked: userMetaMap.get(row.id)?.is_password_locked ?? false,
        failed_attempts: userMetaMap.get(row.id)?.failed_attempts ?? 0,
        locked_at: userMetaMap.get(row.id)?.locked_at ?? null,
      }))
    } catch {
      // fallback
    }
  }

  return (data ?? []).map((row) => ({
    ...row,
    email: null,
    is_password_locked: false,
    failed_attempts: 0,
    locked_at: null,
  }))
}

export async function createAdminManagedAccountAction(input: {
  fullName: string
  email: string
  phone: string
  role: string
  password?: string
}) {
  const { user, adminName, isSuperAdmin } = await requireUserManagementAccess()
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()
  const role = input.role
  const password = input.password?.trim()
  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['customer', 'admin', 'super_admin'].includes(role)) {
    return { error: 'Periksa nama, email, dan role yang dipilih.' }
  }
  if (role !== 'customer' && !isSuperAdmin) {
    return { error: 'Hanya Super Admin yang berhak membuat akun staf Admin atau Super Admin.' }
  }
  if (password && password.length < 6) {
    return { error: 'Password minimal 6 karakter jika ingin dibuatkan langsung.' }
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return { error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di environment server.' }
  const adminClient = createSupabaseAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  let createdUserId: string | null = null
  const currentAppMeta = {}

  if (password) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    app_metadata: {
      ...currentAppMeta,
      is_password_locked: false,
      failed_password_attempts: 0,
      password_locked_at: null,
      password_reset_by_admin: true,
      password_reset_at: new Date().toISOString(),
    },
      user_metadata: { full_name: fullName },
    })
    if (error || !data.user) return { error: error?.message ?? 'Gagal membuat akun dengan password.' }
    createdUserId = data.user.id
  } else {
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } })
    if (error || !data.user) return { error: error?.message ?? 'Undangan akun gagal dibuat.' }
    createdUserId = data.user.id
  }

  const { error: profileError } = await adminClient.from('users').update({ full_name: fullName, phone: phone || null, role }).eq('id', createdUserId)
  if (profileError) return { error: `Akun terbuat, tetapi profil gagal diperbarui: ${profileError.message}` }

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: isSuperAdmin ? 'super_admin' : 'admin',
    action: 'create',
    entity_type: 'account',
    entity_name: fullName,
    details: password
      ? `Membuat akun baru "${fullName}" (${email}) dengan role ${role} dan password langsung aktif`
      : `Mengundang akun baru "${fullName}" (${email}) dengan role ${role}`,
  })

  revalidatePath('/admin/customers')
  return { success: true }
}

export async function setAdminManagedAccountPasswordAction(input: {
  userId: string
  newPassword: string
}) {
  const { user, adminName, isSuperAdmin } = await requireUserManagementAccess()
  const userId = input.userId.trim()
  const targetId = userId
  const newPassword = input.newPassword.trim()
  if (!userId || newPassword.length < 6) {
    return { error: 'Password minimal 6 karakter.' }
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return { error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di environment server.' }
  const adminClient = createSupabaseAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: targetProfile } = await adminClient.from('users').select('role, full_name').eq('id', userId).maybeSingle()
  if (targetProfile?.role && targetProfile.role !== 'customer' && !isSuperAdmin) {
    return { error: 'Hanya Super Admin yang berhak menyetel password staf Admin atau Super Admin.' }
  }

  const { data: targetUser } = await adminClient.auth.admin.getUserById(userId)
  const currentMeta = targetUser?.user?.user_metadata || {}
  const currentAppMeta = targetUser?.user?.app_metadata || {}

  const { data: updatedUser, error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
    email_confirm: true,
    app_metadata: {
      ...currentAppMeta,
      is_password_locked: false,
      failed_password_attempts: 0,
      password_locked_at: null,
      password_reset_by_admin: true,
      password_reset_at: new Date().toISOString(),
    },
    user_metadata: {
      ...currentMeta,
      is_password_locked: false,
      failed_password_attempts: 0,
      password_locked_at: null,
      password_reset_by_admin: true,
      password_reset_at: new Date().toISOString(),
    },
  })
  if (error) return { error: error.message }

  try {
    await adminClient.from('users').update({
      is_password_locked: false,
      failed_password_attempts: 0,
      password_locked_at: null,
    }).eq('id', targetId)
  } catch {
    // ignore
  }

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: isSuperAdmin ? 'super_admin' : 'admin',
    action: 'update',
    entity_type: 'account',
    entity_name: updatedUser.user?.email || userId,
    details: `Menyetel password baru untuk akun "${updatedUser.user?.email || userId}" (kunci akun dibuka)`,
  })

  revalidatePath('/admin/customers')
  revalidatePath('/profile')
  return { success: true }
}

export async function unlockAdminManagedAccountAction(userId: string) {
  const { user, adminName, isSuperAdmin } = await requireUserManagementAccess()
  const targetId = userId.trim()
  if (!targetId) return { error: 'User ID tidak valid.' }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return { error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di environment server.' }
  const adminClient = createSupabaseAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: targetProfile } = await adminClient.from('users').select('role').eq('id', targetId).maybeSingle()
  if (targetProfile?.role && targetProfile.role !== 'customer' && !isSuperAdmin) {
    return { error: 'Hanya Super Admin yang berhak membuka kunci akun staf Admin atau Super Admin.' }
  }

  const { data: targetUser } = await adminClient.auth.admin.getUserById(targetId)
  const currentMeta = targetUser?.user?.user_metadata || {}
  const currentAppMeta = targetUser?.user?.app_metadata || {}

  const { data: updatedUser, error } = await adminClient.auth.admin.updateUserById(targetId, {
    app_metadata: {
      ...currentAppMeta,
      is_password_locked: false,
      failed_password_attempts: 0,
      password_locked_at: null,
      unlocked_by_admin: true,
      unlocked_at: new Date().toISOString(),
    },
    user_metadata: {
      ...currentMeta,
      is_password_locked: false,
      failed_password_attempts: 0,
      password_locked_at: null,
      unlocked_by_admin: true,
      unlocked_at: new Date().toISOString(),
    },
  })
  if (error) return { error: error.message }

  try {
    await adminClient.from('users').update({
      is_password_locked: false,
      failed_password_attempts: 0,
      password_locked_at: null,
    }).eq('id', targetId)
  } catch {
    // ignore
  }

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: isSuperAdmin ? 'super_admin' : 'admin',
    action: 'update',
    entity_type: 'account',
    entity_name: updatedUser.user?.email || targetId,
    details: `Membuka kunci akun "${updatedUser.user?.email || targetId}" (kunci 3x gagal sandi dibersihkan)`,
  })

  revalidatePath('/admin/customers')
  revalidatePath('/profile')
  return { success: true }
}

export async function deleteAdminManagedAccountAction(userId: string) {
  const { user, adminName, isSuperAdmin } = await requireUserManagementAccess()
  const targetId = userId.trim()
  if (!targetId) return { error: 'ID akun tidak valid.' }

  if (targetId === user.id) {
    return { error: 'Anda tidak dapat menghapus akun Anda sendiri.' }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return { error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di environment server.' }
  const adminClient = createSupabaseAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: targetProfile, error: profileError } = await adminClient
    .from('users')
    .select('id, full_name, role')
    .eq('id', targetId)
    .maybeSingle()

  if (profileError) return { error: `Gagal memeriksa profil akun: ${profileError.message}` }
  if (!targetProfile) {
    return { error: 'Akun tidak ditemukan atau sudah dihapus.' }
  }

  if (targetProfile.role !== 'customer' && !isSuperAdmin) {
    return { error: 'Hanya Super Admin yang berhak menghapus atau mendemosikan akun staf Admin atau Super Admin.' }
  }

  if (targetProfile.role === 'super_admin') {
    const { count: superAdminCount, error: superAdminCountError } = await adminClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')

    if (superAdminCountError) return { error: `Gagal memeriksa jumlah Super Admin: ${superAdminCountError.message}` }
    if ((superAdminCount ?? 0) <= 1) {
      return { error: 'Tidak dapat menghapus Super Admin terakhir di sistem toko.' }
    }
  }

  const { data: authResult, error: authLookupError } = await adminClient.auth.admin.getUserById(targetId)
  if (authLookupError || !authResult.user) {
    return { error: 'Identitas Auth akun tidak ditemukan. Tidak ada data yang dihapus.' }
  }

  const targetEmail = authResult.user.email || ''
  const targetName = targetProfile.full_name || targetEmail || 'Pengguna'

  // FK ON DELETE SET NULL keeps orders and their billing snapshots intact.
  const { count: orderCount, error: orderCountError } = await adminClient
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', targetId)

  if (orderCountError) return { error: `Gagal memeriksa riwayat pesanan: ${orderCountError.message}` }

  // Supabase Auth refuses to delete users who still own Storage objects. Find
  // ownership server-side, then remove through Storage API (never SQL metadata).
  const { data: ownedObjects, error: storageLookupError } = await adminClient.rpc('list_user_storage_objects', {
    p_user_id: targetId,
  })
  if (storageLookupError) {
    return { error: 'Gagal memeriksa file milik akun. Pastikan migration penghapusan akun sudah diterapkan.' }
  }

  const objectsByBucket = new Map<string, string[]>()
  for (const object of ownedObjects ?? []) {
    if (!object.bucket_id || !object.name) continue
    const paths = objectsByBucket.get(object.bucket_id) ?? []
    paths.push(object.name)
    objectsByBucket.set(object.bucket_id, paths)
  }

  for (const [bucket, objectPaths] of objectsByBucket) {
    for (let offset = 0; offset < objectPaths.length; offset += 100) {
      const { error } = await adminClient.storage.from(bucket).remove(objectPaths.slice(offset, offset + 100))
      if (error) {
        return {
          error: `Akun belum dihapus. Pembersihan file Storage gagal (${bucket}): ${error.message}. Aman untuk mencoba ulang.`,
        }
      }
    }
  }

  // Official Auth Admin API removes auth.users and cascades the private profile.
  // Related orders and voucher history are detached by the migration's SET NULL FKs.
  const { error: authError } = await adminClient.auth.admin.deleteUser(targetId)
  if (authError) {
    const message = authError.message.toLowerCase().includes('super admin')
      ? 'Akun belum dihapus. Tidak dapat menghapus Super Admin terakhir di sistem toko. File Storage yang sudah dibersihkan tidak dapat dipulihkan.'
      : `Akun belum dihapus: ${authError.message}. File Storage mungkin sudah dibersihkan; coba ulangi setelah kendala Auth teratasi.`
    return { error: message }
  }

  const { data: sfData } = await adminClient
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle()

  if (sfData?.settings?.admin_permissions?.[targetId]) {
    const updatedSettings = { ...sfData.settings }
    const currentPermissions = { ...updatedSettings.admin_permissions }
    delete currentPermissions[targetId]
    updatedSettings.admin_permissions = currentPermissions
    await adminClient.from('storefront_settings').update({ settings: updatedSettings }).eq('id', 'main')
  }

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: isSuperAdmin ? 'super_admin' : 'admin',
    action: 'delete',
    entity_type: 'account',
    entity_name: targetName,
    details: orderCount
      ? `Menghapus akun "${targetName}" (${targetProfile.role}) secara permanen dan mempertahankan ${orderCount} pesanan beserta detail transaksi.`
      : `Menghapus akun "${targetName}" (${targetProfile.role}) secara permanen beserta data profil nontransaksional.`,
  })

  revalidatePath('/admin/customers')
  return {
    success: true,
    message: orderCount
      ? `Akun "${targetName}" dihapus. ${orderCount} riwayat pesanan tetap dipertahankan.`
      : `Akun "${targetName}" dihapus permanen.`,
  }
}

export async function getAdminCustomerReportsAction() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_admin_customers_report', { p_offset: 0, p_limit: 1000 })
  if (error) throw error
  return (data ?? []) as {
    id: string
    full_name: string | null
    phone: string | null
    created_at: string
    total_orders: number
    completed_orders: number
    completed_spend: number
    last_order_at: string | null
  }[]
}

export async function getAdminLockedAccountsNotificationAction() {
  const { isAdmin } = await getAdminAccess()
  if (!isAdmin) return { count: 0, lockedAccounts: [] }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return { count: 0, lockedAccounts: [] }

  try {
    const adminClient = createSupabaseAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const lockedUsers = (authData?.users ?? []).filter(
      (u) => Boolean(u.app_metadata?.is_password_locked ?? u.user_metadata?.is_password_locked)
    )

    return {
      count: lockedUsers.length,
      lockedAccounts: lockedUsers.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || 'Pelanggan',
        lockedAt: (u.app_metadata?.password_locked_at as string) || (u.user_metadata?.password_locked_at as string) || null,
      })),
    }
  } catch {
    return { count: 0, lockedAccounts: [] }
  }
}

export async function updateAdminManagedAccountRoleAction(formData: FormData) {
  try {
    const { user, adminName } = await requireSuperAdmin()
    const id = String(formData.get('id') ?? '')
    const role = String(formData.get('role') ?? '')
    if (!id || !['customer', 'admin', 'super_admin'].includes(role)) return { error: 'Role akun tidak valid.' }
    if (id === user.id && role !== 'super_admin') return { error: 'Role akun yang sedang digunakan tidak dapat diturunkan dari halaman ini.' }
    const supabase = await createClient()
    const { error } = await supabase.rpc('admin_update_user_role', {
      p_user_id: id,
      p_role: role,
    })
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('admin_update_user_role')) {
        return { error: 'Fungsi sistem admin_update_user_role tidak tersedia atau belum diterapkan di database. Pembaruan role dibatalkan secara aman (fail-closed).' }
      }
      return { error: error.message }
    }

    await recordAdminActivity({
      admin_id: user.id,
      admin_name: adminName,
      admin_role: 'super_admin',
      action: 'update',
      entity_type: 'account',
      entity_name: id,
      details: `Mengubah role akun pengguna (ID: ${id}) menjadi "${role}"`,
    })

    revalidatePath('/admin/customers')
    return { success: true }
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : 'Role gagal diperbarui.' }
  }
}

export async function saveAdminProductAction(formData: FormData) {
  const { user, adminName, role } = await requireModulePermission('products')
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

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: productId ? 'update' : 'create',
    entity_type: 'product',
    entity_name: name,
    details: productId ? `Memperbarui produk "${name}"` : `Menambahkan produk baru "${name}"`,
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/orders/[id]/invoice', 'page')
  revalidatePath('/')
  return { success: true }
}

function generateTaxonomySlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `item-${crypto.randomUUID().slice(0, 6)}`
}

export async function getMissingImportTaxonomiesAction(categories: string[], brands: string[]) {
  await requireModulePermission('products')
  const supabase = await createClient()
  const [{ data: existingCats }, { data: existingBrands }] = await Promise.all([
    supabase.from('categories').select('id, name'),
    supabase.from('brands').select('id, name'),
  ])
  const missingCategories = [...new Set(categories.map((c) => c?.trim()).filter(Boolean))].filter(
    (name) => !existingCats?.some((c) => c.name.trim().toLowerCase() === name.toLowerCase())
  )
  const missingBrands = [...new Set(brands.map((b) => b?.trim()).filter(Boolean))].filter(
    (name) => !existingBrands?.some((b) => b.name.trim().toLowerCase() === name.toLowerCase())
  )
  return { missingCategories, missingBrands }
}

export async function bulkImportAdminProductsAction(products: unknown) {
  const { user, adminName, role } = await requireModulePermission('products')
  if (!Array.isArray(products) || products.length < 1 || products.length > 500) throw new Error('Impor dapat memuat 1 sampai 500 produk sekaligus.')
  for (const product of products) {
    if (!product || typeof product !== 'object' || typeof product.name !== 'string' || !product.name.trim() || typeof product.sku !== 'string' || typeof product.description !== 'string' || !product.description.trim() || typeof product.category !== 'string' || !product.category.trim() || typeof product.brand !== 'string' || !product.brand.trim() || !isValidImportPrices(product.price, product.discount_price ?? null) || !hasConfirmedImportPriceMapping(product) || !Array.isArray(product.variants) || !Array.isArray(product.specifications) || !['create', 'update', 'consolidate'].includes(product.importAction)) throw new Error('Data impor tidak valid, harga promo tidak valid, atau konfirmasi harga belum lengkap. Periksa setiap baris preview.')
    if (product.errors?.length || product.variants.length > 50 || product.specifications.length > 50) throw new Error('Data memiliki error atau jumlah varian/spesifikasi melewati batas.')
    if (product.importAction === 'update' && !product.targetProductId) throw new Error('Pilih produk database yang cocok sebelum update.')
    if (product.importAction === 'consolidate' && (!Array.isArray(product.consolidationTargetIds) || product.consolidationTargetIds.length === 0)) throw new Error('Konsolidasi memerlukan produk database target yang teridentifikasi.')
    if (typeof product.stock === 'number' && product.stock < 0) throw new Error('Stok produk tidak boleh negatif.')
    for (const v of product.variants) {
      if (typeof v.stock === 'number' && v.stock < 0) throw new Error('Stok varian tidak boleh negatif.')
    }
  }
  const supabase = await createClient()

  // Ensure any missing categories and brands are auto-created before invoking bulk import RPC
  const activeProducts = products.filter((p: { importAction?: string }) => p.importAction !== 'skip')
  const targetCategories = [...new Set(activeProducts.map((p: { category?: string }) => p.category?.trim()).filter(Boolean) as string[])]
  const targetBrands = [...new Set(activeProducts.map((p: { brand?: string }) => p.brand?.trim()).filter(Boolean) as string[])]

  if (targetCategories.length || targetBrands.length) {
    const [{ data: existingCats }, { data: existingBrands }] = await Promise.all([
      supabase.from('categories').select('id, name, slug'),
      supabase.from('brands').select('id, name, slug'),
    ])

    const missingCategories = targetCategories.filter(
      (name) => !existingCats?.some((c) => c.name.trim().toLowerCase() === name.toLowerCase())
    )
    const missingBrands = targetBrands.filter(
      (name) => !existingBrands?.some((b) => b.name.trim().toLowerCase() === name.toLowerCase())
    )

    if (missingCategories.length) {
      for (const catName of missingCategories) {
        const baseSlug = generateTaxonomySlug(catName)
        let slug = baseSlug
        let count = 1
        while (existingCats?.some((c) => c.slug === slug)) {
          slug = `${baseSlug}-${count++}`
        }
        await supabase.from('categories').insert({
          name: catName,
          slug,
          description: `Kategori ${catName} (dibuat otomatis dari impor katalog)`,
        })
      }
    }

    if (missingBrands.length) {
      for (const brandName of missingBrands) {
        const baseSlug = generateTaxonomySlug(brandName)
        let slug = baseSlug
        let count = 1
        while (existingBrands?.some((b) => b.slug === slug)) {
          slug = `${baseSlug}-${count++}`
        }
        await supabase.from('brands').insert({
          name: brandName,
          slug,
        })
      }
    }

    if (missingCategories.length || missingBrands.length) {
      revalidatePath('/admin/categories')
      revalidatePath('/admin/brands')
      revalidatePath('/categories')
      revalidatePath('/brands')
    }
  }

  type ImportItem = {
    name: string
    sku: string
    description?: string
    price: number
    discount_price?: number | null
    stock?: number
    category?: string
    brand?: string
    status?: string
    is_best_seller?: boolean
    is_new_arrival?: boolean
    specifications?: Array<{ key: string; value: string; display_order?: number }>
    importAction?: string
    targetProductId?: string
    consolidationTargetIds?: string[]
    currentStock?: number | null
    stockChangeReason?: string
    variants?: Array<{
      id?: string
      sku?: string
      color: string
      ram: string
      storage: string
      price: number | null
      discount_price: number | null
      stock: number
    }>
  }

  const typedProducts = products as ImportItem[]

  // 1. Attempt bulk_import_products_v3 first (supports create, update, and consolidate atomically)
  const v3Result = await supabase.rpc('bulk_import_products_v3', { p_products: products })
  let importedCount = Number(v3Result.data) || 0

  if (v3Result.error) {
    const isMissingV3Rpc = v3Result.error.code === 'PGRST202' || v3Result.error.code === '42883'
    if (!isMissingV3Rpc) {
      // Real database / business validation error: fail immediately and roll back completely
      throw new Error(v3Result.error.message)
    }

    // Fail closed if batch contains consolidation: consolidation REQUIRES bulk_import_products_v3 transaction
    const hasConsolidation = typedProducts.some((p) => p.importAction === 'consolidate')
    if (hasConsolidation) {
      throw new Error(
        'Fitur konsolidasi varian dan kebijakan stok membutuhkan fungsi database bulk_import_products_v3. Harap terapkan migration 20261031000000_bulk_import_v3_stock_and_consolidation.sql terlebih dahulu.'
      )
    }

    // Fallback only for legacy create/update when v3 RPC is not yet migrated to database
    const v2Result = await supabase.rpc('bulk_import_products_v2', { p_products: products })
    if (v2Result.error) {
      const isMissingV2Rpc = v2Result.error.code === 'PGRST202' || v2Result.error.code === '42883'
      if (!isMissingV2Rpc) throw new Error(v2Result.error.message)

      const onlyCreates = typedProducts.every((p) => !p.importAction || p.importAction === 'create')
      if (onlyCreates) {
        const v1Result = await supabase.rpc('bulk_import_products', { p_products: products })
        if (v1Result.error) throw new Error(v1Result.error.message)
        importedCount = Number(v1Result.data) || 0
      } else {
        throw new Error(
          'Fitur update produk dan varian membutuhkan fungsi database bulk_import_products_v2 atau bulk_import_products_v3. Harap jalankan migration database terlebih dahulu.'
        )
      }
    } else {
      importedCount = Number(v2Result.data) || 0
    }
  }

  // Audit activity log: record stock updates and mass import details
  const stockChanges = typedProducts
    .filter((p) => p.importAction !== 'skip')
    .map((p) => {
      const oldStock = p.currentStock !== null && p.currentStock !== undefined ? p.currentStock : 'baru'
      return `${p.name} (${p.sku}): ${oldStock} -> ${p.stock ?? 0} [${p.stockChangeReason || p.importAction}]`
    })
    .slice(0, 10)

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'update',
    entity_type: 'product',
    entity_name: 'Impor Katalog',
    details: `Mengimpor ${typedProducts.length} produk katalog (${typedProducts.filter((p) => p.importAction === 'update').length} update, ${typedProducts.filter((p) => p.importAction === 'consolidate').length} konsolidasi, ${typedProducts.filter((p) => p.importAction === 'create').length} baru). Rincian stok: ${stockChanges.join('; ')}`,
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/orders/[id]/invoice', 'page')
  revalidatePath('/')
  return { success: true, count: importedCount }
}

export async function deleteAdminProductAction(productId: string) {
  const { user, adminName, role } = await requireModulePermission('products')
  if (!productId) throw new Error('ID produk tidak valid.')
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw new Error(error.message)

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'delete',
    entity_type: 'product',
    entity_name: productId,
    details: `Menghapus produk (ID: ${productId})`,
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/orders/[id]/invoice', 'page')
  revalidatePath('/')
  return { success: true }
}

export async function bulkUpdateAdminProductsStatusAction(
  productIds: string[],
  status: 'published' | 'draft' | 'archived'
) {
  const { user, adminName, role } = await requireModulePermission('products')
  if (!productIds || productIds.length === 0) throw new Error('Pilih minimal satu produk.')
  if (!['published', 'draft', 'archived'].includes(status)) throw new Error('Status tidak valid.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ status })
    .in('id', productIds)

  if (error) throw new Error(error.message)

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'status_change',
    entity_type: 'product',
    entity_name: `${productIds.length} produk`,
    details: `Mengubah status ${productIds.length} produk menjadi "${status}"`,
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/orders/[id]/invoice', 'page')
  revalidatePath('/')
  return { success: true, count: productIds.length }
}

export async function bulkUpdateAdminProductsAction(
  productIds: string[],
  updates: {
    status?: 'published' | 'draft' | 'archived';
    categoryId?: string;
    brandId?: string;
    stock?: number;
    isBestSeller?: boolean;
    isNewArrival?: boolean;
  }
) {
  const { user, adminName, role } = await requireModulePermission('products')
  if (!productIds || productIds.length === 0) throw new Error('Pilih minimal satu produk.')

  const payload: Record<string, unknown> = {}
  if (updates.status && ['published', 'draft', 'archived'].includes(updates.status)) {
    payload.status = updates.status
  }
  if (updates.categoryId && updates.categoryId.trim() !== '') {
    payload.category_id = updates.categoryId
  }
  if (updates.brandId && updates.brandId.trim() !== '') {
    payload.brand_id = updates.brandId
  }
  if (typeof updates.stock === 'number' && Number.isInteger(updates.stock) && updates.stock >= 0) {
    payload.stock = updates.stock
  }
  if (typeof updates.isBestSeller === 'boolean') {
    payload.is_best_seller = updates.isBestSeller
  }
  if (typeof updates.isNewArrival === 'boolean') {
    payload.is_new_arrival = updates.isNewArrival
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('Tidak ada perubahan yang dipilih.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update(payload)
    .in('id', productIds)

  if (error) throw new Error(error.message)

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'update',
    entity_type: 'product',
    entity_name: `${productIds.length} produk`,
    details: `Memperbarui ${productIds.length} produk sekaligus (${Object.keys(payload).join(', ')})`,
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/orders/[id]/invoice', 'page')
  revalidatePath('/')
  return { success: true, count: productIds.length }
}

export async function bulkDeleteAdminProductsAction(productIds: string[]) {
  const { user, adminName, role } = await requireModulePermission('products')
  if (!productIds || productIds.length === 0) throw new Error('Pilih minimal satu produk.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .delete()
    .in('id', productIds)

  if (error) throw new Error(error.message)

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'delete',
    entity_type: 'product',
    entity_name: `${productIds.length} produk`,
    details: `Menghapus massal ${productIds.length} produk`,
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/orders/[id]/invoice', 'page')
  revalidatePath('/')
  return { success: true, count: productIds.length }
}

export async function getAdminCategoriesAction() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveAdminCategoryAction(formData: FormData) {
  const { user, adminName, role } = await requireModulePermission('categories')
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

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: id ? 'update' : 'create',
    entity_type: 'category',
    entity_name: name,
    details: id ? `Memperbarui kategori "${name}"` : `Menambahkan kategori baru "${name}"`,
  })

  revalidatePath('/admin/categories')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteAdminCategoryAction(id: string) {
  const { user, adminName, role } = await requireModulePermission('categories')
  if (!id) throw new Error('ID kategori tidak valid.')
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'delete',
    entity_type: 'category',
    entity_name: id,
    details: `Menghapus kategori (ID: ${id})`,
  })

  revalidatePath('/admin/categories')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getAdminBrandsAction() {
  await requireModulePermission('brands')
  const supabase = await createClient()
  const { data, error } = await supabase.from('brands').select('id,name,slug,logo_url').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveAdminBrandAction(formData: FormData) {
  const { user, adminName, role } = await requireModulePermission('brands')
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

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: id ? 'update' : 'create',
    entity_type: 'brand',
    entity_name: name,
    details: id ? `Memperbarui brand "${name}"` : `Menambahkan brand baru "${name}"`,
  })

  revalidatePath('/admin/brands')
  revalidatePath('/')
  revalidatePath('/brands')
  return { success: true }
}

export async function deleteAdminBrandAction(id: string) {
  const { user, adminName, role } = await requireModulePermission('brands')
  if (!id) throw new Error('ID brand tidak valid.')
  const supabase = await createClient()
  const { error } = await supabase.from('brands').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'delete',
    entity_type: 'brand',
    entity_name: id,
    details: `Menghapus brand (ID: ${id})`,
  })

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
  const { user, adminName, isSuperAdmin, role } = await requireModulePermission('content')
  if (!settings || typeof settings !== 'object' || JSON.stringify(settings).length > 100000) throw new Error('Pengaturan toko tidak valid.')
  const catalogPageSize = (settings as { admin?: { catalogPageSize?: unknown } }).admin?.catalogPageSize
  if (catalogPageSize !== undefined && ![24, 48, 100, 200].includes(Number(catalogPageSize))) throw new Error('Jumlah produk per halaman harus 24, 48, 100, atau 200.')
  const store = (settings as { store?: { branches?: unknown; email?: unknown; maps_url?: unknown } }).store
  if (typeof store?.email === 'string' && store.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.email)) throw new Error('Email toko tidak valid.')
  const isValidMapsUrl = (urlString: unknown): boolean => {
    if (typeof urlString !== 'string' || !urlString.trim()) return true
    try {
      const url = new URL(urlString.trim())
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
      const host = url.hostname.toLowerCase()
      return (
        host === 'share.google' ||
        host.endsWith('.google.com') ||
        host === 'google.com' ||
        host === 'maps.google.com' ||
        host.endsWith('.goo.gl') ||
        host === 'goo.gl' ||
        host === 'g.co' ||
        host.includes('google')
      )
    } catch {
      return false
    }
  }
  if (typeof store?.maps_url === 'string' && store.maps_url.trim()) {
    if (!isValidMapsUrl(store.maps_url)) throw new Error('Gunakan link Google Maps yang valid untuk toko utama.')
  }
  if (Array.isArray(store?.branches)) {
    for (const branch of store.branches) {
      if (!branch || typeof branch !== 'object') throw new Error('Data cabang tidak valid.')
      const item = branch as { name?: unknown; address?: unknown; maps_url?: unknown }
      if (typeof item.name !== 'string' || !item.name.trim() || typeof item.address !== 'string' || !item.address.trim()) throw new Error('Setiap cabang perlu nama dan alamat.')
      if (typeof item.maps_url === 'string' && item.maps_url.trim()) {
        if (!isValidMapsUrl(item.maps_url)) throw new Error('Gunakan link Google Maps yang valid untuk cabang.')
      }
    }
  }
  const officialMarketplaces = (settings as { official_marketplaces?: unknown }).official_marketplaces
  if (officialMarketplaces !== undefined && !Array.isArray(officialMarketplaces)) throw new Error('Data marketplace tidak valid.')
  if (Array.isArray(officialMarketplaces)) {
    for (const mp of officialMarketplaces) {
      if (!mp || typeof mp !== 'object') throw new Error('Data marketplace tidak valid.')
      const item = mp as { name?: unknown; stores?: unknown }
      if (typeof item.name !== 'string' || !item.name.trim()) {
        throw new Error('Setiap marketplace harus memiliki nama.')
      }
      if (Array.isArray(item.stores)) {
        for (const s of item.stores) {
          if (!s || typeof s !== 'object') throw new Error('Data toko marketplace tidak valid.')
          const store = s as { name?: unknown; url?: unknown }
          if (typeof store.name !== 'string' || !store.name.trim() || typeof store.url !== 'string' || !store.url.trim()) {
            throw new Error('Setiap toko di marketplace harus memiliki nama dan tautan URL.')
          }
        }
      }
    }
  }
  const officialChannels = (settings as { official_channels?: unknown }).official_channels
  if (officialChannels !== undefined && !Array.isArray(officialChannels)) throw new Error('Data official channel tidak valid.')
  if (Array.isArray(officialChannels)) {
    for (const ch of officialChannels) {
      if (!ch || typeof ch !== 'object') throw new Error('Data official channel tidak valid.')
      const item = ch as { name?: unknown; url?: unknown }
      if (typeof item.name !== 'string' || !item.name.trim() || typeof item.url !== 'string' || !item.url.trim()) {
        throw new Error('Setiap official channel harus memiliki nama dan link URL yang valid.')
      }
    }
  }
  const pickupInfo = (settings as { pickup_info?: { store_name?: unknown; store_address?: unknown; maps_url?: unknown } }).pickup_info
  if (pickupInfo) {
    if (typeof pickupInfo.store_name !== 'string' || pickupInfo.store_name.length > 80 || typeof pickupInfo.store_address !== 'string' || pickupInfo.store_address.length > 300 || typeof pickupInfo.maps_url !== 'string') throw new Error('Informasi lokasi pickup tidak valid.')
    if (pickupInfo.maps_url && pickupInfo.maps_url.trim()) {
      if (!isValidMapsUrl(pickupInfo.maps_url)) throw new Error('Gunakan link Google Maps yang valid untuk lokasi pickup.')
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
  const featuredReviews = (settings as { featured_reviews?: unknown }).featured_reviews
  if (featuredReviews !== undefined && !Array.isArray(featuredReviews)) throw new Error('Data ulasan produk tidak valid.')
  if (Array.isArray(featuredReviews)) {
    for (const r of featuredReviews) {
      if (!r || typeof r !== 'object') throw new Error('Data ulasan produk tidak valid.')
      const rev = r as { user_name?: unknown; comment?: unknown; rating?: unknown }
      if (typeof rev.user_name !== 'string' || !rev.user_name.trim()) throw new Error('Nama pembeli pada ulasan harus diisi.')
      if (typeof rev.comment !== 'string' || !rev.comment.trim()) throw new Error('Teks ulasan harus diisi.')
    }
  }
  const supabase = await createClient()
  let settingsToSave = settings as Record<string, unknown>
  if (!isSuperAdmin) {
    const { data: existingData } = await supabase.from('storefront_settings').select('settings').eq('id', 'main').maybeSingle()
    const existingSettings = (existingData?.settings && typeof existingData.settings === 'object') ? existingData.settings as Record<string, unknown> : {}
    settingsToSave = {
      ...settingsToSave,
      admin_permissions: existingSettings.admin_permissions,
      admin: {
        ...(settingsToSave.admin as Record<string, unknown> || {}),
        catalogPageSize: (existingSettings.admin as Record<string, unknown>)?.catalogPageSize ?? 24,
      },
    }
  }

  const { error } = await supabase.from('storefront_settings').upsert({ id: 'main', settings: settingsToSave }, { onConflict: 'id' })
  if (error) throw new Error(error.message)

  // Sinkronisasi status is_new_arrival dan is_best_seller pada tabel products
  const sectionsObj = (settings as { sections?: Record<string, { productIds?: string[] }> })?.sections
  if (sectionsObj) {
    if (Array.isArray(sectionsObj.newArrivals?.productIds) && sectionsObj.newArrivals.productIds.length > 0) {
      await supabase
        .from('products')
        .update({ is_new_arrival: true })
        .in('id', sectionsObj.newArrivals.productIds)
    }
    if (Array.isArray(sectionsObj.bestsellers?.productIds) && sectionsObj.bestsellers.productIds.length > 0) {
      await supabase
        .from('products')
        .update({ is_best_seller: true })
        .in('id', sectionsObj.bestsellers.productIds)
    }
  }

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role || (isSuperAdmin ? 'super_admin' : 'admin'),
    action: 'update',
    entity_type: 'settings',
    entity_name: 'Pengaturan Toko & Faktur',
    details: 'Memperbarui pengaturan storefront, faktur penjualan, cabang, dan official marketplace',
  })

  revalidatePath('/')
  revalidatePath('/promo')
  revalidatePath('/admin/content')
  revalidatePath('/checkout')
  revalidatePath('/cart')
  revalidatePath('/products')
  revalidatePath('/orders/[id]/invoice', 'page')
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

export async function seedDefaultFaqsAction() {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { data: existing } = await supabase.from('faqs').select('id').limit(1)
  if (existing && existing.length > 0) {
    return { success: false, message: 'FAQ sudah ada di database.' }
  }
  const { error } = await supabase.from('faqs').insert(DEFAULT_FAQS)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content')
  revalidatePath('/')
  revalidatePath('/faq')
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

export type AdminNotificationCategory =
  | 'order'
  | 'payment'
  | 'stock'
  | 'catalog'
  | 'activity'
  | 'security';

export type AdminNotificationItem = {
  id: string;
  category: AdminNotificationCategory;
  title: string;
  description: string;
  link: string;
  created_at: string;
  severity: 'urgent' | 'warning' | 'info';
};

export async function getAdminAllNotificationsAction(): Promise<{
  notifications: AdminNotificationItem[];
  counts: {
    total: number;
    orders: number;
    payment: number;
    stock: number;
    catalog: number;
    activity: number;
    security: number;
  };
  allowedCategories: AdminNotificationCategory[];
  staffNotificationConfig: AdminNotificationCategory[];
  isSuperAdmin: boolean;
}> {
  const { isAdmin, role } = await getAdminAccess();
  if (!isAdmin) {
    return {
      notifications: [],
      counts: { total: 0, orders: 0, payment: 0, stock: 0, catalog: 0, activity: 0, security: 0 },
      allowedCategories: [],
      staffNotificationConfig: ['order', 'stock', 'catalog'],
      isSuperAdmin: false,
    };
  }

  const isSuperAdmin = role === 'super_admin';
  const supabase = await createClient();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const notifs: AdminNotificationItem[] = [];

  // Read settings for audit logs and staff notification configuration
  let staffNotificationConfig: AdminNotificationCategory[] = ['order', 'stock', 'catalog'];
  let auditLogs: Array<{
    id: string;
    admin_name: string;
    admin_role: string;
    action: string;
    entity_type: string;
    entity_name: string;
    details: string;
    created_at: string;
  }> = [];

  try {
    const { data: sfData } = await supabase
      .from('storefront_settings')
      .select('settings')
      .eq('id', 'main')
      .maybeSingle();

    if (Array.isArray(sfData?.settings?.staff_notification_config) && sfData.settings.staff_notification_config.length > 0) {
      staffNotificationConfig = sfData.settings.staff_notification_config;
    }

    if (Array.isArray(sfData?.settings?.admin_audit_logs)) {
      auditLogs = sfData.settings.admin_audit_logs;
    }
  } catch {
    // fallback
  }

  // 1. Akun Terkunci (Keamanan)
  if (serviceKey && url) {
    try {
      const adminClient = createSupabaseAdminClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const lockedUsers = (authData?.users ?? []).filter(
        (u) => Boolean(u.app_metadata?.is_password_locked ?? u.user_metadata?.is_password_locked)
      );
      for (const u of lockedUsers) {
        const name =
          (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          u.email ||
          'Pengguna';
        notifs.push({
          id: `sec-${u.id}`,
          category: 'security',
          title: `Akun Terkunci: ${name}`,
          description: `${u.email || '-'} telah 3x salah memasukkan kata sandi dan butuh reset password.`,
          link: '/admin/customers',
          created_at:
            (u.user_metadata?.password_locked_at as string) || new Date().toISOString(),
          severity: 'urgent',
        });
      }
    } catch {
      // fallback
    }
  }

  // 2. Pesanan Masuk & Status Pembelian (Order)
  try {
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, payment_method, grand_total, created_at, updated_at, users(full_name)')
      .order('created_at', { ascending: false })
      .limit(20);

    for (const o of recentOrders ?? []) {
      const profile = Array.isArray(o.users) ? o.users[0] : o.users;
      const customerName = profile?.full_name || 'Pelanggan';
      const orderNum = o.order_number || String(o.id).slice(0, 8);
      const formattedTotal = Number(o.grand_total ?? 0).toLocaleString('id-ID');

      if (o.status === 'pending') {
        notifs.push({
          id: `ord-pending-${o.id}`,
          category: 'order',
          title: `Pesanan Baru Masuk #${orderNum}`,
          description: `${customerName} • Total Rp ${formattedTotal} • Menunggu Pembayaran`,
          link: '/admin/orders',
          created_at: o.created_at,
          severity: 'warning',
        });
      } else if (o.status === 'processing') {
        notifs.push({
          id: `ord-proc-${o.id}`,
          category: 'order',
          title: `Pesanan Diproses #${orderNum}`,
          description: `${customerName} • Total Rp ${formattedTotal} • Siap Cek-in & Pengiriman`,
          link: '/admin/orders',
          created_at: o.updated_at || o.created_at,
          severity: 'info',
        });
      } else if (o.status === 'shipped') {
        notifs.push({
          id: `ord-ship-${o.id}`,
          category: 'order',
          title: `Pesanan Dikirim #${orderNum}`,
          description: `Pesanan ${customerName} sedang dalam perjalanan pengiriman kurir.`,
          link: '/admin/orders',
          created_at: o.updated_at || o.created_at,
          severity: 'info',
        });
      } else if (o.status === 'cancelled') {
        notifs.push({
          id: `ord-cancel-${o.id}`,
          category: 'order',
          title: `Pesanan Dibatalkan #${orderNum}`,
          description: `Pesanan ${customerName} telah dibatalkan oleh sistem atau pelanggan.`,
          link: '/admin/orders',
          created_at: o.updated_at || o.created_at,
          severity: 'warning',
        });
      }

      // 3. Pengeditan Pembayaran & Verifikasi Transfer (Payment)
      if (o.payment_status === 'paid') {
        notifs.push({
          id: `pay-paid-${o.id}`,
          category: 'payment',
          title: `Pembayaran Lunas: #${orderNum}`,
          description: `Pembayaran ${customerName} sebesar Rp ${formattedTotal} (${o.payment_method || 'Transfer'}) telah lunas terverifikasi.`,
          link: '/admin/orders',
          created_at: o.updated_at || o.created_at,
          severity: 'info',
        });
      } else if (o.payment_status === 'awaiting_verification' || (o.status === 'pending' && o.payment_method === 'transfer')) {
        notifs.push({
          id: `pay-verify-${o.id}`,
          category: 'payment',
          title: `Verifikasi Transfer: #${orderNum}`,
          description: `Pesanan ${customerName} (Rp ${formattedTotal}) membutuhkan cek mutasi & verifikasi transfer bank.`,
          link: '/admin/orders',
          created_at: o.updated_at || o.created_at,
          severity: 'urgent',
        });
      }
    }
  } catch {
    // fallback
  }

  // 4. Stok Menipis / Habis (Stock <= 5)
  try {
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('id, name, stock, updated_at, categories(name)')
      .lte('stock', 5)
      .order('stock', { ascending: true })
      .limit(10);

    for (const p of lowStockProducts ?? []) {
      const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
      const isOut = (p.stock ?? 0) <= 0;
      notifs.push({
        id: `stock-alert-${p.id}`,
        category: 'stock',
        title: isOut ? `Stok Habis: ${p.name}` : `Stok Menipis: ${p.name}`,
        description: isOut
          ? `Stok kosong! Kategori: ${cat?.name || '-'}. Segera lakukan restock inventaris.`
          : `Sisa ${p.stock} unit (Kategori: ${cat?.name || '-'}). Segera restock sebelum kehabisan.`,
        link: `/admin/products?search=${encodeURIComponent(p.name)}`,
        created_at: p.updated_at || new Date().toISOString(),
        severity: isOut ? 'urgent' : 'warning',
      });
    }
  } catch {
    // fallback
  }

  // 5. Log Aktivitas (Pengeditan Pembayaran, Masukin Data Stock, Produk, Brand, dll)
  for (const log of auditLogs.slice(0, 30)) {
    const detailLower = (log.details || '').toLowerCase();
    const isPaymentEdit =
      log.entity_type === 'order' &&
      (detailLower.includes('pembayaran') ||
        detailLower.includes('bayar') ||
        detailLower.includes('transfer') ||
        detailLower.includes('verifikasi') ||
        detailLower.includes('lunas') ||
        detailLower.includes('status'));

    const isStockEdit =
      detailLower.includes('stok') ||
      detailLower.includes('stock') ||
      detailLower.includes('sinkronisasi') ||
      detailLower.includes('import stock');

    const isCatalog =
      ['product', 'brand', 'category'].includes(log.entity_type) && !isStockEdit;

    if (isPaymentEdit) {
      notifs.push({
        id: `audit-pay-${log.id}`,
        category: 'payment',
        title: `Pengeditan Pembayaran: ${log.entity_name}`,
        description: `${log.admin_name} (${log.admin_role}): ${log.details}`,
        link: '/admin/orders',
        created_at: log.created_at,
        severity: 'info',
      });
    } else if (isStockEdit) {
      notifs.push({
        id: `audit-stock-${log.id}`,
        category: 'stock',
        title: `Pembaruan Stok: ${log.entity_name}`,
        description: `${log.admin_name} (${log.admin_role}): ${log.details}`,
        link: '/admin/stock-sync',
        created_at: log.created_at,
        severity: 'info',
      });
    } else if (isCatalog) {
      notifs.push({
        id: `audit-cat-${log.id}`,
        category: 'catalog',
        title: `${log.action === 'create' ? 'Penambahan' : 'Pengeditan'} ${
          log.entity_type === 'product'
            ? 'Produk'
            : log.entity_type === 'brand'
            ? 'Brand'
            : 'Kategori'
        }: ${log.entity_name}`,
        description: `${log.admin_name} (${log.admin_role}): ${log.details}`,
        link:
          log.entity_type === 'product'
            ? '/admin/products'
            : log.entity_type === 'brand'
            ? '/admin/brands'
            : '/admin/categories',
        created_at: log.created_at,
        severity: 'info',
      });
    } else if (['content', 'settings', 'voucher', 'account'].includes(log.entity_type)) {
      notifs.push({
        id: `audit-act-${log.id}`,
        category: 'activity',
        title: `Aktivitas Sistem: ${log.entity_name}`,
        description: `${log.admin_name} (${log.admin_role}): ${log.details}`,
        link: log.entity_type === 'voucher' ? '/admin/vouchers' : '/admin/logs',
        created_at: log.created_at,
        severity: 'info',
      });
    }
  }

  // 6. Produk & Brand Baru Ditambahkan (Katalog Baru)
  try {
    const { data: recentProds } = await supabase
      .from('products')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    for (const p of recentProds ?? []) {
      notifs.push({
        id: `prod-new-${p.id}`,
        category: 'catalog',
        title: `Produk Baru: ${p.name}`,
        description: `Produk telah terdaftar aktif dalam katalog toko.`,
        link: `/admin/products?search=${encodeURIComponent(p.name)}`,
        created_at: p.created_at,
        severity: 'info',
      });
    }
  } catch {
    // fallback
  }

  // Urutkan berdasarkan waktu terbaru dan cegah duplikat ID
  const seenIds = new Set<string>();
  const uniqueNotifs: AdminNotificationItem[] = [];
  for (const n of notifs) {
    if (!seenIds.has(n.id)) {
      seenIds.add(n.id);
      uniqueNotifs.push(n);
    }
  }
  uniqueNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Kategori yang diizinkan untuk dilihat oleh user saat ini
  const allowedCategories: AdminNotificationCategory[] = isSuperAdmin
    ? ['order', 'payment', 'stock', 'catalog', 'activity', 'security']
    : staffNotificationConfig;

  // Filter notifikasi sesuai kategori yang diizinkan
  const filteredNotifs = uniqueNotifs
    .filter((n) => allowedCategories.includes(n.category))
    .slice(0, 50);

  const counts = {
    total: filteredNotifs.length,
    orders: filteredNotifs.filter((n) => n.category === 'order').length,
    payment: filteredNotifs.filter((n) => n.category === 'payment').length,
    stock: filteredNotifs.filter((n) => n.category === 'stock').length,
    catalog: filteredNotifs.filter((n) => n.category === 'catalog').length,
    activity: filteredNotifs.filter((n) => n.category === 'activity').length,
    security: filteredNotifs.filter((n) => n.category === 'security').length,
  };

  return {
    notifications: filteredNotifs,
    counts,
    allowedCategories,
    staffNotificationConfig,
    isSuperAdmin,
  };
}

export async function saveStaffNotificationConfigAction(
  categories: AdminNotificationCategory[]
): Promise<{ success: boolean; message: string; staffNotificationConfig: AdminNotificationCategory[] }> {
  const { user, role } = await getAdminAccess();
  if (!user || role !== 'super_admin') {
    throw new Error('Hanya Super Admin yang berwenang mengatur preferensi notifikasi staf.');
  }

  const validCategories: AdminNotificationCategory[] = [
    'order',
    'payment',
    'stock',
    'catalog',
    'activity',
    'security',
  ];
  const cleaned = categories.filter((c) => validCategories.includes(c));
  if (cleaned.length === 0) {
    throw new Error('Pilih minimal satu kategori notifikasi untuk staf admin.');
  }

  const adminClient = getSupabaseAdminClient();
  const { data: sfData } = await adminClient
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle();

  const currentSettings =
    sfData?.settings && typeof sfData.settings === 'object' ? sfData.settings : {};

  const { error } = await adminClient.from('storefront_settings').upsert(
    {
      id: 'main',
      settings: {
        ...currentSettings,
        staff_notification_config: cleaned,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Gagal menyimpan pengaturan notifikasi staf: ${error.message}`);
  }

  return {
    success: true,
    message: 'Pengaturan notifikasi staf admin berhasil disimpan!',
    staffNotificationConfig: cleaned,
  };
}

export async function updateAdminAvatarAction(avatarUrl: string) {
  const { user } = await requireAdmin()
  const cleanUrl = avatarUrl.trim()
  if (cleanUrl && !/^https?:\/\//i.test(cleanUrl) && !cleanUrl.startsWith('/')) {
    throw new Error('URL foto tidak valid. Gunakan format URL HTTPS atau upload gambar.')
  }
  if (/\.(svg|html|htm)($|\?)/i.test(cleanUrl)) {
    throw new Error('Format gambar SVG/HTML tidak diizinkan demi alasan keamanan. Gunakan file JPG, PNG, atau WebP.')
  }

  // Update auth metadata
  const supabase = await createClient()
  await supabase.auth.updateUser({
    data: { avatar_url: cleanUrl || null },
  })

  // Update public.users table with admin client (bypasses RLS/restricted columns)
  try {
    const adminClient = getSupabaseAdminClient()
    await adminClient
      .from('users')
      .update({ avatar_url: cleanUrl || null })
      .eq('id', user.id)
  } catch {
    await supabase
      .from('users')
      .update({ avatar_url: cleanUrl || null })
      .eq('id', user.id)
  }

  revalidatePath('/admin')
  revalidatePath('/profile')
  return { success: true, avatarUrl: cleanUrl }
}

export async function getCurrentAdminAvatarAction() {
  const { user } = await requireAdmin()
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return {
    avatarUrl: profile?.avatar_url || (user.user_metadata?.avatar_url as string) || '',
  }
}

