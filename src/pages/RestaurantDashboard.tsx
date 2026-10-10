'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  Restaurant, Category, MenuItem, RestaurantTable, 
  Order, Coupon, Customer, TableServiceRequest 
} from '../types';
import { useToast } from '../components/Toast';
import { TableQRModal } from '../components/TableQRModal';
import { PosTerminal } from '../components/PosTerminal';
import { PosOrderList } from '../components/PosOrderList';
import { 
  LayoutDashboard, ShoppingBag, ChefHat, Grid3X3, Utensils, 
  Users, Tag, Award, CreditCard, BarChart3, UserPlus, Settings, 
  LogOut, Plus, Search, Trash2, Edit3, Copy, Check, ExternalLink, 
  Printer, DollarSign, Clock, AlertCircle, RefreshCw, Flame, CheckCircle2,
  Upload, QrCode, History, Phone, Receipt, Archive, Filter, Calendar, Sparkles, CheckSquare,
  Lock, Eye, EyeOff, KeyRound, BellRing, Smartphone, CheckCheck, X, ArrowRight,
  Menu, Coffee, ShoppingCart
} from 'lucide-react';

interface RestaurantDashboardProps {
  onNavigate: (path: string) => void;
  initialTab?: string;
}

export const RestaurantDashboard: React.FC<RestaurantDashboardProps> = ({ 
  onNavigate, 
  initialTab = 'pos' 
}) => {
  const { user, restaurant, logout, setRestaurant } = useAuth();
  const { showToast } = useToast();

  const isKitchenOnly = user?.role === 'kitchen_staff';
  const isWaiterOnly = user?.role === 'waiter';

  const defaultTab = isKitchenOnly ? 'kitchen' : isWaiterOnly ? 'orders' : initialTab;
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Restaurant | null>(restaurant);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Table Service Requests / Customer Calls State
  const [serviceRequests, setServiceRequests] = useState<TableServiceRequest[]>([]);
  const [callsFilter, setCallsFilter] = useState<'all' | 'water' | 'bill' | 'waiter' | 'resolved'>('all');
  const [selectedTableBillModal, setSelectedTableBillModal] = useState<any | null>(null);
  const [loadingTableBill, setLoadingTableBill] = useState(false);

  // Order History & Daily Clear States
  const [orderHistoryPhone, setOrderHistoryPhone] = useState('');
  const [orderHistorySearch, setOrderHistorySearch] = useState('');
  const [orderHistoryDate, setOrderHistoryDate] = useState('all');
  const [orderHistoryPayment, setOrderHistoryPayment] = useState('all');
  const [orderHistoryStatus, setOrderHistoryStatus] = useState('all');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [ordersViewMode, setOrdersViewMode] = useState<'active' | 'all' | 'cleared'>('active');
  const [kitchenViewMode, setKitchenViewMode] = useState<'active' | 'all'>('active');
  const [dailyClearing, setDailyClearing] = useState(false);
  const [payCounterOnlySetting, setPayCounterOnlySetting] = useState(false);

  // QR Modal States
  const [qrModalTable, setQrModalTable] = useState<RestaurantTable | null>(null);
  const [isAllQrModal, setIsAllQrModal] = useState(false);

  // Modals & Forms
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    price: 199,
    discount_price: '',
    category_id: '',
    image: '',
    weight: '300g',
    is_veg: true,
    spicy_level: 0,
    prep_time: 15,
    is_available: true,
    is_bestseller: false
  });
  const [generatingAiDesc, setGeneratingAiDesc] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [showTableModal, setShowTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    discount_type: 'fixed',
    discount_value: 50,
    min_order_amount: 300,
    max_discount_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
    usage_limit: 1000,
    is_active: true
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'kitchen_staff'
  });

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Staff POS Order Punching State
  const [showPosModal, setShowPosModal] = useState(false);
  const [posTableNumber, setPosTableNumber] = useState<number>(1);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('all');
  const [posCart, setPosCart] = useState<{
    menu_item_id: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    is_veg: boolean;
  }[]>([]);
  const [posOrderNotes, setPosOrderNotes] = useState('');
  const [submittingPosOrder, setSubmittingPosOrder] = useState(false);
  const [clearingCalls, setClearingCalls] = useState(false);

  // Settings Form State
  const [settingsFormData, setSettingsFormData] = useState({
    name: '',
    logo: '',
    cover_image: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    description: '',
    opening_time: '',
    closing_time: '',
    cuisine_type: '',
    wifi_info: '',
    tax_rate: 5.0,
    upi_id: '',
    upi_payee_name: ''
  });

  // Admin Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Audio Chime synthesizer for staff alerts
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch {
      // Audio fallback
    }
  };

  // Load All Data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [prof, menuData, tbls, ords, cpns, custs, anly, stff, reqs] = await Promise.all([
        api.getRestaurantProfile(),
        api.getMenu(),
        api.getTables(),
        api.getOrders(),
        api.getCoupons(),
        api.getCustomers(),
        api.getAnalytics(),
        user?.role === 'restaurant_owner' ? api.getStaff() : Promise.resolve([]),
        api.getServiceRequests()
      ]);

      setProfile(prof);
      setRestaurant(prof);
      setCategories(menuData.categories);
      setItems(menuData.items);
      setTables(tbls);
      setOrders(ords);
      setCoupons(cpns);
      setCustomers(custs);
      setAnalytics(anly);
      setStaffList(stff);
      setServiceRequests(reqs);

      setSettingsFormData({
        name: prof.name || '',
        logo: prof.logo || '',
        cover_image: prof.cover_image || '',
        phone: prof.phone || '',
        address: prof.address || '',
        city: prof.city || '',
        state: prof.state || '',
        pincode: prof.pincode || '',
        description: prof.description || '',
        opening_time: prof.opening_time || '10:00 AM',
        closing_time: prof.closing_time || '11:00 PM',
        cuisine_type: prof.cuisine_type || '',
        wifi_info: prof.wifi_info || '',
        tax_rate: prof.tax_rate ?? 5.0,
        upi_id: prof.upi_id || '',
        upi_payee_name: prof.upi_payee_name || ''
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to load restaurant data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const restId = user?.restaurant_id || profile?.id || 'rest-urban-bites-1';

    // Setup Live SSE stream for real-time kitchen & order sync
    const eventSource = new EventSource(`/api/realtime/events?restaurantId=${restId}`);
    
    eventSource.addEventListener('NEW_ORDER', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        showToast(`🔔 New Order #${payload.data.order_number} for Table ${payload.data.table_number}!`, 'info');
        loadDashboardData();
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    eventSource.addEventListener('ORDER_STATUS_UPDATED', () => {
      loadDashboardData();
    });

    eventSource.addEventListener('TABLE_SERVICE_REQUEST', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        const reqData: TableServiceRequest = payload.data || payload;
        setServiceRequests(prev => [reqData, ...prev.filter(r => r.id !== reqData.id)]);
        playAlertSound();
        const reason = reqData.request_type === 'water' 
          ? '💧 Water' 
          : reqData.request_type === 'bill' 
          ? '🧾 Final Bill' 
          : '🛎️ Staff Assistance';
        showToast(`🛎️ Table #${reqData.table_number} called for ${reason}!`, 'info');
      } catch (err) {
        console.error('SSE service request error:', err);
      }
    });

    eventSource.addEventListener('SERVICE_REQUEST_UPDATED', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        const reqData: TableServiceRequest = payload.data || payload;
        setServiceRequests(prev => prev.map(r => r.id === reqData.id ? reqData : r));
      } catch (err) {
        console.error('SSE service request update error:', err);
      }
    });

    eventSource.addEventListener('TABLE_SETTLED', () => {
      loadDashboardData();
    });

    // Resilient 3.5s auto-poll to guarantee alerts always arrive even if SSE disconnects
    const pollInterval = setInterval(async () => {
      try {
        const latestReqs = await api.getServiceRequests();
        if (Array.isArray(latestReqs)) {
          setServiceRequests(prev => {
            const prevPendingIds = new Set(prev.filter(r => r.status === 'pending').map(r => r.id));
            const hasNewPending = latestReqs.some(r => r.status === 'pending' && !prevPendingIds.has(r.id));
            if (hasNewPending) {
              playAlertSound();
            }
            return latestReqs;
          });
        }
      } catch {
        // quiet poll fallback
      }
    }, 3500);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, [user?.restaurant_id, profile?.id]);

  // Update Service Request (Attend or Resolve)
  const handleUpdateServiceRequestStatus = async (id: string, status: 'attended' | 'resolved') => {
    try {
      await api.updateServiceRequest(id, status);
      setServiceRequests(prev => prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status,
            attended_at: status === 'attended' ? new Date().toISOString() : r.attended_at,
            attended_by: status === 'attended' ? (user?.name || 'Staff') : r.attended_by,
            resolved_at: status === 'resolved' ? new Date().toISOString() : r.resolved_at
          };
        }
        return r;
      }));
      showToast(status === 'attended' ? 'Marked as Attending!' : 'Call marked as Complete / Resolved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update request', 'error');
    }
  };

  // Staff POS / Order Taking Helpers
  const handleAddToPosCart = (item: MenuItem) => {
    const price = (item.discount_price && item.discount_price > 0) ? item.discount_price : item.price;
    setPosCart(prev => {
      const existing = prev.find(p => p.menu_item_id === item.id);
      if (existing) {
        return prev.map(p => p.menu_item_id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price,
          quantity: 1,
          is_veg: item.is_veg
        }
      ];
    });
  };

  const handleUpdatePosQty = (itemId: string, delta: number) => {
    setPosCart(prev => {
      return prev.map(p => {
        if (p.menu_item_id === itemId) {
          const newQty = p.quantity + delta;
          return newQty > 0 ? { ...p, quantity: newQty } : null;
        }
        return p;
      }).filter(Boolean) as any[];
    });
  };

  const handleSubmitStaffOrder = async () => {
    if (!posTableNumber) {
      showToast('Please select a table number', 'error');
      return;
    }
    if (posCart.length === 0) {
      showToast('Please add at least one food item to order', 'error');
      return;
    }
    try {
      setSubmittingPosOrder(true);
      const itemsPayload = posCart.map(c => ({
        menu_item_id: c.menu_item_id,
        item_name_snapshot: c.name,
        price_snapshot: c.price,
        quantity: c.quantity,
        special_instructions: c.notes || undefined
      }));

      const res = await api.waiterPunchOrder({
        table_number: posTableNumber,
        items: itemsPayload,
        notes: posOrderNotes.trim() || undefined,
        customer_name: posCustomerName.trim() || undefined,
        customer_phone: posCustomerPhone.trim() || undefined,
        payment_method: 'cash_table'
      } as any);

      showToast(`🎉 Order #${res.order.order_number} punched for Table #${posTableNumber}! Sent to kitchen KOT.`, 'success');
      setShowPosModal(false);
      setPosCart([]);
      setPosOrderNotes('');
      setPosCustomerName('');
      setPosCustomerPhone('');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit staff order', 'error');
    } finally {
      setSubmittingPosOrder(false);
    }
  };

  const openPosForTable = (tableNumber: number) => {
    setPosTableNumber(tableNumber);
    setActiveTab('pos');
    setMobileMenuOpen(false);
  };

  const handleClearResolvedCalls = async () => {
    try {
      setClearingCalls(true);
      const res = await api.clearResolvedServiceRequests();
      setServiceRequests(prev => prev.filter(r => r.status !== 'resolved'));
      showToast(`Cleared ${res.cleared || 0} completed calls for today!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to clear resolved calls', 'error');
    } finally {
      setClearingCalls(false);
    }
  };

  // Open Running Bill for Table from Call / Table list
  const handleOpenTableBill = async (tableId: string, tableNumber: number) => {
    try {
      setLoadingTableBill(true);
      const bill = await api.getTableRunningBill(tableId);
      setSelectedTableBillModal(bill);
    } catch (err: any) {
      showToast(err.message || 'Unable to retrieve table bill', 'error');
    } finally {
      setLoadingTableBill(false);
    }
  };

  // Order Actions
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.updateOrderStatus(orderId, status);
      showToast(`Order status updated to ${status}`, 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status', 'error');
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    try {
      await api.markOrderPaid(orderId);
      showToast('Payment marked as PAID', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to mark payment', 'error');
    }
  };

  const handleCompleteOrderCash = async (order: Order) => {
    try {
      await api.completeOrderWithCash(order.id);
      showToast(`Table #${order.table_number} Order #${order.order_number} COMPLETED with CASH!`, 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete order with cash', 'error');
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`Are you sure you want to delete Order #${order.order_number} (Table #${order.table_number})?`)) {
      return;
    }
    try {
      setOrders(prev => prev.filter(o => o.id !== order.id));
      await api.deleteOrder(order.id);
      showToast(`Order #${order.order_number} deleted successfully!`, 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete order', 'error');
      loadDashboardData();
    }
  };

  const handleDailyClear = async () => {
    const completedOrders = orders.filter(o => ['COMPLETED', 'SERVED'].includes(o.status) && !o.is_cleared_from_active);
    if (completedOrders.length === 0) {
      showToast('No completed orders to clear right now.', 'info');
      return;
    }
    if (!confirm(`Clear ${completedOrders.length} completed order(s) for the day? Active kitchen & live order screens will be refreshed clean. All order records remain permanently saved in Order History.`)) {
      return;
    }
    try {
      setDailyClearing(true);
      const res = await api.dailyClearOrders();
      showToast(res.message, 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to perform daily clear', 'error');
    } finally {
      setDailyClearing(false);
    }
  };

  const handleTogglePayCounterOnly = async (enabled: boolean) => {
    try {
      setPayCounterOnlySetting(enabled);
      await api.updateRestaurantOperations({ pay_counter_only: enabled });
      showToast(enabled ? 'Pay at Counter ONLY mode enabled for customers' : 'All payment modes restored', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment settings', 'error');
    }
  };

  // Menu Item Operations
  const handleSaveItem = async () => {
    if (!itemFormData.name || !itemFormData.category_id || !itemFormData.price) {
      showToast('Please fill in name, price, and category', 'error');
      return;
    }
    try {
      if (editingItem) {
        await api.updateMenuItem(editingItem.id, itemFormData);
        showToast('Menu item updated successfully', 'success');
      } else {
        await api.createMenuItem(itemFormData);
        showToast('New menu item added', 'success');
      }
      setShowItemModal(false);
      setEditingItem(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save menu item', 'error');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.deleteMenuItem(itemId);
      showToast('Menu item deleted', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete item', 'error');
    }
  };

  const handleDuplicateItem = async (itemId: string) => {
    try {
      await api.duplicateMenuItem(itemId);
      showToast('Menu item duplicated', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to duplicate item', 'error');
    }
  };

  const handleGenerateAiDescription = async () => {
    if (!itemFormData.name.trim()) {
      showToast('Please enter the food item name first', 'info');
      return;
    }
    const cat = categories.find(c => c.id === itemFormData.category_id);
    try {
      setGeneratingAiDesc(true);
      const token = localStorage.getItem('restoqr_token') || localStorage.getItem('token');
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: itemFormData.name.trim(),
          category: cat?.name || '',
          is_veg: itemFormData.is_veg
        })
      });
      const data = await res.json();
      if (data.description) {
        setItemFormData(prev => ({ ...prev, description: data.description }));
        showToast('Chef description generated with Gemini AI!', 'success');
      } else {
        showToast(data.error || 'Could not generate description', 'error');
      }
    } catch {
      showToast('AI generation failed', 'error');
    } finally {
      setGeneratingAiDesc(false);
    }
  };

  // Category Operations
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({ name: newCatName.trim(), sort_order: categories.length + 1 });
      showToast('Category created', 'success');
      setNewCatName('');
      setShowCatModal(false);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create category', 'error');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      setCategories(prev => prev.filter(c => c.id !== catId));
      await api.deleteCategory(catId);
      showToast('Category deleted successfully', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
      loadDashboardData();
    }
  };

  // Table Operations
  const handleCreateTable = async () => {
    const num = parseInt(newTableNumber, 10);
    if (isNaN(num)) {
      showToast('Please enter a valid table number', 'error');
      return;
    }
    try {
      await api.createTable({ table_number: num, capacity: parseInt(newTableCapacity, 10) || 4 });
      showToast(`Table ${num} added`, 'success');
      setNewTableNumber('');
      setShowTableModal(false);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add table', 'error');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    try {
      setTables(prev => prev.filter(t => t.id !== tableId));
      await api.deleteTable(tableId);
      showToast('Table deleted successfully', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete table', 'error');
      loadDashboardData();
    }
  };

  // Coupon Operations
  const handleSaveCoupon = async () => {
    if (!couponFormData.code || !couponFormData.discount_value) {
      showToast('Please enter code and discount value', 'error');
      return;
    }
    try {
      if (editingCoupon) {
        await api.updateCoupon(editingCoupon.id, couponFormData);
        showToast('Coupon updated', 'success');
      } else {
        await api.createCoupon(couponFormData);
        showToast('Coupon created', 'success');
      }
      setShowCouponModal(false);
      setEditingCoupon(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save coupon', 'error');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      // Optimistic removal from UI state immediately
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      await api.deleteCoupon(couponId);
      showToast('Coupon deleted successfully', 'success');
      const updated = await api.getCoupons();
      setCoupons(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete coupon', 'error');
      const updated = await api.getCoupons();
      setCoupons(updated);
    }
  };

  // Staff Operations
  const handleCreateStaff = async () => {
    if (!staffFormData.name || !staffFormData.email || !staffFormData.password) {
      showToast('Please fill in all staff details', 'error');
      return;
    }
    try {
      await api.addStaff(staffFormData);
      showToast('Staff member added', 'success');
      setShowStaffModal(false);
      setStaffFormData({ name: '', email: '', password: '', role: 'kitchen_staff' });
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add staff', 'error');
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      setStaffList(prev => prev.filter(s => s.id !== staffId));
      await api.deleteStaff(staffId);
      showToast('Staff member removed successfully', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove staff', 'error');
      loadDashboardData();
    }
  };

  // Admin Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Please fill in both current and new password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }
    try {
      setChangingPassword(true);
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password. Verify your current password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateRestaurantProfile(settingsFormData);
      showToast('Restaurant profile updated! Live menu updated.', 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    }
  };

  // Image Upload handler (Base64 file reader)
  const handleImageUpload = (field: 'logo' | 'cover_image' | 'item_image', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (field === 'item_image') {
        setItemFormData(prev => ({ ...prev, image: dataUrl }));
      } else {
        setSettingsFormData(prev => ({ ...prev, [field]: dataUrl }));
      }
      showToast('Image uploaded successfully', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Quick stats
  const todayOrders = orders.filter(o => o.created_at.startsWith(new Date().toISOString().split('T')[0]));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.total : 0), 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'NEW').length;
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;
  const pendingCallsCount = serviceRequests.filter(r => r.status !== 'resolved').length;
  const waterCallsCount = serviceRequests.filter(r => r.status !== 'resolved' && r.request_type === 'water').length;
  const billCallsCount = serviceRequests.filter(r => r.status !== 'resolved' && r.request_type === 'bill').length;

  return (
    <div className="h-screen bg-[#f8f9fa] text-slate-800 flex flex-col md:flex-row overflow-hidden">
      {/* MOBILE TOP BAR (For Phone / Small Screens) */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5 text-[#ff4d2e]" />
          </button>
          <div className="flex items-center gap-2 truncate">
            <img
              src={profile?.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100'}
              alt={profile?.name}
              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
            />
            <div className="truncate">
              <div className="font-extrabold text-xs text-slate-900 truncate max-w-[130px]">{profile?.name}</div>
              <div className="text-[9px] uppercase font-bold text-[#ff4d2e]">
                {user?.role.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('pos');
              setMobileMenuOpen(false);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-black flex items-center gap-1 shadow-md shadow-[#ff4d2e]/25 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>POS</span>
          </button>

          <button
            onClick={() => setActiveTab('table-calls')}
            className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"
            title="Table Calls & Alerts"
          >
            <BellRing className={`w-4 h-4 ${pendingCallsCount > 0 ? 'text-[#ff4d2e] animate-bounce' : ''}`} />
            {pendingCallsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff4d2e] text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                {pendingCallsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-OUT NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-white border-r border-slate-200 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <img
                  src={profile?.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100'}
                  alt={profile?.name}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                />
                <div className="truncate">
                  <div className="font-extrabold text-sm text-slate-900 truncate">{profile?.name}</div>
                  <div className="text-[10px] uppercase font-bold text-[#ff4d2e] tracking-wider">
                    {user?.role.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Take Order Button in Drawer */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveTab('pos');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-extrabold text-xs shadow-md shadow-[#ff4d2e]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>⚡ TAKE ORDER (POS)</span>
              </button>
            </div>

            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              <button
                onClick={() => { setActiveTab('pos'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'pos' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>POS Terminal</span>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                  activeTab === 'pos' ? 'bg-white/20 text-white' : 'bg-[#ff4d2e]/10 text-[#ff4d2e]'
                }`}>
                  Live
                </span>
              </button>

              {!isKitchenOnly && (
                <button
                  onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                    activeTab === 'orders' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>App Orders</span>
                  {pendingOrdersCount > 0 && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#ff4d2e] text-white font-bold animate-pulse">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>
              )}

              {!isKitchenOnly && !isWaiterOnly && (
                <button
                  onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                    activeTab === 'dashboard' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard Overview</span>
                </button>
              )}

              <button
                onClick={() => { setActiveTab('kitchen'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  activeTab === 'kitchen' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span>Kitchen Display (KDS)</span>
                {preparingCount > 0 && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                    {preparingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('table-calls'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  activeTab === 'table-calls' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BellRing className={`w-4 h-4 ${pendingCallsCount > 0 ? 'text-[#ff4d2e] animate-bounce' : ''}`} />
                <span>Table Calls & Alerts</span>
                {pendingCallsCount > 0 && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#ff4d2e] text-white font-extrabold animate-pulse">
                    {pendingCallsCount}
                  </span>
                )}
              </button>

              {!isKitchenOnly && (
                <button
                  onClick={() => { setActiveTab('tables'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                    activeTab === 'tables' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>Tables & QR Codes</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {tables.length}
                  </span>
                </button>
              )}

              <button
                onClick={() => { setActiveTab('order-history'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  activeTab === 'order-history' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Order History</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {orders.length}
                </span>
              </button>

              {!isKitchenOnly && !isWaiterOnly && (
                <>
                  <button
                    onClick={() => { setActiveTab('menu'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                      activeTab === 'menu' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Menu Items</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {items.length}
                    </span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('coupons'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                      activeTab === 'coupons' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Tag className="w-4 h-4" />
                    <span>Coupons</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('customers'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                      activeTab === 'customers' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Customers</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                      activeTab === 'analytics' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </button>

                  {user?.role === 'restaurant_owner' && (
                    <button
                      onClick={() => { setActiveTab('staff'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                        activeTab === 'staff' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Staff & Roles</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                      activeTab === 'settings' ? 'bg-[#ff4d2e] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings & UPI</span>
                  </button>

                  {profile?.slug && (
                    <a
                      href={`/menu/${profile.slug}/table/1`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-[#ff4d2e] bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Preview Customer Menu</span>
                    </a>
                  )}
                </>
              )}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-slate-100 bg-white">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200/90 flex-col shrink-0 shadow-xs h-screen sticky top-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <img
              src={profile?.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100'}
              alt={profile?.name}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
            />
            <div className="truncate">
              <div className="font-extrabold text-sm text-slate-900 tracking-tight truncate">{profile?.name}</div>
              <div className="text-[10px] uppercase font-bold text-[#ff4d2e] tracking-wider">
                {user?.role.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Take Order CTA */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => {
              setPosTableNumber(tables[0]?.table_number || 1);
              setActiveTab('pos');
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-black text-xs shadow-md shadow-[#ff4d2e]/25 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>⚡ TAKE ORDER (POS)</span>
          </button>
        </div>

        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'pos' 
                ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS Terminal</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
              activeTab === 'pos' ? 'bg-white/20 text-white' : 'bg-[#ff4d2e]/10 text-[#ff4d2e]'
            }`}>
              Live
            </span>
          </button>

          {!isKitchenOnly && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'orders' 
                  ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>App Orders</span>
              {pendingOrdersCount > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#ff4d2e] text-white font-bold animate-pulse">
                  {pendingOrdersCount}
                </span>
              )}
            </button>
          )}

          {!isKitchenOnly && !isWaiterOnly && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('kitchen')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'kitchen' 
                ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Kitchen Display (KDS)</span>
            {preparingCount > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                {preparingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('table-calls')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'table-calls' 
                ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BellRing className={`w-4 h-4 ${pendingCallsCount > 0 ? 'text-[#ff4d2e] animate-bounce' : ''}`} />
            <span>Table Calls & Alerts</span>
            {pendingCallsCount > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#ff4d2e] text-white font-extrabold animate-pulse">
                {pendingCallsCount}
              </span>
            )}
          </button>

          {!isKitchenOnly && (
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'tables' 
                  ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span>Tables & QR Codes</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {tables.length}
              </span>
            </button>
          )}

          <button
            onClick={() => onNavigate('/restaurant/floor')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 border border-amber-200 transition-all"
            title="Open Mobile Staff Floor Portal"
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile Staff Floor</span>
          </button>

          <button
            onClick={() => setActiveTab('order-history')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'order-history' 
                ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Order History</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {orders.length}
            </span>
          </button>

          {!isKitchenOnly && !isWaiterOnly && (
            <>
              <button
                onClick={() => setActiveTab('menu')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === 'menu' 
                    ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>Menu Items</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {items.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('coupons')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === 'coupons' 
                    ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>Coupons</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {coupons.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === 'customers' 
                    ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Customers & Loyalty</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === 'analytics' 
                    ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>

              {user?.role === 'restaurant_owner' && (
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    activeTab === 'staff' 
                      ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Staff & Roles</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === 'settings' 
                    ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25 font-bold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Restaurant Profile</span>
              </button>

              {profile?.slug && (
                <a
                  href={`/menu/${profile.slug}/table/1`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-[#ff4d2e] hover:text-[#e03d1e] bg-orange-50/70 hover:bg-orange-100/70 border border-orange-200/80 transition-all group"
                  title="Preview Live Customer Digital Menu"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span className="truncate">Preview Customer Menu</span>
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-[#ff4d2e] border border-orange-200">
                    Live
                  </span>
                </a>
              )}
            </>
          )}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#ff4d2e]/10 text-[#ff4d2e] font-bold flex items-center justify-center text-xs border border-[#ff4d2e]/20">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className={`flex-1 flex flex-col min-w-0 ${activeTab === 'pos' ? 'overflow-hidden h-screen' : 'overflow-y-auto h-screen'}`}>
        {/* Top bar */}
        <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h2 className="font-extrabold text-lg text-slate-900 capitalize">
              {activeTab === 'pos' ? 'POS Terminal' : activeTab === 'dashboard' ? 'Overview Dashboard' : activeTab.replace('-', ' ')}
            </h2>
            {profile?.status === 'active' ? (
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Online & Live
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Suspended
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {activeTab === 'menu' && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setItemFormData({
                    name: '',
                    description: '',
                    price: 199,
                    discount_price: '',
                    category_id: categories[0]?.id || '',
                    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
                    weight: '300g',
                    is_veg: true,
                    spicy_level: 0,
                    prep_time: 15,
                    is_available: true,
                    is_bestseller: false
                  });
                  setShowItemModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ADD MENU ITEM</span>
              </button>
            )}

            {activeTab === 'tables' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAllQrModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  <Printer className="w-4 h-4 text-orange-400" />
                  <span>DOWNLOAD ALL QR</span>
                </button>
                <button
                  onClick={() => setShowTableModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD TABLE</span>
                </button>
              </div>
            )}

            {activeTab === 'coupons' && (
              <button
                onClick={() => {
                  setEditingCoupon(null);
                  setCouponFormData({
                    code: '',
                    discount_type: 'fixed',
                    discount_value: 50,
                    min_order_amount: 300,
                    max_discount_amount: '',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
                    usage_limit: 1000,
                    is_active: true
                  });
                  setShowCouponModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>CREATE COUPON</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab Views */}
        <div className={`flex-1 min-w-0 ${activeTab === 'pos' ? 'p-2 sm:p-3 overflow-hidden h-[calc(100vh-4rem)] flex flex-col' : 'p-6 md:p-8 space-y-8 overflow-y-auto'}`}>
          {/* Sticky Alert Banner if there are pending calls */}
          {pendingCallsCount > 0 && activeTab !== 'table-calls' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/80 border-2 border-rose-500/50 shadow-xl flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3 truncate">
                <span className="text-2xl">🚨</span>
                <div className="truncate">
                  <div className="font-black text-white text-sm flex items-center gap-2">
                    <span>{pendingCallsCount} Active Customer Table Call{pendingCallsCount > 1 ? 's' : ''}!</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono">ACTION REQUIRED</span>
                  </div>
                  <div className="text-xs text-slate-300 truncate mt-0.5">
                    {serviceRequests.filter(r => r.status !== 'resolved').slice(0, 3).map(r => `Table #${r.table_number}: ${r.request_type === 'water' ? '💧 Water' : r.request_type === 'bill' ? '🧾 Final Bill' : '🛎️ Waiter'}`).join(' • ')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('table-calls')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shrink-0 shadow-md cursor-pointer transition"
              >
                VIEW & ATTEND
              </button>
            </div>
          )}

          {/* DEDICATED CUSTOMER TABLE CALLS & STAFF ALERTS SECTION */}
          {/* 4. TABLE CALLS & ALERTS */}
          {activeTab === 'table-calls' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>🛎️ Customer Table Calls & Staff Alerts</span>
                    {pendingCallsCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#ff4d2e] text-white font-black text-xs animate-pulse">
                        {pendingCallsCount} Pending
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Real-time requests when customers call staff for Water, Bill Settlement, or Table Assistance
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <button
                    onClick={() => setCallsFilter('all')}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      callsFilter === 'all' ? 'bg-[#ff4d2e] text-white shadow-md shadow-[#ff4d2e]/25' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    All ({serviceRequests.length})
                  </button>
                  <button
                    onClick={() => setCallsFilter('water')}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      callsFilter === 'water' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <span>💧 Water</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 font-mono">{waterCallsCount}</span>
                  </button>
                  <button
                    onClick={() => setCallsFilter('bill')}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      callsFilter === 'bill' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <span>🧾 Bill</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 font-mono">{billCallsCount}</span>
                  </button>
                  <button
                    onClick={() => setCallsFilter('waiter')}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      callsFilter === 'waiter' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <span>🛎️ Waiter</span>
                  </button>
                  <button
                    onClick={() => setCallsFilter('resolved')}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      callsFilter === 'resolved' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>✅ Completed</span>
                  </button>

                  <button
                    onClick={handleClearResolvedCalls}
                    disabled={clearingCalls || serviceRequests.filter(r => r.status === 'resolved').length === 0}
                    className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Clear completed calls from active list for today"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>{clearingCalls ? 'Clearing...' : 'Clear Completed'}</span>
                  </button>
                </div>
              </div>

              {/* Calls Grid */}
              {(() => {
                const filteredCalls = serviceRequests.filter(r => {
                  if (callsFilter === 'all') return r.status !== 'resolved';
                  if (callsFilter === 'water') return r.request_type === 'water' && r.status !== 'resolved';
                  if (callsFilter === 'bill') return r.request_type === 'bill' && r.status !== 'resolved';
                  if (callsFilter === 'waiter') return r.request_type !== 'water' && r.request_type !== 'bill' && r.status !== 'resolved';
                  if (callsFilter === 'resolved') return r.status === 'resolved';
                  return true;
                });

                if (filteredCalls.length === 0) {
                  return (
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h4 className="font-black text-base text-slate-900">No Table Calls in this category</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                        When a guest at any table requests drinking water, calls for staff, or requests their final bill, the notification will ring here instantly with the table number.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCalls.map(req => {
                      const isWater = req.request_type === 'water';
                      const isBill = req.request_type === 'bill';
                      const isResolved = req.status === 'resolved';
                      const isAttended = req.status === 'attended';
                      const tableMatch = tables.find(t => t.table_number === req.table_number);

                      return (
                        <div
                          key={req.id}
                          className={`rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                            isResolved
                              ? 'bg-slate-50 border-slate-200 opacity-75'
                              : isWater
                              ? 'bg-blue-50/70 border-blue-200'
                              : isBill
                              ? 'bg-emerald-50/70 border-emerald-200'
                              : 'bg-amber-50/70 border-amber-200'
                          }`}
                        >
                          <div>
                            {/* Header: Table and Type */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-sm shadow-xs">
                                  Table #{req.table_number}
                                </span>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                  isWater 
                                    ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                    : isBill 
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}>
                                  {isWater ? '💧 Drinking Water' : isBill ? '🧾 Bill Settlement' : '🛎️ Staff Call'}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>

                            {/* Note and Status */}
                            <div className="my-2.5">
                              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                {req.note || (isWater ? 'Customer requested drinking water for the table.' : isBill ? 'Customer requested final bill settlement.' : 'Assistance requested.')}
                              </p>

                              {isAttended && !isResolved && (
                                <div className="mt-2 text-[11px] text-amber-800 font-bold flex items-center gap-1.5 bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300">
                                  <Clock className="w-3.5 h-3.5 animate-spin" />
                                  <span>Attending: {req.attended_by || 'Staff'} (On the way)</span>
                                </div>
                              )}

                              {isResolved && (
                                <div className="mt-2 text-[11px] text-emerald-800 font-bold flex items-center gap-1.5 bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Completed & Attended</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons: Attend, Complete, View Bill */}
                          <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                            {!isResolved && (
                              <>
                                {!isAttended && (
                                  <button
                                    onClick={() => handleUpdateServiceRequestStatus(req.id, 'attended')}
                                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <span>🏃 ON THE WAY</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleUpdateServiceRequestStatus(req.id, 'resolved')}
                                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                                  title="Mark as completed after attending the table"
                                >
                                  <CheckCheck className="w-4 h-4" />
                                  <span>COMPLETE</span>
                                </button>
                              </>
                            )}

                            {isBill && tableMatch && (
                              <button
                                onClick={() => handleOpenTableBill(tableMatch.id, req.table_number)}
                                className="py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>VIEW BILL</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 0. POS TERMINAL (MATCHES SCREENSHOT 1) */}
          {activeTab === 'pos' && (
            <PosTerminal
              categories={categories}
              items={items}
              tables={tables}
              onOrderPlaced={(newOrder) => {
                setOrders(prev => [newOrder, ...prev]);
                showToast(`Order #${newOrder.order_number} created and sent to kitchen!`, 'success');
                loadDashboardData();
              }}
              restaurantName={profile?.name}
            />
          )}

          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Quick metrics cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Orders</div>
                  <div className="text-3xl font-black text-slate-900 mt-2">{todayOrders.length}</div>
                  <div className="text-xs text-[#ff4d2e] mt-2 font-bold">{pendingOrdersCount} new live orders</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</div>
                  <div className="text-3xl font-black text-emerald-600 mt-2">₹{todayRevenue.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mt-2">Paid customer bills</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kitchen Status</div>
                  <div className="text-3xl font-black text-blue-600 mt-2">{preparingCount + readyCount}</div>
                  <div className="text-xs text-slate-500 mt-2">{preparingCount} cooking, {readyCount} ready to serve</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dining Tables</div>
                  <div className="text-3xl font-black text-amber-600 mt-2">{tables.length}</div>
                  <div className="text-xs text-slate-400 mt-2">All configured with custom QR</div>
                </div>
              </div>

              {/* DEDICATED LIVE CUSTOMER TABLE CALLS SECTION ON MAIN DASHBOARD */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center">
                      <BellRing className={`w-5 h-5 ${pendingCallsCount > 0 ? 'animate-bounce text-rose-500' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-slate-900">Live Customer Table Calls</h3>
                        {pendingCallsCount > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#ff4d2e] text-white font-black text-xs animate-pulse">
                            {pendingCallsCount} Action Required
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            All Clear
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Real-time alerts when customers call staff for Water, Bill Settlement, or Table Assistance
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('table-calls')}
                    className="px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                  >
                    <span>View All Calls History</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {serviceRequests.filter(r => r.status !== 'resolved').length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <div className="text-sm font-bold text-slate-800">No active table calls at the moment</div>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      When guests tap "Need Water", "Request Bill", or "Call Waiter" on their digital menu, the notification appears here instantly with table number and one-tap action buttons.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {serviceRequests.filter(r => r.status !== 'resolved').slice(0, 6).map(req => {
                      const isWater = req.request_type === 'water';
                      const isBill = req.request_type === 'bill';
                      const isAttended = req.status === 'attended';
                      const tableMatch = tables.find(t => t.table_number === req.table_number);

                      return (
                        <div
                          key={req.id}
                          className={`rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs ${
                            isWater 
                              ? 'bg-blue-50/60 border-blue-200' 
                              : isBill 
                              ? 'bg-emerald-50/60 border-emerald-200' 
                              : 'bg-amber-50/60 border-amber-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-sm shadow-xs">
                                Table #{req.table_number}
                              </span>
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                isWater 
                                  ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                  : isBill 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {isWater ? '💧 Water' : isBill ? '🧾 Bill' : '🛎️ Staff Call'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 my-2 leading-snug font-medium">
                              {req.note || (isWater ? 'Requested drinking water' : isBill ? 'Requested final bill' : 'Assistance requested')}
                            </p>

                            <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                              <span>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isAttended && (
                                <span className="text-amber-700 font-bold">Attending: {req.attended_by || 'Staff'}</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center gap-2">
                            {!isAttended ? (
                              <button
                                onClick={() => handleUpdateServiceRequestStatus(req.id, 'attended')}
                                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                              >
                                <span>🏃 ON THE WAY</span>
                              </button>
                            ) : null}

                            <button
                              onClick={() => handleUpdateServiceRequestStatus(req.id, 'resolved')}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>COMPLETE</span>
                            </button>

                            {isBill && tableMatch && (
                              <button
                                onClick={() => handleOpenTableBill(tableMatch.id, req.table_number)}
                                className="py-2 px-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>BILL</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <h3 className="font-black text-base text-slate-900 mb-4">Quick Management Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('pos');
                    }}
                    className="p-4 rounded-2xl bg-[#ff4d2e]/10 border border-[#ff4d2e]/30 hover:bg-[#ff4d2e]/15 text-left transition group cursor-pointer"
                  >
                    <ShoppingCart className="w-5 h-5 text-[#ff4d2e] mb-2 group-hover:scale-110 transition" />
                    <div className="font-black text-xs text-slate-900">Open POS Terminal</div>
                    <div className="text-[11px] text-[#ff4d2e] font-semibold mt-0.5">Take Live Order</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('tables');
                      setShowTableModal(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/70 text-left transition group cursor-pointer"
                  >
                    <Grid3X3 className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition" />
                    <div className="font-black text-xs text-slate-900">Add Table</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Generate QR</div>
                  </button>

                  <button
                    onClick={() => setIsAllQrModal(true)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/70 text-left transition group cursor-pointer"
                  >
                    <QrCode className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition" />
                    <div className="font-black text-xs text-slate-900">Print QR Cards</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">All table standees</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('orders')}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/70 text-left transition group cursor-pointer"
                  >
                    <ShoppingBag className="w-5 h-5 text-blue-500 mb-2 group-hover:scale-110 transition" />
                    <div className="font-black text-xs text-slate-900">App Orders</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{orders.length} in system</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('coupons');
                      setShowCouponModal(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/70 text-left transition group cursor-pointer"
                  >
                    <Tag className="w-5 h-5 text-purple-500 mb-2 group-hover:scale-110 transition" />
                    <div className="font-black text-xs text-slate-900">Create Coupon</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">SAVE50 / Discount</div>
                  </button>
                </div>
              </div>

              {/* Live Orders preview on dashboard */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-base text-slate-900">Active Dine-in Orders</h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#ff4d2e] hover:text-[#e03d1e] font-bold cursor-pointer"
                  >
                    Open Live Orders Board
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map(o => (
                    <div key={o.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">Order #{o.order_number}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ff4d2e]/10 text-[#ff4d2e] font-bold border border-[#ff4d2e]/20">
                            Table {o.table_number}
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            o.status === 'NEW' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            o.status === 'PREPARING' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            o.status === 'READY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {o.items?.map(it => `${it.quantity}× ${it.item_name_snapshot}`).join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-black text-base text-slate-900">₹{o.total}</div>
                          <div className="text-[11px] text-slate-400 uppercase font-medium">{o.payment_method} • {o.payment_status}</div>
                        </div>

                        {o.payment_status !== 'paid' && (
                          <button
                            onClick={() => handleMarkPaid(o.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. APP ORDERS (MATCHES SCREENSHOT 2) */}
          {activeTab === 'orders' && (
            <PosOrderList
              orders={orders}
              tables={tables}
              onOrderUpdated={loadDashboardData}
              currencySymbol="₹"
            />
          )}

          {/* 3. KITCHEN DISPLAY SYSTEM */}
          {activeTab === 'kitchen' && (() => {
            const completedUnarchivedCount = orders.filter(o => ['COMPLETED', 'SERVED'].includes(o.status) && !o.is_cleared_from_active).length;
            const displayedKitchenOrders = orders.filter(o => {
              if (kitchenViewMode === 'active') {
                return ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status) && !o.is_cleared_from_active;
              }
              return ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(o.status);
            });

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <ChefHat className="w-7 h-7 text-[#ff4d2e]" />
                      <span>Kitchen Display System (KDS)</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">High-speed operational view for chefs and kitchen crew</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center text-xs">
                      <button
                        onClick={() => setKitchenViewMode('active')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                          kitchenViewMode === 'active' ? 'bg-[#ff4d2e] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Active Cooking ({orders.filter(o => ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status) && !o.is_cleared_from_active).length})
                      </button>
                      <button
                        onClick={() => setKitchenViewMode('all')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                          kitchenViewMode === 'all' ? 'bg-[#ff4d2e] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Orders ({orders.length})
                      </button>
                    </div>

                    <button
                      onClick={handleDailyClear}
                      disabled={dailyClearing || completedUnarchivedCount === 0}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition disabled:opacity-40 cursor-pointer shadow-xs"
                      title="Clear served and completed orders from the kitchen display for today"
                    >
                      <Archive className="w-3.5 h-3.5 text-slate-500" />
                      <span>{dailyClearing ? 'Clearing...' : `Clear Completed (${completedUnarchivedCount})`}</span>
                    </button>
                  </div>
                </div>

                {displayedKitchenOrders.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center max-w-lg mx-auto shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-1">Kitchen All Clear!</h4>
                    <p className="text-xs text-slate-500">
                      No dishes currently pending in the kitchen. New table orders will chime here immediately.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedKitchenOrders.map(order => {
                      const elapsedMins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
                      return (
                        <div
                          key={order.id}
                          className={`bg-white border-2 rounded-3xl p-6 shadow-md flex flex-col justify-between ${
                            order.status === 'PREPARING'
                              ? 'border-blue-500 ring-2 ring-blue-500/10'
                              : order.status === 'READY'
                              ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                              : order.status === 'COMPLETED'
                              ? 'border-slate-200 opacity-60'
                              : 'border-[#ff4d2e] ring-2 ring-[#ff4d2e]/10 animate-pulse'
                          }`}
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <div>
                                <div className="text-2xl font-black text-slate-900">#{order.order_number}</div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                  <Clock className="w-3.5 h-3.5 text-[#ff4d2e]" />
                                  <span className="font-mono font-bold text-slate-700">{elapsedMins} mins ago</span>
                                </div>
                              </div>
                              <div className="px-4 py-2 rounded-2xl bg-[#ff4d2e] text-white font-black text-lg shadow-md shadow-[#ff4d2e]/25">
                                TABLE {order.table_number}
                              </div>
                            </div>

                            {/* Customer Phone info */}
                            {order.customer_phone && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-mono">
                                <Phone className="w-3 h-3 text-[#ff4d2e]" />
                                <span>{order.customer_phone}</span>
                                {order.customer_name && <span>• {order.customer_name}</span>}
                              </div>
                            )}

                            {/* Food Items List */}
                            <div className="py-4 space-y-2.5">
                              {order.items?.map((it, idx) => (
                                <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                                  <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                                    <span>{it.item_name_snapshot}</span>
                                    <span className="text-base font-black text-[#ff4d2e] px-2 py-0.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                                      ×{it.quantity}
                                    </span>
                                  </div>
                                  {it.customization && (
                                    <div className="text-xs text-amber-700 mt-1 font-semibold">
                                      Note: {it.customization}
                                    </div>
                                  )}
                                </div>
                              ))}

                              {order.notes && (
                                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                                  <span className="font-bold">Order Note:</span> {order.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Kitchen Action Buttons */}
                          <div className="pt-4 border-t border-slate-100 space-y-2">
                            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCompleteOrderCash(order)}
                                className="w-full py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-wider uppercase transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <span>💵 COMPLETE ORDER (CASH ₹{order.total})</span>
                              </button>
                            )}

                            {(order.status === 'NEW' || order.status === 'ACCEPTED') && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                                className="w-full py-3.5 rounded-2xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-black text-xs tracking-wider uppercase transition shadow-md shadow-[#ff4d2e]/25 cursor-pointer"
                              >
                                START PREPARING
                              </button>
                            )}
                            {order.status === 'PREPARING' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'READY')}
                                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase transition shadow-md shadow-emerald-600/25 cursor-pointer"
                              >
                                MARK READY
                              </button>
                            )}
                            {order.status === 'READY' && (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'SERVED')}
                                  className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs tracking-wider uppercase transition cursor-pointer"
                                >
                                  SERVED TO TABLE
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'COMPLETED')}
                                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase transition shadow-md shadow-emerald-600/25 cursor-pointer"
                                >
                                  COMPLETE ORDER
                                </button>
                              </div>
                            )}
                            {order.status === 'SERVED' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'COMPLETED')}
                                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase transition cursor-pointer"
                              >
                                ✓ MARK COMPLETED (CLEARABLE)
                              </button>
                            )}
                            {order.status === 'COMPLETED' && (
                              <div className="py-2.5 px-3 rounded-2xl bg-emerald-50 text-emerald-700 text-center text-xs font-bold border border-emerald-200">
                                Completed • Ready for Daily Clear
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 4. TABLES & QR CODE MANAGEMENT */}
          {activeTab === 'tables' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Table Management & Unique QR System</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Every dining table receives an isolated QR linking directly to table ordering
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tables.map(table => (
                  <div
                    key={table.id}
                    className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500">Cap: {table.capacity} Guests</span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          table.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          table.status === 'occupied' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {table.status}
                        </span>
                      </div>

                      <div className="text-center py-4">
                        <div className="inline-block p-4 rounded-3xl bg-[#ff4d2e]/10 border border-[#ff4d2e]/25 text-[#ff4d2e] font-black text-3xl">
                          T{table.table_number}
                        </div>
                        <div className="font-black text-lg text-slate-900 mt-2">Table {table.table_number}</div>
                        <div className="text-xs font-mono text-slate-400 mt-1">
                          /menu/{profile?.slug}/table/{table.table_number}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => openPosForTable(table.table_number)}
                        className="w-full py-2.5 px-3 rounded-2xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-black shadow-md shadow-[#ff4d2e]/25 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>⚡ PUNCH / TAKE ORDER</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setQrModalTable(table);
                            setIsAllQrModal(false);
                          }}
                          className="flex-1 py-2 px-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-slate-500" />
                          <span>View / Print QR</span>
                        </button>

                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="p-2 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
                          title="Delete Table"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. MENU MANAGEMENT */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {/* Category Pill Bar */}
              <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2">
                <div className="flex items-center gap-2">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-xs"
                    >
                      <span>{cat.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                        title="Delete category"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowCatModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Category</span>
                  </button>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Header */}
                      <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          {item.is_veg ? (
                            <span className="w-5 h-5 rounded border border-emerald-500 bg-white/90 flex items-center justify-center shadow-xs">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded border border-rose-500 bg-white/90 flex items-center justify-center shadow-xs">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            </span>
                          )}
                          {item.is_bestseller && (
                            <span className="px-2 py-0.5 rounded-full bg-[#ff4d2e] text-white font-black text-[10px] uppercase tracking-wider shadow-sm">
                              Bestseller
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-white/95 backdrop-blur font-black text-sm text-slate-900 border border-slate-200 shadow-sm">
                          ₹{item.price}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-black text-base text-slate-900">{item.name}</h4>
                          <span className="text-xs text-slate-400 font-medium">{item.weight}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 font-medium">
                          <span>Prep: {item.prep_time}m</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            Spice: {Array(item.spicy_level).fill('🌶️').join('') || 'Mild'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setItemFormData({
                              name: item.name,
                              description: item.description,
                              price: item.price,
                              discount_price: item.discount_price?.toString() || '',
                              category_id: item.category_id,
                              image: item.image,
                              weight: item.weight,
                              is_veg: item.is_veg,
                              spicy_level: item.spicy_level,
                              prep_time: item.prep_time,
                              is_available: item.is_available,
                              is_bestseller: item.is_bestseller
                            });
                            setShowItemModal(true);
                          }}
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDuplicateItem(item.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                          title="Duplicate Item"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={async () => {
                          await api.updateMenuItem(item.id, { is_available: !item.is_available });
                          loadDashboardData();
                        }}
                        className={`text-xs font-bold px-3 py-1 rounded-xl border transition cursor-pointer ${
                          item.is_available
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.is_available ? 'Available' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. COUPON MANAGEMENT */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Promotional Coupons (Full CRUD)</h3>
                <p className="text-xs text-slate-500 font-medium">Offer discounts with minimum order thresholds and limits</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm text-slate-800">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Coupon Code</th>
                      <th className="px-6 py-4">Discount</th>
                      <th className="px-6 py-4">Min Order</th>
                      <th className="px-6 py-4">Usage</th>
                      <th className="px-6 py-4">Valid Window</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coupons.map(coupon => (
                      <tr key={coupon.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          <span className="px-2.5 py-1 rounded-xl bg-[#ff4d2e]/10 text-[#ff4d2e] border border-[#ff4d2e]/25">
                            {coupon.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-600">
                          {coupon.discount_type === 'fixed' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">₹{coupon.min_order_amount}</td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {coupon.used_count} / {coupon.usage_limit}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {coupon.start_date} to {coupon.end_date}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            coupon.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingCoupon(coupon);
                                setCouponFormData({
                                  code: coupon.code,
                                  discount_type: coupon.discount_type,
                                  discount_value: coupon.discount_value,
                                  min_order_amount: coupon.min_order_amount,
                                  max_discount_amount: coupon.max_discount_amount?.toString() || '',
                                  start_date: coupon.start_date,
                                  end_date: coupon.end_date,
                                  usage_limit: coupon.usage_limit,
                                  is_active: coupon.is_active
                                });
                                setShowCouponModal(true);
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit Coupon"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCoupon(coupon.id);
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer transition"
                              title="Delete Coupon"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDER HISTORY & CUSTOMER AUDIT */}
          {activeTab === 'order-history' && (() => {
            // Apply history filters
            const filteredHistory = orders.filter(ord => {
              // Phone filter
              if (orderHistoryPhone.trim()) {
                const searchDigits = orderHistoryPhone.replace(/\D/g, '').slice(-10);
                if (searchDigits) {
                  const ordDigits = (ord.customer_phone || '').replace(/\D/g, '').slice(-10);
                  if (!ordDigits.includes(searchDigits)) return false;
                }
              }

              // Generic search (customer name, order number, item name, table)
              if (orderHistorySearch.trim()) {
                const q = orderHistorySearch.toLowerCase().trim();
                const matchNum = ord.order_number.toString().includes(q);
                const matchName = (ord.customer_name || '').toLowerCase().includes(q);
                const matchPhone = (ord.customer_phone || '').toLowerCase().includes(q);
                const matchItems = ord.items?.some(it => it.item_name_snapshot.toLowerCase().includes(q));
                const matchTable = `table ${ord.table_number}`.includes(q) || ord.table_number.toString() === q;
                if (!matchNum && !matchName && !matchPhone && !matchItems && !matchTable) return false;
              }

              // Date filter
              if (orderHistoryDate !== 'all') {
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
                const orderDate = ord.created_at.split('T')[0];
                if (orderHistoryDate === 'today' && orderDate !== today) return false;
                if (orderHistoryDate === 'yesterday' && orderDate !== yesterday) return false;
                if (orderHistoryDate === 'last7days') {
                  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
                  if (orderDate < sevenDaysAgo) return false;
                }
              }

              // Payment filter
              if (orderHistoryPayment !== 'all') {
                if (ord.payment_method !== orderHistoryPayment) return false;
              }

              // Status filter
              if (orderHistoryStatus !== 'all') {
                if (ord.status !== orderHistoryStatus) return false;
              }

              return true;
            });

            const totalHistoryRevenue = filteredHistory.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.total : 0), 0);
            const counterPaymentOrders = filteredHistory.filter(o => o.payment_method === 'cash_counter');

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <History className="w-7 h-7 text-[#ff4d2e]" />
                      <span>Order History & Customer Audit</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Searchable records of which mobile number ordered which dishes, dates, tables, and billing details
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDailyClear}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5 text-slate-500" />
                      <span>Daily Clear Active Queue</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filtered Orders</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{filteredHistory.length}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Out of {orders.length} total orders</div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paid Sales Volume</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">₹{totalHistoryRevenue.toLocaleString()}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Settled payments</div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pay at Counter</div>
                    <div className="text-2xl font-black text-amber-600 mt-1">{counterPaymentOrders.length}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Counter settlement flow</div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">With Phone Number</div>
                    <div className="text-2xl font-black text-blue-600 mt-1">
                      {filteredHistory.filter(o => Boolean(o.customer_phone)).length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Verified diner records</div>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Search by Mobile Phone Number */}
                    <div className="md:col-span-4 relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#ff4d2e]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={orderHistoryPhone}
                        onChange={e => setOrderHistoryPhone(e.target.value)}
                        placeholder="Filter by Customer Mobile (e.g. 9876543210)..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff4d2e] rounded-2xl pl-10 pr-8 py-2.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                      {orderHistoryPhone && (
                        <button
                          onClick={() => setOrderHistoryPhone('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Generic Search */}
                    <div className="md:col-span-3 relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={orderHistorySearch}
                        onChange={e => setOrderHistorySearch(e.target.value)}
                        placeholder="Dish name, order #, diner name..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff4d2e] rounded-2xl pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Date filter */}
                    <div className="md:col-span-2">
                      <select
                        value={orderHistoryDate}
                        onChange={e => setOrderHistoryDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:border-[#ff4d2e]"
                      >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="last7days">Last 7 Days</option>
                      </select>
                    </div>

                    {/* Payment filter */}
                    <div className="md:col-span-2">
                      <select
                        value={orderHistoryPayment}
                        onChange={e => setOrderHistoryPayment(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:border-[#ff4d2e]"
                      >
                        <option value="all">All Payment Methods</option>
                        <option value="cash_counter">Pay at Counter</option>
                        <option value="cash_table">Cash at Table</option>
                        <option value="online">Online UPI</option>
                      </select>
                    </div>

                    {/* Status filter */}
                    <div className="md:col-span-1">
                      <select
                        value={orderHistoryStatus}
                        onChange={e => setOrderHistoryStatus(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-2xl px-2 py-2.5 focus:outline-none focus:border-[#ff4d2e]"
                      >
                        <option value="all">Status</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="SERVED">Served</option>
                        <option value="READY">Ready</option>
                        <option value="PREPARING">Preparing</option>
                        <option value="NEW">New</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {(orderHistoryPhone || orderHistorySearch || orderHistoryDate !== 'all' || orderHistoryPayment !== 'all' || orderHistoryStatus !== 'all') && (
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span>Showing {filteredHistory.length} matching order records</span>
                      <button
                        onClick={() => {
                          setOrderHistoryPhone('');
                          setOrderHistorySearch('');
                          setOrderHistoryDate('all');
                          setOrderHistoryPayment('all');
                          setOrderHistoryStatus('all');
                        }}
                        className="text-[#ff4d2e] hover:text-[#e03d1e] font-bold cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* History Table / Records */}
                <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
                  {filteredHistory.length === 0 ? (
                    <div className="p-16 text-center text-slate-400">
                      <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <div className="font-bold text-slate-800">No historical orders match this search</div>
                      <div className="text-xs text-slate-400 mt-1">Try clearing or changing your phone number or date filter</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-800">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                          <tr>
                            <th className="px-5 py-3.5">Order # / Time</th>
                            <th className="px-5 py-3.5">Customer Mobile Number</th>
                            <th className="px-5 py-3.5">Customer Name</th>
                            <th className="px-5 py-3.5">Table</th>
                            <th className="px-5 py-3.5">Items Ordered (What was ordered)</th>
                            <th className="px-5 py-3.5">Bill Amount</th>
                            <th className="px-5 py-3.5">Payment Method</th>
                            <th className="px-5 py-3.5">Status</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredHistory.map(o => (
                            <tr key={o.id} className="hover:bg-slate-50/80 transition">
                              {/* Order & Time */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="font-black text-slate-900 text-sm">#{o.order_number}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                  {new Date(o.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              {/* Customer Mobile Number */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                {o.customer_phone ? (
                                  <button
                                    onClick={() => setOrderHistoryPhone(o.customer_phone!)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ff4d2e]/10 text-[#ff4d2e] hover:bg-[#ff4d2e]/20 font-mono font-bold text-xs border border-[#ff4d2e]/20 transition cursor-pointer"
                                    title="Click to filter all orders by this phone number"
                                  >
                                    <Phone className="w-3 h-3 text-[#ff4d2e]" />
                                    <span>{o.customer_phone}</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400 italic">No Phone (Walk-in)</span>
                                )}
                              </td>

                              {/* Customer Name */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className="font-bold text-slate-900">{o.customer_name || 'Walk-in Diner'}</span>
                              </td>

                              {/* Table */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-extrabold text-xs border border-slate-200">
                                  Table {o.table_number}
                                </span>
                              </td>

                              {/* Items ordered breakdown */}
                              <td className="px-5 py-4 max-w-xs">
                                <div className="space-y-1">
                                  {o.items?.map((it, idx) => (
                                    <div key={idx} className="truncate">
                                      <span className="font-bold text-[#ff4d2e] mr-1">{it.quantity}×</span>
                                      <span className="text-slate-800 font-medium">{it.item_name_snapshot}</span>
                                      {it.customization && (
                                        <span className="text-[10px] text-amber-700 ml-1.5 font-semibold">
                                          ({it.customization})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {o.notes && (
                                    <div className="text-[10px] text-slate-400 italic">
                                      Note: {o.notes}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Bill Amount */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="font-black text-sm text-slate-900 font-mono">₹{o.total}</div>
                                {o.discount > 0 && (
                                  <div className="text-[10px] text-emerald-600 font-bold">Saved: -₹{o.discount}</div>
                                )}
                              </td>

                              {/* Payment Method */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div>
                                  {o.payment_method === 'cash_counter' ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px] uppercase">
                                      Pay at Counter
                                    </span>
                                  ) : o.payment_method === 'online' ? (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[10px] uppercase">
                                      Online UPI
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[10px] uppercase">
                                      Cash at Table
                                    </span>
                                  )}
                                  <div className={`text-[10px] font-bold uppercase mt-1 ${
                                    o.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                                  }`}>
                                    {o.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                                  </div>
                                </div>
                              </td>

                              {/* Order Status */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                  o.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  o.status === 'SERVED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  o.status === 'READY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  o.status === 'PREPARING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  o.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {o.status}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-5 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5 ml-auto">
                                  {o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                                    <button
                                      onClick={() => handleCompleteOrderCash(o)}
                                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                      title="Mark Order as Completed in Cash"
                                    >
                                      <span>💵 Cash Paid</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => setSelectedReceiptOrder(o)}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    title="View Receipt"
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-[#ff4d2e]" />
                                    <span>Receipt</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteOrder(o)}
                                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                                    title="Delete Order"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 7. CUSTOMERS & LOYALTY */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Customer Records & Loyalty Program</h3>
                <p className="text-xs text-slate-500 font-medium">Every ₹100 spent gives 10 loyalty points for rewards</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm text-slate-800">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Orders Count</th>
                      <th className="px-6 py-4">Total Spending</th>
                      <th className="px-6 py-4">Loyalty Balance</th>
                      <th className="px-6 py-4">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{c.phone}</td>
                        <td className="px-6 py-4 font-medium">{c.orders_count} orders</td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-600">₹{c.total_spent}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-xs border border-amber-200">
                            ★ {c.loyalty_points} Pts
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(c.last_order_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sales & Dining Analytics</h3>
                <p className="text-xs text-slate-500 font-medium">Insights into revenue, popular dishes, and order channels</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="text-xs text-slate-400 font-bold uppercase">Total Gross Sales</div>
                  <div className="text-3xl font-black text-emerald-600 mt-2">₹{analytics?.totalRevenue ?? 0}</div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="text-xs text-slate-400 font-bold uppercase">Total Orders Served</div>
                  <div className="text-3xl font-black text-slate-900 mt-2">{analytics?.totalOrders ?? 0}</div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="text-xs text-slate-400 font-bold uppercase">Avg Order Value (AOV)</div>
                  <div className="text-3xl font-black text-[#ff4d2e] mt-2">₹{analytics?.avgOrderValue ?? 0}</div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="text-xs text-slate-400 font-bold uppercase">Unique Diners</div>
                  <div className="text-3xl font-black text-blue-600 mt-2">{analytics?.totalCustomers ?? 0}</div>
                </div>
              </div>

              {/* Popular Items */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <h4 className="font-black text-base text-slate-900 mb-4">Top Selling Menu Items</h4>
                <div className="space-y-3">
                  {analytics?.popularItems?.map((it: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#ff4d2e]/10 text-[#ff4d2e] font-black text-xs flex items-center justify-center border border-[#ff4d2e]/20">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{it.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-600">₹{it.revenue}</div>
                        <div className="text-xs text-slate-400 font-medium">{it.count} ordered</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Staff Accounts & Permissions</h3>
                  <p className="text-xs text-slate-500 font-medium">Add kitchen chefs, managers, and table waiters</p>
                </div>
                <button
                  onClick={() => setShowStaffModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-black transition shadow-md shadow-[#ff4d2e]/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD STAFF</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {staffList.map(st => (
                  <div key={st.id} className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="uppercase text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ff4d2e]/10 text-[#ff4d2e] border border-[#ff4d2e]/20">
                          {st.role.replace('_', ' ')}
                        </span>
                        {st.role !== 'restaurant_owner' && (
                          <button
                            onClick={() => handleDeleteStaff(st.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <h4 className="font-black text-base text-slate-900">{st.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{st.email}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                      Joined: {new Date(st.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. RESTAURANT PROFILE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Restaurant Profile & Public Menu</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Update your branding, cover photo, address, and WiFi info displayed to customers
                  </p>
                </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Restaurant Logo</label>
                    <div className="flex items-center gap-4">
                      <img
                        src={settingsFormData.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'}
                        alt="Logo preview"
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs"
                      />
                      <label className="cursor-pointer px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#ff4d2e]" />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleImageUpload('logo', e)}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Cover Banner Photo</label>
                    <div className="flex items-center gap-4">
                      <img
                        src={settingsFormData.cover_image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'}
                        alt="Cover preview"
                        className="w-24 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs"
                      />
                      <label className="cursor-pointer px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#ff4d2e]" />
                        <span>Upload Cover</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleImageUpload('cover_image', e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Basic info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Restaurant Name *</label>
                    <input
                      type="text"
                      value={settingsFormData.name}
                      onChange={e => setSettingsFormData({ ...settingsFormData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={settingsFormData.phone}
                      onChange={e => setSettingsFormData({ ...settingsFormData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Cuisine Specialty</label>
                    <input
                      type="text"
                      value={settingsFormData.cuisine_type}
                      onChange={e => setSettingsFormData({ ...settingsFormData, cuisine_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Guest WiFi Credentials</label>
                    <input
                      type="text"
                      value={settingsFormData.wifi_info}
                      onChange={e => setSettingsFormData({ ...settingsFormData, wifi_info: e.target.value })}
                      placeholder="SSID / Password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={settingsFormData.address}
                    onChange={e => setSettingsFormData({ ...settingsFormData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">City</label>
                    <input
                      type="text"
                      value={settingsFormData.city}
                      onChange={e => setSettingsFormData({ ...settingsFormData, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">State</label>
                    <input
                      type="text"
                      value={settingsFormData.state}
                      onChange={e => setSettingsFormData({ ...settingsFormData, state: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tax Rate %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settingsFormData.tax_rate}
                      onChange={e => setSettingsFormData({ ...settingsFormData, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>
                </div>

                {/* Direct UPI Payment Details (PhonePe, Google Pay, Paytm) */}
                <div className="pt-5 border-t border-slate-100 space-y-4">
                  <div className="p-5 rounded-3xl bg-indigo-50/60 border border-indigo-100">
                    <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm mb-1">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <span>Online Payment Gateway: Direct UPI (PhonePe • Google Pay • Paytm)</span>
                      <span className="ml-auto text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        0% Commission
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mt-2 font-medium">
                      When customers click <strong>Online Pay</strong> on their mobile device, they can choose to pay via <strong>PhonePe</strong>, <strong>Google Pay</strong>, or <strong>Paytm</strong>. The exact bill amount will be pre-filled automatically, and money will directly credit to your restaurant's bank account via this UPI ID.
                    </p>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Restaurant UPI ID / VPA *</span>
                          {settingsFormData.upi_id && settingsFormData.upi_id.includes('@') ? (
                            <span className="text-[10px] text-emerald-600 font-mono font-bold">✓ Valid Format</span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-mono font-bold">e.g. name@okaxis</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={settingsFormData.upi_id}
                          onChange={e => setSettingsFormData({ ...settingsFormData, upi_id: e.target.value.trim() })}
                          placeholder="e.g. urbanbites@okaxis, cafe@icici, 9876543210@paytm"
                          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          UPI Account Payee / Business Name
                        </label>
                        <input
                          type="text"
                          value={settingsFormData.upi_payee_name}
                          onChange={e => setSettingsFormData({ ...settingsFormData, upi_payee_name: e.target.value })}
                          placeholder="e.g. Urban Bites Cafe & Kitchen"
                          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                        />
                      </div>
                    </div>

                    {/* Customer Preview Pill */}
                    <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-700 shadow-xs">
                      <div className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                        <span className="text-indigo-600">📱 Customer Checkout Preview:</span>
                        <span className="text-[10px] text-slate-400 font-normal">What diners see on their screen</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#5f259f] text-white flex items-center justify-center font-black text-xs">पे</span>
                          <div>
                            <div className="font-bold text-slate-900 text-[11px]">PhonePe</div>
                            <div className="text-[10px] text-slate-500">Exact amount prefilled</div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-white text-slate-900 flex items-center justify-center font-black text-[10px] border border-slate-200">GP</span>
                          <div>
                            <div className="font-bold text-slate-900 text-[11px]">Google Pay</div>
                            <div className="text-[10px] text-slate-500">1-tap app launch</div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#002e6e] text-white flex items-center justify-center font-black text-[10px]">Paytm</span>
                          <div>
                            <div className="font-bold text-slate-900 text-[11px]">Paytm UPI</div>
                            <div className="text-[10px] text-slate-500">Instant verification</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Policy: Pay at Counter Only Toggle */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#ff4d2e]" />
                        <span className="font-bold text-sm text-slate-900">Enforce "Pay at Counter Only" Mode</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        When enabled, all diners ordering from mobile QR codes will only see the "Pay at Counter" option. 
                        Payment must be completed in person at the billing / cashier counter.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={payCounterOnlySetting}
                        onChange={e => handleTogglePayCounterOnly(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff4d2e]"></div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={settingsFormData.description}
                    onChange={e => setSettingsFormData({ ...settingsFormData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-black text-xs shadow-md shadow-[#ff4d2e]/25 transition cursor-pointer"
                >
                  SAVE RESTAURANT PROFILE
                </button>
              </div>
            </form>

            {/* Security & Change Admin Password Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 mt-6 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-[#ff4d2e]" />
                <h4 className="text-lg font-black text-slate-900">Change Admin Password</h4>
              </div>
              <p className="text-xs text-slate-500 mb-5 font-medium">
                Update your admin login password to keep your restaurant portal secure.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Current Password *</label>
                  <div className="relative">
                    <input
                      type={showPasswordFields ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPasswordFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">New Password * (Min 6 chars)</label>
                    <input
                      type={showPasswordFields ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Confirm New Password *</label>
                    <input
                      type={showPasswordFields ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword || !currentPassword || !newPassword}
                  className="px-6 py-2.5 rounded-2xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-md shadow-[#ff4d2e]/20"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{changingPassword ? 'Updating Password...' : 'UPDATE ADMIN PASSWORD'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>

      {/* QR MODAL (Single or All) */}
      {(qrModalTable || isAllQrModal) && profile && (
        <TableQRModal
          table={qrModalTable}
          restaurant={profile}
          allTables={tables}
          isAllMode={isAllQrModal}
          onClose={() => {
            setQrModalTable(null);
            setIsAllQrModal(false);
          }}
        />
      )}

      {/* ADD/EDIT MENU ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="font-extrabold text-lg text-slate-900">{editingItem ? 'Edit Food Item' : 'Add Food Item'}</h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* SECTION 1: CATEGORY SELECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#ff4d2e] uppercase tracking-wider">
                    1. Select Menu Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCatModal(true);
                    }}
                    className="text-[11px] font-bold text-[#ff4d2e] hover:text-[#e03d1e] underline cursor-pointer"
                  >
                    + Add New Category
                  </button>
                </div>
                <select
                  value={itemFormData.category_id}
                  onChange={e => setItemFormData({ ...itemFormData, category_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#ff4d2e] font-medium"
                >
                  <option value="">-- Choose Category (e.g. Starters, Main Course, Beverages) --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No categories exist yet. Click "+ Add New Category" above to create your first category.
                  </p>
                )}
              </div>

              {/* SECTION 2: ITEM NAME */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Food Item Name *
                </label>
                <input
                  type="text"
                  value={itemFormData.name}
                  onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })}
                  placeholder="e.g. Paneer Butter Masala, Crispy Corn, Chicken Tikka Burger..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e] placeholder:text-slate-400"
                />
              </div>

              {/* SECTION 3: DESCRIPTION */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Food Description & Ingredients
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={generatingAiDesc || !itemFormData.name.trim()}
                    className="text-[11px] font-bold text-[#ff4d2e] hover:text-[#e03d1e] flex items-center gap-1 cursor-pointer disabled:opacity-40 transition"
                    title="Auto-generate appetizing description using server-side Gemini AI"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${generatingAiDesc ? 'animate-spin' : ''}`} />
                    <span>{generatingAiDesc ? 'Writing description...' : '✨ AI Write Description'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={itemFormData.description}
                  onChange={e => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Detailed description, fresh spices, portion size, and culinary taste notes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e] placeholder:text-slate-400"
                />
              </div>

              {/* SECTION 4: VEG / NON-VEG TICK SELECTION ("veg aur non veg ka tick") */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  4. Dietary Type (Veg / Non-Veg Tick) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* VEG CARD */}
                  <button
                    type="button"
                    onClick={() => setItemFormData({ ...itemFormData, is_veg: true })}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                      itemFormData.is_veg
                        ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md border-2 border-emerald-500 flex items-center justify-center p-0.5 bg-white">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-emerald-700">Pure Vegetarian</div>
                        <div className="text-[10px] text-slate-500">Veg (Green Dot)</div>
                      </div>
                    </div>
                    {itemFormData.is_veg && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* NON-VEG CARD */}
                  <button
                    type="button"
                    onClick={() => setItemFormData({ ...itemFormData, is_veg: false })}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                      !itemFormData.is_veg
                        ? 'border-rose-500 bg-rose-50 text-slate-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md border-2 border-rose-500 flex items-center justify-center p-0.5 bg-white">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-rose-700">Non-Vegetarian</div>
                        <div className="text-[10px] text-slate-500">Non-Veg (Red Dot)</div>
                      </div>
                    </div>
                    {!itemFormData.is_veg && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black">
                        ✓
                      </span>
                    )}
                  </button>
                </div>

                {/* Explicit checkmark checkbox */}
                <div className="mt-2.5 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={itemFormData.is_veg}
                      onChange={e => setItemFormData({ ...itemFormData, is_veg: e.target.checked })}
                      className="w-4 h-4 text-emerald-500 rounded bg-slate-100 border-slate-300 cursor-pointer"
                    />
                    <span>{itemFormData.is_veg ? '✓ Marked as 100% Pure Veg' : 'Mark as Vegetarian'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={itemFormData.is_bestseller}
                      onChange={e => setItemFormData({ ...itemFormData, is_bestseller: e.target.checked })}
                      className="w-4 h-4 text-[#ff4d2e] rounded bg-slate-100 border-slate-300 cursor-pointer"
                    />
                    <span>★ Mark as Chef's Bestseller</span>
                  </label>
                </div>
              </div>

              {/* SECTION 5: PRICING, PHOTO & ATTRIBUTES */}
              <div className="pt-3 border-t border-slate-100 space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  5. Pricing & Photo
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      value={itemFormData.price}
                      onChange={e => setItemFormData({ ...itemFormData, price: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e] font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount Price (₹)</label>
                    <input
                      type="number"
                      value={itemFormData.discount_price}
                      onChange={e => setItemFormData({ ...itemFormData, discount_price: e.target.value })}
                      placeholder="Optional promo price"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Food Photo</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={itemFormData.image}
                      onChange={e => setItemFormData({ ...itemFormData, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                    />
                    <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition flex items-center gap-1.5 shrink-0">
                      <Upload className="w-3.5 h-3.5 text-[#ff4d2e]" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleImageUpload('item_image', e)}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Portion / Size</label>
                    <input
                      type="text"
                      value={itemFormData.weight}
                      onChange={e => setItemFormData({ ...itemFormData, weight: e.target.value })}
                      placeholder="e.g. 350g or 2 Pcs"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prep Time (mins)</label>
                    <input
                      type="number"
                      value={itemFormData.prep_time}
                      onChange={e => setItemFormData({ ...itemFormData, prep_time: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Spice Level</label>
                    <select
                      value={itemFormData.spicy_level}
                      onChange={e => setItemFormData({ ...itemFormData, spicy_level: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                    >
                      <option value={0}>0 - Mild</option>
                      <option value={1}>1 - Medium 🌶️</option>
                      <option value={2}>2 - Hot 🌶️🌶️</option>
                      <option value={3}>3 - Extra Hot 🌶️🌶️🌶️</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="px-5 py-2.5 rounded-2xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-bold text-xs shadow-md shadow-[#ff4d2e]/20 cursor-pointer"
              >
                {editingItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CATEGORY MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-slate-800">
            <h3 className="font-extrabold text-base text-slate-900 mb-3">Add Menu Category</h3>
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="e.g. Sourdough Pizzas"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 mb-4 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCatModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-bold transition shadow-md shadow-[#ff4d2e]/20 cursor-pointer"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TABLE MODAL */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-slate-800">
            <h3 className="font-extrabold text-base text-slate-900 mb-3">Add Restaurant Table</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Table Number *</label>
                <input
                  type="number"
                  value={newTableNumber}
                  onChange={e => setNewTableNumber(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Capacity (Seats)</label>
                <input
                  type="number"
                  value={newTableCapacity}
                  onChange={e => setNewTableCapacity(e.target.value)}
                  placeholder="4"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                className="px-4 py-2 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-bold transition shadow-md shadow-[#ff4d2e]/20 cursor-pointer"
              >
                Create Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT COUPON MODAL */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-800">
            <h3 className="font-extrabold text-base text-slate-900 mb-4">
              {editingCoupon ? 'Edit Coupon' : 'Create Promotional Coupon'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={couponFormData.code}
                  onChange={e => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SAVE50"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={couponFormData.discount_type}
                    onChange={e => setCouponFormData({ ...couponFormData, discount_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                  >
                    <option value="fixed">Fixed Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Value *</label>
                  <input
                    type="number"
                    value={couponFormData.discount_value}
                    onChange={e => setCouponFormData({ ...couponFormData, discount_value: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  value={couponFormData.min_order_amount}
                  onChange={e => setCouponFormData({ ...couponFormData, min_order_amount: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={couponFormData.start_date}
                    onChange={e => setCouponFormData({ ...couponFormData, start_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={couponFormData.end_date}
                    onChange={e => setCouponFormData({ ...couponFormData, end_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              {editingCoupon ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteCoupon(editingCoupon.id);
                    setShowCouponModal(false);
                    setEditingCoupon(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Coupon</span>
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCoupon}
                  className="px-5 py-2.5 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-bold text-xs shadow-md shadow-[#ff4d2e]/20 cursor-pointer"
                >
                  {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-slate-800">
            <h3 className="font-extrabold text-base text-slate-900 mb-3">Add Restaurant Staff Member</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={staffFormData.name}
                  onChange={e => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  placeholder="Staff Name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={staffFormData.email}
                  onChange={e => setStaffFormData({ ...staffFormData, email: e.target.value })}
                  placeholder="staff@restaurant.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={staffFormData.password}
                  onChange={e => setStaffFormData({ ...staffFormData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                <select
                  value={staffFormData.role}
                  onChange={e => setStaffFormData({ ...staffFormData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#ff4d2e]"
                >
                  <option value="kitchen_staff">Kitchen Staff (KDS Only)</option>
                  <option value="waiter">Floor Waiter (Orders & Tables)</option>
                  <option value="restaurant_manager">Restaurant Manager</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowStaffModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStaff}
                className="px-4 py-2 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-bold shadow-md shadow-[#ff4d2e]/20 cursor-pointer"
              >
                Add Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL RECEIPT & CUSTOMER ORDER AUDIT MODAL */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#ff4d2e]" />
                <h3 className="font-black text-base text-slate-900">
                  Order Receipt #{selectedReceiptOrder.order_number}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedReceiptOrder(null)} 
                className="text-slate-400 hover:text-slate-700 p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Restaurant info snapshot */}
              <div className="text-center pb-3 border-b border-slate-100">
                <div className="font-black text-base text-slate-900">{profile?.name}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">{profile?.address}</div>
                <div className="text-[#ff4d2e] font-bold mt-1 text-xs">Table #{selectedReceiptOrder.table_number}</div>
              </div>

              {/* Customer Audit Details */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Customer Audit Details</div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Customer Mobile:</span>
                  <span className="font-mono font-bold text-[#ff4d2e]">
                    {selectedReceiptOrder.customer_phone || 'Not Provided (Walk-in)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedReceiptOrder.customer_name || 'Walk-in Diner'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Order Placed At:</span>
                  <span className="text-slate-700">
                    {new Date(selectedReceiptOrder.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Channel:</span>
                  <span className="font-bold text-amber-700 capitalize">
                    {selectedReceiptOrder.payment_method === 'cash_counter' ? 'Pay at Counter' : selectedReceiptOrder.payment_method.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className={`font-bold uppercase ${selectedReceiptOrder.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedReceiptOrder.payment_status}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Itemized Food Items</div>
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  {selectedReceiptOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-200/60 pb-1.5 last:border-b-0 last:pb-0">
                      <div>
                        <div className="font-bold text-slate-900">
                          <span className="text-[#ff4d2e] mr-1.5">{it.quantity}×</span>
                          {it.item_name_snapshot}
                        </div>
                        {it.customization && (
                          <div className="text-[10px] text-amber-600 pl-4">{it.customization}</div>
                        )}
                        {it.special_instructions && (
                          <div className="text-[10px] text-slate-400 italic pl-4">Note: {it.special_instructions}</div>
                        )}
                      </div>
                      <div className="font-mono font-bold text-slate-800">
                        ₹{it.price_snapshot * it.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Calculation */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-800">₹{selectedReceiptOrder.subtotal}</span>
                </div>
                {selectedReceiptOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount ({selectedReceiptOrder.coupon_code || 'Promo'}):</span>
                    <span className="font-mono">-₹{selectedReceiptOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST / Tax:</span>
                  <span className="font-mono text-slate-800">₹{selectedReceiptOrder.tax}</span>
                </div>
                {selectedReceiptOrder.service_charge ? (
                  <div className="flex justify-between">
                    <span>Service Charge:</span>
                    <span className="font-mono text-slate-800">₹{selectedReceiptOrder.service_charge}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-600">₹{selectedReceiptOrder.total}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#ff4d2e]" />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={() => setSelectedReceiptOrder(null)}
                className="px-5 py-2.5 rounded-2xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-bold transition shadow-md shadow-[#ff4d2e]/20 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE RUNNING BILL MODAL (CALLED FROM TABLE CALLS OR TABLES) */}
      {selectedTableBillModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-800">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900">
                  Table #{selectedTableBillModal.table_number} Bill Summary
                </h3>
              </div>
              <button
                onClick={() => setSelectedTableBillModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {loadingTableBill ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Calculating bill...
                </div>
              ) : selectedTableBillModal.active_orders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No active orders for Table #{selectedTableBillModal.table_number}.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items on Table Tab</div>
                    <div className="divide-y divide-slate-200/70 text-xs">
                      {selectedTableBillModal.active_orders.flatMap((o: any) => o.items).map((it: any, idx: number) => (
                        <div key={idx} className="py-1.5 flex justify-between text-slate-800">
                          <span>
                            <strong className="text-[#ff4d2e] font-mono">×{it.quantity}</strong> {it.item_name_snapshot}
                          </span>
                          <span className="font-mono text-slate-700">₹{it.price_snapshot * it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Items:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedTableBillModal.total_items}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal & Tax:</span>
                      <span className="font-mono font-bold text-slate-900">₹{selectedTableBillModal.running_total}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-emerald-600">
                      <span>Grand Total:</span>
                      <span className="text-lg font-black font-mono">₹{selectedTableBillModal.running_total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#ff4d2e]" />
                <span>Print Bill</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    await api.settleTable(selectedTableBillModal.table_id);
                    showToast(`Table #${selectedTableBillModal.table_number} settled & cleared`, 'success');
                    // auto-resolve any bill alerts for this table
                    const alerts = serviceRequests.filter(r => r.table_number === selectedTableBillModal.table_number);
                    for (const a of alerts) {
                      api.updateServiceRequest(a.id, 'resolved').catch(() => {});
                    }
                    setSelectedTableBillModal(null);
                    loadDashboardData();
                  } catch (err: any) {
                    showToast(err.message || 'Failed to settle table', 'error');
                  }
                }}
                className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-600/25"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>MARK PAID & CLEAR TABLE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
