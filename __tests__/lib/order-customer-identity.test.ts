import { describe, expect, it } from 'vitest';
import { resolveOrderCustomerIdentity } from '@/lib/orders/customer-identity';

describe('order customer identity', () => {
  it('uses the transaction snapshot after the account profile has been deleted', () => {
    const deletedAccountOrder = {
      shippingAddress: {
        recipient_name: 'Nama penerima lama',
        phone: '081234567890',
        customer_snapshot: {
          name: 'Nama di waktu transaksi',
          email: 'buyer@example.com',
          phone: '081111111111',
        },
      },
      userProfile: null,
    };

    expect(resolveOrderCustomerIdentity(deletedAccountOrder)).toEqual({
      name: 'Nama di waktu transaksi',
      email: 'buyer@example.com',
      phone: '081111111111',
    });
  });

  it('prefers verified legacy recipient fields and then the matching profile', () => {
    expect(resolveOrderCustomerIdentity({
      shippingAddress: { recipient_name: '  Penerima order  ', phone: '081234567890' },
      userProfile: { full_name: 'Nama profil sekarang', email: 'current@example.com', phone: '089999999999' },
    })).toEqual({
      name: 'Penerima order',
      email: 'current@example.com',
      phone: '081234567890',
    });
  });

  it('uses a clear fallback when no historical or profile identity exists', () => {
    expect(resolveOrderCustomerIdentity({ shippingAddress: null, userProfile: null })).toEqual({
      name: null,
      email: null,
      phone: null,
    });
  });

  it('supports both object and array profile relations', () => {
    expect(resolveOrderCustomerIdentity({
      shippingAddress: {},
      userProfile: [{ full_name: 'Budi', email: 'budi@example.com', phone: '0812' }],
    })).toEqual({ name: 'Budi', email: 'budi@example.com', phone: '0812' });
  });
});
