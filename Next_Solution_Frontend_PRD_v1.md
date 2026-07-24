
# Next Solution Store – Frontend PRD v1.0

> **Project:** Next Solution Store  
> **Scope:** Frontend Only  
> **Framework:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui

---

# Vision

Build a premium, minimalist multi-brand electronics e-commerce inspired by Apple's design philosophy while preserving the Next Solution identity.

Core principles:

- Minimal
- Premium
- Fast
- Responsive
- Trustworthy
- Accessible

---

# Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Framer Motion
- Lucide React
- Swiper
- React Hook Form
- Zod

---

# Design System

## Colors

Primary: #0A4EA3
Secondary: #2563EB
Accent: #EF4444

Background: #F8FAFC
Surface: #FFFFFF

Text Primary: #111827
Text Secondary: #64748B

Border: #E5E7EB

---

## Typography

Font:
- Geist
- Inter

Scale:

H1 60
H2 48
H3 36
H4 28
Body 16
Small 14

---

## Radius

Button : 999px
Card : 24px
Input : 16px
Modal : 28px

---

## Shadows

Soft
Medium
Large

Use subtle shadows only.

---

## Spacing

4
8
12
16
24
32
48
64
80
96
120

---

# Components

Navigation
- Navbar
- Mega Menu
- Breadcrumb
- Search

Buttons
- Primary
- Secondary
- Outline
- Ghost
- Icon Button

Cards
- Product Card
- Brand Card
- Promo Card
- Category Card
- Testimonial Card

Commerce
- Cart
- Wishlist
- Checkout Summary
- Product Gallery
- Rating
- Stock Badge
- Discount Badge

Forms
- Input
- Select
- Checkbox
- Quantity
- Search

Feedback
- Toast
- Modal
- Drawer
- Skeleton
- Empty State
- Error State

Layout
- Container
- Grid
- Section
- Divider
- Tabs
- Accordion

---

# Folder Structure

app/
components/
features/
hooks/
lib/
types/
constants/
services/
store/
public/
assets/

---

# Pages

## Public

Landing
Products
Category
Brands
Promo
About
Contact

## Authentication UI

Login
Register
Forgot Password
Reset Password

## Customer

Profile
Wishlist
Cart
Checkout
Order History
Invoice
Settings

---

# Landing Page

1 Hero
2 Category
3 Featured Products
4 Promo Banner
5 Best Seller
6 New Arrival
7 Brand Showcase
8 Why Choose Us
9 Testimonials
10 FAQ
11 Newsletter
12 Footer

---

# Product Listing

Search

Filter:
- Brand
- Price
- Category
- Processor
- RAM
- Storage
- GPU
- Screen Size

Sort:
- Newest
- Popular
- Price Low
- Price High

Grid/List Toggle

Pagination

---

# Product Detail

Gallery
Image Zoom
Specification
Description
Review
Related Product
Recently Viewed
Add To Cart

---

# Cart

Update Quantity

Delete Item

Voucher UI

Summary

Proceed Checkout

---

# Checkout (Frontend UI)

Shipping Address

Courier

Payment Method UI

Order Summary

Success Page

---

# Responsive

Mobile

Tablet

Laptop

Desktop

Ultra Wide

---

# UI States

Default

Hover

Focus

Active

Loading

Disabled

Empty

Error

---

# Animations

Navbar Blur

Fade Up

Fade In

Card Hover

Button Scale

Smooth Scroll

Duration: 200ms

---

# Dummy Data

Create local JSON/TS data for:

Products

Brands

Categories

Reviews

Banners

Testimonials

FAQ

---

# Performance Goal

Lighthouse

Performance >95

Accessibility >95

SEO >95

Best Practices 100

---

# Development Roadmap

Sprint 1
- Project setup
- Theme
- Design System
- Navbar
- Footer

Sprint 2
- Landing Page

Sprint 3
- Catalog

Sprint 4
- Product Detail

Sprint 5
- Cart
- Checkout UI
- Authentication UI

Sprint 6
- Profile
- Wishlist
- Order History

---

# AI Implementation Rules

1. Use reusable components.
2. Mobile-first.
3. No inline styles.
4. Use TypeScript everywhere.
5. Components must be reusable.
6. Clean folder structure.
7. Use Server Components unless client state is required.
8. Keep code production-ready.
9. Use semantic HTML.
10. Optimize images using next/image.
11. Use lazy loading where possible.
12. Keep UI inspired by Apple but do not copy Apple layouts directly.
13. Follow Next Solution brand colors.
14. Every page must have loading, empty, and error UI.
15. Use dummy data only. No backend integration.

END OF FRONTEND PRD
