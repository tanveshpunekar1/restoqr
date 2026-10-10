import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.ts';
import type { 
  User, Order, OrderItem, Restaurant, MenuItem, 
  Category, RestaurantTable, Coupon, Customer, ActivityLog, Subscription, TableServiceRequest 
} from '../types/index.ts';

export const apiRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'resto-qr-saas-super-secret-key-2026';

// Server-Sent Events (SSE) subscribers for live kitchen & order updates
interface SSEClient {
  id: string;
  restaurant_id: string;
  res: Response;
}
let sseClients: SSEClient[] = [];

export function broadcastEvent(restaurantId: string, eventType: string, payload: any) {
  const data = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
  sseClients
    .filter(c => c.restaurant_id === restaurantId || c.restaurant_id === 'all')
    .forEach(c => {
      try {
        c.res.write(`event: ${eventType}\ndata: ${data}\n\n`);
      } catch (err) {
        // handle disconnected client
      }
    });
}

// ----------------------------------------------------
// AUTH MIDDLEWARE
// ----------------------------------------------------
export interface AuthRequest extends Request {
  user?: User;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const users = db.get('users');
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found or session expired' });
    }

    // If user is restaurant staff, check if restaurant is suspended
    if (user.restaurant_id && user.role !== 'platform_admin') {
      const restaurants = db.get('restaurants');
      const rest = restaurants.find(r => r.id === user.restaurant_id);
      if (rest && rest.status === 'suspended') {
        return res.status(403).json({ error: 'Restaurant account is suspended. Please contact administrator.' });
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurant_id: user.restaurant_id,
      created_at: user.created_at
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
}

// ----------------------------------------------------
// REALTIME SSE ENDPOINT
// ----------------------------------------------------
apiRouter.get('/realtime/events', (req: Request, res: Response) => {
  const restaurantId = (req.query.restaurantId as string) || 'all';
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = Math.random().toString(36).substring(7);
  const newClient: SSEClient = { id: clientId, restaurant_id: restaurantId, res };
  sseClients.push(newClient);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// ----------------------------------------------------
// 1. AUTHENTICATION & LOGIN
// ----------------------------------------------------
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = db.get('users');
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Role-based status checks
    if (user.role !== 'platform_admin' && user.restaurant_id) {
      const restaurants = db.get('restaurants');
      const rest = restaurants.find(r => r.id === user.restaurant_id);
      if (!rest) {
        return res.status(403).json({ error: 'Assigned restaurant not found' });
      }
      if (rest.status === 'suspended') {
        return res.status(403).json({ error: 'Restaurant account is suspended. Please contact administrator.' });
      }

      // Check subscription
      const subscriptions = db.get('subscriptions');
      const sub = subscriptions.find(s => s.restaurant_id === rest.id);
      if (sub && sub.status === 'expired') {
        return res.status(403).json({ error: 'Your subscription has expired. Please contact the administrator.' });
      }
    }

    // Determine target redirect route
    let redirectUrl = '/restaurant/pos';
    if (user.role === 'platform_admin') {
      redirectUrl = '/admin/dashboard';
    } else if (user.role === 'kitchen_staff') {
      redirectUrl = '/restaurant/kitchen';
    } else if (user.role === 'waiter') {
      redirectUrl = '/restaurant/orders';
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, restaurantId: user.restaurant_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurant_id: user.restaurant_id,
      created_at: user.created_at
    };

    let userRestaurant = null;
    if (user.restaurant_id) {
      userRestaurant = db.get('restaurants').find(r => r.id === user.restaurant_id) || null;
    }

    return res.json({
      success: true,
      token,
      user: safeUser,
      restaurant: userRestaurant,
      redirectUrl
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

apiRouter.get('/auth/me', authenticate, (req: AuthRequest, res: Response) => {
  let userRestaurant = null;
  if (req.user?.restaurant_id) {
    userRestaurant = db.get('restaurants').find(r => r.id === req.user?.restaurant_id) || null;
  }
  res.json({
    user: req.user,
    restaurant: userRestaurant
  });
});

apiRouter.post('/auth/change-password', authenticate, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both current password and new password are required' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const users = db.get('users');
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }

  const isMatch = bcrypt.compareSync(current_password, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Current password does not match' });
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  db.update(data => {
    const targetUser = data.users.find(u => u.id === userId);
    if (targetUser) {
      targetUser.password_hash = newHash;
    }
  });

  res.json({ success: true, message: 'Password changed successfully' });
});

// SUPABASE SCHEMA EXPORT
apiRouter.get('/supabase/schema', (_req: Request, res: Response) => {
  const schemaPath = path.resolve(process.cwd(), 'supabase_schema.sql');
  if (fs.existsSync(schemaPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(schemaPath);
  }
  res.status(404).send('-- supabase_schema.sql not found');
});

// SUPABASE STATUS CHECK
apiRouter.get('/supabase/status', async (_req: Request, res: Response) => {
  try {
    const status = await db.checkSupabase();
    res.json({
      ...status,
      lastSyncTime: db.lastSyncTime,
      lastSyncStatus: db.lastSyncStatus,
      restaurantCount: db.get('restaurants')?.length || 0,
      menuItemCount: db.get('menu_items')?.length || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SUPABASE SYNC (Push local data to Supabase)
apiRouter.post('/supabase/sync', authenticate, requireRole('platform_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const syncRes = await db.syncToSupabase();
    res.json(syncRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SUPABASE RESTORE (Pull from Supabase into local memory and disk)
apiRouter.post('/supabase/restore', authenticate, requireRole('platform_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const restoreRes = await db.syncFromSupabase();
    res.json(restoreRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// JSON BACKUP EXPORT (Platform Admin can download complete database snapshot)
apiRouter.get('/admin/backup/export', authenticate, requireRole('platform_admin'), (_req: AuthRequest, res: Response) => {
  const all = db.getAllData();
  res.setHeader('Content-Disposition', `attachment; filename=restoqr-backup-${new Date().toISOString().split('T')[0]}.json`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(all, null, 2));
});

// JSON BACKUP IMPORT (Platform Admin can upload database snapshot)
apiRouter.post('/admin/backup/import', authenticate, requireRole('platform_admin'), (req: AuthRequest, res: Response) => {
  try {
    const { backupData } = req.body;
    if (!backupData) {
      return res.status(400).json({ error: 'backupData is required' });
    }
    const result = db.importBackup(backupData);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. SUPER ADMIN ENDPOINTS (platform_admin)
// ----------------------------------------------------
apiRouter.get('/admin/metrics', authenticate, requireRole('platform_admin'), (req: AuthRequest, res: Response) => {
  const restaurants = db.get('restaurants');
  const subscriptions = db.get('subscriptions');
  const orders = db.get('orders');

  const totalRestaurants = restaurants.length;
  const activeRestaurants = restaurants.filter(r => r.status === 'active').length;
  const pendingRestaurants = restaurants.filter(r => r.status === 'pending').length;
  const suspendedRestaurants = restaurants.filter(r => r.status === 'suspended').length;

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at.startsWith(today));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.total : 0), 0);

  const pendingPayments = subscriptions.filter(s => s.payment_status === 'pending').length;
  
  // Expiring in next 30 days
  const now = Date.now();
  const thirtyDays = 30 * 24 * 3600 * 1000;
  const expiringSubscriptions = subscriptions.filter(s => {
    const exp = new Date(s.expiry_date).getTime();
    return exp > now && exp - now < thirtyDays;
  }).length;

  // Chart data: 7 days orders & revenue
  const dailyStats: Record<string, { date: string; orders: number; revenue: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().split('T')[0];
    dailyStats[d] = { date: d, orders: 0, revenue: 0 };
  }
  orders.forEach(o => {
    const d = o.created_at.split('T')[0];
    if (dailyStats[d]) {
      dailyStats[d].orders += 1;
      if (o.payment_status === 'paid') {
        dailyStats[d].revenue += o.total;
      }
    }
  });

  res.json({
    totalRestaurants,
    activeRestaurants,
    pendingRestaurants,
    suspendedRestaurants,
    todayOrdersCount: todayOrders.length,
    todayRevenue,
    pendingPayments,
    expiringSubscriptions,
    dailyChart: Object.values(dailyStats),
    recentRestaurants: restaurants.slice(-5).reverse(),
    recentOrders: orders.slice(-8).reverse()
  });
});

apiRouter.get('/admin/restaurants', authenticate, requireRole('platform_admin'), (req: AuthRequest, res: Response) => {
  const restaurants = db.get('restaurants');
  const subscriptions = db.get('subscriptions');
  const users = db.get('users');

  const detailed = restaurants.map(r => {
    const sub = subscriptions.find(s => s.restaurant_id === r.id);
    const owner = users.find(u => u.id === r.owner_id);
    return {
      ...r,
      subscription: sub || null,
      owner: owner ? { name: owner.name, email: owner.email, id: owner.id } : null
    };
  });

  res.json(detailed);
});

apiRouter.post('/admin/restaurants', authenticate, requireRole('platform_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, logo, cover_image, phone, email, address, city, state, pincode,
      description, opening_time, closing_time, cuisine_type, status, plan,
      owner_name, owner_email, owner_password
    } = req.body;

    if (!name || !owner_email || !owner_password) {
      return res.status(400).json({ error: 'Restaurant Name, Owner Email, and Initial Password are required' });
    }

    const users = db.get('users');
    if (users.some(u => u.email.toLowerCase() === owner_email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'A user with this owner email already exists' });
    }

    // Slug generation
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const restaurants = db.get('restaurants');
    if (restaurants.some(r => r.slug === slug)) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const restaurantId = `rest-${Date.now()}`;
    const ownerId = `usr-owner-${Date.now()}`;
    const passwordHash = bcrypt.hashSync(owner_password, 10);

    const newOwner: User & { password_hash: string } = {
      id: ownerId,
      email: owner_email.trim().toLowerCase(),
      name: owner_name || 'Restaurant Owner',
      role: 'restaurant_owner',
      restaurant_id: restaurantId,
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };

    const newRestaurant: Restaurant = {
      id: restaurantId,
      name,
      slug,
      logo: logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
      cover_image: cover_image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
      phone: phone || '',
      email: email || owner_email,
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      description: description || '',
      opening_time: opening_time || '10:00 AM',
      closing_time: closing_time || '11:00 PM',
      cuisine_type: cuisine_type || 'Bistro & Grill',
      wifi_info: 'GuestWiFi / Resto2026',
      status: status || 'active',
      plan: plan || 'growth',
      owner_id: ownerId,
      enabled_payments: { online: true, cash_table: true, cash_counter: true },
      tax_rate: 5.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create Subscription
    const planPrices: Record<string, number> = { starter: 999, growth: 1999, pro: 3499, custom: 4999 };
    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      restaurant_id: restaurantId,
      plan: plan || 'growth',
      price: planPrices[plan] || 1999,
      start_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: status === 'active' ? 'active' : 'pending',
      payment_status: status === 'active' ? 'paid' : 'pending',
      payment_method: 'Admin Provisioned',
      notes: 'Initial subscription generated during creation'
    };

    // Default Table 1 & Table 2
    const defaultTables: RestaurantTable[] = [
      { id: `tbl-${Date.now()}-1`, restaurant_id: restaurantId, table_number: 1, capacity: 2, status: 'available', created_at: new Date().toISOString() },
      { id: `tbl-${Date.now()}-2`, restaurant_id: restaurantId, table_number: 2, capacity: 4, status: 'available', created_at: new Date().toISOString() }
    ];

    // Default Category & Menu Item
    const defaultCatId = `cat-${Date.now()}`;
    const defaultCategories: Category[] = [
      { id: defaultCatId, restaurant_id: restaurantId, name: 'Chef Specials', sort_order: 1, is_active: true, created_at: new Date().toISOString() }
    ];
    const defaultItems: MenuItem[] = [
      {
        id: `item-${Date.now()}`,
        restaurant_id: restaurantId,
        category_id: defaultCatId,
        name: `${name} Signature Dish`,
        description: 'House specialty crafted with fresh local ingredients and signature seasonings.',
        price: 249,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
        weight: '300g',
        is_veg: true,
        spicy_level: 1,
        prep_time: 15,
        is_available: true,
        is_bestseller: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    db.update(data => {
      data.users.push(newOwner);
      data.restaurants.push(newRestaurant);
      data.subscriptions.push(newSub);
      data.tables.push(...defaultTables);
      data.categories.push(...defaultCategories);
      data.menu_items.push(...defaultItems);
      data.activity_logs.push({
        id: `act-${Date.now()}`,
        user_email: req.user!.email,
        action: 'RESTAURANT_CREATED',
        details: `Created restaurant ${name} (${slug}) for ${owner_email}`,
        timestamp: new Date().toISOString()
      });
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      restaurant: newRestaurant,
      owner: { name: newOwner.name, email: newOwner.email }
    });
  } catch (err: any) {
    console.error('Restaurant creation error:', err);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

apiRouter.patch('/admin/restaurants/:id/status', authenticate, requireRole('platform_admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, service_expires_at, duration_days, ban_reason } = req.body;

  let updatedRest: Restaurant | null = null;
  db.update(data => {
    const rest = data.restaurants.find(r => r.id === id);
    if (rest) {
      if (status) {
        rest.status = status;
        if (status === 'suspended') {
          rest.ban_reason = ban_reason || 'Service suspended by Master Admin';
          rest.is_banned = true;
        } else if (status === 'active') {
          rest.is_banned = false;
          rest.ban_reason = undefined;
        }
      }

      if (duration_days && typeof duration_days === 'number') {
        const expires = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString();
        rest.service_expires_at = expires;
        rest.status = 'active';
        rest.is_banned = false;
        rest.ban_reason = undefined;
      } else if (service_expires_at !== undefined) {
        rest.service_expires_at = service_expires_at;
      }

      rest.updated_at = new Date().toISOString();
      updatedRest = rest;

      // Update associated subscription if present
      const sub = data.subscriptions.find(s => s.restaurant_id === id);
      if (sub) {
        if (rest.status === 'suspended') {
          sub.status = 'suspended';
        } else if (rest.status === 'active') {
          sub.status = 'active';
        }
        if (rest.service_expires_at) {
          sub.expiry_date = rest.service_expires_at.split('T')[0];
        }
      }

      data.activity_logs.push({
        id: `act-${Date.now()}`,
        user_email: req.user!.email,
        action: 'RESTAURANT_SERVICE_UPDATED',
        details: `Updated ${rest.name}: Status=${rest.status}, Expires=${rest.service_expires_at || 'Never'}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  if (!updatedRest) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  broadcastEvent(id, 'RESTAURANT_SERVICE_UPDATED', updatedRest);
  res.json({ success: true, restaurant: updatedRest });
});

// DELETE RESTAURANT (CAFE) AND ALL ASSOCIATED TENANT DATA
apiRouter.delete('/admin/restaurants/:id', authenticate, requireRole('platform_admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existingRest = db.get('restaurants').find(r => r.id === id);
  if (!existingRest) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  db.update(data => {
    // 1. Remove restaurant
    data.restaurants = data.restaurants.filter(r => r.id !== id);
    // 2. Remove staff & owner users (except platform admins)
    data.users = data.users.filter(u => u.restaurant_id !== id);
    // 3. Remove subscriptions
    data.subscriptions = data.subscriptions.filter(s => s.restaurant_id !== id);
    // 4. Remove tables
    data.tables = data.tables.filter(t => t.restaurant_id !== id);
    // 5. Remove categories & menu items
    data.categories = data.categories.filter(c => c.restaurant_id !== id);
    data.menu_items = data.menu_items.filter(m => m.restaurant_id !== id);
    // 6. Remove orders
    data.orders = data.orders.filter(o => o.restaurant_id !== id);
    // 7. Remove coupons
    data.coupons = data.coupons.filter(c => c.restaurant_id !== id);
    // 8. Remove service requests
    data.table_service_requests = (data.table_service_requests || []).filter(r => r.restaurant_id !== id);

    data.activity_logs.unshift({
      id: `act-${Date.now()}`,
      restaurant_id: id,
      user_email: req.user?.email || 'admin',
      action: 'RESTAURANT_DELETED',
      details: `Restaurant "${existingRest.name}" (${existingRest.slug}) permanently deleted by platform admin`,
      timestamp: new Date().toISOString()
    });
  });

  broadcastEvent('all', 'RESTAURANT_DELETED', { id, name: existingRest.name });
  res.json({ success: true, message: `Restaurant "${existingRest.name}" deleted successfully` });
});

apiRouter.patch('/admin/subscriptions/:id', authenticate, requireRole('platform_admin'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { plan, status, payment_status, expiry_date, notes } = req.body;

  let updatedSub: Subscription | null = null;
  db.update(data => {
    const sub = data.subscriptions.find(s => s.id === id);
    if (sub) {
      if (plan) sub.plan = plan;
      if (status) sub.status = status;
      if (payment_status) sub.payment_status = payment_status;
      if (expiry_date) sub.expiry_date = expiry_date;
      if (notes !== undefined) sub.notes = notes;
      updatedSub = sub;

      // Also sync restaurant status if payment/active confirmed
      const rest = data.restaurants.find(r => r.id === sub.restaurant_id);
      if (rest) {
        if (sub.status === 'active' && sub.payment_status === 'paid') {
          rest.status = 'active';
        } else if (sub.status === 'suspended' || sub.status === 'expired') {
          rest.status = 'suspended';
        }
      }
    }
  });

  if (!updatedSub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }
  res.json({ success: true, subscription: updatedSub });
});

apiRouter.get('/admin/subscriptions', authenticate, requireRole('platform_admin'), (req: AuthRequest, res: Response) => {
  const subs = db.get('subscriptions');
  const rests = db.get('restaurants');
  const result = subs.map(s => {
    const r = rests.find(rest => rest.id === s.restaurant_id);
    return { ...s, restaurant_name: r?.name || 'Unknown' };
  });
  res.json(result);
});

apiRouter.get('/admin/activity-logs', authenticate, requireRole('platform_admin'), (req: AuthRequest, res: Response) => {
  const logs = db.get('activity_logs');
  res.json(logs.slice(-50).reverse());
});

// ----------------------------------------------------
// 3. RESTAURANT MANAGEMENT ENDPOINTS (Tenant Isolated)
// ----------------------------------------------------
function getRestaurantId(req: AuthRequest): string {
  if (req.user?.role === 'platform_admin') {
    if (req.query.adminRestaurantId) {
      return req.query.adminRestaurantId as string;
    }
    const allRests = db.get('restaurants');
    return (allRests && allRests.length > 0) ? allRests[0].id : 'rest-urban-bites-1';
  }
  return req.user?.restaurant_id || (db.get('restaurants')[0]?.id || 'rest-urban-bites-1');
}

// RESTAURANT PROFILE
apiRouter.get('/restaurant/profile', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const rest = db.get('restaurants').find(r => r.id === restId);
  if (!rest) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(rest);
});

apiRouter.put('/restaurant/profile', authenticate, requireRole('platform_admin', 'restaurant_owner'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const {
    name, logo, cover_image, phone, address, city, state, pincode,
    description, opening_time, closing_time, cuisine_type, wifi_info,
    enabled_payments, tax_rate, upi_id, upi_payee_name, pay_counter_only
  } = req.body;

  let updated: Restaurant | null = null;
  db.update(data => {
    const rest = data.restaurants.find(r => r.id === restId);
    if (rest) {
      if (name) rest.name = name;
      if (logo !== undefined) rest.logo = logo;
      if (cover_image !== undefined) rest.cover_image = cover_image;
      if (phone !== undefined) rest.phone = phone;
      if (address !== undefined) rest.address = address;
      if (city !== undefined) rest.city = city;
      if (state !== undefined) rest.state = state;
      if (pincode !== undefined) rest.pincode = pincode;
      if (description !== undefined) rest.description = description;
      if (opening_time !== undefined) rest.opening_time = opening_time;
      if (closing_time !== undefined) rest.closing_time = closing_time;
      if (cuisine_type !== undefined) rest.cuisine_type = cuisine_type;
      if (wifi_info !== undefined) rest.wifi_info = wifi_info;
      if (enabled_payments) rest.enabled_payments = { ...rest.enabled_payments, ...enabled_payments };
      if (tax_rate !== undefined) rest.tax_rate = Number(tax_rate);
      if (upi_id !== undefined) rest.upi_id = upi_id.trim();
      if (upi_payee_name !== undefined) rest.upi_payee_name = upi_payee_name.trim();
      if (pay_counter_only !== undefined) rest.pay_counter_only = Boolean(pay_counter_only);
      rest.updated_at = new Date().toISOString();
      updated = rest;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Restaurant not found' });
  broadcastEvent(restId, 'RESTAURANT_PROFILE_UPDATED', updated);
  res.json({ success: true, restaurant: updated });
});

// MENU MANAGEMENT (Categories & Items)
apiRouter.get('/restaurant/menu', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const categories = db.get('categories').filter(c => c.restaurant_id === restId).sort((a, b) => a.sort_order - b.sort_order);
  const items = db.get('menu_items').filter(i => i.restaurant_id === restId);
  res.json({ categories, items });
});

apiRouter.post('/restaurant/categories', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const newCat: Category = {
    id: `cat-${Date.now()}`,
    restaurant_id: restId,
    name,
    sort_order: sort_order || 99,
    is_active: true,
    created_at: new Date().toISOString()
  };

  db.update(data => data.categories.push(newCat));
  res.status(201).json({ success: true, category: newCat });
});

apiRouter.put('/restaurant/categories/:id', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;
  const { name, sort_order, is_active } = req.body;

  let updated: Category | null = null;
  db.update(data => {
    const cat = data.categories.find(c => c.id === id && c.restaurant_id === restId);
    if (cat) {
      if (name !== undefined) cat.name = name;
      if (sort_order !== undefined) cat.sort_order = Number(sort_order);
      if (is_active !== undefined) cat.is_active = Boolean(is_active);
      updated = cat;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true, category: updated });
});

apiRouter.delete('/restaurant/categories/:id', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;

  db.update(data => {
    data.categories = data.categories.filter(c => !(c.id === id && c.restaurant_id === restId));
  });
  res.json({ success: true });
});

apiRouter.post('/restaurant/items', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const {
    name, description, price, discount_price, category_id, image,
    weight, is_veg, spicy_level, prep_time, is_available, is_bestseller
  } = req.body;

  if (!name || price === undefined || !category_id) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  const newItem: MenuItem = {
    id: `item-${Date.now()}`,
    restaurant_id: restId,
    category_id,
    name,
    description: description || '',
    price: Number(price),
    discount_price: discount_price ? Number(discount_price) : undefined,
    image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    weight: weight || '',
    is_veg: is_veg !== undefined ? Boolean(is_veg) : true,
    spicy_level: Number(spicy_level || 0),
    prep_time: Number(prep_time || 15),
    is_available: is_available !== undefined ? Boolean(is_available) : true,
    is_bestseller: Boolean(is_bestseller),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.update(data => data.menu_items.push(newItem));
  res.status(201).json({ success: true, item: newItem });
});

apiRouter.put('/restaurant/items/:id', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;
  const updates = req.body;

  let updated: MenuItem | null = null;
  db.update(data => {
    const item = data.menu_items.find(i => i.id === id && i.restaurant_id === restId);
    if (item) {
      if (updates.name !== undefined) item.name = updates.name;
      if (updates.description !== undefined) item.description = updates.description;
      if (updates.price !== undefined) item.price = Number(updates.price);
      if (updates.discount_price !== undefined) item.discount_price = updates.discount_price ? Number(updates.discount_price) : undefined;
      if (updates.category_id !== undefined) item.category_id = updates.category_id;
      if (updates.image !== undefined) item.image = updates.image;
      if (updates.weight !== undefined) item.weight = updates.weight;
      if (updates.is_veg !== undefined) item.is_veg = Boolean(updates.is_veg);
      if (updates.spicy_level !== undefined) item.spicy_level = Number(updates.spicy_level);
      if (updates.prep_time !== undefined) item.prep_time = Number(updates.prep_time);
      if (updates.is_available !== undefined) item.is_available = Boolean(updates.is_available);
      if (updates.is_bestseller !== undefined) item.is_bestseller = Boolean(updates.is_bestseller);
      item.updated_at = new Date().toISOString();
      updated = item;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Menu item not found' });
  res.json({ success: true, item: updated });
});

apiRouter.delete('/restaurant/items/:id', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;

  db.update(data => {
    data.menu_items = data.menu_items.filter(i => !(i.id === id && i.restaurant_id === restId));
  });
  res.json({ success: true });
});

apiRouter.post('/restaurant/items/:id/duplicate', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;

  const item = db.get('menu_items').find(i => i.id === id && i.restaurant_id === restId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const duplicated: MenuItem = {
    ...item,
    id: `item-${Date.now()}`,
    name: `${item.name} (Copy)`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.update(data => data.menu_items.push(duplicated));
  res.status(201).json({ success: true, item: duplicated });
});

// TABLES MANAGEMENT
apiRouter.get('/restaurant/tables', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const tables = db.get('tables').filter(t => t.restaurant_id === restId).sort((a, b) => a.table_number - b.table_number);
  res.json(tables);
});

apiRouter.post('/restaurant/tables', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager', 'waiter'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { table_number, capacity, status } = req.body;

  if (table_number === undefined) return res.status(400).json({ error: 'Table number is required' });

  const existing = db.get('tables').find(t => t.restaurant_id === restId && t.table_number === Number(table_number));
  if (existing) {
    return res.status(400).json({ error: `Table ${table_number} already exists` });
  }

  const newTable: RestaurantTable = {
    id: `tbl-${Date.now()}`,
    restaurant_id: restId,
    table_number: Number(table_number),
    capacity: Number(capacity || 4),
    status: status || 'available',
    created_at: new Date().toISOString()
  };

  db.update(data => data.tables.push(newTable));
  res.status(201).json({ success: true, table: newTable });
});

apiRouter.put('/restaurant/tables/:id', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager', 'waiter'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;
  const { table_number, capacity, status } = req.body;

  let updated: RestaurantTable | null = null;
  db.update(data => {
    const tbl = data.tables.find(t => t.id === id && t.restaurant_id === restId);
    if (tbl) {
      if (table_number !== undefined) tbl.table_number = Number(table_number);
      if (capacity !== undefined) tbl.capacity = Number(capacity);
      if (status !== undefined) tbl.status = status;
      updated = tbl;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Table not found' });
  res.json({ success: true, table: updated });
});

apiRouter.delete('/restaurant/tables/:id', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;

  db.update(data => {
    data.tables = data.tables.filter(t => !(t.id === id && t.restaurant_id === restId));
  });
  res.json({ success: true });
});

// COUPONS MANAGEMENT
apiRouter.get('/restaurant/coupons', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const coupons = db.get('coupons').filter(c => c.restaurant_id === restId);
  res.json(coupons);
});

apiRouter.post('/restaurant/coupons', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const {
    code, discount_type, discount_value, min_order_amount,
    max_discount_amount, start_date, end_date, usage_limit, per_customer_limit, is_active
  } = req.body;

  if (!code || !discount_value || !start_date || !end_date) {
    return res.status(400).json({ error: 'Coupon code, discount value, start date and end date are required' });
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = db.get('coupons').find(c => c.restaurant_id === restId && c.code === cleanCode);
  if (existing) {
    return res.status(400).json({ error: 'Coupon code already exists for this restaurant' });
  }

  const newCoupon: Coupon = {
    id: `cpn-${Date.now()}`,
    restaurant_id: restId,
    code: cleanCode,
    discount_type: discount_type || 'percentage',
    discount_value: Number(discount_value),
    min_order_amount: Number(min_order_amount || 0),
    max_discount_amount: max_discount_amount ? Number(max_discount_amount) : undefined,
    start_date,
    end_date,
    usage_limit: Number(usage_limit || 100),
    used_count: 0,
    per_customer_limit: Number(per_customer_limit || 1),
    is_active: is_active !== undefined ? Boolean(is_active) : true,
    created_at: new Date().toISOString()
  };

  db.update(data => data.coupons.push(newCoupon));
  res.status(201).json({ success: true, coupon: newCoupon });
});

apiRouter.put('/restaurant/coupons/:id', authenticate, requireRole('platform_admin', 'restaurant_owner', 'restaurant_manager'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;
  const updates = req.body;

  let updated: Coupon | null = null;
  db.update(data => {
    const coupon = data.coupons.find(c => c.id === id && c.restaurant_id === restId);
    if (coupon) {
      if (updates.code) coupon.code = updates.code.trim().toUpperCase();
      if (updates.discount_type) coupon.discount_type = updates.discount_type;
      if (updates.discount_value !== undefined) coupon.discount_value = Number(updates.discount_value);
      if (updates.min_order_amount !== undefined) coupon.min_order_amount = Number(updates.min_order_amount);
      if (updates.max_discount_amount !== undefined) coupon.max_discount_amount = updates.max_discount_amount ? Number(updates.max_discount_amount) : undefined;
      if (updates.start_date) coupon.start_date = updates.start_date;
      if (updates.end_date) coupon.end_date = updates.end_date;
      if (updates.usage_limit !== undefined) coupon.usage_limit = Number(updates.usage_limit);
      if (updates.is_active !== undefined) coupon.is_active = Boolean(updates.is_active);
      updated = coupon;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Coupon not found' });
  res.json({ success: true, coupon: updated });
});

apiRouter.delete('/restaurant/coupons/:id', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const rawId = (req.params.id || '').trim();

  let deleted = false;
  db.update(data => {
    if (!data.coupons) data.coupons = [];
    const beforeCount = data.coupons.length;
    data.coupons = data.coupons.filter(c => {
      const match = c.id === rawId || (c.code && c.code.toUpperCase() === rawId.toUpperCase());
      if (match) {
        if (req.user?.role === 'platform_admin' || !restId || !c.restaurant_id || c.restaurant_id === restId) {
          deleted = true;
          return false;
        }
      }
      return true;
    });

    // Fallback: If still not deleted but user has management rights, remove the matched coupon
    if (!deleted && ['platform_admin', 'restaurant_owner', 'restaurant_manager'].includes(req.user?.role || '')) {
      data.coupons = data.coupons.filter(c => {
        if (c.id === rawId || (c.code && c.code.toUpperCase() === rawId.toUpperCase())) {
          deleted = true;
          return false;
        }
        return true;
      });
    }

    if (!deleted && beforeCount > data.coupons.length) {
      deleted = true;
    }
  });

  return res.json({ success: true, message: 'Coupon deleted successfully' });
});

// ORDERS MANAGEMENT
apiRouter.get('/restaurant/orders', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const orders = db.get('orders').filter(o => o.restaurant_id === restId).reverse();
  res.json(orders);
});

apiRouter.patch('/restaurant/orders/:id/status', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  let updatedOrder: Order | null = null;
  db.update(data => {
    const ord = data.orders.find(o => o.id === id && o.restaurant_id === restId);
    if (ord) {
      ord.status = status;
      ord.updated_at = new Date().toISOString();
      updatedOrder = ord;

      // Update table status if completed or cancelled
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        const tbl = data.tables.find(t => t.id === ord.table_id);
        if (tbl) tbl.status = 'available';
      }
    }
  });

  if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
  broadcastEvent(restId, 'ORDER_STATUS_UPDATED', updatedOrder);
  res.json({ success: true, order: updatedOrder });
});

apiRouter.patch('/restaurant/orders/:id/payment', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;
  const { payment_status } = req.body;

  let updatedOrder: Order | null = null;
  db.update(data => {
    const ord = data.orders.find(o => o.id === id && o.restaurant_id === restId);
    if (ord) {
      ord.payment_status = payment_status || 'paid';
      ord.updated_at = new Date().toISOString();
      updatedOrder = ord;
    }
  });

  if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
  broadcastEvent(restId, 'ORDER_PAYMENT_UPDATED', updatedOrder);
  res.json({ success: true, order: updatedOrder });
});

// STAFF COMPLETE ORDER WITH CASH (FOR TABLE / ORDER)
apiRouter.post('/restaurant/orders/:id/complete-cash', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;

  let updatedOrder: Order | null = null;
  db.update(data => {
    const ord = data.orders.find(o => o.id === id && o.restaurant_id === restId);
    if (ord) {
      ord.status = 'COMPLETED';
      ord.payment_status = 'paid';
      ord.payment_method = 'cash_table';
      ord.updated_at = new Date().toISOString();
      updatedOrder = ord;

      // Free table if no pending orders remain
      const hasOtherPending = data.orders.some(
        o => o.restaurant_id === restId && 
             o.table_id === ord.table_id && 
             o.id !== ord.id && 
             !['COMPLETED', 'CANCELLED'].includes(o.status)
      );
      if (!hasOtherPending) {
        const tbl = data.tables.find(t => t.id === ord.table_id);
        if (tbl) tbl.status = 'available';
      }

      data.activity_logs.unshift({
        id: `act-${Date.now()}`,
        restaurant_id: restId,
        user_email: req.user?.email || 'staff',
        action: 'ORDER_COMPLETED_CASH',
        details: `Order #${ord.order_number} (Table ${ord.table_number}) marked COMPLETED with CASH payment`,
        timestamp: new Date().toISOString()
      });
    }
  });

  if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });

  // Broadcast both payment and status updates so customer and kitchen get instant notification
  broadcastEvent(restId, 'ORDER_PAYMENT_UPDATED', updatedOrder);
  broadcastEvent(restId, 'ORDER_STATUS_UPDATED', updatedOrder);
  res.json({ success: true, message: `Order #${(updatedOrder as Order).order_number} marked COMPLETED (Cash Received)`, order: updatedOrder });
});

// DELETE ORDER (BY STAFF / ADMIN)
apiRouter.delete('/restaurant/orders/:id', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;

  const existingOrder = db.get('orders').find(o => o.id === id && o.restaurant_id === restId);
  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found' });
  }

  db.update(data => {
    data.orders = data.orders.filter(o => !(o.id === id && o.restaurant_id === restId));

    // If table has no pending orders left, free it
    const hasRemaining = data.orders.some(
      o => o.restaurant_id === restId && 
           o.table_id === existingOrder.table_id && 
           !['COMPLETED', 'CANCELLED'].includes(o.status)
    );
    if (!hasRemaining) {
      const tbl = data.tables.find(t => t.id === existingOrder.table_id);
      if (tbl) tbl.status = 'available';
    }

    data.activity_logs.unshift({
      id: `act-${Date.now()}`,
      restaurant_id: restId,
      user_email: req.user?.email || 'staff',
      action: 'ORDER_DELETED',
      details: `Order #${existingOrder.order_number} (Table ${existingOrder.table_number}) deleted by ${req.user?.name || 'Staff'}`,
      timestamp: new Date().toISOString()
    });
  });

  broadcastEvent(restId, 'ORDER_DELETED', { id, order_number: existingOrder.order_number });
  res.json({ success: true, message: `Order #${existingOrder.order_number} deleted successfully` });
});

// DAILY CLEAR COMPLETED ORDERS FROM KITCHEN & ACTIVE ORDERS VIEW
apiRouter.post('/restaurant/orders/daily-clear', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  let clearedCount = 0;

  db.update(data => {
    data.orders.forEach(ord => {
      if (ord.restaurant_id === restId) {
        // Clear if order is marked COMPLETED or SERVED
        if (['COMPLETED', 'SERVED'].includes(ord.status) && !ord.is_cleared_from_active) {
          ord.is_cleared_from_active = true;
          ord.cleared_at = new Date().toISOString();
          ord.updated_at = new Date().toISOString();
          clearedCount++;
        }
      }
    });

    // Also check and free tables that have no active pending orders left
    data.tables.forEach(tbl => {
      if (tbl.restaurant_id === restId && tbl.status === 'occupied') {
        const hasPending = data.orders.some(
          o => o.restaurant_id === restId && 
               o.table_id === tbl.id && 
               !['COMPLETED', 'CANCELLED'].includes(o.status)
        );
        if (!hasPending) {
          tbl.status = 'available';
        }
      }
    });

    data.activity_logs.unshift({
      id: `act-${Date.now()}`,
      restaurant_id: restId,
      user_email: req.user?.email || 'staff',
      action: 'DAILY_CLEAR_COMPLETED',
      details: `Daily clear completed: ${clearedCount} completed orders archived from live board into Order History`,
      timestamp: new Date().toISOString()
    });
  });

  broadcastEvent(restId, 'ORDERS_CLEARED', { cleared_count: clearedCount, timestamp: new Date().toISOString() });
  
  res.json({
    success: true,
    cleared_count: clearedCount,
    message: `Successfully cleared ${clearedCount} completed order(s) for the day. All records are safely preserved in Order History.`
  });
});

// COMPREHENSIVE ORDER HISTORY WITH PHONE NUMBER & CUSTOMER AUDIT
apiRouter.get('/restaurant/orders/history', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { phone, search, status, payment_method, date, limit } = req.query;

  let history = db.get('orders').filter(o => o.restaurant_id === restId);

  // Filter by phone number (exact or last 10 digits match)
  if (phone) {
    const cleanQueryDigits = phone.toString().replace(/\D/g, '').slice(-10);
    if (cleanQueryDigits) {
      history = history.filter(o => {
        if (!o.customer_phone) return false;
        const ordDigits = o.customer_phone.replace(/\D/g, '').slice(-10);
        return ordDigits.includes(cleanQueryDigits);
      });
    }
  }

  // Filter by status
  if (status && status !== 'all') {
    history = history.filter(o => o.status === status);
  }

  // Filter by payment method
  if (payment_method && payment_method !== 'all') {
    history = history.filter(o => o.payment_method === payment_method);
  }

  // Filter by date (YYYY-MM-DD)
  if (date && date !== 'all') {
    const dateStr = date.toString();
    history = history.filter(o => o.created_at.startsWith(dateStr));
  }

  // Generic search (order_number, customer name, phone, item name)
  if (search) {
    const q = search.toString().toLowerCase().trim();
    history = history.filter(o => {
      const matchNum = o.order_number.toString().includes(q);
      const matchName = o.customer_name?.toLowerCase().includes(q);
      const matchPhone = o.customer_phone?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) || o.customer_phone?.includes(q);
      const matchItems = o.items?.some(it => it.item_name_snapshot.toLowerCase().includes(q));
      const matchTable = `table ${o.table_number}`.includes(q) || o.table_number.toString() === q;
      return matchNum || matchName || matchPhone || matchItems || matchTable;
    });
  }

  // Sort descending by created_at (newest first)
  history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (limit) {
    history = history.slice(0, parseInt(limit.toString(), 10));
  }

  res.json({
    success: true,
    total_count: history.length,
    orders: history
  });
});

// CUSTOMERS & LOYALTY
apiRouter.get('/restaurant/customers', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const customers = db.get('customers').filter(c => c.restaurant_id === restId);
  res.json(customers);
});

// STAFF MANAGEMENT
apiRouter.get('/restaurant/staff', authenticate, requireRole('platform_admin', 'restaurant_owner'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const users = db.get('users').filter(u => u.restaurant_id === restId);
  const safeUsers = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.created_at
  }));
  res.json(safeUsers);
});

apiRouter.post('/restaurant/staff', authenticate, requireRole('platform_admin', 'restaurant_owner'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const allowedRoles = ['restaurant_manager', 'kitchen_staff', 'waiter'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid staff role' });
  }

  const users = db.get('users');
  if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const newStaff: User & { password_hash: string } = {
    id: `usr-staff-${Date.now()}`,
    email: email.trim().toLowerCase(),
    name,
    role,
    restaurant_id: restId,
    password_hash: bcrypt.hashSync(password, 10),
    created_at: new Date().toISOString()
  };

  db.update(data => data.users.push(newStaff));
  res.status(201).json({
    success: true,
    staff: { id: newStaff.id, name: newStaff.name, email: newStaff.email, role: newStaff.role }
  });
});

apiRouter.delete('/restaurant/staff/:id', authenticate, requireRole('platform_admin', 'restaurant_owner'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;

  db.update(data => {
    data.users = data.users.filter(u => !(u.id === id && u.restaurant_id === restId && u.role !== 'restaurant_owner'));
  });
  res.json({ success: true });
});

// TABLE SERVICE REQUESTS (STAFF ALERTS: WATER, BILL, WAITER)
apiRouter.get('/restaurant/service-requests', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const requests = (db.get('service_requests') || []).filter(r => r.restaurant_id === restId);
  requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(requests);
});

apiRouter.patch('/restaurant/service-requests/:id', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { id } = req.params;
  const { status } = req.body; // 'attended' | 'resolved' | 'pending'

  let updated: any = null;
  db.update(data => {
    if (!data.service_requests) data.service_requests = [];
    const item = data.service_requests.find(r => r.id === id && r.restaurant_id === restId);
    if (item) {
      item.status = status;
      if (status === 'attended') {
        item.attended_at = new Date().toISOString();
        item.attended_by = req.user?.name || 'Staff';
      } else if (status === 'resolved') {
        item.resolved_at = new Date().toISOString();
      }
      updated = item;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Service request not found' });
  broadcastEvent(restId, 'SERVICE_REQUEST_UPDATED', updated);
  res.json({ success: true, request: updated });
});

// WAITER POS / PUNCH ORDER FOR TABLE
apiRouter.post('/restaurant/orders/punch', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { table_number, items, notes, payment_method, customer_name, customer_phone, order_type } = req.body;

  if (!table_number || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Table number and order items are required' });
  }

  const rest = db.get('restaurants').find(r => r.id === restId);
  if (!rest) return res.status(404).json({ error: 'Restaurant not found' });

  const table = db.get('tables').find(t => t.restaurant_id === restId && t.table_number === Number(table_number));
  const tableId = table ? table.id : `tbl-${table_number}`;

  let subtotal = 0;
  const orderItems: any[] = [];
  const orderId = `ord-${Date.now()}`;

  items.forEach((it: any, index: number) => {
    const menuItem = db.get('menu_items').find(m => m.id === it.menu_item_id);
    const price = it.price_snapshot || (menuItem ? menuItem.price : 100);
    const lineTotal = price * (it.quantity || 1);
    subtotal += lineTotal;

    orderItems.push({
      id: `oi-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
      order_id: orderId,
      menu_item_id: it.menu_item_id || 'custom-item',
      item_name_snapshot: it.item_name_snapshot || (menuItem ? menuItem.name : 'Dish'),
      price_snapshot: price,
      quantity: it.quantity || 1,
      selected_size: it.selected_size,
      selected_size_price: it.selected_size_price || 0,
      selected_addons: it.selected_addons || [],
      spice_level: it.spice_level,
      special_instructions: it.special_instructions,
      customization: it.customization,
      created_at: new Date().toISOString()
    });
  });

  const taxRate = (rest.tax_rate ?? 5) / 100;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const serviceChargeRate = (rest.service_charge_rate ?? 0) / 100;
  const serviceChargeAmount = Math.round(subtotal * serviceChargeRate * 100) / 100;
  const grandTotal = Math.round((subtotal + taxAmount + serviceChargeAmount) * 100) / 100;

  let nextNum = 1001;
  db.update(data => {
    if (!data.next_order_number) data.next_order_number = 1001;
    nextNum = data.next_order_number++;
  });

  const newOrder: any = {
    id: orderId,
    order_number: nextNum,
    restaurant_id: restId,
    table_id: tableId,
    table_number: Number(table_number),
    customer_name: customer_name?.trim() || `Table ${table_number} (Staff)`,
    customer_phone: customer_phone?.trim() || undefined,
    order_type: order_type || 'dine_in',
    status: 'NEW',
    payment_method: payment_method || 'cash_table',
    payment_status: 'pending',
    subtotal,
    discount: 0,
    tax: taxAmount,
    service_charge: serviceChargeAmount,
    total: grandTotal,
    notes: notes || undefined,
    items: orderItems,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.update(data => {
    data.orders.unshift(newOrder);
    data.order_items.push(...orderItems);
    if (table && (!order_type || order_type === 'dine_in')) {
      table.status = 'occupied';
    }
  });

  broadcastEvent(restId, 'ORDER_CREATED', newOrder);
  broadcastEvent(restId, 'NEW_ORDER', newOrder);
  res.json({ success: true, order: newOrder });
});

// CLEAR RESOLVED TABLE SERVICE REQUESTS (FOR DAILY CLEANUP)
apiRouter.post('/restaurant/service-requests/clear-resolved', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  let cleared = 0;
  db.update(data => {
    if (data.service_requests) {
      const before = data.service_requests.length;
      data.service_requests = data.service_requests.filter(r => !(r.restaurant_id === restId && r.status === 'resolved'));
      cleared = before - data.service_requests.length;
    }
  });
  broadcastEvent(restId, 'SERVICE_REQUESTS_CLEARED', { cleared });
  res.json({ success: true, cleared });
});

// WAITER / STAFF TABLE BILL SETTLEMENT
apiRouter.post('/restaurant/tables/:tableNum/settle-bill', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { tableNum } = req.params;
  const { payment_method } = req.body;
  const tableNumber = Number(tableNum);

  let updatedOrders: any[] = [];
  db.update(data => {
    data.orders.forEach(o => {
      if (o.restaurant_id === restId && o.table_number === tableNumber && o.payment_status !== 'paid' && o.status !== 'CANCELLED') {
        o.payment_status = 'paid';
        if (payment_method) o.payment_method = payment_method;
        if (o.status === 'NEW' || o.status === 'ACCEPTED' || o.status === 'PREPARING' || o.status === 'READY') {
          o.status = 'SERVED';
        }
        o.updated_at = new Date().toISOString();
        updatedOrders.push(o);
      }
    });
    const table = data.tables.find(t => t.restaurant_id === restId && t.table_number === tableNumber);
    if (table) {
      table.status = 'cleaning';
    }
  });

  updatedOrders.forEach(o => {
    broadcastEvent(restId, 'ORDER_PAYMENT_UPDATED', o);
  });

  res.json({ success: true, count: updatedOrders.length, orders: updatedOrders });
});

// ANALYTICS
apiRouter.get('/restaurant/analytics', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const orders = db.get('orders').filter(o => o.restaurant_id === restId);
  const customers = db.get('customers').filter(c => c.restaurant_id === restId);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.total : 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

  // Payment breakdown
  const payments = {
    online: orders.filter(o => o.payment_method === 'online').length,
    cash_table: orders.filter(o => o.payment_method === 'cash_table').length,
    cash_counter: orders.filter(o => o.payment_method === 'cash_counter').length
  };

  // Popular items
  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach(o => {
    o.items?.forEach(item => {
      if (!itemCounts[item.item_name_snapshot]) {
        itemCounts[item.item_name_snapshot] = { name: item.item_name_snapshot, count: 0, revenue: 0 };
      }
      itemCounts[item.item_name_snapshot].count += item.quantity;
      itemCounts[item.item_name_snapshot].revenue += item.quantity * item.price_snapshot;
    });
  });

  const popularItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  res.json({
    totalRevenue,
    totalOrders,
    avgOrderValue: Math.round(avgOrderValue),
    totalCustomers: customers.length,
    payments,
    popularItems
  });
});

// ----------------------------------------------------
// 4. RESTAURANT TABLE BILL & OPERATIONS ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/restaurant/tables/:tableId/running-bill', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { tableId } = req.params;
  const table = db.get('tables').find(t => t.id === tableId && t.restaurant_id === restId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  const activeOrders = db.get('orders').filter(
    o => o.restaurant_id === restId && o.table_id === tableId && o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
  );

  const runningTotal = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalItems = activeOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  res.json({
    table_number: table.table_number,
    table_id: table.id,
    status: table.status,
    active_orders: activeOrders,
    running_total: Math.round(runningTotal * 100) / 100,
    total_items: totalItems
  });
});

apiRouter.post('/restaurant/tables/:tableId/settle', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { tableId } = req.params;
  const table = db.get('tables').find(t => t.id === tableId && t.restaurant_id === restId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  db.update(data => {
    // Settle all active orders
    data.orders.forEach(o => {
      if (o.restaurant_id === restId && o.table_id === tableId && o.status !== 'COMPLETED' && o.status !== 'CANCELLED') {
        o.status = 'COMPLETED';
        o.payment_status = 'paid';
        o.updated_at = new Date().toISOString();
      }
    });
    // Set table status to available
    const tbl = data.tables.find(t => t.id === tableId);
    if (tbl) tbl.status = 'available';
  });

  broadcastEvent(restId, 'TABLE_SETTLED', { tableId, table_number: table.table_number });
  res.json({ success: true, message: `Table ${table.table_number} settled successfully` });
});

apiRouter.patch('/restaurant/orders/:orderId/verify-code', authenticate, (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { orderId } = req.params;
  const { code } = req.body;

  const order = db.get('orders').find(o => o.id === orderId && o.restaurant_id === restId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.verification_code && order.verification_code !== code?.toString().trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check with customer.' });
  }

  db.update(data => {
    const ord = data.orders.find(o => o.id === orderId);
    if (ord) {
      if (ord.status === 'NEW') ord.status = 'ACCEPTED';
      ord.updated_at = new Date().toISOString();
    }
  });

  const updated = db.get('orders').find(o => o.id === orderId);
  broadcastEvent(restId, 'ORDER_STATUS_UPDATED', updated);
  res.json({ success: true, order: updated });
});

apiRouter.patch('/restaurant/settings/operations', authenticate, requireRole('platform_admin', 'restaurant_owner'), (req: AuthRequest, res: Response) => {
  const restId = getRestaurantId(req);
  const { accepting_orders, order_validation_enabled, service_charge_rate, pay_counter_only } = req.body;

  db.update(data => {
    const rest = data.restaurants.find(r => r.id === restId);
    if (rest) {
      if (accepting_orders !== undefined) rest.accepting_orders = Boolean(accepting_orders);
      if (order_validation_enabled !== undefined) rest.order_validation_enabled = Boolean(order_validation_enabled);
      if (service_charge_rate !== undefined) rest.service_charge_rate = Number(service_charge_rate);
      if (pay_counter_only !== undefined) rest.pay_counter_only = Boolean(pay_counter_only);
      rest.updated_at = new Date().toISOString();
    }
  });

  const updatedRest = db.get('restaurants').find(r => r.id === restId);
  res.json({ success: true, restaurant: updatedRest });
});

// ----------------------------------------------------
// 5. PUBLIC CUSTOMER ENDPOINTS (Menu, Table, Order Confirmation)
// ----------------------------------------------------
apiRouter.get('/public/menu/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const rest = db.get('restaurants').find(r => r.slug === slug);

  if (!rest) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  const isSuspended = rest.status === 'suspended';
  const isExpired = rest.service_expires_at ? new Date() > new Date(rest.service_expires_at) : false;

  if (isSuspended) {
    return res.status(403).json({ 
      error: rest.ban_reason || 'This cafe service has been temporarily suspended by the platform administrator.' 
    });
  }

  if (isExpired) {
    return res.status(403).json({ 
      error: 'This restaurant’s service subscription validity has expired. Please contact restaurant administration.' 
    });
  }

  const categories = db.get('categories')
    .filter(c => c.restaurant_id === rest.id && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Return all items so UI can render out-of-stock items with disabled ADD buttons
  const items = db.get('menu_items')
    .filter(i => i.restaurant_id === rest.id);

  const tables = db.get('tables')
    .filter(t => t.restaurant_id === rest.id)
    .map(t => ({ table_number: t.table_number }));

  res.json({
    restaurant: {
      id: rest.id,
      name: rest.name,
      slug: rest.slug,
      logo: rest.logo,
      cover_image: rest.cover_image,
      phone: rest.phone,
      address: rest.address,
      city: rest.city,
      description: rest.description,
      cuisine_type: rest.cuisine_type,
      wifi_info: rest.wifi_info,
      opening_time: rest.opening_time,
      closing_time: rest.closing_time,
      tax_rate: rest.tax_rate,
      service_charge_rate: rest.service_charge_rate ?? 5.0,
      accepting_orders: rest.accepting_orders ?? true,
      order_validation_enabled: rest.order_validation_enabled ?? false,
      rating: rest.rating ?? 4.8,
      rating_count: rest.rating_count ?? 428,
      supported_languages: rest.supported_languages ?? ['en', 'hi', 'mr'],
      enabled_payments: rest.enabled_payments,
      pay_counter_only: rest.pay_counter_only ?? false,
      upi_id: rest.upi_id || '',
      upi_payee_name: rest.upi_payee_name || rest.name,
      service_expires_at: rest.service_expires_at
    },
    categories,
    items,
    available_tables: tables
  });
});

apiRouter.get('/public/menu/:slug/table/:tableNum', (req: Request, res: Response) => {
  const { slug, tableNum } = req.params;
  const tableNumber = parseInt(tableNum, 10);

  const rest = db.get('restaurants').find(r => r.slug === slug);
  if (!rest) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  const isSuspended = rest.status === 'suspended';
  const isExpired = rest.service_expires_at ? new Date() > new Date(rest.service_expires_at) : false;

  if (isSuspended) {
    return res.status(403).json({ 
      error: rest.ban_reason || 'This cafe service has been temporarily suspended by the platform administrator.' 
    });
  }

  if (isExpired) {
    return res.status(403).json({ 
      error: 'This restaurant’s service subscription validity has expired. Please contact restaurant administration.' 
    });
  }

  const table = db.get('tables').find(t => t.restaurant_id === rest.id && t.table_number === tableNumber);
  if (!table) {
    return res.status(404).json({ error: 'Table not found.' });
  }

  const categories = db.get('categories')
    .filter(c => c.restaurant_id === rest.id && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Return all items so UI can render out-of-stock items with disabled ADD buttons
  const items = db.get('menu_items')
    .filter(i => i.restaurant_id === rest.id);

  res.json({
    restaurant: {
      id: rest.id,
      name: rest.name,
      slug: rest.slug,
      logo: rest.logo,
      cover_image: rest.cover_image,
      phone: rest.phone,
      address: rest.address,
      city: rest.city,
      description: rest.description,
      cuisine_type: rest.cuisine_type,
      wifi_info: rest.wifi_info,
      opening_time: rest.opening_time,
      closing_time: rest.closing_time,
      tax_rate: rest.tax_rate,
      service_charge_rate: rest.service_charge_rate ?? 5.0,
      accepting_orders: rest.accepting_orders ?? true,
      order_validation_enabled: rest.order_validation_enabled ?? false,
      rating: rest.rating ?? 4.8,
      rating_count: rest.rating_count ?? 428,
      supported_languages: rest.supported_languages ?? ['en', 'hi', 'mr'],
      enabled_payments: rest.enabled_payments,
      pay_counter_only: rest.pay_counter_only ?? false,
      upi_id: rest.upi_id || '',
      upi_payee_name: rest.upi_payee_name || rest.name
    },
    table: {
      id: table.id,
      table_number: table.table_number,
      capacity: table.capacity,
      status: table.status
    },
    categories,
    items
  });
});

// FETCH RUNNING TABLE ORDERS / BILL FOR CUSTOMER
apiRouter.get('/public/table/:slug/:tableNum/orders', (req: Request, res: Response) => {
  const { slug, tableNum } = req.params;
  const tableNumber = parseInt(tableNum, 10);

  const rest = db.get('restaurants').find(r => r.slug === slug);
  if (!rest) return res.status(404).json({ error: 'Restaurant not found' });

  const table = db.get('tables').find(t => t.restaurant_id === rest.id && t.table_number === tableNumber);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  const activeOrders = db.get('orders').filter(
    o => o.restaurant_id === rest.id && o.table_id === table.id && o.status !== 'CANCELLED'
  );

  const runningTotal = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalItems = activeOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  res.json({
    table_number: table.table_number,
    table_id: table.id,
    running_total: Math.round(runningTotal * 100) / 100,
    total_items: totalItems,
    orders: activeOrders
  });
});

// FETCH RECENT ORDERS BY SESSION IDS OR TABLE
apiRouter.post('/public/orders/recent', (req: Request, res: Response) => {
  const { restaurant_id, order_ids, table_number } = req.body;
  if (!restaurant_id) {
    return res.status(400).json({ error: 'Restaurant ID required' });
  }

  const allOrders = db.get('orders').filter(o => o.restaurant_id === restaurant_id);
  
  let matchingOrders: typeof allOrders = [];

  // 1. If explicit order_ids array provided
  if (Array.isArray(order_ids) && order_ids.length > 0) {
    const idSet = new Set(order_ids);
    matchingOrders = allOrders.filter(o => idSet.has(o.id));
  }

  // 2. Also include table orders if table_number provided
  if (table_number !== undefined && table_number !== null) {
    const tblNum = Number(table_number);
    const tableOrders = allOrders.filter(o => o.table_number === tblNum);
    
    // Combine and deduplicate
    const combinedMap = new Map();
    [...matchingOrders, ...tableOrders].forEach(o => {
      combinedMap.set(o.id, o);
    });
    matchingOrders = Array.from(combinedMap.values());
  }

  // Sort newest first
  matchingOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const runningTotal = matchingOrders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.total, 0);

  const activeCount = matchingOrders.filter(
    o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
  ).length;

  res.json({
    success: true,
    orders: matchingOrders,
    running_total: Math.round(runningTotal * 100) / 100,
    active_count: activeCount
  });
});

// CUSTOMER PHONE LOGIN & ACCOUNT CREATION
apiRouter.post('/public/customer/login', (req: Request, res: Response) => {
  const { phone, name, restaurant_id } = req.body;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Please enter a valid mobile number' });
  }

  const cleanDigits = phone.replace(/\D/g, '').slice(-10);
  if (cleanDigits.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
  }

  // Find customer in db
  let customer = db.get('customers').find(c => {
    const custDigits = c.phone.replace(/\D/g, '').slice(-10);
    return custDigits === cleanDigits && (!restaurant_id || c.restaurant_id === restaurant_id);
  });

  if (!customer) {
    // If not found, create a new customer record
    const newCust: Customer = {
      id: `cst-${Date.now()}`,
      restaurant_id: restaurant_id || 'rest-urban-bites-1',
      name: name?.trim() || 'Diner',
      phone: phone.trim(),
      orders_count: 0,
      total_spent: 0,
      last_order_at: new Date().toISOString(),
      loyalty_points: 0,
      created_at: new Date().toISOString()
    };
    db.update(data => data.customers.push(newCust));
    customer = newCust;
  } else if (name && name.trim()) {
    db.update(data => {
      const c = data.customers.find(item => item.id === customer!.id);
      if (c) c.name = name.trim();
    });
    customer.name = name.trim();
  }

  // Find all past orders for this phone number
  const pastOrders = db.get('orders').filter(o => {
    if (!o.customer_phone) return false;
    const ordDigits = o.customer_phone.replace(/\D/g, '').slice(-10);
    const matchesPhone = ordDigits === cleanDigits;
    const matchesRest = !restaurant_id || o.restaurant_id === restaurant_id;
    return matchesPhone && matchesRest;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    success: true,
    customer,
    orders: pastOrders
  });
});

// GET PAST / OLD ORDERS FOR A CUSTOMER PHONE NUMBER
apiRouter.get('/public/customer/orders', (req: Request, res: Response) => {
  const { phone, restaurant_id } = req.query;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const cleanDigits = phone.toString().replace(/\D/g, '').slice(-10);
  if (cleanDigits.length < 10) {
    return res.status(400).json({ error: 'Please provide a valid 10-digit phone number' });
  }

  const pastOrders = db.get('orders').filter(o => {
    if (!o.customer_phone) return false;
    const ordDigits = o.customer_phone.replace(/\D/g, '').slice(-10);
    const matchesPhone = ordDigits === cleanDigits;
    const matchesRest = !restaurant_id || o.restaurant_id === restaurant_id.toString();
    return matchesPhone && matchesRest;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const customer = db.get('customers').find(c => {
    const custDigits = c.phone.replace(/\D/g, '').slice(-10);
    return custDigits === cleanDigits;
  });

  res.json({
    success: true,
    customer: customer || null,
    orders: pastOrders
  });
});

// CUSTOMER TABLE ASSISTANCE / CALL WAITER (WATER, BILL, CUTLERY, WAITER)
apiRouter.post('/public/table/service-request', (req: Request, res: Response) => {
  const { restaurant_id, table_number, request_type, note } = req.body;
  if (!restaurant_id || table_number === undefined) {
    return res.status(400).json({ error: 'Restaurant ID and table number are required' });
  }

  const rest = db.get('restaurants').find(r => r.id === restaurant_id);
  if (!rest) return res.status(404).json({ error: 'Restaurant not found' });

  const notification: TableServiceRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    restaurant_id,
    table_number: Number(table_number),
    request_type: request_type || 'waiter',
    note: note || '',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  db.update(data => {
    if (!data.service_requests) data.service_requests = [];
    data.service_requests.unshift(notification);
    data.activity_logs.unshift({
      id: `act-${Date.now()}`,
      restaurant_id,
      user_email: `Table ${table_number}`,
      action: 'SERVICE_REQUEST',
      details: `Table #${table_number} requested: ${request_type} (${note || ''})`,
      timestamp: new Date().toISOString()
    });
  });

  broadcastEvent(restaurant_id, 'TABLE_SERVICE_REQUEST', notification);
  res.json({ 
    success: true, 
    request: notification, 
    message: `Staff alerted! Someone is heading to Table ${table_number}.` 
  });
});

// GET ACTIVE TABLE SERVICE REQUEST (FOR CUSTOMER STATUS TRACKING)
apiRouter.get('/public/table/service-request/:restaurantId/:tableNumber', (req: Request, res: Response) => {
  const { restaurantId, tableNumber } = req.params;
  const requests = (db.get('service_requests') || [])
    .filter(r => r.restaurant_id === restaurantId && r.table_number === Number(tableNumber))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const active = requests.find(r => r.status !== 'resolved');
  res.json({ active_request: active || null, latest_requests: requests.slice(0, 5) });
});

// PUBLIC ONLINE TABLE BILL SETTLEMENT VIA UPI
apiRouter.post('/public/table/pay-bill', (req: Request, res: Response) => {
  const { restaurant_id, table_number, utr } = req.body;
  if (!restaurant_id || table_number === undefined) {
    return res.status(400).json({ error: 'Restaurant ID and table number are required' });
  }

  const tblNum = Number(table_number);
  const updatedOrders: any[] = [];

  db.update(data => {
    data.orders.forEach(o => {
      if (o.restaurant_id === restaurant_id && o.table_number === tblNum && o.payment_status !== 'paid' && o.status !== 'CANCELLED') {
        o.payment_status = 'paid';
        o.payment_method = 'online';
        if (utr) {
          o.notes = `${o.notes || ''} [Paid via UPI UTR: ${utr}]`.trim();
        }
        o.updated_at = new Date().toISOString();
        updatedOrders.push(o);
      }
    });

    if (data.service_requests) {
      data.service_requests.forEach(r => {
        if (r.restaurant_id === restaurant_id && r.table_number === tblNum && r.request_type === 'bill' && r.status !== 'resolved') {
          r.status = 'resolved';
          r.resolved_at = new Date().toISOString();
        }
      });
    }

    const table = data.tables.find(t => t.restaurant_id === restaurant_id && t.table_number === tblNum);
    if (table) {
      table.status = 'cleaning';
    }
  });

  updatedOrders.forEach(o => {
    broadcastEvent(restaurant_id, 'ORDER_PAYMENT_UPDATED', o);
  });
  broadcastEvent(restaurant_id, 'TABLE_SETTLED', { table_number: tblNum });

  const totalPaid = updatedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Create a persistent table service request so staff and cafe dashboard see the payment alert
  const paymentNotification: TableServiceRequest = {
    id: `req-pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    restaurant_id,
    table_number: tblNum,
    request_type: 'bill',
    note: `💰 ₹${totalPaid} Bill Paid via UPI by Table #${tblNum}! ${utr ? `UTR: ${utr}` : 'Direct UPI App'} (${updatedOrders.length} Order(s))`,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  db.update(data => {
    if (!data.service_requests) data.service_requests = [];
    data.service_requests.unshift(paymentNotification);
  });

  broadcastEvent(restaurant_id, 'TABLE_SERVICE_REQUEST', paymentNotification);
  broadcastEvent(restaurant_id, 'PAYMENT_RECEIVED', {
    table_number: tblNum,
    amount: totalPaid,
    orders: updatedOrders.map(o => o.order_number),
    customer_name: updatedOrders[0]?.customer_name || `Table ${tblNum}`,
    utr: utr || 'UPI Online',
    timestamp: new Date().toISOString()
  });

  res.json({ 
    success: true, 
    count: updatedOrders.length, 
    message: `Table #${tblNum} bill settled successfully via UPI!` 
  });
});


// VALIDATE COUPON
apiRouter.post('/public/coupon/validate', (req: Request, res: Response) => {
  const { restaurant_id, code, subtotal } = req.body;
  if (!restaurant_id || !code || subtotal === undefined) {
    return res.status(400).json({ error: 'Restaurant ID, coupon code and subtotal are required' });
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = db.get('coupons').find(c => c.restaurant_id === restaurant_id && c.code === cleanCode);

  if (!coupon || !coupon.is_active) {
    return res.status(400).json({ error: 'Invalid or expired coupon' });
  }

  const now = new Date().toISOString().split('T')[0];
  if (coupon.start_date > now || coupon.end_date < now) {
    return res.status(400).json({ error: 'Coupon has expired or is not yet active' });
  }

  if (coupon.used_count >= coupon.usage_limit) {
    return res.status(400).json({ error: 'Coupon usage limit has been reached' });
  }

  if (Number(subtotal) < coupon.min_order_amount) {
    return res.status(400).json({ 
      error: `Minimum order amount of ₹${coupon.min_order_amount} required to use this coupon` 
    });
  }

  let discount = 0;
  if (coupon.discount_type === 'fixed') {
    discount = Math.min(coupon.discount_value, Number(subtotal));
  } else {
    discount = (Number(subtotal) * coupon.discount_value) / 100;
    if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }
  }

  res.json({
    success: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      calculated_discount: Math.round(discount * 100) / 100
    }
  });
});

// ====================================================
// 26-STEP PLACE ORDER IMPLEMENTATION (FIX PLACE ORDER BUG)
// ====================================================
apiRouter.post('/public/order', async (req: Request, res: Response) => {
  try {
    const {
      restaurant_id,
      table_number,
      items,
      coupon_code,
      payment_method,
      customer_name,
      customer_phone,
      notes,
      special_instructions
    } = req.body;

    // 1. Basic payload checks
    if (!restaurant_id || table_number === undefined || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Unable to place your order. Missing order details.' });
    }

    // 2. Validate restaurant
    const rest = db.get('restaurants').find(r => r.id === restaurant_id);
    if (!rest || rest.status !== 'active') {
      return res.status(403).json({ error: rest?.ban_reason || 'Restaurant ordering is currently suspended by administration.' });
    }

    if (rest.service_expires_at && new Date() > new Date(rest.service_expires_at)) {
      return res.status(403).json({ error: 'Restaurant plan validity has expired. Please contact restaurant staff.' });
    }

    if (rest.accepting_orders === false) {
      return res.status(400).json({ error: "We're currently not accepting orders." });
    }

    // 3 & 4 & 5. Validate table belongs to restaurant
    const table = db.get('tables').find(t => t.restaurant_id === restaurant_id && t.table_number === Number(table_number));
    if (!table) {
      return res.status(400).json({ error: 'Unable to place your order. Invalid table.' });
    }

    // 6 & 7 & 8 & 9. Validate every menu item & fetch current prices from DB
    const allDbItems = db.get('menu_items');
    let recalculatedSubtotal = 0;
    let maxPrepTime = 10;
    const validatedOrderItems: OrderItem[] = [];

    for (const cartItem of items) {
      const dbItem = allDbItems.find(i => i.id === cartItem.menu_item_id && i.restaurant_id === restaurant_id);
      if (!dbItem) {
        return res.status(400).json({ error: `Item "${cartItem.name || 'selected item'}" is no longer available.` });
      }
      if (!dbItem.is_available) {
        return res.status(400).json({ error: `"${dbItem.name}" is currently out of stock. Please remove it from your cart.` });
      }
      const qty = parseInt(cartItem.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Invalid item quantity.' });
      }

      if (dbItem.prep_time && dbItem.prep_time > maxPrepTime) {
        maxPrepTime = dbItem.prep_time;
      }

      // Base price (favor discount_price if active)
      let unitPrice = dbItem.discount_price !== undefined && dbItem.discount_price > 0 
        ? dbItem.discount_price 
        : dbItem.price;

      // Handle custom size price delta
      if (cartItem.selected_size && dbItem.sizes) {
        const foundSize = dbItem.sizes.find(s => s.name === cartItem.selected_size);
        if (foundSize) {
          unitPrice += foundSize.price_delta;
        }
      }

      // Handle custom add-ons
      const validAddons: { id: string; name: string; price: number }[] = [];
      if (Array.isArray(cartItem.selected_addons) && dbItem.add_ons) {
        for (const addon of cartItem.selected_addons) {
          const dbAddon = dbItem.add_ons.find(a => a.id === addon.id || a.name === addon.name);
          if (dbAddon) {
            unitPrice += dbAddon.price;
            validAddons.push({ id: dbAddon.id, name: dbAddon.name, price: dbAddon.price });
          }
        }
      }

      recalculatedSubtotal += unitPrice * qty;

      // Build customization text representation
      const custParts: string[] = [];
      if (cartItem.selected_size) custParts.push(`Size: ${cartItem.selected_size}`);
      if (validAddons.length > 0) custParts.push(`Add-ons: ${validAddons.map(a => a.name).join(', ')}`);
      if (cartItem.spice_level) custParts.push(`Spice: ${cartItem.spice_level}`);
      if (cartItem.special_instructions) custParts.push(`Note: ${cartItem.special_instructions}`);
      if (cartItem.customization) custParts.push(cartItem.customization);

      validatedOrderItems.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        order_id: '', // set below
        menu_item_id: dbItem.id,
        item_name_snapshot: dbItem.name,
        price_snapshot: unitPrice,
        quantity: qty,
        selected_size: cartItem.selected_size || undefined,
        selected_addons: validAddons.length > 0 ? validAddons : undefined,
        special_instructions: cartItem.special_instructions || undefined,
        customization: custParts.length > 0 ? custParts.join(' | ') : undefined,
        created_at: new Date().toISOString()
      });
    }

    // 10 & 11 & 12. Validate coupon if provided
    let calculatedDiscount = 0;
    let validCoupon: Coupon | undefined;

    if (coupon_code) {
      const cleanCode = coupon_code.trim().toUpperCase();
      validCoupon = db.get('coupons').find(c => c.restaurant_id === restaurant_id && c.code === cleanCode);
      if (validCoupon && validCoupon.is_active) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (validCoupon.start_date <= todayStr && validCoupon.end_date >= todayStr) {
          if (recalculatedSubtotal >= validCoupon.min_order_amount && validCoupon.used_count < validCoupon.usage_limit) {
            if (validCoupon.discount_type === 'fixed') {
              calculatedDiscount = Math.min(validCoupon.discount_value, recalculatedSubtotal);
            } else {
              calculatedDiscount = (recalculatedSubtotal * validCoupon.discount_value) / 100;
              if (validCoupon.max_discount_amount && calculatedDiscount > validCoupon.max_discount_amount) {
                calculatedDiscount = validCoupon.max_discount_amount;
              }
            }
          }
        }
      }
    }

    // 13 & 14. Calculate service charge, tax and final amount
    const taxableAmount = Math.max(0, recalculatedSubtotal - calculatedDiscount);
    const serviceRate = rest.service_charge_rate || 0;
    const calculatedServiceCharge = Math.round((taxableAmount * serviceRate) / 100 * 100) / 100;

    const taxRate = rest.tax_rate || 5.0;
    const calculatedTax = Math.round(((taxableAmount + calculatedServiceCharge) * taxRate) / 100 * 100) / 100;
    const calculatedTotal = Math.round((taxableAmount + calculatedServiceCharge + calculatedTax) * 100) / 100;

    // 15. Validate payment method
    const validPayments = ['online', 'cash_table', 'cash_counter'];
    let chosenPayment = validPayments.includes(payment_method) ? payment_method : 'cash_counter';
    if (rest.pay_counter_only) {
      chosenPayment = 'cash_counter';
    }

    // 16-24. Create order and order_items
    const orderId = `ord-${Date.now()}`;
    const nextNum = db.get('next_order_number') || 1042;

    validatedOrderItems.forEach(item => {
      item.order_id = orderId;
    });

    // Verification code if enabled
    const verificationCode = rest.order_validation_enabled 
      ? Math.floor(1000 + Math.random() * 9000).toString() 
      : undefined;

    const newOrder: Order = {
      id: orderId,
      order_number: nextNum,
      restaurant_id,
      table_id: table.id,
      table_number: table.table_number,
      customer_name: customer_name?.trim() || undefined,
      customer_phone: customer_phone?.trim() || undefined,
      status: 'NEW',
      payment_method: chosenPayment as any,
      payment_status: 'pending', // Starts pending until online gateway verifies or staff marks as paid
      subtotal: Math.round(recalculatedSubtotal * 100) / 100,
      discount: Math.round(calculatedDiscount * 100) / 100,
      service_charge: calculatedServiceCharge,
      tax: calculatedTax,
      total: calculatedTotal,
      coupon_id: validCoupon?.id,
      coupon_code: validCoupon?.code,
      notes: notes?.trim() || undefined,
      special_instructions: special_instructions?.trim() || notes?.trim() || undefined,
      verification_code: verificationCode,
      estimated_prep_time: maxPrepTime + 5,
      items: validatedOrderItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to Database
    db.update(data => {
      data.orders.push(newOrder);
      data.next_order_number = nextNum + 1;

      // Update coupon usage count
      if (validCoupon) {
        const cpn = data.coupons.find(c => c.id === validCoupon!.id);
        if (cpn) cpn.used_count += 1;
      }

      // Update table status to occupied
      const tbl = data.tables.find(t => t.id === table.id);
      if (tbl) tbl.status = 'occupied';

      // Update or create customer
      if (customer_phone?.trim()) {
        const phone = customer_phone.trim();
        let cust = data.customers.find(c => c.restaurant_id === restaurant_id && c.phone === phone);
        if (cust) {
          cust.orders_count += 1;
          cust.total_spent += calculatedTotal;
          cust.last_order_at = new Date().toISOString();
          cust.loyalty_points += Math.floor(calculatedTotal / 10);
          if (customer_name?.trim()) cust.name = customer_name.trim();
        } else {
          data.customers.push({
            id: `cst-${Date.now()}`,
            restaurant_id,
            name: customer_name?.trim() || 'Guest Customer',
            phone,
            orders_count: 1,
            total_spent: calculatedTotal,
            last_order_at: new Date().toISOString(),
            loyalty_points: Math.floor(calculatedTotal / 10),
            created_at: new Date().toISOString()
          });
        }
      }
    });

    // 25. Broadcast live update to Kitchen & Orders screens!
    broadcastEvent(restaurant_id, 'NEW_ORDER', newOrder);

    // 26. Return order
    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    return res.status(500).json({ error: 'Unable to place your order. Please try again.' });
  }
});

// ONLINE PAYMENT CONFIRMATION / SIMULATION ENDPOINT
apiRouter.post('/public/order/:orderId/verify-payment', (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { payment_id, status } = req.body;

  const order = db.get('orders').find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  db.update(data => {
    const ord = data.orders.find(o => o.id === orderId);
    if (ord) {
      ord.payment_status = (status === 'failed' ? 'failed' : 'paid');
      ord.payment_method = 'online';
      ord.updated_at = new Date().toISOString();
    }
  });

  const updatedOrder = db.get('orders').find(o => o.id === orderId);
  broadcastEvent(order.restaurant_id, 'ORDER_PAYMENT_UPDATED', updatedOrder);
  if (updatedOrder && updatedOrder.payment_status === 'paid') {
    const paymentNotification: TableServiceRequest = {
      id: `req-pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      restaurant_id: order.restaurant_id,
      table_number: updatedOrder.table_number,
      request_type: 'bill',
      note: `💰 ₹${updatedOrder.total} Paid via UPI for Order #${updatedOrder.order_number} (Table #${updatedOrder.table_number}). Customer: ${updatedOrder.customer_name || 'Diner'} ${payment_id ? `[UTR: ${payment_id}]` : ''}`,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    db.update(data => {
      if (!data.service_requests) data.service_requests = [];
      data.service_requests.unshift(paymentNotification);
    });

    broadcastEvent(order.restaurant_id, 'TABLE_SERVICE_REQUEST', paymentNotification);
    broadcastEvent(order.restaurant_id, 'PAYMENT_RECEIVED', {
      table_number: updatedOrder.table_number,
      amount: updatedOrder.total,
      orders: [updatedOrder.order_number],
      customer_name: updatedOrder.customer_name || `Table ${updatedOrder.table_number}`,
      utr: payment_id || 'UPI Online',
      timestamp: new Date().toISOString()
    });
  }
  res.json({ success: true, order: updatedOrder });
});

// Image Upload Endpoint (Persists uploaded images to /data/uploads/ and serves via /api/uploads/...)
apiRouter.post('/upload', (req: Request, res: Response) => {
  const { dataUrl, filename } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: 'dataUrl is required' });
  }

  // If already an HTTP/HTTPS URL, return directly
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://') || dataUrl.startsWith('/api/uploads/')) {
    return res.json({ success: true, url: dataUrl });
  }

  try {
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (match) {
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1].replace('+', '');
      const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const safeName = (filename || 'img')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .slice(0, 30);
      const uniqueFileName = `${safeName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(uploadsDir, uniqueFileName);
      fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));

      return res.json({
        success: true,
        url: `/api/uploads/${uniqueFileName}`
      });
    }
  } catch (err: any) {
    console.error('Failed to write uploaded image file:', err);
  }

  // Fallback: return dataUrl if regex failed
  res.json({
    success: true,
    url: dataUrl
  });
});

// SERVER-SIDE GEMINI AI PROXY (Security: Key never exposed to client)
apiRouter.post('/ai/generate-description', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, category, is_veg } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Food item name is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(503).json({ error: 'Gemini API is not configured on the server' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Write an appetizing, mouthwatering restaurant menu description (1-2 sentences, max 35 words) for a ${is_veg ? 'Vegetarian' : 'Non-Vegetarian'} dish named "${name}" in the category "${category || 'Specialty'}". Focus on fresh ingredients, taste notes, and aroma. Return plain text only without quotes or markdown formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });

    const description = response.text ? response.text.trim() : '';
    res.json({ success: true, description });
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate description' });
  }
});
