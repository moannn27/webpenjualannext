# Next Solution Store - Backend Architecture

## Overview
This Next.js 15 App Router project uses **Supabase** and **PostgreSQL** to form a highly scalable, production-ready backend that perfectly maps to the frontend requirements.

## Stack
- Next.js 15 (App Router & Server Actions)
- Supabase (PostgreSQL, Auth, Storage)
- Vitest (Unit Testing)

## Architecture Layers
We strictly adhere to a decoupled **Clean Architecture**:

1. **Database Layer (`supabase/migrations/`)**: 
   Contains all SQL files dictating the schemas, enum constraints, foreign keys, triggers, and Row Level Security (RLS) policies.
   
2. **Repository Layer (`repositories/`)**:
   Provides data access methods (`ProductRepository`, `OrderRepository`, etc.). It wraps Supabase API calls so that business logic doesn't touch the database directly.

3. **Service Layer (`services/`)**:
   Contains business logic (e.g., `CheckoutService`, `PaymentService`). It consumes repositories and enforces business constraints before saving data.

4. **Controller Layer (`actions/`)**:
   Next.js Server Actions. These are the entry points for the frontend. They check session security, invoke services, and trigger `revalidatePath()` to mutate the UI cache seamlessly.

## Security
- **Authentication**: Managed via `@supabase/ssr` with Next.js Middleware guarding protected routes.
- **RLS**: Every table has RLS enabled. We use a secure definer function `public.is_admin()` to assign permissions safely without recursive loop risks.
- **Storage**: Buckets are secured so that users can only modify their own avatars and reviews, whilst products and brands are strictly admin-controlled.

## Testing
Unit tests are written using `Vitest`. Supabase is mocked globally in `__tests__/setup.ts` to allow isolated service/repository logic testing. Run tests using your preferred test runner (Vitest).
