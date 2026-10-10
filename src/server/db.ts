import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import type { 
  User, Restaurant, Subscription, Category, MenuItem, 
  RestaurantTable, Order, OrderItem, Coupon, Customer, ActivityLog, TableServiceRequest 
} from '../types/index.ts';

export interface DatabaseSchema {
  users: (User & { password_hash: string })[];
  restaurants: Restaurant[];
  subscriptions: Subscription[];
  categories: Category[];
  menu_items: MenuItem[];
  tables: RestaurantTable[];
  orders: Order[];
  order_items: OrderItem[];
  coupons: Coupon[];
  customers: Customer[];
  activity_logs: ActivityLog[];
  service_requests: TableServiceRequest[];
  next_order_number: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getInitialData(): DatabaseSchema {
  const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@12345', 10);
  const ownerHash = bcrypt.hashSync('Owner@12345', 10);
  const kitchenHash = bcrypt.hashSync('Kitchen@12345', 10);
  const waiterHash = bcrypt.hashSync('Waiter@12345', 10);

  const restaurantId = 'rest-urban-bites-1';
  const ownerId = 'usr-owner-1';

  return {
    users: [
      {
        id: 'usr-admin-1',
        email: 'tanveshpunekar296@gmail.com',
        name: 'Tanvesh Punekar (Super Admin)',
        role: 'platform_admin',
        password_hash: adminHash,
        created_at: new Date().toISOString()
      },
      {
        id: 'usr-admin-2',
        email: 'tanveshpunekar123@gmail.com',
        name: 'Tanvesh Punekar (Super Admin)',
        role: 'platform_admin',
        password_hash: adminHash,
        created_at: new Date().toISOString()
      },
      {
        id: ownerId,
        email: 'owner@urbanbites.com',
        name: 'Vikram Malhotra',
        role: 'restaurant_owner',
        restaurant_id: restaurantId,
        password_hash: ownerHash,
        created_at: new Date().toISOString()
      },
      {
        id: 'usr-kitchen-1',
        email: 'kitchen@urbanbites.com',
        name: 'Chef Rajesh Sharma',
        role: 'kitchen_staff',
        restaurant_id: restaurantId,
        password_hash: kitchenHash,
        created_at: new Date().toISOString()
      },
      {
        id: 'usr-waiter-1',
        email: 'waiter@urbanbites.com',
        name: 'Sunil Verma',
        role: 'waiter',
        restaurant_id: restaurantId,
        password_hash: waiterHash,
        created_at: new Date().toISOString()
      }
    ],
    restaurants: [
      {
        id: restaurantId,
        name: 'Urban Bites Cafe',
        slug: 'urban-bites-cafe',
        logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
        cover_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        phone: '+91 98765 43210',
        email: 'contact@urbanbites.com',
        address: '104 Heritage Boulevard, 12th Main, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        description: 'Artisan sourdough pizzas, gourmet smashed burgers, and handcrafted coffees served in a vibrant cafe ambience.',
        opening_time: '11:00 AM',
        closing_time: '11:30 PM',
        cuisine_type: 'Italian & Cafe Bistro',
        wifi_info: 'UrbanBites_Guest / Coffee2026',
        status: 'active',
        plan: 'pro',
        owner_id: ownerId,
        enabled_payments: {
          online: true,
          cash_table: true,
          cash_counter: true
        },
        upi_id: 'urbanbites@okaxis',
        upi_payee_name: 'Urban Bites Cafe',
        tax_rate: 5.0,
        service_charge_rate: 5.0,
        accepting_orders: true,
        order_validation_enabled: false,
        rating: 4.8,
        rating_count: 428,
        supported_languages: ['en', 'hi', 'mr'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    subscriptions: [
      {
        id: 'sub-1',
        restaurant_id: restaurantId,
        plan: 'pro',
        price: 3499,
        start_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 335 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'active',
        payment_status: 'paid',
        payment_method: 'UPI / Razorpay',
        payment_reference: 'PAY_PRO_99412',
        notes: 'Annual Pro Subscription confirmed by Platform Admin'
      }
    ],
    categories: [
      {
        id: 'cat-1',
        restaurant_id: restaurantId,
        name: 'Artisan Pizzas',
        sort_order: 1,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cat-2',
        restaurant_id: restaurantId,
        name: 'Burgers & Sandwiches',
        sort_order: 2,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cat-3',
        restaurant_id: restaurantId,
        name: 'Appetizers & Starters',
        sort_order: 3,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cat-4',
        restaurant_id: restaurantId,
        name: 'Handcrafted Beverages',
        sort_order: 4,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cat-5',
        restaurant_id: restaurantId,
        name: 'Desserts & Sweets',
        sort_order: 5,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    menu_items: [
      {
        id: 'item-1',
        restaurant_id: restaurantId,
        category_id: 'cat-1',
        name: 'Paneer Pizza',
        description: 'Tender marinated cottage cheese cubes, bell peppers, fresh mozzarella, and aromatic basil on stone-baked sourdough.',
        price: 299,
        discount_price: 269,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
        weight: '350g',
        is_veg: true,
        spicy_level: 1,
        prep_time: 15,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Regular (8")', price_delta: 0 },
          { name: 'Medium (10")', price_delta: 80 },
          { name: 'Large (12")', price_delta: 150 }
        ],
        add_ons: [
          { id: 'addon-p1', name: 'Extra Mozzarella Cheese', price: 50 },
          { id: 'addon-p2', name: 'Extra Marinated Paneer', price: 70 },
          { id: 'addon-p3', name: 'Garlic Butter Crust', price: 35 },
          { id: 'addon-p4', name: 'Hot Honey Drizzle', price: 40 }
        ],
        spice_options: ['Mild', 'Medium Spicy', 'Fiery Hot'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-2',
        restaurant_id: restaurantId,
        category_id: 'cat-1',
        name: 'Truffle Wild Mushroom Pizza',
        description: 'Shiitake and cremini forest mushrooms, garlic oil, creamy fior di latte, and parmesan shavings.',
        price: 349,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
        weight: '380g',
        is_veg: true,
        spicy_level: 0,
        prep_time: 18,
        is_available: true,
        is_bestseller: false,
        is_recommended: true,
        sizes: [
          { name: 'Regular (8")', price_delta: 0 },
          { name: 'Medium (10")', price_delta: 90 },
          { name: 'Large (12")', price_delta: 170 }
        ],
        add_ons: [
          { id: 'addon-tm1', name: 'Truffle Glaze Infusion', price: 60 },
          { id: 'addon-tm2', name: 'Parmesan Crisp Shavings', price: 45 }
        ],
        spice_options: ['Herbed (No Spice)', 'Mild Chili Flakes'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-3',
        restaurant_id: restaurantId,
        category_id: 'cat-1',
        name: 'Classic Pepperoni Pizza',
        description: 'Crisp smoked cured pepperoni slices, San Marzano tomato reduction, stringy mozzarella cheese.',
        price: 399,
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80',
        weight: '400g',
        is_veg: false,
        spicy_level: 2,
        prep_time: 15,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Regular (8")', price_delta: 0 },
          { name: 'Medium (10")', price_delta: 100 },
          { name: 'Large (12")', price_delta: 180 }
        ],
        add_ons: [
          { id: 'addon-pep1', name: 'Double Pepperoni Load', price: 90 },
          { id: 'addon-pep2', name: 'Cheese Burst Crust', price: 75 },
          { id: 'addon-pep3', name: 'Pickled Jalapeños', price: 30 }
        ],
        spice_options: ['Standard Spice', 'Smoky Fiery'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-4',
        restaurant_id: restaurantId,
        category_id: 'cat-2',
        name: 'Double Gourmet Smash Burger',
        description: 'Two crispy smashed ground beef patties, melted aged cheddar, caramelized shallots, house burger sauce in toasted brioche.',
        price: 249,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
        weight: '320g',
        is_veg: false,
        spicy_level: 1,
        prep_time: 12,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Single Patty', price_delta: -50 },
          { name: 'Double Smash (Standard)', price_delta: 0 },
          { name: 'Triple Monster Stack', price_delta: 90 }
        ],
        add_ons: [
          { id: 'addon-b1', name: 'Crispy Smoked Bacon', price: 60 },
          { id: 'addon-b2', name: 'Aged English Cheddar Slice', price: 40 },
          { id: 'addon-b3', name: 'Caramelized Onion Jam', price: 30 },
          { id: 'addon-b4', name: 'Fried Farm Egg', price: 35 }
        ],
        spice_options: ['Mild Mayo', 'Spicy Chipotle', 'Ghost Pepper'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-5',
        restaurant_id: restaurantId,
        category_id: 'cat-3',
        name: 'Crispy Peri-Peri Fries',
        description: 'Golden skin-on hand-cut potatoes tossed in spicy African bird eye chili seasoning and served with garlic mayo.',
        price: 149,
        image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
        weight: '200g',
        is_veg: true,
        spicy_level: 2,
        prep_time: 8,
        is_available: true,
        is_bestseller: false,
        is_recommended: true,
        sizes: [
          { name: 'Regular Basket', price_delta: 0 },
          { name: 'Large Sharing Tub', price_delta: 60 }
        ],
        add_ons: [
          { id: 'addon-f1', name: 'Melted Cheddar Cheese Dip', price: 45 },
          { id: 'addon-f2', name: 'Truffle Mayo Dip', price: 35 },
          { id: 'addon-f3', name: 'Crispy Fried Onion Bits', price: 25 }
        ],
        spice_options: ['Low Spice', 'Zesty Peri-Peri', 'Extra Tangy'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-6',
        restaurant_id: restaurantId,
        category_id: 'cat-4',
        name: 'Signature Cold Brew Float',
        description: 'Steeped single-origin Arabica over ice topped with rich creamy Tahitian vanilla bean gelato.',
        price: 189,
        image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
        weight: '350ml',
        is_veg: true,
        spicy_level: 0,
        prep_time: 5,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Regular (350ml)', price_delta: 0 },
          { name: 'Grande (500ml)', price_delta: 50 }
        ],
        add_ons: [
          { id: 'addon-cb1', name: 'Double Espresso Shot', price: 40 },
          { id: 'addon-cb2', name: 'Salted Caramel Syrup', price: 30 },
          { id: 'addon-cb3', name: 'Oat Milk Sub', price: 35 }
        ],
        spice_options: ['Sweet', 'Unsweetened / Keto'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-7',
        restaurant_id: restaurantId,
        category_id: 'cat-5',
        name: 'Sizzling Walnut Brownie with Ice Cream',
        description: 'Dense dark Belgian chocolate fudge brownie served sizzling with vanilla scoop and warm melted chocolate drizzle.',
        price: 199,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
        weight: '220g',
        is_veg: true,
        spicy_level: 0,
        prep_time: 10,
        is_available: true,
        is_bestseller: true,
        is_recommended: true,
        sizes: [
          { name: 'Single Serving', price_delta: 0 },
          { name: 'Double Indulgence', price_delta: 90 }
        ],
        add_ons: [
          { id: 'addon-br1', name: 'Extra Vanilla Bean Scoop', price: 45 },
          { id: 'addon-br2', name: 'Roasted Almond Flakes', price: 30 },
          { id: 'addon-br3', name: 'Hot Belgian Ganache Pour', price: 35 }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'item-8',
        restaurant_id: restaurantId,
        category_id: 'cat-3',
        name: 'Garlic Parmesan Herb Dough-Balls',
        description: 'Warm fluffy sourdough balls glazed with roasted garlic rosemary herb butter and served with marinara dip.',
        price: 169,
        image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&auto=format&fit=crop&q=80',
        weight: '180g',
        is_veg: true,
        spicy_level: 0,
        prep_time: 10,
        is_available: true,
        is_bestseller: false,
        is_recommended: false,
        add_ons: [
          { id: 'addon-gb1', name: 'Warm Spicy Marinara Bowl', price: 30 },
          { id: 'addon-gb2', name: 'Smoked Jalapeno Cheese Dip', price: 45 }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    tables: [
      {
        id: 'tbl-1',
        restaurant_id: restaurantId,
        table_number: 1,
        capacity: 2,
        status: 'available',
        created_at: new Date().toISOString()
      },
      {
        id: 'tbl-2',
        restaurant_id: restaurantId,
        table_number: 2,
        capacity: 4,
        status: 'available',
        created_at: new Date().toISOString()
      },
      {
        id: 'tbl-3',
        restaurant_id: restaurantId,
        table_number: 3,
        capacity: 4,
        status: 'available',
        created_at: new Date().toISOString()
      },
      {
        id: 'tbl-4',
        restaurant_id: restaurantId,
        table_number: 4,
        capacity: 6,
        status: 'available',
        created_at: new Date().toISOString()
      },
      {
        id: 'tbl-5',
        restaurant_id: restaurantId,
        table_number: 5,
        capacity: 2,
        status: 'available',
        created_at: new Date().toISOString()
      }
    ],
    orders: [
      {
        id: 'ord-1040',
        order_number: 1040,
        restaurant_id: restaurantId,
        table_id: 'tbl-2',
        table_number: 2,
        customer_name: 'Ananya Roy',
        customer_phone: '+91 99887 76655',
        status: 'SERVED',
        payment_method: 'online',
        payment_status: 'paid',
        subtotal: 548,
        discount: 50,
        tax: 24.9,
        total: 522.9,
        coupon_id: 'cpn-1',
        coupon_code: 'SAVE50',
        items: [
          {
            id: 'oi-1',
            order_id: 'ord-1040',
            menu_item_id: 'item-1',
            item_name_snapshot: 'Paneer Pizza',
            price_snapshot: 299,
            quantity: 1,
            created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
          },
          {
            id: 'oi-2',
            order_id: 'ord-1040',
            menu_item_id: 'item-4',
            item_name_snapshot: 'Double Gourmet Smash Burger',
            price_snapshot: 249,
            quantity: 1,
            created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
          }
        ],
        created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
        id: 'ord-1041',
        order_number: 1041,
        restaurant_id: restaurantId,
        table_id: 'tbl-4',
        table_number: 4,
        customer_name: 'Rahul Khanna',
        customer_phone: '+91 98111 22334',
        status: 'PREPARING',
        payment_method: 'cash_table',
        payment_status: 'pending',
        subtotal: 797,
        discount: 0,
        tax: 39.85,
        total: 836.85,
        items: [
          {
            id: 'oi-3',
            order_id: 'ord-1041',
            menu_item_id: 'item-3',
            item_name_snapshot: 'Classic Pepperoni Pizza',
            price_snapshot: 399,
            quantity: 2,
            customization: 'Extra crispy crust',
            created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
          }
        ],
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      }
    ],
    order_items: [],
    coupons: [
      {
        id: 'cpn-1',
        restaurant_id: restaurantId,
        code: 'SAVE50',
        discount_type: 'fixed',
        discount_value: 50,
        min_order_amount: 300,
        start_date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
        usage_limit: 1000,
        used_count: 24,
        per_customer_limit: 1,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cpn-2',
        restaurant_id: restaurantId,
        code: 'WELCOME20',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_amount: 250,
        max_discount_amount: 100,
        start_date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
        usage_limit: 500,
        used_count: 12,
        per_customer_limit: 1,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    customers: [
      {
        id: 'cst-1',
        restaurant_id: restaurantId,
        name: 'Ananya Roy',
        phone: '+91 99887 76655',
        email: 'ananya@example.com',
        orders_count: 3,
        total_spent: 1640,
        last_order_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        loyalty_points: 160,
        created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'cst-2',
        restaurant_id: restaurantId,
        name: 'Rahul Khanna',
        phone: '+91 98111 22334',
        orders_count: 1,
        total_spent: 836.85,
        last_order_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        loyalty_points: 80,
        created_at: new Date().toISOString()
      }
    ],
    activity_logs: [
      {
        id: 'act-1',
        user_email: 'tanveshpunekar296@gmail.com',
        action: 'PLATFORM_INIT',
        details: 'Multi-restaurant QR ordering platform initialized',
        timestamp: new Date().toISOString()
      },
      {
        id: 'act-2',
        user_email: 'tanveshpunekar296@gmail.com',
        action: 'RESTAURANT_CREATED',
        details: 'Created restaurant Urban Bites Cafe (Pro Plan)',
        timestamp: new Date().toISOString()
      }
    ],
    service_requests: [],
    next_order_number: 1042
  };
}

const DB_BACKUP_FILE = path.join(DATA_DIR, 'db.backup.json');
const DB_TMP_FILE = path.join(DATA_DIR, 'db.tmp.json');

// Supabase Cloud Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseKey.includes('your-supabase-')
);

class Database {
  private data: DatabaseSchema;
  public supabase: any = null;
  public isCloudConfigured: boolean = false;
  private syncTimeout: NodeJS.Timeout | null = null;
  public lastSyncTime: string | null = null;
  public lastSyncStatus: string = 'Initialized';

  constructor() {
    this.data = this.load();
    this.initSupabase();
  }

  private initSupabase() {
    if (isSupabaseConfigured) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });
        this.isCloudConfigured = true;
        console.log(`[Database] Supabase client initialized for ${supabaseUrl}`);
        // Asynchronously attempt to sync from Supabase if local only has default
        setTimeout(() => {
          this.autoRestoreFromCloudIfEmpty();
        }, 1500);
      } catch (err) {
        console.warn('[Database] Failed to initialize Supabase client:', err);
      }
    }
  }

  private load(): DatabaseSchema {
    // 1. Try primary db.json
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.restaurants) && Array.isArray(parsed.users)) {
            this.sanitizeData(parsed);
            return parsed;
          }
        }
      } catch (e) {
        console.error('[Database] Primary db.json corrupted or invalid. Attempting backup restore...', e);
      }
    }

    // 2. Try backup db.backup.json
    if (fs.existsSync(DB_BACKUP_FILE)) {
      try {
        const backupRaw = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
        if (backupRaw && backupRaw.trim().length > 0) {
          const parsedBackup = JSON.parse(backupRaw);
          if (parsedBackup && Array.isArray(parsedBackup.restaurants) && Array.isArray(parsedBackup.users)) {
            console.warn('[Database] Successfully restored database from backup file!');
            this.sanitizeData(parsedBackup);
            this.saveData(parsedBackup);
            return parsedBackup;
          }
        }
      } catch (e2) {
        console.error('[Database] Backup file also failed to load:', e2);
      }
    }

    // 3. Last fallback: initial demo seed data
    console.warn('[Database] Initializing fresh database defaults');
    const initial = getInitialData();
    this.saveData(initial);
    return initial;
  }

  private sanitizeData(data: any) {
    if (!data.users) data.users = [];
    if (!data.restaurants) data.restaurants = [];
    if (!data.subscriptions) data.subscriptions = [];
    if (!data.categories) data.categories = [];
    if (!data.menu_items) data.menu_items = [];
    if (!data.tables) data.tables = [];
    if (!data.orders) data.orders = [];
    if (!data.coupons) data.coupons = [];
    if (!data.customers) data.customers = [];
    if (!data.activity_logs) data.activity_logs = [];
    if (!data.service_requests) data.service_requests = [];
    if (typeof data.next_order_number !== 'number') data.next_order_number = 1042;

    const initial = getInitialData();
    // Ensure default master admin exists
    initial.users.forEach(initUser => {
      if (!data.users.some((u: any) => u.email.toLowerCase() === initUser.email.toLowerCase())) {
        data.users.push(initUser);
      }
    });

    data.restaurants.forEach((r: any) => {
      if (r.accepting_orders === undefined) r.accepting_orders = true;
      if (r.order_validation_enabled === undefined) r.order_validation_enabled = false;
      if (r.service_charge_rate === undefined) r.service_charge_rate = 5.0;
      if (r.rating === undefined) r.rating = 4.8;
      if (r.rating_count === undefined) r.rating_count = 428;
      if (!r.supported_languages) r.supported_languages = ['en', 'hi', 'mr'];
    });
  }

  private saveData(data: DatabaseSchema) {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      // Atomic write: write to temp file then rename (prevents corruption on unexpected process kill)
      fs.writeFileSync(DB_TMP_FILE, jsonString, 'utf-8');
      fs.renameSync(DB_TMP_FILE, DB_FILE);

      // Create backup copy asynchronously
      try {
        fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
      } catch (be) {
        // Non-critical
      }
    } catch (e) {
      console.error('[Database] Failed to save db.json atomically:', e);
    }
  }

  public save() {
    this.saveData(this.data);
    this.scheduleCloudSync();
  }

  public get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    return this.data[key];
  }

  public set<K extends keyof DatabaseSchema>(key: K, value: DatabaseSchema[K]) {
    this.data[key] = value;
    this.save();
  }

  public update(fn: (data: DatabaseSchema) => void) {
    fn(this.data);
    this.save();
  }

  public resetToDefaults() {
    this.data = getInitialData();
    this.save();
  }

  public getAllData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  public importBackup(imported: any): { success: boolean; message: string; restaurantCount: number } {
    if (!imported || !Array.isArray(imported.restaurants)) {
      throw new Error('Invalid backup format: missing restaurants array');
    }
    this.sanitizeData(imported);
    this.data = imported;
    this.save();
    return {
      success: true,
      message: `Successfully restored ${imported.restaurants.length} restaurants and their data!`,
      restaurantCount: imported.restaurants.length
    };
  }

  // ----------------------------------------------------
  // SUPABASE CLOUD SYNC & RECOVERY ENGINE
  // ----------------------------------------------------
  private scheduleCloudSync() {
    if (!this.supabase || !this.isCloudConfigured) return;
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      this.syncToSupabase().catch(err => {
        console.warn('[Database] Background cloud sync notice:', err.message);
      });
    }, 2000);
  }

  public async checkSupabase(): Promise<{
    configured: boolean;
    connected: boolean;
    tables: Record<string, boolean>;
    allReady: boolean;
    cloudStoreReady: boolean;
    message: string;
    projectUrl: string;
  }> {
    if (!this.isCloudConfigured || !this.supabase) {
      return {
        configured: false,
        connected: false,
        tables: {},
        allReady: false,
        cloudStoreReady: false,
        message: 'Supabase credentials not configured in environment',
        projectUrl: supabaseUrl
      };
    }

    const tablesToCheck = [
      'restaurants', 'categories', 'menu_items', 'tables', 
      'orders', 'coupons', 'customers', 'profiles', 'service_requests'
    ];
    const tableStatus: Record<string, boolean> = {};

    try {
      // 1. Check cloud store table
      let cloudStoreReady = false;
      const { error: csErr } = await this.supabase.from('restoqr_cloud_store').select('key').limit(1);
      cloudStoreReady = !csErr;

      // 2. Check relational tables
      let readyCount = 0;
      for (const t of tablesToCheck) {
        const { error } = await this.supabase.from(t).select('id').limit(1);
        const ok = !error;
        tableStatus[t] = ok;
        if (ok) readyCount++;
      }

      const allReady = readyCount === tablesToCheck.length;
      let message = '';
      if (allReady && cloudStoreReady) {
        message = 'All Supabase tables and cloud store are 100% active and connected!';
      } else if (allReady) {
        message = 'All PostgreSQL relational tables are active and connected!';
      } else if (cloudStoreReady) {
        message = 'Cloud backup store is active! (Relational tables pending SQL execution)';
      } else {
        message = `Tables not found in Supabase yet. Please run the SQL schema in Supabase SQL Editor.`;
      }

      return {
        configured: true,
        connected: true,
        tables: tableStatus,
        allReady,
        cloudStoreReady,
        message,
        projectUrl: supabaseUrl
      };
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        tables: tableStatus,
        allReady: false,
        cloudStoreReady: false,
        message: err.message || 'Failed to connect to Supabase',
        projectUrl: supabaseUrl
      };
    }
  }

  public async syncToSupabase(): Promise<{ success: boolean; message: string; synced: Record<string, number> }> {
    if (!this.supabase || !this.isCloudConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const check = await this.checkSupabase();
    const stats: Record<string, number> = {};

    // 1. If restoqr_cloud_store is available, save master JSON backup instantly
    if (check.cloudStoreReady) {
      try {
        await this.supabase.from('restoqr_cloud_store').upsert({
          key: 'restoqr_master_db',
          data: this.data,
          updated_at: new Date().toISOString()
        });
        stats['restoqr_cloud_store'] = 1;
      } catch (err) {
        console.warn('[Database] Cloud store upsert error:', err);
      }
    }

    // 2. If relational tables are available, sync each entity table
    if (check.tables['restaurants']) {
      try {
        const rests = this.data.restaurants.map(r => ({
          ...r,
          supported_languages: r.supported_languages || ['en', 'hi', 'mr'],
          enabled_payments: r.enabled_payments || { online: true, cash_table: true, cash_counter: true }
        }));
        if (rests.length > 0) {
          const { error } = await this.supabase.from('restaurants').upsert(rests, { onConflict: 'id' });
          if (!error) stats['restaurants'] = rests.length;
        }
      } catch (e: any) {
        console.warn('[Database] Restaurants cloud sync:', e.message);
      }
    }

    if (check.tables['categories']) {
      try {
        if (this.data.categories.length > 0) {
          const { error } = await this.supabase.from('categories').upsert(this.data.categories, { onConflict: 'id' });
          if (!error) stats['categories'] = this.data.categories.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['menu_items']) {
      try {
        if (this.data.menu_items.length > 0) {
          const { error } = await this.supabase.from('menu_items').upsert(this.data.menu_items, { onConflict: 'id' });
          if (!error) stats['menu_items'] = this.data.menu_items.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['tables']) {
      try {
        if (this.data.tables.length > 0) {
          const { error } = await this.supabase.from('tables').upsert(this.data.tables, { onConflict: 'id' });
          if (!error) stats['tables'] = this.data.tables.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['orders']) {
      try {
        if (this.data.orders.length > 0) {
          const ordersToSync = this.data.orders.map(o => ({
            id: o.id,
            order_number: o.order_number,
            restaurant_id: o.restaurant_id,
            table_id: o.table_id || null,
            table_number: o.table_number,
            customer_name: o.customer_name || '',
            customer_phone: o.customer_phone || '',
            status: o.status,
            payment_method: o.payment_method,
            payment_status: o.payment_status,
            subtotal: o.subtotal,
            discount: o.discount || 0,
            tax: o.tax || 0,
            total: o.total,
            coupon_id: o.coupon_id || null,
            coupon_code: o.coupon_code || '',
            items: o.items || [],
            notes: o.notes || '',
            created_at: o.created_at,
            updated_at: o.updated_at
          }));
          const { error } = await this.supabase.from('orders').upsert(ordersToSync, { onConflict: 'id' });
          if (!error) stats['orders'] = ordersToSync.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['coupons']) {
      try {
        if (this.data.coupons.length > 0) {
          const { error } = await this.supabase.from('coupons').upsert(this.data.coupons, { onConflict: 'id' });
          if (!error) stats['coupons'] = this.data.coupons.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['customers']) {
      try {
        if (this.data.customers.length > 0) {
          const { error } = await this.supabase.from('customers').upsert(this.data.customers, { onConflict: 'id' });
          if (!error) stats['customers'] = this.data.customers.length;
        }
      } catch (e: any) {}
    }

    if (check.tables['service_requests']) {
      try {
        if (this.data.service_requests.length > 0) {
          const { error } = await this.supabase.from('service_requests').upsert(this.data.service_requests, { onConflict: 'id' });
          if (!error) stats['service_requests'] = this.data.service_requests.length;
        }
      } catch (e: any) {}
    }

    this.lastSyncTime = new Date().toISOString();
    this.lastSyncStatus = `Synced ${Object.keys(stats).length} tables`;
    return {
      success: true,
      message: `Cloud sync completed at ${new Date().toLocaleTimeString()}`,
      synced: stats
    };
  }

  public async syncFromSupabase(): Promise<{ success: boolean; message: string; restoredCount: number }> {
    if (!this.supabase || !this.isCloudConfigured) {
      throw new Error('Supabase is not configured.');
    }

    // 1. Try restoring from restoqr_cloud_store first (complete JSON backup)
    try {
      const { data: cloudStoreData, error: csErr } = await this.supabase
        .from('restoqr_cloud_store')
        .select('data')
        .eq('key', 'restoqr_master_db')
        .maybeSingle();

      if (!csErr && cloudStoreData?.data && Array.isArray(cloudStoreData.data.restaurants)) {
        if (cloudStoreData.data.restaurants.length > 0) {
          this.sanitizeData(cloudStoreData.data);
          this.data = cloudStoreData.data;
          this.saveData(this.data);
          return {
            success: true,
            message: `Restored ${cloudStoreData.data.restaurants.length} restaurants from Supabase cloud store!`,
            restoredCount: cloudStoreData.data.restaurants.length
          };
        }
      }
    } catch (err) {}

    // 2. Otherwise try restoring from relational tables
    try {
      const { data: cloudRestaurants, error: restErr } = await this.supabase.from('restaurants').select('*');
      if (!restErr && cloudRestaurants && cloudRestaurants.length > 0) {
        const [catsRes, itemsRes, tablesRes, ordersRes, couponsRes, customersRes] = await Promise.all([
          this.supabase.from('categories').select('*'),
          this.supabase.from('menu_items').select('*'),
          this.supabase.from('tables').select('*'),
          this.supabase.from('orders').select('*'),
          this.supabase.from('coupons').select('*'),
          this.supabase.from('customers').select('*')
        ]);

        this.data.restaurants = cloudRestaurants;
        if (catsRes.data) this.data.categories = catsRes.data;
        if (itemsRes.data) this.data.menu_items = itemsRes.data;
        if (tablesRes.data) this.data.tables = tablesRes.data;
        if (ordersRes.data) this.data.orders = ordersRes.data;
        if (couponsRes.data) this.data.coupons = couponsRes.data;
        if (customersRes.data) this.data.customers = customersRes.data;

        this.saveData(this.data);
        return {
          success: true,
          message: `Restored ${cloudRestaurants.length} restaurants and menu items from Supabase tables!`,
          restoredCount: cloudRestaurants.length
        };
      }
    } catch (err: any) {
      throw new Error(`Failed to restore from Supabase tables: ${err.message}`);
    }

    return {
      success: false,
      message: 'No saved restaurants found in Supabase yet.',
      restoredCount: 0
    };
  }

  private async autoRestoreFromCloudIfEmpty() {
    try {
      // If local only has 1 restaurant, check if Supabase has more
      if (this.data.restaurants.length <= 1) {
        const res = await this.syncFromSupabase();
        if (res.success && res.restoredCount > 0) {
          console.log(`[Database] Auto-restored ${res.restoredCount} restaurants from Supabase Cloud!`);
        }
      } else {
        // Local has data, sync it up to Supabase to keep cloud up to date
        await this.syncToSupabase();
      }
    } catch (err) {
      // Silent in background
    }
  }
}

export const db = new Database();

