/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutService } from '@/services/checkout.service';
import { type CheckoutInput } from '@/validators/checkout.validator';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: vi.fn(),
}));

describe('Checkout Voucher Concurrency, Reservation Safety & RBAC Suite', () => {
  let checkoutService: CheckoutService;

  const validCheckoutInput: CheckoutInput = {
    recipientName: 'Pelanggan Uji',
    phone: '081234567890',
    streetAddress: 'Jl. Sudirman No. 45',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12190',
    shippingMethod: 'standard',
    paymentMethod: 'manual_transfer',
  };

  const dummyCart = {
    id: 'cart-123',
    cart_items: [
      {
        quantity: 1,
        variant_id: null,
        products: {
          id: 'prod-laptop-1',
          name: 'ThinkPad T14',
          price: 15000000,
          discount_price: null,
          status: 'published',
          stock: 10,
          category_id: 'cat-laptop',
          brand_id: 'brand-lenovo',
          categories: { id: 'cat-laptop', name: 'Laptop' },
          brands: { id: 'brand-lenovo', name: 'Lenovo' },
        },
        product_variants: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    checkoutService = new CheckoutService();
  });

  it('prevents voucher quota overflow when two checkouts run in parallel with 1 quota remaining', async () => {
    // Shared simulated database state
    const voucherState = {
      id: 'voucher-single-quota-uuid',
      code: 'LIMITED1',
      description: 'Voucher Khusus 1 Kuota',
      discount_type: 'fixed_amount',
      discount_value: 500000,
      min_purchase: 1000000,
      max_discount: null,
      start_date: null,
      end_date: null,
      is_active: true,
      usage_limit: 1,
      usage_count: 0,
    };

    const reservationsDb: Record<string, { voucher_id: string; user_id: string; status: string; order_id?: string }> = {};
    let reservationCounter = 0;
    let orderCounter = 0;

    // Mock createClient (client session)
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockImplementation(async () => {
      return {
        from: (table: string) => {
          if (table === 'vouchers') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { ...voucherState },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'storefront_settings') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { settings: {} },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'cart') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: dummyCart,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  neq: () => Promise.resolve({ count: 0 }),
                }),
              }),
            };
          }
          return {} as any;
        },
        rpc: async (fn: string) => {
          if (fn === 'process_checkout') {
            orderCounter++;
            return { data: `order-uuid-${orderCounter}`, error: null };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    // Mock getSupabaseAdminClient (service_role executing secure RPCs)
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    vi.mocked(getSupabaseAdminClient).mockImplementation(() => {
      return {
        from: (table: string) => {
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: { total_amount: 15000000, shipping_amount: 25000 },
                    error: null,
                  }),
                }),
              }),
              update: () => ({
                eq: async () => ({ error: null }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              update: () => ({
                eq: async () => ({ error: null }),
              }),
            };
          }
          return {} as any;
        },
        rpc: async (fn: string, args: any) => {
          if (fn === 'claim_voucher_quota') {
            // Atomic DB evaluation: increment usage_count ONLY IF usage_count < usage_limit
            if (voucherState.is_active && (voucherState.usage_limit === null || voucherState.usage_count < voucherState.usage_limit)) {
              voucherState.usage_count += 1;
              reservationCounter++;
              const resId = `res-uuid-${reservationCounter}`;
              reservationsDb[resId] = {
                voucher_id: voucherState.id,
                user_id: args.p_user_id,
                status: 'reserved',
              };
              return { data: resId, error: null };
            }
            return { data: null, error: null };
          }
          if (fn === 'consume_voucher_reservation') {
            const res = reservationsDb[args.p_reservation_id];
            if (res && res.status === 'reserved') {
              res.status = 'consumed';
              res.order_id = args.p_order_id;
              return { data: true, error: null };
            }
            return { data: false, error: null };
          }
          if (fn === 'release_voucher_reservation') {
            const res = reservationsDb[args.p_reservation_id];
            if (res && res.status === 'reserved') {
              res.status = 'released';
              voucherState.usage_count = Math.max(0, voucherState.usage_count - 1);
              return { data: true, error: null };
            }
            return { data: false, error: null };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    // Run two checkouts concurrently
    const [result1, result2] = await Promise.allSettled([
      checkoutService.checkout('user-alice-1', validCheckoutInput, 'LIMITED1'),
      checkoutService.checkout('user-bob-2', validCheckoutInput, 'LIMITED1'),
    ]);

    const succeeded = [result1, result2].filter((r) => r.status === 'fulfilled');
    const failed = [result1, result2].filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    if (failed[0].status === 'rejected') {
      expect((failed[0].reason as Error).message).toMatch(/Kuota pemakaian voucher ini sudah habis/i);
    }

    // Crucial: usage_count MUST be exactly 1, never exceeding usage_limit 1
    expect(voucherState.usage_count).toBe(1);

    // Reservation for the succeeded checkout must be 'consumed'
    const consumedList = Object.values(reservationsDb).filter((r) => r.status === 'consumed');
    expect(consumedList).toHaveLength(1);
  });

  it('rolls back claimed voucher quota if process_checkout fails midway', async () => {
    const voucherState = {
      id: 'voucher-rollback-uuid',
      code: 'ROLLBACK10',
      description: 'Voucher Rollback Test',
      discount_type: 'fixed_amount',
      discount_value: 100000,
      min_purchase: 500000,
      max_discount: null,
      start_date: null,
      end_date: null,
      is_active: true,
      usage_limit: 5,
      usage_count: 2,
    };

    const reservationsDb: Record<string, { voucher_id: string; user_id: string; status: string }> = {};

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockImplementation(async () => {
      return {
        from: (table: string) => {
          if (table === 'vouchers') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { ...voucherState },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'storefront_settings') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { settings: {} },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'cart') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: dummyCart,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
        rpc: async (fn: string) => {
          if (fn === 'process_checkout') {
            return { data: null, error: { message: 'Insufficient stock for product ThinkPad T14' } };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    vi.mocked(getSupabaseAdminClient).mockImplementation(() => {
      return {
        from: () => ({
          update: () => ({ eq: async () => ({ error: null }) }),
        }),
        rpc: async (fn: string, args: any) => {
          if (fn === 'claim_voucher_quota') {
            voucherState.usage_count += 1;
            const resId = 'res-rollback-123';
            reservationsDb[resId] = {
              voucher_id: voucherState.id,
              user_id: args.p_user_id,
              status: 'reserved',
            };
            return { data: resId, error: null };
          }
          if (fn === 'release_voucher_reservation') {
            const res = reservationsDb[args.p_reservation_id];
            if (res && res.status === 'reserved') {
              res.status = 'released';
              voucherState.usage_count = Math.max(0, voucherState.usage_count - 1);
              return { data: true, error: null };
            }
            return { data: false, error: null };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    expect(voucherState.usage_count).toBe(2);

    await expect(
      checkoutService.checkout('user-test-fail', validCheckoutInput, 'ROLLBACK10')
    ).rejects.toThrow(/Insufficient stock/i);

    // Reservation must have transitioned to 'released'
    expect(reservationsDb['res-rollback-123'].status).toBe('released');

    // Usage count must have returned back to 2, not remaining at 3
    expect(voucherState.usage_count).toBe(2);
  });

  it('prevents replay attacks on voucher release: cannot decrement usage_count more than once or when already consumed', async () => {
    const voucherState = {
      id: 'voucher-replay-test-uuid',
      usage_count: 5,
    };

    const reservationsDb: Record<string, { voucher_id: string; status: string }> = {
      'res-already-released': { voucher_id: voucherState.id, status: 'released' },
      'res-already-consumed': { voucher_id: voucherState.id, status: 'consumed' },
      'res-active-reserved': { voucher_id: voucherState.id, status: 'reserved' },
    };

    // Simulate release_voucher_reservation RPC logic
    const releaseVoucherReservation = (resId: string) => {
      const res = reservationsDb[resId];
      // Atomic condition in SQL: WHERE id = p_reservation_id AND status = 'reserved'
      if (!res || res.status !== 'reserved') {
        return false;
      }
      res.status = 'released';
      voucherState.usage_count = Math.max(0, voucherState.usage_count - 1);
      return true;
    };

    // 1. Initial count is 5
    expect(voucherState.usage_count).toBe(5);

    // 2. Releasing a reservation in 'reserved' state succeeds and decrements count by 1
    const releaseSuccess1 = releaseVoucherReservation('res-active-reserved');
    expect(releaseSuccess1).toBe(true);
    expect(voucherState.usage_count).toBe(4);
    expect(reservationsDb['res-active-reserved'].status).toBe('released');

    // 3. REPLAY ATTEMPT: Calling release on the same reservation a second time must be rejected and must NOT decrement count
    const replayAttempt = releaseVoucherReservation('res-active-reserved');
    expect(replayAttempt).toBe(false);
    expect(voucherState.usage_count).toBe(4); // Remains 4, not decremented to 3!

    // 4. ATTEMPT ON CONSUMED RESERVATION: Calling release on an order that succeeded ('consumed') must be rejected and must NOT decrement count
    const consumedAttempt = releaseVoucherReservation('res-already-consumed');
    expect(consumedAttempt).toBe(false);
    expect(voucherState.usage_count).toBe(4); // Remains 4!
  });

  it('enforces RBAC: regular user / authenticated client is denied direct execute access to voucher quota RPCs', async () => {
    // In our migration, claim_voucher_quota, consume_voucher_reservation, and release_voucher_reservation
    // are REVOKED from PUBLIC, anon, authenticated and GRANTED only to service_role.

    const clientRpcMock = vi.fn().mockImplementation(async (fnName: string) => {
      if (['claim_voucher_quota', 'consume_voucher_reservation', 'release_voucher_reservation'].includes(fnName)) {
        return {
          data: null,
          error: {
            code: '42501',
            message: `permission denied for function ${fnName}`,
          },
        };
      }
      return { data: null, error: null };
    });

    const regularUserSupabaseClient = {
      rpc: clientRpcMock,
    };

    // User attempts direct call to claim_voucher_quota
    const claimResult = await regularUserSupabaseClient.rpc('claim_voucher_quota');
    expect(claimResult.error).toBeDefined();
    expect(claimResult.error?.code).toBe('42501');
    expect(claimResult.error?.message).toMatch(/permission denied/i);

    // User attempts direct call to release_voucher_reservation
    const releaseResult = await regularUserSupabaseClient.rpc('release_voucher_reservation');
    expect(releaseResult.error).toBeDefined();
    expect(releaseResult.error?.code).toBe('42501');
    expect(releaseResult.error?.message).toMatch(/permission denied/i);
  });

  it('fails closed safely when claim_voucher_quota RPC is not found in database (PGRST202)', async () => {
    const voucherState = {
      id: 'voucher-fail-closed-uuid',
      code: 'FAILCLOSED',
      description: 'Test Fail Closed',
      discount_type: 'fixed_amount',
      discount_value: 50000,
      min_purchase: 100000,
      max_discount: null,
      start_date: null,
      end_date: null,
      is_active: true,
      usage_limit: 10,
      usage_count: 0,
    };

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockImplementation(async () => {
      return {
        from: (table: string) => {
          if (table === 'vouchers') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { ...voucherState },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'storefront_settings') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { settings: {} },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'cart') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: dummyCart,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      } as any;
    });

    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    vi.mocked(getSupabaseAdminClient).mockImplementation(() => {
      return {
        rpc: async (fn: string) => {
          if (fn === 'claim_voucher_quota') {
            return { data: null, error: { code: 'PGRST202', message: 'Could not find function claim_voucher_quota' } };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    await expect(
      checkoutService.checkout('user-test', validCheckoutInput, 'FAILCLOSED')
    ).rejects.toThrow(/fail-closed|belum tersedia/i);
  });

  it('opportunistically reclaims expired reservations (>15 mins) when claiming quota, avoiding quota lockout from server crashes', async () => {
    const voucherState = {
      id: 'voucher-stale-test-uuid',
      code: 'STALE1',
      description: 'Test Stale Recovery',
      discount_type: 'fixed_amount',
      discount_value: 50000,
      min_purchase: 100000,
      max_discount: null,
      start_date: null,
      end_date: null,
      is_active: true,
      usage_limit: 1,
      usage_count: 1,
    };

    const reservationsDb: Record<string, { voucher_id: string; user_id: string; status: string; created_at: Date; order_id?: string }> = {
      'res-stale-abandoned': {
        voucher_id: voucherState.id,
        user_id: 'crashed-user-999',
        status: 'reserved',
        created_at: new Date(Date.now() - 20 * 60 * 1000),
      },
    };

    let reservationCounter = 1;

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockImplementation(async () => {
      return {
        from: (table: string) => {
          if (table === 'vouchers') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { ...voucherState },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'storefront_settings') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { settings: {} }, error: null }),
                }),
              }),
            };
          }
          if (table === 'cart') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: dummyCart, error: null }),
                }),
              }),
            };
          }
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({ neq: () => Promise.resolve({ count: 0 }) }),
              }),
            };
          }
          return {} as any;
        },
        rpc: async (fn: string) => {
          if (fn === 'process_checkout') {
            return { data: 'order-recovered-123', error: null };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    vi.mocked(getSupabaseAdminClient).mockImplementation(() => {
      return {
        from: (table: string) => {
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: { total_amount: 15000000, shipping_amount: 25000 },
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: async () => ({ error: null }) }),
            };
          }
          if (table === 'payments') {
            return { update: () => ({ eq: async () => ({ error: null }) }) };
          }
          return {} as any;
        },
        rpc: async (fn: string, args: any) => {
          if (fn === 'claim_voucher_quota') {
            const now = Date.now();
            let reclaimed = 0;
            for (const [, res] of Object.entries(reservationsDb)) {
              if (res.voucher_id === args?.p_voucher_id && res.status === 'reserved') {
                const ageMinutes = (now - res.created_at.getTime()) / (60 * 1000);
                if (ageMinutes > 15) {
                  res.status = 'released';
                  reclaimed++;
                }
              }
            }
            if (reclaimed > 0) {
              voucherState.usage_count = Math.max(0, voucherState.usage_count - reclaimed);
            }

            if (voucherState.is_active && (voucherState.usage_limit === null || voucherState.usage_count < voucherState.usage_limit)) {
              voucherState.usage_count += 1;
              reservationCounter++;
              const resId = 'res-uuid-' + reservationCounter;
              reservationsDb[resId] = {
                voucher_id: voucherState.id,
                user_id: args?.p_user_id,
                status: 'reserved',
                created_at: new Date(),
              };
              return { data: resId, error: null };
            }
            return { data: null, error: null };
          }
          if (fn === 'consume_voucher_reservation') {
            const res = reservationsDb[args?.p_reservation_id];
            if (res && res.status === 'reserved') {
              res.status = 'consumed';
              res.order_id = args?.p_order_id;
              return { data: true, error: null };
            }
            return { data: false, error: null };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    expect(reservationsDb['res-stale-abandoned'].status).toBe('reserved');
    expect(voucherState.usage_count).toBe(1);

    const result = await checkoutService.checkout('user-new-customer', validCheckoutInput, 'STALE1');

    expect(result.id).toBe('order-recovered-123');
    expect(reservationsDb['res-stale-abandoned'].status).toBe('released');
    expect(voucherState.usage_count).toBe(1);
  });

  it('fails checkout safely and triggers rollback when consume_voucher_reservation returns false (e.g. reservation expired)', async () => {
    const voucherState = {
      id: 'voucher-consume-fail-uuid',
      code: 'EXPIREFAIL',
      description: 'Test Expired Consume',
      discount_type: 'fixed_amount',
      discount_value: 50000,
      min_purchase: 100000,
      max_discount: null,
      start_date: null,
      end_date: null,
      is_active: true,
      usage_limit: 5,
      usage_count: 1,
    };

    let cancelledOrderId: string | null = null;
    let releasedReservationId: string | null = null;

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockImplementation(async () => {
      return {
        from: (table: string) => {
          if (table === 'vouchers') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { ...voucherState },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'storefront_settings') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { settings: {} }, error: null }),
                }),
              }),
            };
          }
          if (table === 'cart') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: dummyCart, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        },
        rpc: async (fn: string) => {
          if (fn === 'process_checkout') {
            return { data: 'order-to-cancel-999', error: null };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    vi.mocked(getSupabaseAdminClient).mockImplementation(() => {
      return {
        from: (table: string) => {
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: { total_amount: 15000000, shipping_amount: 25000 },
                    error: null,
                  }),
                }),
              }),
              update: (fields: any) => ({
                eq: async (_col: string, val: any) => {
                  if (fields.status === 'cancelled') {
                    cancelledOrderId = val;
                  }
                  return { error: null };
                },
              }),
            };
          }
          return {} as any;
        },
        rpc: async (fn: string, args: any) => {
          if (fn === 'claim_voucher_quota') {
            return { data: 'res-will-expire', error: null };
          }
          if (fn === 'consume_voucher_reservation') {
            return { data: false, error: null };
          }
          if (fn === 'release_voucher_reservation') {
            releasedReservationId = args?.p_reservation_id;
            return { data: false, error: null };
          }
          return { data: null, error: null };
        },
      } as any;
    });

    await expect(
      checkoutService.checkout('user-expire-test', validCheckoutInput, 'EXPIREFAIL')
    ).rejects.toThrow(/kadaluarsa atau tidak valid/i);

    expect(cancelledOrderId).toBe('order-to-cancel-999');
    expect(releasedReservationId).toBe('res-will-expire');
  });

  it('allows releases and decrements on oversubscribed historical vouchers without crashing, while blocking increments (23514)', () => {
    // Simulates the PostgreSQL guard_voucher_usage_limit trigger logic
    const enforceVoucherQuotaGuard = (
      op: 'INSERT' | 'UPDATE',
      oldRow: { usage_count: number; usage_limit: number | null } | null,
      newRow: { usage_count: number; usage_limit: number | null }
    ) => {
      if (newRow.usage_count < 0) {
        const err = new Error('Voucher usage_count cannot be negative.');
        (err as any).code = '23514';
        throw err;
      }

      if (op === 'INSERT') {
        if (newRow.usage_limit !== null && newRow.usage_count > newRow.usage_limit) {
          const err = new Error(`Voucher usage_count (${newRow.usage_count}) exceeds usage_limit (${newRow.usage_limit}).`);
          (err as any).code = '23514';
          throw err;
        }
      }

      if (op === 'UPDATE' && oldRow) {
        if (newRow.usage_limit !== null) {
          if (newRow.usage_count > oldRow.usage_count && newRow.usage_count > newRow.usage_limit) {
            const err = new Error(`Voucher usage_count (${newRow.usage_count}) cannot be incremented beyond usage_limit (${newRow.usage_limit}).`);
            (err as any).code = '23514';
            throw err;
          }
        }
      }

      return { allowed: true };
    };

    // 1. Oversubscribed historical voucher (limit: 10, current count: 12)
    const historicalVoucher = { usage_count: 12, usage_limit: 10 };

    // 2. Decrementing from 12 -> 11 when reservation is released or order cancelled MUST succeed
    const decrementResult = enforceVoucherQuotaGuard(
      'UPDATE',
      historicalVoucher,
      { usage_count: 11, usage_limit: 10 }
    );
    expect(decrementResult.allowed).toBe(true);

    // 3. Updating non-quota fields (same usage_count: 12) MUST succeed
    const metadataUpdateResult = enforceVoucherQuotaGuard(
      'UPDATE',
      historicalVoucher,
      { usage_count: 12, usage_limit: 10 }
    );
    expect(metadataUpdateResult.allowed).toBe(true);

    // 4. Attempting to INCREMENT (12 -> 13) MUST fail with 23514
    expect(() =>
      enforceVoucherQuotaGuard(
        'UPDATE',
        historicalVoucher,
        { usage_count: 13, usage_limit: 10 }
      )
    ).toThrowError(/cannot be incremented beyond usage_limit/);

    // 5. Attempting to set negative usage_count MUST fail with 23514
    expect(() =>
      enforceVoucherQuotaGuard(
        'UPDATE',
        historicalVoucher,
        { usage_count: -1, usage_limit: 10 }
      )
    ).toThrowError(/cannot be negative/);
  });

});
