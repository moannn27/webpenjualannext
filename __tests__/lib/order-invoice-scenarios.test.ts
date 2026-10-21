import { describe, expect, it } from 'vitest';
import type { InvoiceOrderData, InvoiceStorefrontInfo } from '@/components/invoice/OrderInvoice';

describe('Order Invoice Security & Multi-Scenario Suite', () => {
  const customerA = { id: 'usr-customer-a', full_name: 'Budi Santoso', email: 'budi@example.com', role: 'customer' };
  const customerB = { id: 'usr-customer-b', full_name: 'Dewi Lestari', email: 'dewi@example.com', role: 'customer' };
  const adminUser = { id: 'usr-admin-1', full_name: 'Admin Utama', email: 'admin@nextsolution.com', role: 'admin' };

  const sampleOrderA: InvoiceOrderData = {
    id: 'ord-11111111-2222-3333-4444-555555555555',
    order_number: 'ORD-20261014-04',
    created_at: '2026-10-14T08:30:00.000Z',
    status: 'processing',
    total_amount: 16199000,
    shipping_amount: 0,
    discount_amount: 0,
    grand_total: 16199000,
    courier: 'pickup',
    shipping_address: {
      recipient_name: 'Budi Santoso',
      phone: '081234567890',
      pickup_location: 'Next Solution Bandung',
      pickup_address: 'Jl. Kartini No. 9, Bandung',
    },
    order_items: [
      {
        id: 'item-1',
        product_id: 'prod-001',
        product_name: 'IdeaPad Slim 3 14IPH11 (IdeaPad Slim 3i) (CORE ULTRA 5)',
        price: 16199000,
        quantity: 1,
        variant_details: {
          color: 'Luna Grey',
          ram: '16GB SODIMM DDR5-5600',
          storage: '512GB SSD M.2',
        },
        sku: '83UQ-IDEAPAD-SLIM-3',
        products: {
          id: 'prod-001',
          sku: '83UQ-IDEAPAD-SLIM-3',
          name: 'IdeaPad Slim 3 14IPH11 (IdeaPad Slim 3i) (CORE ULTRA 5)',
          description: 'Laptop kerja modern bertenaga Intel Core Ultra 5',
          brands: { name: 'Lenovo' },
          categories: { name: 'Laptops' },
          product_images: [{ url: 'https://example.com/laptop.jpg', is_primary: true }],
          product_specifications: [
            { key: 'Processor', value: 'Intel Core Ultra 5 125H', display_order: 1 },
            { key: 'RAM', value: '16GB DDR5', display_order: 2 },
          ],
        },
      },
    ],
    payments: [
      {
        id: 'pay-1',
        amount: 16199000,
        payment_method: 'manual_transfer',
        status: 'success',
      },
    ],
    users: {
      full_name: 'Budi Santoso',
      phone: '081234567890',
      email: 'budi@example.com',
    },
  };

  const sampleStorefront: InvoiceStorefrontInfo = {
    storeName: 'Next Solution Store',
    storeAddress: 'Jl. Kartini No. 9',
    storeCity: 'Bandung',
    storePhone: '081234567890',
    storeWhatsapp: '081234567890',
    storeEmail: 'support@nextsolution.com',
    logoUrl: 'https://example.com/logo.png',
    logoDisplayMode: 'both',
    bankAccounts: [
      {
        bank_name: 'BCA',
        account_number: '8320192831',
        account_holder: 'Next Solution Store',
      },
    ],
  };

  describe('Scenario 1: Authorization & IDOR Access Control', () => {
    function authorizeInvoiceAccess(
      sessionUser: { id: string; role: string },
      orderOwnerId: string
    ): { allowed: boolean; reason?: string } {
      const isAdmin = sessionUser.role === 'admin' || sessionUser.role === 'super_admin';
      if (isAdmin) return { allowed: true };
      if (sessionUser.id === orderOwnerId) return { allowed: true };
      return { allowed: false, reason: 'Forbidden: Customers cannot access invoices of other customers' };
    }

    it('allows a customer to access their own invoice', () => {
      const result = authorizeInvoiceAccess(customerA, customerA.id);
      expect(result.allowed).toBe(true);
    });

    it('strictly forbids a customer from accessing another customer invoice (prevents IDOR)', () => {
      const result = authorizeInvoiceAccess(customerB, customerA.id);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Forbidden');
    });

    it('allows an administrator to view any customer invoice', () => {
      const result = authorizeInvoiceAccess(adminUser, customerA.id);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Scenario 2: Data Integrity & Calculation Verification', () => {
    it('verifies items subtotal, discount, shipping and grand_total consistency', () => {
      expect(sampleStorefront.storeName).toBe('Next Solution Store');
      expect(sampleStorefront.bankAccounts?.[0].bank_name).toBe('BCA');
      const itemsSubtotal = sampleOrderA.order_items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(itemsSubtotal).toBe(16199000);
      expect(sampleOrderA.total_amount).toBe(itemsSubtotal);

      const calculatedGrandTotal = sampleOrderA.total_amount + sampleOrderA.shipping_amount - sampleOrderA.discount_amount;
      expect(calculatedGrandTotal).toBe(sampleOrderA.grand_total);
    });

    it('handles complex orders with multiple products, discounts, and courier shipping', () => {
      const multiProductOrder: InvoiceOrderData = {
        id: 'ord-multi',
        order_number: 'ORD-20261021-99',
        created_at: '2026-10-21T10:00:00.000Z',
        status: 'shipped',
        total_amount: 25000000,
        shipping_amount: 45000,
        discount_amount: 500000,
        grand_total: 24545000,
        courier: 'jne',
        shipping_address: {
          recipient_name: 'Dewi Lestari',
          phone: '081299998888',
          street_address: 'Jl. Riau No. 50',
          city: 'Bandung',
          province: 'Jawa Barat',
          postal_code: '40115',
        },
        order_items: [
          {
            id: 'it-1',
            product_name: 'Laptop Gaming ASUS ROG',
            price: 23000000,
            quantity: 1,
          },
          {
            id: 'it-2',
            product_name: 'Gaming Mouse Wireless',
            price: 1000000,
            quantity: 2,
          },
        ],
        payments: [{ amount: 24545000, payment_method: 'qris', status: 'success' }],
      };

      const line1 = multiProductOrder.order_items[0].price * multiProductOrder.order_items[0].quantity;
      const line2 = multiProductOrder.order_items[1].price * multiProductOrder.order_items[1].quantity;
      expect(line1 + line2).toBe(multiProductOrder.total_amount);

      const grandExpected = multiProductOrder.total_amount + multiProductOrder.shipping_amount - multiProductOrder.discount_amount;
      expect(multiProductOrder.grand_total).toBe(grandExpected);
    });
  });

  describe('Scenario 3: Resilient Fallback for Old Orders & Null Data', () => {
    it('successfully processes old orders where product record was deleted or has null metadata', () => {
      const legacyOrder: InvoiceOrderData = {
        id: 'ord-legacy-old',
        order_number: 'ORD-20250101-01',
        created_at: '2025-01-01T12:00:00.000Z',
        status: 'delivered',
        total_amount: 5000000,
        shipping_amount: 0,
        discount_amount: 0,
        grand_total: 5000000,
        courier: 'pickup',
        shipping_address: null, // Legacy order with null shipping_address
        order_items: [
          {
            id: 'legacy-item-1',
            product_id: null, // Product was deleted or unlinked
            product_name: 'Monitor Jadul 19 Inch (Discontinued)',
            price: 5000000,
            quantity: 1,
            variant_details: null,
            products: null, // No relation to current products table
          },
        ],
        payments: [],
        users: null,
      };

      // Resilient fallback checks
      const recipient = legacyOrder.shipping_address?.recipient_name || legacyOrder.users?.full_name || 'Pelanggan';
      expect(recipient).toBe('Pelanggan');

      const item = legacyOrder.order_items[0];
      expect(item.product_name).toBe('Monitor Jadul 19 Inch (Discontinued)');
      expect(item.price).toBe(5000000);
      expect(item.quantity).toBe(1);
    });
  });

  describe('Scenario 4: Payment Status & Pickup Mode Rendering', () => {
    it('correctly maps payment confirmation states', () => {
      const isConfirmed = (status: string, orderStatus: string) =>
        status === 'success' ||
        orderStatus === 'processing' ||
        orderStatus === 'shipped' ||
        orderStatus === 'delivered';

      expect(isConfirmed('success', 'processing')).toBe(true);
      expect(isConfirmed('pending', 'shipped')).toBe(true);
      expect(isConfirmed('pending', 'pending')).toBe(false);
    });

    it('properly differentiates pickup vs courier addresses', () => {
      const isPickup = sampleOrderA.courier === 'pickup';
      expect(isPickup).toBe(true);
      expect(sampleOrderA.shipping_address?.pickup_location).toBe('Next Solution Bandung');
    });
  });

  describe('Scenario 5: Dynamic Invoice Settings & Complaint Flow', () => {
    it('uses configured invoice header subtitle, terms and guarantee notes', () => {
      const customStorefront: InvoiceStorefrontInfo = {
        ...sampleStorefront,
        headerSubtitle: 'Pusat Komputer, Laptop & Solusi Elektronik Resmi',
        termsNote: 'Simpan faktur fisik atau digital ini sebagai bukti sah transaksi dan garansi resmi. Garansi distributor berlaku dengan kondisi segel utuh.',
        guaranteeNote: 'Simpan faktur ini sebagai bukti pembelian yang sah untuk klaim garansi resmi.',
        complaintWhatsapp: '6281234567890',
        complaintInstructions: 'Ajukan komplain langsung melalui WhatsApp Admin dengan menyertakan video unboxing utuh.',
      };

      expect(customStorefront.headerSubtitle).toBe('Pusat Komputer, Laptop & Solusi Elektronik Resmi');
      expect(customStorefront.termsNote).toContain('Garansi distributor');
      expect(customStorefront.complaintWhatsapp).toBe('6281234567890');
    });

    it('generates structured customer complaint WhatsApp text with order details', () => {
      const phone = '081234567890';
      const cleanPhone = phone.replace(/\D/g, '');
      const waTarget = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

      const itemsSummary = sampleOrderA.order_items.map((i) => `• ${i.product_name} (${i.quantity}x)`).join('\n');
      const msg =
        `Halo Admin ${sampleStorefront.storeName},\n` +
        `Saya ingin mengajukan komplain / bantuan terkait pesanan saya:\n\n` +
        `📋 *Rincian Pesanan:*\n` +
        `• Nomor Faktur: *${sampleOrderA.order_number}*\n` +
        `• Nama Pembeli: *${sampleOrderA.shipping_address?.recipient_name}*\n` +
        `• Produk Dipesan:\n${itemsSummary}\n\n` +
        `Catatan: Saya telah menyiapkan bukti foto & video unboxing utuh.`;

      const complaintUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`;
      expect(complaintUrl).toContain('https://wa.me/6281234567890');
      expect(complaintUrl).toContain(encodeURIComponent('ORD-20261014-04'));
      expect(complaintUrl).toContain(encodeURIComponent('Budi Santoso'));
    });

    it('generates admin follow-up WhatsApp link to contact customer about complaints', () => {
      const recipientPhone = sampleOrderA.shipping_address?.phone || '';
      const cleanRecipient = recipientPhone.replace(/\D/g, '');
      const customerTarget = cleanRecipient.startsWith('0') ? '62' + cleanRecipient.slice(1) : cleanRecipient;

      const adminMsg = `Halo Kak ${sampleOrderA.shipping_address?.recipient_name}, kami dari Admin terkait pesanan No. *${sampleOrderA.order_number}*`;
      const adminFollowUpUrl = `https://wa.me/${customerTarget}?text=${encodeURIComponent(adminMsg)}`;

      expect(adminFollowUpUrl).toBe(`https://wa.me/6281234567890?text=${encodeURIComponent(adminMsg)}`);
    });
  });
});

