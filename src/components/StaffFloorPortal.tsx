'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  Restaurant, MenuItem, Category, RestaurantTable, 
  Order, TableServiceRequest 
} from '../types';
import { useToast } from '../components/Toast';
import { 
  BellRing, Utensils, ShoppingBag, Grid3X3, CheckCircle2, 
  Clock, Volume2, VolumeX, LogOut, Plus, Minus, Search, 
  Printer, DollarSign, RefreshCw, X, AlertTriangle, ArrowRight,
  UserCheck, Receipt, Sparkles, ChefHat
} from 'lucide-react';

interface StaffFloorPortalProps {
  onNavigate: (path: string) => void;
}

export const StaffFloorPortal: React.FC<StaffFloorPortalProps> = ({ onNavigate }) => {
  const { user, restaurant, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'alerts' | 'tables' | 'orders'>('alerts');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Core Data
  const [profile, setProfile] = useState<Restaurant | null>(restaurant);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [serviceRequests, setServiceRequests] = useState<TableServiceRequest[]>([]);

  // Filter state for alerts
  const [alertFilter, setAlertFilter] = useState<'all' | 'water' | 'bill' | 'waiter'>('all');

  // Table Bill & POS Modal State
  const [selectedTableForBill, setSelectedTableForBill] = useState<RestaurantTable | null>(null);
  const [tableBillData, setTableBillData] = useState<{
    table_number: number;
    table_id: string;
    status: string;
    active_orders: Order[];
    running_total: number;
    total_items: number;
  } | null>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [settlingBill, setSettlingBill] = useState(false);

  // POS Punch Order Modal State
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<RestaurantTable | null>(null);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState<string>('all');
  const [posCart, setPosCart] = useState<{
    menu_item_id: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }[]>([]);
  const [posOrderNotes, setPosOrderNotes] = useState('');
  const [punchingOrder, setPunchingOrder] = useState(false);

  // Audio Chime synthesizer via Web Audio API
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.3); // D6

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Load Floor Data
  const loadFloorData = async () => {
    try {
      setLoading(true);
      const [prof, menuData, tbls, ords, reqs] = await Promise.all([
        api.getRestaurantProfile(),
        api.getMenu(),
        api.getTables(),
        api.getOrders(),
        api.getServiceRequests()
      ]);

      setProfile(prof);
      setCategories(menuData.categories);
      setMenuItems(menuData.items);
      setTables(tbls);
      setOrders(ords);
      setServiceRequests(reqs);
    } catch (err: any) {
      showToast(err.message || 'Error loading staff portal data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloorData();

    // Setup Live SSE stream
    const eventSource = new EventSource(`/api/realtime/events?restaurantId=${user?.restaurant_id}`);

    eventSource.addEventListener('TABLE_SERVICE_REQUEST', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        const req: TableServiceRequest = payload.data || payload;
        setServiceRequests(prev => [req, ...prev.filter(r => r.id !== req.id)]);
        playAlertChime();
        const reason = req.request_type === 'water' 
          ? '💧 Water' 
          : req.request_type === 'bill' 
          ? '🧾 Final Bill' 
          : '🛎️ Waiter Assistance';
        showToast(`🚨 Table #${req.table_number} requested ${reason}!`, 'info');
      } catch (err) {
        console.error('SSE table service request error:', err);
      }
    });

    eventSource.addEventListener('SERVICE_REQUEST_UPDATED', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        const req: TableServiceRequest = payload.data || payload;
        setServiceRequests(prev => prev.map(r => r.id === req.id ? req : r));
      } catch (err) {
        console.error('SSE update service request error:', err);
      }
    });

    eventSource.addEventListener('NEW_ORDER', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        showToast(`🔔 New Order #${payload.data.order_number} for Table ${payload.data.table_number}!`, 'info');
        loadFloorData();
      } catch (err) {
        console.error('SSE new order error:', err);
      }
    });

    eventSource.addEventListener('ORDER_STATUS_UPDATED', () => {
      api.getOrders().then(setOrders).catch(() => {});
    });

    eventSource.addEventListener('TABLE_SETTLED', () => {
      api.getTables().then(setTables).catch(() => {});
      api.getOrders().then(setOrders).catch(() => {});
    });

    return () => {
      eventSource.close();
    };
  }, [user?.restaurant_id]);

  // Update Service Request (Attend or Resolve)
  const handleUpdateAlertStatus = async (id: string, status: 'attended' | 'resolved') => {
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
      showToast(status === 'attended' ? 'Marked as Attending!' : 'Request marked as Resolved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update alert status', 'error');
    }
  };

  // Open Running Bill for Table
  const handleOpenTableBill = async (table: RestaurantTable) => {
    try {
      setSelectedTableForBill(table);
      setLoadingBill(true);
      const bill = await api.getTableRunningBill(table.id);
      setTableBillData(bill);
    } catch (err: any) {
      showToast(err.message || 'Unable to retrieve table bill', 'error');
    } finally {
      setLoadingBill(false);
    }
  };

  // Settle Bill
  const handleSettleBill = async (paymentMethod: string = 'cash_table') => {
    if (!selectedTableForBill) return;
    try {
      setSettlingBill(true);
      await api.settleTable(selectedTableForBill.id);
      showToast(`Table #${selectedTableForBill.table_number} bill settled (${paymentMethod.replace('_', ' ')}). Table marked available.`, 'success');
      
      // Auto resolve any pending bill alerts for this table
      const pendingBillAlerts = serviceRequests.filter(
        r => r.table_number === selectedTableForBill.table_number && r.status !== 'resolved'
      );
      for (const a of pendingBillAlerts) {
        api.updateServiceRequest(a.id, 'resolved').catch(() => {});
      }

      setSelectedTableForBill(null);
      setTableBillData(null);
      loadFloorData();
    } catch (err: any) {
      showToast(err.message || 'Failed to settle table bill', 'error');
    } finally {
      setSettlingBill(false);
    }
  };

  // Open POS Punch Order for Table
  const handleOpenPosOrder = (table: RestaurantTable) => {
    setSelectedTableForOrder(table);
    setPosCart([]);
    setPosOrderNotes('');
    setPosSearch('');
  };

  // Add Item to POS Cart
  const handleAddToPosCart = (item: MenuItem) => {
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
          price: (item.discount_price && item.discount_price > 0) ? item.discount_price : item.price,
          quantity: 1
        }
      ];
    });
  };

  // Modify POS Cart quantity
  const handleUpdatePosQuantity = (menuItemId: string, delta: number) => {
    setPosCart(prev => {
      return prev.map(p => {
        if (p.menu_item_id === menuItemId) {
          const newQty = p.quantity + delta;
          return newQty > 0 ? { ...p, quantity: newQty } : null;
        }
        return p;
      }).filter(Boolean) as any[];
    });
  };

  // Submit POS Order
  const handleSubmitPosOrder = async () => {
    if (!selectedTableForOrder || posCart.length === 0) {
      showToast('Please add items to punch this order', 'error');
      return;
    }
    try {
      setPunchingOrder(true);
      const itemsPayload = posCart.map(c => ({
        menu_item_id: c.menu_item_id,
        item_name_snapshot: c.name,
        price_snapshot: c.price,
        quantity: c.quantity,
        special_instructions: c.notes || undefined
      }));

      await api.waiterPunchOrder({
        table_number: selectedTableForOrder.table_number,
        items: itemsPayload,
        notes: posOrderNotes.trim() || undefined,
        payment_method: 'cash_table'
      });

      showToast(`Order sent to kitchen for Table #${selectedTableForOrder.table_number}!`, 'success');
      setSelectedTableForOrder(null);
      setPosCart([]);
      loadFloorData();
    } catch (err: any) {
      showToast(err.message || 'Failed to punch order', 'error');
    } finally {
      setPunchingOrder(false);
    }
  };

  // Update order status (Mark served)
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.updateOrderStatus(orderId, status);
      showToast(`Order marked as ${status}`, 'success');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o));
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status', 'error');
    }
  };

  // Filtered Alerts
  const pendingAlerts = useMemo(() => {
    return serviceRequests.filter(r => {
      if (r.status === 'resolved') return false;
      if (alertFilter === 'water') return r.request_type === 'water';
      if (alertFilter === 'bill') return r.request_type === 'bill';
      if (alertFilter === 'waiter') return r.request_type !== 'water' && r.request_type !== 'bill';
      return true;
    });
  }, [serviceRequests, alertFilter]);

  const activeAlertsCount = serviceRequests.filter(r => r.status !== 'resolved').length;
  const waterCount = serviceRequests.filter(r => r.status !== 'resolved' && r.request_type === 'water').length;
  const billCount = serviceRequests.filter(r => r.status !== 'resolved' && r.request_type === 'bill').length;

  // POS filtered items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item.is_available) return false;
      if (posCategory !== 'all' && item.category_id !== posCategory) return false;
      if (posSearch.trim()) {
        const q = posSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, posCategory, posSearch]);

  const posTotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 flex flex-col font-sans selection:bg-[#F0442B] selection:text-white">
      {/* 1. Mobile-Optimized Floor Staff Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F0442B] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">{profile?.name || 'SuKopi'}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Floor
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {user?.name || 'Staff'} • <span className="text-[#F0442B] font-bold capitalize">{user?.role?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                soundEnabled 
                  ? 'bg-rose-50 text-[#F0442B] border-rose-200' 
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={loadFloorData}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              title="Refresh Floor Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#F0442B] border border-rose-200 transition text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Top Metric Ticker for Fast Glance on Floor */}
      <div className="bg-white/80 border-b border-slate-200/80 px-4 py-2.5">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-2.5 text-center text-xs">
          <button
            onClick={() => { setActiveTab('alerts'); setAlertFilter('water'); }}
            className={`p-2.5 rounded-2xl border transition cursor-pointer shadow-xs ${
              waterCount > 0 
                ? 'bg-blue-50/90 border-blue-300 text-blue-800 font-bold' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400">Water Requests</div>
            <div className="text-lg font-black text-blue-600 mt-0.5">{waterCount}</div>
          </button>

          <button
            onClick={() => { setActiveTab('alerts'); setAlertFilter('bill'); }}
            className={`p-2.5 rounded-2xl border transition cursor-pointer shadow-xs ${
              billCount > 0 
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800 font-bold' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400">Bill Requests</div>
            <div className="text-lg font-black text-emerald-600 mt-0.5">{billCount}</div>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-xs"
          >
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Tables</div>
            <div className="text-lg font-black text-[#F0442B] mt-0.5">
              {tables.filter(t => t.status === 'occupied').length} / {tables.length}
            </div>
          </button>
        </div>
      </div>

      {/* 3. Main Floor Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28">
        {/* TAB 1: LIVE ALERTS (WATER & BILLS) */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Live Table Requests & Calls</span>
                  {activeAlertsCount > 0 && (
                    <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-[#F0442B] text-white shadow-xs">
                      {activeAlertsCount} Pending
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Real-time alerts when guests call for water, final bills, or floor service
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setAlertFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    alertFilter === 'all' 
                      ? 'bg-[#F0442B] text-white shadow-xs' 
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  All ({serviceRequests.filter(r => r.status !== 'resolved').length})
                </button>
                <button
                  onClick={() => setAlertFilter('water')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    alertFilter === 'water' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <span>💧 Water</span>
                  <span className="text-[10px] px-1 rounded-full bg-black/10 font-mono">{waterCount}</span>
                </button>
                <button
                  onClick={() => setAlertFilter('bill')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    alertFilter === 'bill' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <span>🧾 Bill</span>
                  <span className="text-[10px] px-1 rounded-full bg-black/10 font-mono">{billCount}</span>
                </button>
                <button
                  onClick={() => setAlertFilter('waiter')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    alertFilter === 'waiter' 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <span>🛎️ Waiter</span>
                </button>
              </div>
            </div>

            {/* Alerts List */}
            {pendingAlerts.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base text-slate-900">All Clear! No Pending Requests</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  When a diner taps "Need Water" or "Request Bill", real-time alerts will pop up here with table numbers and audio chimes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingAlerts.map(req => {
                  const isWater = req.request_type === 'water';
                  const isBill = req.request_type === 'bill';
                  const isAttended = req.status === 'attended';
                  const matchedTable = tables.find(t => t.table_number === req.table_number);

                  return (
                    <div
                      key={req.id}
                      className={`rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                        isWater 
                          ? 'bg-blue-50/50 border-blue-200' 
                          : isBill 
                          ? 'bg-emerald-50/50 border-emerald-200' 
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div>
                        {/* Top row: Table badge and Time */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-xs shadow-xs">
                              Table #{req.table_number}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              isWater 
                                ? 'bg-blue-100/70 text-blue-800 border-blue-200' 
                                : isBill 
                                ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200' 
                                : 'bg-amber-100/70 text-amber-800 border-amber-200'
                            }`}>
                              {isWater ? '💧 Drinking Water' : isBill ? '🧾 Bill Settlement' : '🛎️ Staff Call'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        {/* Note & Attend Status */}
                        <div className="my-2">
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">
                            {req.note || (isWater ? 'Guest requested drinking water on table.' : isBill ? 'Guest requested final bill settlement.' : 'Assistance requested.')}
                          </p>

                          {isAttended && (
                            <div className="mt-2 text-[11px] text-amber-800 font-bold flex items-center gap-1.5 bg-amber-100/70 px-2.5 py-1 rounded-xl border border-amber-200">
                              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>Attending: {req.attended_by || 'Staff'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                        {!isAttended ? (
                          <button
                            onClick={() => handleUpdateAlertStatus(req.id, 'attended')}
                            className="flex-1 py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>I'M ON IT</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateAlertStatus(req.id, 'resolved')}
                            className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>MARK DONE</span>
                          </button>
                        )}

                        {isBill && matchedTable && (
                          <button
                            onClick={() => handleOpenTableBill(matchedTable)}
                            className="py-2.5 px-3 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>BRING BILL</span>
                          </button>
                        )}

                        {matchedTable && (
                          <button
                            onClick={() => handleOpenPosOrder(matchedTable)}
                            className="py-2.5 px-3 rounded-2xl bg-[#F0442B] hover:bg-[#d93822] text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Add items for this table"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>ADD ORDER</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TABLES & FLOOR POS (ORDER PUNCHING & BILLING) */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🪑 Floor Tables & POS</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select a table to punch a new order, add items, or view and print the running bill
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Occupied
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Bill / Water Req
                </span>
              </div>
            </div>

            {/* Table Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {tables.map(tbl => {
                const tableAlerts = serviceRequests.filter(
                  r => r.table_number === tbl.table_number && r.status !== 'resolved'
                );
                const hasWater = tableAlerts.some(r => r.request_type === 'water');
                const hasBill = tableAlerts.some(r => r.request_type === 'bill');
                const hasAlert = tableAlerts.length > 0;

                const tableActiveOrders = orders.filter(
                  o => o.table_number === tbl.table_number && o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
                );
                const isOccupied = tableActiveOrders.length > 0 || tbl.status === 'occupied';

                return (
                  <div
                    key={tbl.id}
                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between relative overflow-hidden ${
                      hasBill
                        ? 'bg-emerald-950/30 border-emerald-500/50 ring-2 ring-emerald-500/30'
                        : hasWater
                        ? 'bg-blue-950/30 border-blue-500/50 ring-2 ring-blue-500/30'
                        : isOccupied
                        ? 'bg-slate-900 border-orange-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top alert badge indicator */}
                    {hasAlert && (
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {hasWater && <span className="text-xs animate-bounce" title="Water requested">💧</span>}
                        {hasBill && <span className="text-xs animate-bounce" title="Bill requested">🧾</span>}
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                        <span>Cap: {tbl.capacity}p</span>
                        <span className={`px-1.5 py-0.2 rounded-full font-bold ${
                          isOccupied ? 'text-orange-400 bg-orange-500/10' : 'text-emerald-400 bg-emerald-500/10'
                        }`}>
                          {isOccupied ? 'Occupied' : 'Free'}
                        </span>
                      </div>

                      <div className="text-center py-3">
                        <div className="text-3xl font-black text-white">
                          T{tbl.table_number}
                        </div>
                        <div className="text-[11px] font-bold text-slate-300 mt-1">
                          Table {tbl.table_number}
                        </div>
                        {tableActiveOrders.length > 0 && (
                          <div className="text-[10px] text-orange-400 font-mono font-bold mt-0.5">
                            {tableActiveOrders.length} Order(s)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons for Waiter */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleOpenPosOrder(tbl)}
                        className="w-full py-2 px-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>TAKE ORDER</span>
                      </button>

                      <button
                        onClick={() => handleOpenTableBill(tbl)}
                        className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          hasBill
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <Receipt className="w-3 h-3" />
                        <span>VIEW BILL</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVE KITCHEN ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">📋 Live Table Orders</h2>
                <p className="text-xs text-slate-400">Track and serve orders as kitchen marks them READY</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-orange-400 font-bold font-mono">
                {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length} Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').map(ord => (
                <div
                  key={ord.id}
                  className={`rounded-2xl p-4 border transition ${
                    ord.status === 'READY'
                      ? 'bg-emerald-950/30 border-emerald-500/50 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-base">#{ord.order_number}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-orange-500 text-white font-extrabold text-xs">
                        Table {ord.table_number}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      ord.status === 'READY' 
                        ? 'bg-emerald-500 text-slate-950 font-black animate-pulse' 
                        : ord.status === 'PREPARING' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {ord.status}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/80 my-2 text-xs">
                    {ord.items?.map((it, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between">
                        <span className="text-slate-200">
                          <strong className="text-orange-400 font-mono font-bold">×{it.quantity}</strong> {it.item_name_snapshot}
                        </span>
                        <span className="text-slate-400 font-mono">₹{it.price_snapshot * it.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Total:</span>{' '}
                      <strong className="text-white font-black text-sm">₹{ord.total}</strong>
                    </div>

                    {ord.status === 'READY' ? (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'SERVED')}
                        className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition cursor-pointer"
                      >
                        ✓ MARK SERVED
                      </button>
                    ) : ord.status === 'SERVED' ? (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'COMPLETED')}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                      >
                        COMPLETE
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Chef preparing...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 4. Bottom Navigation Bar for Mobile Phones */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 rounded-2xl flex flex-col items-center gap-1 font-bold text-xs transition cursor-pointer relative ${
              activeTab === 'alerts' ? 'bg-[#FF5C38] text-white shadow-md shadow-orange-500/25' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>Floor Alerts</span>
            {activeAlertsCount > 0 && (
              <span className={`absolute top-1 right-3 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'alerts' ? 'bg-white text-[#FF5C38]' : 'bg-rose-600 text-white animate-pulse'
              }`}>
                {activeAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`py-2 px-1 rounded-2xl flex flex-col items-center gap-1 font-bold text-xs transition cursor-pointer ${
              activeTab === 'tables' ? 'bg-[#FF5C38] text-white shadow-md shadow-orange-500/25' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Tables & POS</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 rounded-2xl flex flex-col items-center gap-1 font-bold text-xs transition cursor-pointer ${
              activeTab === 'orders' ? 'bg-[#FF5C38] text-white shadow-md shadow-orange-500/25' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Live Orders</span>
          </button>
        </div>
      </nav>

      {/* 5. MODAL: TABLE RUNNING BILL & SETTLEMENT */}
      {selectedTableForBill && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-800">
                  Table #{selectedTableForBill.table_number} Bill Summary
                </h3>
              </div>
              <button
                onClick={() => { setSelectedTableForBill(null); setTableBillData(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {loadingBill ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Calculating table bill...
                </div>
              ) : !tableBillData || tableBillData.active_orders.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No active orders for Table #{selectedTableForBill.table_number}.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Breakdown</div>
                    <div className="divide-y divide-slate-100 text-xs">
                      {tableBillData.active_orders.flatMap(o => o.items).map((it, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between text-slate-700">
                          <span>
                            <strong className="text-[#FF5C38] font-mono">×{it.quantity}</strong> {it.item_name_snapshot}
                          </span>
                          <span className="font-mono text-slate-900 font-bold">₹{it.price_snapshot * it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Total Items:</span>
                      <span className="font-mono text-slate-800 font-bold">{tableBillData.total_items}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal & Tax (included):</span>
                      <span className="font-mono text-slate-800 font-bold">₹{tableBillData.running_total}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-emerald-600">
                      <span>Grand Total:</span>
                      <span className="text-lg font-black font-mono">₹{tableBillData.running_total}</span>
                    </div>
                  </div>

                  {/* Print / Present Bill Option */}
                  <div className="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-600">
                    Hand this bill receipt to the guest at Table #{selectedTableForBill.table_number}
                  </div>
                </div>
              )}
            </div>

            {tableBillData && tableBillData.active_orders.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSettleBill('cash_table')}
                  disabled={settlingBill}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-600/25"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>PAID CASH (TABLE)</span>
                </button>

                <button
                  onClick={() => handleSettleBill('online')}
                  disabled={settlingBill}
                  className="py-3 px-3 rounded-xl bg-[#FF5C38] hover:bg-[#ff471e] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-orange-500/25"
                >
                  <Receipt className="w-4 h-4" />
                  <span>PAID VIA UPI / CARD</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL: POS QUICK PUNCH ORDER FOR TABLE */}
      {selectedTableForOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#FF5C38] text-white font-black text-sm flex items-center justify-center">
                  T{selectedTableForOrder.table_number}
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Punch Order for Table #{selectedTableForOrder.table_number}</h3>
                  <p className="text-[11px] text-slate-500">Select dishes to immediately send to the kitchen</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTableForOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Browser & Category Tabs */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/70">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={posSearch}
                  onChange={e => setPosSearch(e.target.value)}
                  placeholder="Search dishes by name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF5C38]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setPosCategory('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    posCategory === 'all' ? 'bg-[#FF5C38] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Items
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setPosCategory(c.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      posCategory === c.id ? 'bg-[#FF5C38] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dishes list */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredMenuItems.map(item => {
                const cartMatch = posCart.find(c => c.menu_item_id === item.id);
                const price = (item.discount_price && item.discount_price > 0) ? item.discount_price : item.price;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between hover:border-slate-300 transition shadow-2xs"
                  >
                    <div className="truncate mr-2">
                      <div className="font-bold text-xs text-slate-800 truncate">{item.name}</div>
                      <div className="text-[11px] font-mono text-emerald-600 font-bold mt-0.5">₹{price}</div>
                    </div>

                    {cartMatch ? (
                      <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2 py-1 rounded-xl shrink-0">
                        <button
                          onClick={() => handleUpdatePosQuantity(item.id, -1)}
                          className="w-5 h-5 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-[#FF5C38] px-1 font-mono">{cartMatch.quantity}</span>
                        <button
                          onClick={() => handleUpdatePosQuantity(item.id, 1)}
                          className="w-5 h-5 rounded-lg bg-[#FF5C38] text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToPosCart(item)}
                        className="px-3 py-1.5 rounded-xl bg-[#FF5C38] hover:bg-[#ff471e] text-white font-extrabold text-xs transition shrink-0 cursor-pointer"
                      >
                        + ADD
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cart & Punch Bar */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
              <input
                type="text"
                value={posOrderNotes}
                onChange={e => setPosOrderNotes(e.target.value)}
                placeholder="Kitchen note (e.g. less spicy, urgent)..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF5C38]"
              />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">Total: {posCart.reduce((s, i) => s + i.quantity, 0)} Items</div>
                  <div className="text-base font-black text-emerald-600 font-mono">₹{posTotal}</div>
                </div>

                <button
                  onClick={handleSubmitPosOrder}
                  disabled={punchingOrder || posCart.length === 0}
                  className="py-3 px-6 rounded-2xl bg-[#FF5C38] hover:bg-[#ff471e] text-white font-black text-xs transition cursor-pointer disabled:opacity-50 shadow-lg shadow-orange-500/25 flex items-center gap-1.5"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>{punchingOrder ? 'PUNCHING...' : 'PUNCH TO KITCHEN'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
