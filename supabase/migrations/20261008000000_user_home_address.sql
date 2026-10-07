-- Store a customer's default home address with their profile.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS home_address TEXT;
