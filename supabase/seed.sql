-- Seed Data

-- 1. Create Auth Users in auth.users (Supabase Auth schema)
-- We will seed one customer and one merchant.
-- Note: passwords are 'password123' encrypted with bcrypt/pgcrypto or just standard stub since they are local test accounts.
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'customer@loymint.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Rohan Sharma"}', 'authenticated', 'authenticated', now(), now()),
  ('b2222222-2222-2222-2222-222222222222', 'merchant@loymint.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Vikram Seth"}', 'authenticated', 'authenticated', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Create Public User profiles
-- Customer Rohan Sharma
INSERT INTO public.users (id, auth_user_id, role, name, email, phone, points_balance, referral_code, created_at, updated_at)
VALUES
  ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'customer', 'Rohan Sharma', 'customer@loymint.com', '+919876543210', 250, 'ROHAN123', now(), now())
ON CONFLICT (auth_user_id) DO NOTHING;

-- Merchant Vikram Seth
INSERT INTO public.users (id, auth_user_id, role, name, email, phone, points_balance, referral_code, created_at, updated_at)
VALUES
  ('d4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222', 'shopkeeper', 'Vikram Seth', 'merchant@loymint.com', '+919988776655', 0, 'VIKRAM99', now(), now())
ON CONFLICT (auth_user_id) DO NOTHING;

-- 3. Create Shops (associated with merchant Vikram Seth)
INSERT INTO public.shops (id, name, category, address, location, earn_points_per_100, redeem_points_per_rupee, rating, owner_id, is_active, created_at)
VALUES
  (
    'e5555555-5555-5555-5555-555555555555',
    'Vikram Gourmet Cafe',
    'Cafes',
    '123, 80 Feet Road, Koramangala, Bengaluru, Karnataka 560034',
    ST_SetSRID(ST_MakePoint(77.624489, 12.934336), 4326)::geography, -- Bangalore Koramangala
    10, -- earn 10 points per 100 spent
    10, -- redeem 10 points per ₹1 discount (1 point = ₹0.10)
    4.5,
    'd4444444-4444-4444-4444-444444444444',
    true,
    now()
  ),
  (
    'e5555555-5555-5555-5555-555555555556',
    'Spice Symphony Restaurant',
    'Restaurants',
    '456, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
    ST_SetSRID(ST_MakePoint(77.641215, 12.971891), 4326)::geography, -- Bangalore Indiranagar
    15, -- earn 15 points per 100 spent
    8,  -- redeem 8 points per ₹1 discount
    4.2,
    'd4444444-4444-4444-4444-444444444444',
    true,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Create other shops for variety (owned by a dummy merchant or Vikram for simplicity)
INSERT INTO public.shops (id, name, category, address, location, earn_points_per_100, redeem_points_per_rupee, rating, owner_id, is_active, created_at)
VALUES
  (
    'e5555555-5555-5555-5555-555555555557',
    'Urban Trim Salon',
    'Salons',
    '789, MG Road, Ashok Nagar, Bengaluru, Karnataka 560001',
    ST_SetSRID(ST_MakePoint(77.607421, 12.975498), 4326)::geography, -- Bangalore MG Road
    20, -- earn 20 points per 100 spent
    5,  -- redeem 5 points per ₹1 discount (1 point = ₹0.20)
    4.8,
    'd4444444-4444-4444-4444-444444444444',
    true,
    now()
  ),
  (
    'e5555555-5555-5555-5555-555555555558',
    'Le Croissant Bakery',
    'Cafes',
    '101, HSR Layout, Sector 6, Bengaluru, Karnataka 560102',
    ST_SetSRID(ST_MakePoint(77.632230, 12.912300), 4326)::geography, -- Bangalore HSR Layout
    8, -- earn 8 points per 100 spent
    12, -- redeem 12 points per ₹1 discount
    4.4,
    'd4444444-4444-4444-4444-444444444444',
    true,
    now()
  ),
  (
    'e5555555-5555-5555-5555-555555555559',
    'Gourmet Garden',
    'Restaurants',
    '202, Jayanagar 4th Block, Jayanagar, Bengaluru, Karnataka 560011',
    ST_SetSRID(ST_MakePoint(77.582400, 12.928400), 4326)::geography, -- Bangalore Jayanagar
    12, -- earn 12 points per 100 spent
    10, -- redeem 10 points per ₹1 discount
    4.6,
    'd4444444-4444-4444-4444-444444444444',
    true,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Create Offers for the shops
INSERT INTO public.offers (id, shop_id, title, description, points_required, reward_type, reward_value, valid_until, is_active, created_at)
VALUES
  (
    'f6666666-6666-6666-6666-666666666661',
    'e5555555-5555-5555-5555-555555555555',
    'Free Espresso Shot',
    'Get a free espresso shot with any beverage purchase.',
    50,
    'free_item',
    'Espresso Shot',
    now() + interval '30 days',
    true,
    now()
  ),
  (
    'f6666666-6666-6666-6666-666666666662',
    'e5555555-5555-5555-5555-555555555555',
    'Flat ₹50 Discount',
    'Get a flat discount of ₹50 on bills above ₹300.',
    500,
    'discount_coupon',
    '50',
    now() + interval '30 days',
    true,
    now()
  ),
  (
    'f6666666-6666-6666-6666-666666666663',
    'e5555555-5555-5555-5555-555555555556',
    'Free Garlic Bread',
    'Get a free garlic bread on orders above ₹500.',
    120,
    'free_item',
    'Garlic Bread',
    now() + interval '30 days',
    true,
    now()
  )
ON CONFLICT (id) DO NOTHING;
