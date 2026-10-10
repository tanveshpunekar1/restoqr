import { 
  User, Restaurant, MenuItem, Category, RestaurantTable, 
  Order, Coupon, Customer, Subscription, ActivityLog, TableServiceRequest 
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('restoqr_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !window.location.pathname.startsWith('/menu')) {
      localStorage.removeItem('restoqr_token');
      localStorage.removeItem('restoqr_user');
      window.location.href = '/login';
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse<{
      success: boolean;
      token: string;
      user: User;
      restaurant: Restaurant | null;
      redirectUrl: string;
    }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ user: User; restaurant: Restaurant | null }>(res);
  },

  async changePassword(payload: { current_password: string; new_password: string }) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Admin
  async getAdminMetrics() {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{
      totalRestaurants: number;
      activeRestaurants: number;
      pendingRestaurants: number;
      suspendedRestaurants: number;
      todayOrdersCount: number;
      todayRevenue: number;
      pendingPayments: number;
      expiringSubscriptions: number;
      dailyChart: { date: string; orders: number; revenue: number }[];
      recentRestaurants: Restaurant[];
      recentOrders: Order[];
    }>(res);
  },

  async getAdminRestaurants() {
    const res = await fetch(`${API_BASE}/admin/restaurants`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<(Restaurant & { subscription: Subscription | null; owner: any })[]>(res);
  },

  async createRestaurant(payload: any) {
    const res = await fetch(`${API_BASE}/admin/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; restaurant: Restaurant; owner: any }>(res);
  },

  async updateRestaurantStatus(id: string, payload: { status?: string; service_expires_at?: string; duration_days?: number; ban_reason?: string } | string) {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    const res = await fetch(`${API_BASE}/admin/restaurants/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body)
    });
    return handleResponse<{ success: boolean; restaurant: Restaurant }>(res);
  },

  async deleteRestaurant(id: string) {
    const res = await fetch(`${API_BASE}/admin/restaurants/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async getAdminSubscriptions() {
    const res = await fetch(`${API_BASE}/admin/subscriptions`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<(Subscription & { restaurant_name: string })[]>(res);
  },

  async updateSubscription(id: string, payload: any) {
    const res = await fetch(`${API_BASE}/admin/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; subscription: Subscription }>(res);
  },

  async getAdminLogs() {
    const res = await fetch(`${API_BASE}/admin/activity-logs`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<ActivityLog[]>(res);
  },

  // Restaurant Management
  async getRestaurantProfile(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/profile?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/profile`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Restaurant>(res);
  },

  async updateRestaurantProfile(payload: Partial<Restaurant>, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/profile?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/profile`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; restaurant: Restaurant }>(res);
  },

  async getMenu(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/menu?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/menu`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ categories: Category[]; items: MenuItem[] }>(res);
  },

  async createCategory(payload: { name: string; sort_order?: number }, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/categories?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/categories`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; category: Category }>(res);
  },

  async updateCategory(id: string, payload: Partial<Category>, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/categories/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/categories/${id}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; category: Category }>(res);
  },

  async deleteCategory(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/categories/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/categories/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async createMenuItem(payload: any, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/items?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/items`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; item: MenuItem }>(res);
  },

  async updateMenuItem(id: string, payload: any, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/items/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/items/${id}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; item: MenuItem }>(res);
  },

  async duplicateMenuItem(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/items/${id}/duplicate?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/items/${id}/duplicate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean; item: MenuItem }>(res);
  },

  async deleteMenuItem(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/items/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/items/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async getTables(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/tables?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/tables`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<RestaurantTable[]>(res);
  },

  async createTable(payload: { table_number: number; capacity?: number; status?: string }, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/tables?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/tables`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; table: RestaurantTable }>(res);
  },

  async updateTable(id: string, payload: Partial<RestaurantTable>, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/tables/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/tables/${id}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; table: RestaurantTable }>(res);
  },

  async deleteTable(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/tables/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/tables/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async getCoupons(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/coupons?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/coupons`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Coupon[]>(res);
  },

  async createCoupon(payload: any, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/coupons?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/coupons`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; coupon: Coupon }>(res);
  },

  async updateCoupon(id: string, payload: any, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/coupons/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/coupons/${id}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; coupon: Coupon }>(res);
  },

  async deleteCoupon(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/coupons/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/coupons/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async getOrders(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Order[]>(res);
  },

  async updateOrderStatus(id: string, status: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders/${id}/status?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders/${id}/status`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status })
    });
    return handleResponse<{ success: boolean; order: Order }>(res);
  },

  async markOrderPaid(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders/${id}/payment?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders/${id}/payment`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ payment_status: 'paid' })
    });
    return handleResponse<{ success: boolean; order: Order }>(res);
  },

  async updateOrderPayment(id: string, payment_status: string, payment_method?: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders/${id}/payment?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders/${id}/payment`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ payment_status, payment_method })
    });
    return handleResponse<{ success: boolean; order: Order }>(res);
  },

  async completeOrderWithCash(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders/${id}/complete-cash?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders/${id}/complete-cash`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean; message: string; order: Order }>(res);
  },

  async deleteOrder(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async dailyClearOrders(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders/daily-clear?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders/daily-clear`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean; cleared_count: number; message: string }>(res);
  },

  async getOrderHistory(params?: {
    phone?: string;
    search?: string;
    status?: string;
    payment_method?: string;
    date?: string;
    limit?: number;
  }, adminRestId?: string) {
    const query = new URLSearchParams();
    if (adminRestId) query.set('adminRestaurantId', adminRestId);
    if (params?.phone) query.set('phone', params.phone);
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.payment_method) query.set('payment_method', params.payment_method);
    if (params?.date) query.set('date', params.date);
    if (params?.limit) query.set('limit', params.limit.toString());

    const url = `${API_BASE}/restaurant/orders/history?${query.toString()}`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean; total_count: number; orders: Order[] }>(res);
  },

  async getCustomers(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/customers?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/customers`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<Customer[]>(res);
  },

  async getAnalytics(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/analytics?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/analytics`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<any>(res);
  },

  async getStaff(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/staff?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/staff`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<any[]>(res);
  },

  async addStaff(payload: any, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/staff?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/staff`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<any>(res);
  },

  async deleteStaff(id: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/staff/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/staff/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<any>(res);
  },

  // Table Service Requests / Waiter Alerts
  async getServiceRequests(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/service-requests?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/service-requests`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<TableServiceRequest[]>(res);
  },

  async updateServiceRequest(id: string, status: 'attended' | 'resolved' | 'pending', adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/service-requests/${id}?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/service-requests/${id}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status })
    });
    return handleResponse<{ success: boolean; request: TableServiceRequest }>(res);
  },

  async clearResolvedServiceRequests(adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/service-requests/clear-resolved?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/service-requests/clear-resolved`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean; cleared: number }>(res);
  },

  // Waiter POS / Punch Order for Table
  async waiterPunchOrder(payload: { 
    table_number: number; 
    items: any[]; 
    notes?: string; 
    payment_method?: string; 
    customer_name?: string; 
    customer_phone?: string; 
    special_instructions?: string;
    order_type?: string;
  }, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders/punch?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders/punch`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; order: Order }>(res);
  },

  // Waiter Table Bill Settle
  async settleTableBill(tableNum: number, paymentMethod?: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/tables/${tableNum}/settle-bill?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/tables/${tableNum}/settle-bill`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ payment_method: paymentMethod })
    });
    return handleResponse<{ success: boolean; count: number; orders: Order[] }>(res);
  },

  // Public Customer Menu & Order Endpoints
  async getPublicMenu(slug: string) {
    const res = await fetch(`${API_BASE}/public/menu/${slug}`);
    return handleResponse<{
      restaurant: Restaurant;
      categories: Category[];
      items: MenuItem[];
      available_tables: { table_number: number }[];
    }>(res);
  },

  async getPublicTableMenu(slug: string, tableNum: number | string) {
    const res = await fetch(`${API_BASE}/public/menu/${slug}/table/${tableNum}`);
    return handleResponse<{
      restaurant: Restaurant;
      table: RestaurantTable;
      categories: Category[];
      items: MenuItem[];
    }>(res);
  },

  async getPublicTableOrders(slug: string, tableNum: number | string) {
    const res = await fetch(`${API_BASE}/public/table/${slug}/${tableNum}/orders`);
    return handleResponse<{
      table_number: number;
      table_id: string;
      running_total: number;
      total_items: number;
      orders: Order[];
    }>(res);
  },

  async getRecentOrders(payload: { restaurant_id: string; order_ids?: string[]; table_number?: number }) {
    const res = await fetch(`${API_BASE}/public/orders/recent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<{
      success: boolean;
      orders: Order[];
      running_total: number;
      active_count: number;
    }>(res);
  },

  async customerPhoneLogin(payload: { phone: string; name?: string; restaurant_id?: string }) {
    const res = await fetch(`${API_BASE}/public/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; customer: Customer; orders: Order[] }>(res);
  },

  async getCustomerPastOrders(phone: string, restaurantId?: string) {
    const query = new URLSearchParams({ phone });
    if (restaurantId) query.set('restaurant_id', restaurantId);
    const res = await fetch(`${API_BASE}/public/customer/orders?${query.toString()}`);
    return handleResponse<{ success: boolean; customer: Customer | null; orders: Order[] }>(res);
  },

  async validateCoupon(restaurantId: string, code: string, subtotal: number) {
    const res = await fetch(`${API_BASE}/public/coupon/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurantId, code, subtotal })
    });
    return handleResponse<{
      success: boolean;
      coupon: {
        id: string;
        code: string;
        discount_type: string;
        discount_value: number;
        calculated_discount: number;
      };
    }>(res);
  },

  // CRITICAL 26-STEP PLACE ORDER
  async placeOrder(payload: {
    restaurant_id: string;
    table_number: number;
    items: {
      menu_item_id: string;
      name?: string;
      quantity: number;
      selected_size?: string;
      selected_addons?: { id: string; name: string; price: number }[];
      spice_level?: string;
      special_instructions?: string;
      customization?: string;
    }[];
    coupon_code?: string;
    payment_method: string;
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
    special_instructions?: string;
  }) {
    const res = await fetch(`${API_BASE}/public/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; message: string; order: Order }>(res);
  },

  async verifyOnlinePayment(orderId: string, status: 'paid' | 'failed' = 'paid') {
    const res = await fetch(`${API_BASE}/public/order/${orderId}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return handleResponse<{ success: boolean; order: Order }>(res);
  },

  async verifyPayment(orderId: string, status: 'paid' | 'failed' = 'paid') {
    return this.verifyOnlinePayment(orderId, status);
  },

  async callWaiter(payload: { restaurant_id: string; table_number: number; request_type?: string; note?: string }) {
    const res = await fetch(`${API_BASE}/public/table/service-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async verifyOrderCode(orderId: string, code: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/orders/${orderId}/verify-code?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/orders/${orderId}/verify-code`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ code })
    });
    return handleResponse<{ success: boolean; order: Order }>(res);
  },

  async getTableRunningBill(tableId: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/tables/${tableId}/running-bill?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/tables/${tableId}/running-bill`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{
      table_number: number;
      table_id: string;
      status: string;
      active_orders: Order[];
      running_total: number;
      total_items: number;
    }>(res);
  },

  async settleTable(tableId: string, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/tables/${tableId}/settle?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/tables/${tableId}/settle`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async updateRestaurantOperations(payload: {
    accepting_orders?: boolean;
    order_validation_enabled?: boolean;
    service_charge_rate?: number;
    pay_counter_only?: boolean;
  }, adminRestId?: string) {
    const url = adminRestId 
      ? `${API_BASE}/restaurant/settings/operations?adminRestaurantId=${adminRestId}` 
      : `${API_BASE}/restaurant/settings/operations`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; restaurant: Restaurant }>(res);
  },

  async uploadImage(dataUrl: string, filename?: string) {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, filename })
    });
    return handleResponse<{ success: boolean; url: string }>(res);
  },

  async getTableServiceRequest(restaurantId: string, tableNumber: number) {
    const res = await fetch(`${API_BASE}/public/table/service-request/${restaurantId}/${tableNumber}`);
    return handleResponse<{ active_request: TableServiceRequest | null; latest_requests: TableServiceRequest[] }>(res);
  },

  async payTableBillOnline(payload: { restaurant_id: string; table_number: number; utr?: string }) {
    const res = await fetch(`${API_BASE}/public/table/pay-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; count: number; message: string }>(res);
  },

  async getSupabaseStatus() {
    const res = await fetch(`${API_BASE}/supabase/status`);
    return handleResponse<{
      configured: boolean;
      connected: boolean;
      tables: Record<string, boolean>;
      allReady: boolean;
      cloudStoreReady: boolean;
      message: string;
      projectUrl: string;
      lastSyncTime: string | null;
      lastSyncStatus: string;
      restaurantCount: number;
      menuItemCount: number;
    }>(res);
  },

  async syncSupabase() {
    const res = await fetch(`${API_BASE}/supabase/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    return handleResponse<{ success: boolean; message: string; synced: Record<string, number> }>(res);
  },

  async restoreSupabase() {
    const res = await fetch(`${API_BASE}/supabase/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    return handleResponse<{ success: boolean; message: string; restoredCount: number }>(res);
  },

  async importBackup(backupData: any) {
    const res = await fetch(`${API_BASE}/admin/backup/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ backupData })
    });
    return handleResponse<{ success: boolean; message: string; restaurantCount: number }>(res);
  }
};

