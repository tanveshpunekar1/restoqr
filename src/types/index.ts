export type UserRole = 
  | 'platform_admin' 
  | 'restaurant_owner' 
  | 'restaurant_manager' 
  | 'kitchen_staff' 
  | 'waiter';

export type RestaurantStatus = 'active' | 'pending' | 'suspended';

export type SubscriptionPlan = 'starter' | 'growth' | 'pro' | 'custom';

export type SubscriptionStatus = 
  | 'pending' 
  | 'awaiting_payment' 
  | 'active' 
  | 'expiring_soon' 
  | 'expired' 
  | 'suspended' 
  | 'cancelled';

export type TableStatus = 'available' | 'ordering' | 'occupied' | 'reserved' | 'cleaning';

export type OrderStatus = 
  | 'NEW' 
  | 'ACCEPTED' 
  | 'PREPARING' 
  | 'READY' 
  | 'SERVED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type PaymentMethod = 'online' | 'cash_table' | 'cash_counter';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type DiscountType = 'percentage' | 'fixed';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  restaurant_id?: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  cover_image: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
  opening_time: string;
  closing_time: string;
  cuisine_type: string;
  wifi_info: string;
  status: RestaurantStatus;
  plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
  owner_id?: string;
  // Payment settings
  enabled_payments: {
    online: boolean;
    cash_table: boolean;
    cash_counter: boolean;
  };
  pay_counter_only?: boolean; // When true, only Pay at Counter is allowed
  upi_id?: string; // Restaurant UPI VPA ID (e.g. 'urbanbites@okaxis') for direct customer payments
  upi_payee_name?: string; // Name registered on bank account for UPI
  tax_rate: number; // e.g. 5%
  service_charge_rate?: number; // e.g. 5%
  accepting_orders?: boolean; // toggle for receiving orders
  order_validation_enabled?: boolean; // OTP PIN verification before kitchen accepts
  rating?: number; // e.g. 4.8
  rating_count?: number; // e.g. 350
  supported_languages?: string[]; // e.g. ['en', 'hi', 'mr']
  // Master Admin service suspension & validity timer
  service_expires_at?: string; // ISO date string when cafe validity expires
  ban_reason?: string; // Reason if cafe is banned or suspended
  is_banned?: boolean;
}

export interface TableServiceRequest {
  id: string;
  restaurant_id: string;
  table_number: number;
  request_type: 'water' | 'bill' | 'waiter' | 'cutlery' | 'cleaning' | string;
  note?: string;
  status: 'pending' | 'attended' | 'resolved';
  created_at: string;
  attended_at?: string;
  resolved_at?: string;
  attended_by?: string;
}

export interface Subscription {
  id: string;
  restaurant_id: string;
  plan: SubscriptionPlan;
  price: number;
  start_date: string;
  expiry_date: string;
  status: SubscriptionStatus;
  payment_status: 'paid' | 'pending' | 'failed';
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItemSize {
  name: string;
  price_delta: number;
}

export interface MenuItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  discount_price?: number;
  image: string;
  weight: string;
  is_veg: boolean;
  spicy_level: number; // 0, 1, 2, 3
  prep_time: number; // in minutes
  is_available: boolean;
  is_bestseller: boolean;
  is_recommended?: boolean;
  sku?: string;
  stock?: number;
  cost_price?: number;
  tag?: string;
  sizes?: MenuItemSize[];
  add_ons?: MenuItemAddon[];
  spice_options?: string[];
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: number;
  capacity: number;
  status: TableStatus;
  qr_code_url?: string;
  created_at: string;
}

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  customization?: string;
  selected_size?: string;
  selected_size_price?: number;
  selected_addons?: SelectedAddon[];
  spice_level?: string;
  special_instructions?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: number;
  restaurant_id: string;
  table_id: string;
  table_number: number;
  customer_name?: string;
  customer_phone?: string;
  order_type?: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  discount: number;
  tax: number;
  service_charge?: number;
  total: number;
  coupon_id?: string;
  coupon_code?: string;
  notes?: string;
  special_instructions?: string;
  verification_code?: string; // 4-digit code if OTP validation enabled
  estimated_prep_time?: number; // in minutes
  is_cleared_from_active?: boolean; // Set when daily clear is run in kitchen / orders
  cleared_at?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface TableRunningBill {
  table_number: number;
  table_id: string;
  active_orders: Order[];
  running_total: number;
  total_items: number;
  status: TableStatus;
}

export interface Coupon {
  id: string;
  restaurant_id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  start_date: string;
  end_date: string;
  usage_limit: number;
  used_count: number;
  per_customer_limit: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  email?: string;
  orders_count: number;
  total_spent: number;
  last_order_at: string;
  loyalty_points: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  restaurant_id?: string;
  user_email: string;
  action: string;
  details: string;
  timestamp: string;
}
