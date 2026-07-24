# Next Solution Store Backend PRD v1.0

Scope: Backend Only
Stack: Supabase + PostgreSQL
Frontend: Next.js 15 App Router

## Objectives
- Authentication
- Product Catalog
- Categories
- Brands
- Search
- Wishlist
- Cart
- Checkout
- Orders
- Payments
- Reviews
- Dashboard
- File Upload

## Tech Stack
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Edge Functions (future)

## Roles
- guest
- customer
- admin
- super_admin

## Core Tables
users
categories
brands
products
product_images
product_specifications
wishlist
cart
cart_items
addresses
orders
order_items
payments
reviews
banners
faqs
testimonials

## Storage Buckets
products
brands
avatars
banners
reviews

## Required Backend Services

ProductService
- getProducts()
- getProductBySlug()
- searchProducts()
- getFeaturedProducts()
- getBestSeller()
- getNewArrival()

CategoryService
- getCategories()

BrandService
- getBrands()

WishlistService
- toggleWishlist()
- getWishlist()

CartService
- getCart()
- addItem()
- updateQuantity()
- removeItem()

OrderService
- createOrder()
- checkout()
- getOrders()
- getOrder()

ReviewService
- createReview()
- getReviews()

UserService
- getProfile()
- updateProfile()

BannerService
- getActiveBanners()

FAQService
- getFAQs()

## Frontend Mapping

Landing:
featured products
best seller
new arrival
brands
banners
faq
testimonials

Products:
search
filter
sort
pagination

Detail:
gallery
specifications
reviews
related products

Cart:
cart
cart items

Checkout:
address
shipping
payment

Dashboard:
profile
orders
wishlist

## Payment Flow

Checkout
-> Create Order
-> Midtrans Snap
-> Payment
-> Webhook
-> Update Order

## Environment

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

## Folder

supabase/
migrations/
seed/
repositories/
services/
actions/
types/
lib/

## AI Instructions

Read the frontend PRD before generating backend.

Generate:
- SQL migrations
- RLS policies
- Storage policies
- TypeScript types
- Server Actions
- Repositories
- Services

Ensure every frontend feature has matching backend support.
