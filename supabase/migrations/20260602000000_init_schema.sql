-- 20260602000000_init_schema.sql

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Enums
CREATE TYPE public.user_role AS ENUM ('customer', 'shopkeeper');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'success', 'failed', 'reward_paid', 'partial_paid', 'expired');
CREATE TYPE public.points_reason AS ENUM ('purchase', 'reward_redeem', 'referral_bonus', 'manual_adjustment');
CREATE TYPE public.reward_type AS ENUM ('free_item', 'discount_coupon');

-- 1. Users Table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  role public.user_role NOT NULL DEFAULT 'customer',
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  profile_pic TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  referral_code VARCHAR(10) UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  preferences TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Shops Table
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  address TEXT NOT NULL,
  location public.geography(POINT, 4326) NOT NULL,
  earn_points_per_100 INTEGER NOT NULL CHECK (earn_points_per_100 >= 0),
  redeem_points_per_rupee INTEGER NOT NULL CHECK (redeem_points_per_rupee > 0),
  rating DECIMAL(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  upi_id VARCHAR(100) NOT NULL DEFAULT '7349417848@ybl',
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shops_location_gix ON public.shops USING GIST (location);
CREATE INDEX shops_owner_idx ON public.shops(owner_id);

-- 3. Transactions Table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(60) UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reward_points_used INTEGER NOT NULL DEFAULT 0 CHECK (reward_points_used >= 0),
  reward_value_used INTEGER NOT NULL DEFAULT 0 CHECK (reward_value_used >= 0),
  upi_paid INTEGER NOT NULL DEFAULT 0 CHECK (upi_paid >= 0),
  status public.transaction_status NOT NULL DEFAULT 'pending',
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX transactions_user_idx ON public.transactions(user_id);
CREATE INDEX transactions_shop_idx ON public.transactions(shop_id);
CREATE INDEX transactions_status_idx ON public.transactions(status);
CREATE INDEX transactions_expires_idx ON public.transactions(expires_at);

-- 4. Points Log Table (Immutable Ledger)
CREATE TABLE public.points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  points_change INTEGER NOT NULL,
  reason public.points_reason NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX points_log_user_idx ON public.points_log(user_id);
CREATE INDEX points_log_transaction_idx ON public.points_log(transaction_id);

-- 5. Offers Table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  reward_type public.reward_type NOT NULL,
  reward_value VARCHAR(100),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Favorite Shops Table
CREATE TABLE public.favorite_shops (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);

-- 7. Saved Offers Table
CREATE TABLE public.saved_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, offer_id)
);

-- 8. Addresses Table
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  address_line TEXT NOT NULL,
  city VARCHAR(50) NOT NULL,
  district VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false
);

-- ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "users_can_read_own_profile"
ON public.users
FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "users_can_update_own_profile"
ON public.users
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- 2. Shops policies
CREATE POLICY "any_authenticated_user_can_read_active_shops"
ON public.shops
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "shopkeepers_can_update_own_shop"
ON public.shops
FOR UPDATE
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'shopkeeper'
  )
)
WITH CHECK (
  owner_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'shopkeeper'
  )
);

-- 3. Transactions policies
CREATE POLICY "customers_can_read_own_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "shopkeepers_can_read_own_shop_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  shop_id IN (
    SELECT s.id
    FROM public.shops s
    JOIN public.users u ON u.id = s.owner_id
    WHERE u.auth_user_id = auth.uid() AND u.role = 'shopkeeper'
  )
);

-- 4. Points log policies
CREATE POLICY "users_can_read_own_points_log"
ON public.points_log
FOR SELECT
TO authenticated
USING (
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- 5. Offers policies
CREATE POLICY "authenticated_users_can_read_active_offers"
ON public.offers
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "shopkeepers_manage_own_offers"
ON public.offers
FOR ALL
TO authenticated
USING (
  shop_id IN (
    SELECT s.id
    FROM public.shops s
    JOIN public.users u ON u.id = s.owner_id
    WHERE u.auth_user_id = auth.uid() AND u.role = 'shopkeeper'
  )
)
WITH CHECK (
  shop_id IN (
    SELECT s.id
    FROM public.shops s
    JOIN public.users u ON u.id = s.owner_id
    WHERE u.auth_user_id = auth.uid() AND u.role = 'shopkeeper'
  )
);

-- 6. Favorite shops policies
CREATE POLICY "users_can_manage_favorites"
ON public.favorite_shops
FOR ALL
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- 7. Saved offers policies
CREATE POLICY "users_can_manage_saved_offers"
ON public.saved_offers
FOR ALL
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- 8. Addresses policies
CREATE POLICY "users_can_manage_addresses"
ON public.addresses
FOR ALL
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
