import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/repositories/base', () => ({
  BaseRepository: class {
    getClient = mocks.getClient
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}))

import { ReviewRepository } from '@/repositories/review.repository'

const reviewData = {
  user_id: '81000000-0000-4000-8000-000000000001',
  product_id: '84000000-0000-4000-8000-000000000001',
  order_id: '86000000-0000-4000-8000-000000000001',
  rating: 5,
  comment: 'Barang diterima dengan baik',
}

function existingReviewQuery(response: { data: unknown; error: null | { code: string; message: string } }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(response),
  }
  return query
}

describe('ReviewRepository.getByProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads public reviews and author fields in one query without exposing user IDs', async () => {
    const reviewRows = [{
      id: '89000000-0000-4000-8000-000000000001',
      product_id: reviewData.product_id,
      rating: 5,
      comment: reviewData.comment,
      image_url: null,
      created_at: '2026-11-02T10:00:00.000Z',
      is_verified: true,
      admin_reply: null,
      admin_replied_at: null,
      users: { full_name: 'Pelanggan', avatar_url: '/avatar.jpg', role: 'customer' },
    }]
    const reviewsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: reviewRows, error: null }),
    }
    mocks.getSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => reviewsQuery),
    })

    const reviews = await new ReviewRepository().getByProduct(reviewData.product_id)

    expect(reviewsQuery.select).toHaveBeenCalledWith(
      'id, product_id, rating, comment, image_url, created_at, is_verified, admin_reply, admin_replied_at, users(full_name, avatar_url)'
    )
    expect(mocks.getClient).not.toHaveBeenCalled()
    expect(mocks.getSupabaseAdminClient).toHaveBeenCalledTimes(1)
    expect(reviews[0].users).toEqual({ full_name: 'Pelanggan', avatar_url: '/avatar.jpg' })
    expect(reviews[0].users).not.toHaveProperty('role')
    expect(reviews[0]).not.toHaveProperty('user_id')
  })
})

describe('ReviewRepository.getRatingSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates every verified rating across result pages', async () => {
    const firstPage = [
      { id: '1', product_id: reviewData.product_id, rating: 5 },
      { id: '2', product_id: reviewData.product_id, rating: 3 },
    ]
    const nextPage = [
      { id: '3', product_id: '84000000-0000-4000-8000-000000000002', rating: 4 },
    ]
    const reviewQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn()
        .mockResolvedValueOnce({ data: firstPage, error: null, count: 3 })
        .mockResolvedValueOnce({ data: nextPage, error: null, count: null }),
    }
    mocks.getClient.mockResolvedValue({
      from: vi.fn(() => reviewQuery),
    })

    const summaries = await new ReviewRepository().getRatingSummaries([
      reviewData.product_id,
      reviewData.product_id,
      '84000000-0000-4000-8000-000000000002',
    ])

    expect(reviewQuery.select).toHaveBeenNthCalledWith(1, 'id, product_id, rating', { count: 'exact' })
    expect(reviewQuery.eq).toHaveBeenCalledWith('is_verified', true)
    expect(reviewQuery.gte).toHaveBeenCalledWith('rating', 1)
    expect(reviewQuery.lte).toHaveBeenCalledWith('rating', 5)
    expect(reviewQuery.range).toHaveBeenNthCalledWith(1, 0, 499)
    expect(reviewQuery.range).toHaveBeenNthCalledWith(2, 2, 501)
    expect(summaries.get(reviewData.product_id)).toEqual({ rating: 4, count: 2 })
    expect(summaries.get('84000000-0000-4000-8000-000000000002')).toEqual({ rating: 4, count: 1 })
  })

  it('returns an empty summary without making a database request when there are no products', async () => {
    const summaries = await new ReviewRepository().getRatingSummaries([])

    expect(summaries.size).toBe(0)
    expect(mocks.getClient).not.toHaveBeenCalled()
  })
})

describe('ReviewRepository.create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('explains that the review migration is missing when order_id is absent', async () => {
    const lookup = existingReviewQuery({ data: null, error: null })
    const insert = vi.fn().mockResolvedValue({
      error: {
        code: '42703',
        message: 'column "order_id" of relation "reviews" does not exist',
      },
    })
    mocks.getClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: lookup.select,
        eq: lookup.eq,
        order: lookup.order,
        limit: lookup.limit,
        maybeSingle: lookup.maybeSingle,
        insert,
      })),
    })

    await expect(new ReviewRepository().create(reviewData)).rejects.toThrow(
      /20261114000000_verified_product_reviews\.sql/
    )
    expect(insert).toHaveBeenCalledWith(reviewData)
  })

  it('does not continue to insert when checking for an existing review fails', async () => {
    const lookup = existingReviewQuery({
      data: null,
      error: { code: '42501', message: 'permission denied for table reviews' },
    })
    const insert = vi.fn()
    mocks.getClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: lookup.select,
        eq: lookup.eq,
        order: lookup.order,
        limit: lookup.limit,
        maybeSingle: lookup.maybeSingle,
        insert,
      })),
    })

    await expect(new ReviewRepository().create(reviewData)).rejects.toThrow(
      /memeriksa ulasan sebelumnya \(42501\)/
    )
    expect(insert).not.toHaveBeenCalled()
  })
})
