import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createReview: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  requireModulePermission: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireModulePermission: mocks.requireModulePermission,
}));

vi.mock("@/services/review.service", () => ({
  ReviewService: class {
    createReview = mocks.createReview;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import {
  getAdminReviewsPageAction,
  getStorefrontFeaturedReviewsAction,
  submitReviewAction,
} from "@/actions/review";

const userId = "81000000-0000-4000-8000-000000000001";
const productId = "84000000-0000-4000-8000-000000000001";
const orderId = "86000000-0000-4000-8000-000000000001";

function query(response: { data: unknown; error: null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
  return builder;
}

function configureClient({
  user = { id: userId },
  order = { data: { id: orderId, status: "delivered" }, error: null },
  item = { data: { id: "87000000-0000-0000-0000-000000000001" }, error: null },
  payment = { data: { id: "88000000-0000-0000-0000-000000000001" }, error: null },
}: {
  user?: { id: string } | null;
  order?: { data: unknown; error: null };
  item?: { data: unknown; error: null };
  payment?: { data: unknown; error: null };
} = {}) {
  const queries = {
    orders: query(order),
    order_items: query(item),
    payments: query(payment),
  };

  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: keyof typeof queries) => queries[table]),
  });
  return queries;
}

function reviewForm({
  product = productId,
  order = orderId,
  rating = "5",
  comment = "Barang diterima dengan baik",
}: {
  product?: string;
  order?: string;
  rating?: string;
  comment?: string;
} = {}) {
  const formData = new FormData();
  formData.set("productId", product);
  formData.set("orderId", order);
  formData.set("rating", rating);
  formData.set("comment", comment);
  return formData;
}

describe("submitReviewAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated review submissions", async () => {
    configureClient({ user: null });

    await expect(submitReviewAction(reviewForm())).rejects.toThrow("Unauthorized");
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it("rejects malformed product and order IDs before querying purchase data", async () => {
    configureClient();

    await expect(submitReviewAction(reviewForm({ product: "not-a-uuid" }))).rejects.toThrow("Produk tidak valid.");
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it("requires a delivered order, matching product, and successful payment", async () => {
    configureClient({ order: { data: { id: orderId, status: "processing" }, error: null } });
    await expect(submitReviewAction(reviewForm())).rejects.toThrow("sudah diterima");
    expect(mocks.createReview).not.toHaveBeenCalled();

    configureClient({ item: { data: null, error: null } });
    await expect(submitReviewAction(reviewForm())).rejects.toThrow("tidak ditemukan di pesanan");
    expect(mocks.createReview).not.toHaveBeenCalled();

    configureClient({ payment: { data: null, error: null } });
    await expect(submitReviewAction(reviewForm())).rejects.toThrow("belum berhasil diverifikasi");
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it("stores a review only after verifying the buyer's delivered paid order item", async () => {
    configureClient();

    await expect(submitReviewAction(reviewForm())).resolves.toEqual({ success: true });
    expect(mocks.createReview).toHaveBeenCalledWith(
      userId,
      productId,
      orderId,
      5,
      "Barang diterima dengan baik"
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/product/${productId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("getAdminReviewsPageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads order numbers separately without requiring a reviews-to-orders relationship", async () => {
    const reviewRows = [{
      id: "89000000-0000-4000-8000-000000000001",
      rating: 5,
      comment: "Barang sesuai",
      created_at: "2026-11-02T10:00:00.000Z",
      product_id: productId,
      user_id: userId,
      order_id: orderId,
      is_verified: true,
      admin_reply: null,
      admin_replied_at: null,
      products: { id: productId, name: "Produk Contoh", product_images: [{ url: "/product.jpg", is_primary: true }] },
      users: { full_name: "Pelanggan", avatar_url: "/avatar.jpg" },
    }];
    const reviewsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: reviewRows, error: null, count: 1 }),
    };
    const ordersQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: orderId, order_number: "ORD-20261102-01" }],
        error: null,
      }),
    };
    const adminClient = {
      from: vi.fn((table: string) => table === "reviews" ? reviewsQuery : ordersQuery),
    };
    mocks.getSupabaseAdminClient.mockReturnValue(adminClient);

    const result = await getAdminReviewsPageAction(1);

    expect(reviewsQuery.select.mock.calls[0][0]).not.toContain("orders(");
    expect(ordersQuery.in).toHaveBeenCalledWith("id", [orderId]);
    expect(result.reviews[0]).toMatchObject({
      order_id: orderId,
      order_number: "ORD-20261102-01",
      product_name: "Produk Contoh",
      user_name: "Pelanggan",
    });
  });

});

describe("getStorefrontFeaturedReviewsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads selected verified reviews and public author fields with the server client", async () => {
    const reviewsQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{
          id: "89000000-0000-4000-8000-000000000001",
          rating: 5,
          comment: "Barang sesuai",
          created_at: "2026-11-02T10:00:00.000Z",
          product_id: productId,
          products: {
            id: productId,
            name: "Produk Contoh",
            product_images: [{ url: "/product.jpg", is_primary: true }],
          },
          users: { full_name: "Pelanggan", avatar_url: "/avatar.jpg" },
        }],
        error: null,
      }),
    };
    mocks.getSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => reviewsQuery),
    });

    const result = await getStorefrontFeaturedReviewsAction([], [
      "89000000-0000-4000-8000-000000000001",
    ]);

    expect(mocks.getSupabaseAdminClient).toHaveBeenCalledTimes(1);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(reviewsQuery.select).toHaveBeenCalledWith(
      "id, rating, comment, created_at, product_id, products(id, name, product_images(url, is_primary)), users(full_name, avatar_url)"
    );
    expect(result[0]).toMatchObject({
      id: "89000000-0000-4000-8000-000000000001",
      user_name: "Pelanggan",
      user_avatar: "/avatar.jpg",
      product_id: productId,
      product_name: "Produk Contoh",
      product_image: "/product.jpg",
      is_verified: true,
    });
  });
});
