-- =================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR RESTOQR MULTI-TENANT SAAS
-- Compatible with text IDs (rest-*, item-*, etc.), JSONB, and instant sync.
-- Paste this entire file into your Supabase SQL Editor and click RUN.
-- =================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  description TEXT DEFAULT '',
  opening_time TEXT DEFAULT '10:00 AM',
  closing_time TEXT DEFAULT '11:00 PM',
  cuisine_type TEXT DEFAULT 'Multi-Cuisine',
  wifi_info TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'growth',
  owner_id TEXT,
  tax_rate NUMERIC(5, 2) DEFAULT 5.00,
  service_charge_rate NUMERIC(5, 2) DEFAULT 5.00,
  accepting_orders BOOLEAN DEFAULT TRUE,
  order_validation_enabled BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 4.8,
  rating_count INT DEFAULT 428,
  supported_languages JSONB DEFAULT '["en", "hi", "mr"]'::jsonb,
  enabled_payments JSONB DEFAULT '{"online": true, "cash_table": true, "cash_counter": true}'::jsonb,
  upi_id TEXT DEFAULT '',
  upi_payee_name TEXT DEFAULT '',
  service_expires_at TIMESTAMPTZ,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES / USERS TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'waiter',
  restaurant_id TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  payment_status TEXT DEFAULT 'paid',
  payment_method TEXT DEFAULT 'UPI',
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10, 2) NOT NULL,
  discount_price NUMERIC(10, 2),
  image TEXT DEFAULT '',
  weight TEXT DEFAULT '',
  is_veg BOOLEAN DEFAULT TRUE,
  spicy_level INT DEFAULT 0,
  prep_time INT DEFAULT 15,
  is_available BOOLEAN DEFAULT TRUE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_recommended BOOLEAN DEFAULT FALSE,
  sizes JSONB DEFAULT '[]'::jsonb,
  add_ons JSONB DEFAULT '[]'::jsonb,
  spice_options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLES TABLE
CREATE TABLE IF NOT EXISTS public.tables (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  capacity INT DEFAULT 4,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, table_number)
);

-- 8. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2) DEFAULT 0,
  max_discount_amount NUMERIC(10, 2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  usage_limit INT DEFAULT 100,
  used_count INT DEFAULT 0,
  per_customer_limit INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, code)
);

-- 9. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number INT,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id TEXT,
  table_number INT,
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'NEW',
  payment_method TEXT NOT NULL DEFAULT 'cash_table',
  payment_status TEXT DEFAULT 'pending',
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  coupon_id TEXT,
  coupon_code TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id TEXT,
  item_name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10, 2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  customization TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  orders_count INT DEFAULT 1,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  last_order_at TIMESTAMPTZ DEFAULT NOW(),
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, phone)
);

-- 12. TABLE SERVICE REQUESTS (Call Waiter / Water / Bill Alerts)
CREATE TABLE IF NOT EXISTS public.service_requests (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  service_type TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  attended_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 13. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 14. RESTOQR CLOUD STORE (Master JSON Document Backup)
CREATE TABLE IF NOT EXISTS public.restoqr_cloud_store (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. ENABLE ROW LEVEL SECURITY AND PERMISSIONS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restoqr_cloud_store ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for anon & authenticated roles so SaaS backend & customer QR work reliably
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_access_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_all_access_%s" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
