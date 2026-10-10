'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Minus, Trash2, Utensils, Coffee, ShoppingBag, 
  Check, CheckCircle2, AlertCircle, Sparkles, ChefHat, User, Phone, 
  SlidersHorizontal, Edit3, Store, Zap, Leaf, Star
} from 'lucide-react';
import { Category, MenuItem, RestaurantTable, Order } from '../types';
import { api } from '../lib/api';
import { useToast } from './Toast';

interface PosTerminalProps {
  categories: Category[];
  items: MenuItem[];
  tables: RestaurantTable[];
  onOrderPlaced: (order: Order) => void;
  adminRestaurantId?: string;
  restaurantName?: string;
  currencySymbol?: string;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
  selected_size?: string;
  selected_size_price?: number;
  selected_addons?: any[];
  special_instructions?: string;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  categories,
  items,
  tables,
  onOrderPlaced,
  adminRestaurantId,
  restaurantName,
  currencySymbol = '$'
}) => {
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [diningMode, setDiningMode] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [seatingArea, setSeatingArea] = useState<'indoor' | 'outdoor'>('indoor');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(
    tables.length > 0 ? tables[0].table_number : 1
  );
  const [customerName, setCustomerName] = useState<string>('Customer Name');
  const [isEditingCustomerName, setIsEditingCustomerName] = useState<boolean>(false);
  const [customerId] = useState<string>(() => '#' + Math.floor(10000000 + Math.random() * 90000000));
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);

  // Category items count helper
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    categories.forEach(c => {
      counts[c.id] = items.filter(it => it.category_id === c.id).length;
    });
    return counts;
  }, [categories, items]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (selectedCategory !== 'all' && it.category_id !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = it.name.toLowerCase().includes(query);
        const matchDesc = (it.description || '').toLowerCase().includes(query);
        return matchName || matchDesc;
      }
      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  // Category Icon mapper
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('non') || lower.includes('beverage') || lower.includes('juice') || lower.includes('shake')) {
      return <Zap className="w-4 h-4" />;
    }
    if (lower.includes('tea')) {
      return <Leaf className="w-4 h-4" />;
    }
    if (lower.includes('pastr') || lower.includes('cake') || lower.includes('bakery') || lower.includes('food')) {
      return <Utensils className="w-4 h-4" />;
    }
    if (lower.includes('snack') || lower.includes('dessert') || lower.includes('starter')) {
      return <Star className="w-4 h-4" />;
    }
    return <Coffee className="w-4 h-4" />;
  };

  // Add item to cart
  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(c => c.item.id === item.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, { item, quantity: 1 }];
    });
    showToast(`Added ${item.name} to order`, 'info');
  };

  // Adjust item quantity
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(c => {
          if (c.item.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Remove item from cart
  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  // Clear cart
  const handleClearCart = () => {
    setCart([]);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, c) => {
      const price = (c.item.discount_price && c.item.discount_price > 0) ? c.item.discount_price : c.item.price;
      return sum + (price + (c.selected_size_price || 0)) * c.quantity;
    }, 0);
  }, [cart]);

  const tax = Math.round(subtotal * 0.11 * 100) / 100; // 11% PPN / VAT as in reference
  const grandTotal = Math.round((subtotal + tax) * 100) / 100;

  // Place Order handler
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast('Please add items to cart before placing an order', 'error');
      return;
    }

    try {
      setPlacingOrder(true);
      const itemsPayload = cart.map(c => {
        const price = (c.item.discount_price && c.item.discount_price > 0) ? c.item.discount_price : c.item.price;
        return {
          menu_item_id: c.item.id,
          item_name_snapshot: c.item.name,
          price_snapshot: price + (c.selected_size_price || 0),
          quantity: c.quantity,
          selected_size: c.selected_size,
          selected_size_price: c.selected_size_price,
          selected_addons: c.selected_addons,
          special_instructions: c.special_instructions
        };
      });

      const res = await api.waiterPunchOrder({
        table_number: diningMode === 'dine_in' ? selectedTableNumber : 0,
        items: itemsPayload,
        customer_name: customerName.trim() === 'Customer Name' ? `Guest ${customerId}` : customerName.trim(),
        order_type: diningMode,
        payment_method: 'cash_table'
      }, adminRestaurantId);

      showToast(`Order #${res.order.order_number} sent to kitchen!`, 'success');
      setCart([]);
      onOrderPlaced(res.order);
    } catch (err: any) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 h-full min-h-0 overflow-hidden">
      {/* LEFT / CENTER: MENU CATALOG & PRODUCTS */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header Greeting & Search (Compact shrink-0 bar) */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Let's do your best today</span>
              <span className="text-base">🚀</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">{currentDateStr} • Active POS Terminal</p>
          </div>

          {/* Search bar + filter button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search food item..."
                className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-[#F0442B] focus:ring-1 focus:ring-[#F0442B]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              className="p-2 rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 shadow-xs hover:border-slate-300 transition shrink-0 cursor-pointer"
              title="Reset Search & Filters"
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Category Cards / Pills (Compact, non-overflowing) */}
        <div className="shrink-0 flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl border text-left transition shrink-0 cursor-pointer flex items-center gap-2 text-xs font-bold ${
              selectedCategory === 'all'
                ? 'bg-rose-50/70 border-[#F0442B] text-[#F0442B] shadow-xs'
                : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F0442B]" />
            <span>All Dishes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
              selectedCategory === 'all' ? 'bg-[#F0442B]/10 text-[#F0442B]' : 'bg-slate-100 text-slate-500'
            }`}>
              {categoryCounts['all'] || 0}
            </span>
          </button>

          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl border text-left transition shrink-0 cursor-pointer flex items-center gap-2 text-xs font-bold ${
                  isSelected
                    ? 'bg-rose-50/70 border-[#F0442B] text-[#F0442B] shadow-xs'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
                }`}
              >
                {getCategoryIcon(cat.name)}
                <span className="truncate max-w-[110px]">{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isSelected ? 'bg-[#F0442B]/10 text-[#F0442B]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Products Grid (Clean internal scroll, responsive multi-column, no window scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center shadow-xs my-4">
              <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 text-sm">No items found</h4>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting another category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredItems.map(item => {
                const inCartItem = cart.find(c => c.item.id === item.id);
                const inCartQty = inCartItem ? inCartItem.quantity : 0;
                const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
                const displayPrice = hasDiscount ? item.discount_price : item.price;
                const discountPercent = hasDiscount 
                  ? Math.round(((item.price - item.discount_price!) / item.price) * 100) 
                  : null;
                const stockDisplay = (item as any).stock !== undefined ? (item as any).stock : 45;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-xs hover:shadow-md hover:border-slate-300 transition cursor-pointer flex flex-col group relative select-none"
                  >
                    {/* Image container: compact, nicely proportioned */}
                    <div className="h-28 sm:h-32 w-full bg-slate-100 rounded-xl relative overflow-hidden shrink-0">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      {/* Stock badge top-left */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-slate-800 text-[9px] sm:text-[10px] font-bold shadow-xs">
                        {stockDisplay} Stocks
                      </div>

                      {/* Quantity in cart badge */}
                      {inCartQty > 0 && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F0442B] text-white text-[10px] sm:text-xs font-black flex items-center justify-center shadow-md animate-scale">
                          {inCartQty}
                        </div>
                      )}
                    </div>

                    {/* Info: Title & Price + Discount / Add Button */}
                    <div className="pt-2 pb-0.5 px-0.5 flex flex-col justify-between flex-1 min-h-[50px]">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#F0442B] transition line-clamp-1" title={item.name}>
                          {item.name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                        <div className="font-black text-xs text-slate-900">
                          {currencySymbol} {displayPrice?.toFixed(2)}
                        </div>

                        {discountPercent ? (
                          <span className="text-[#F0442B] font-black text-[11px] bg-rose-50 px-1.5 py-0.5 rounded-md">
                            {discountPercent}% Off
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-orange-50 hover:bg-[#F0442B] hover:text-white text-[#F0442B] flex items-center justify-center transition cursor-pointer"
                            title="Add to order"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: ORDER CART PANEL (Pinned height, fits single page) */}
      <div className="w-full lg:w-80 xl:w-96 bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col shrink-0 h-full overflow-hidden">
        {/* Top Header of Cart: Customer Info + Mode + Seating + Table */}
        <div className="shrink-0 space-y-2.5 pb-2.5 border-b border-slate-100">
          {/* Header Customer Info */}
          <div className="flex items-center justify-between">
            {isEditingCustomerName ? (
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onBlur={() => setIsEditingCustomerName(false)}
                autoFocus
                className="font-bold text-xs sm:text-sm text-slate-900 border-b border-[#F0442B] outline-none"
              />
            ) : (
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                <span className="truncate max-w-[170px]">{customerName}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingCustomerName(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition"
                  title="Edit Customer Name"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </h3>
            )}
            <div className="text-[11px] text-slate-400 font-mono">{customerId}</div>
          </div>

          {/* Dine In vs Take Away Segmented Pills */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 text-xs font-bold">
            <button
              type="button"
              onClick={() => setDiningMode('dine_in')}
              className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                diningMode === 'dine_in'
                  ? 'bg-white text-[#F0442B] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Dine in</span>
            </button>
            <button
              type="button"
              onClick={() => setDiningMode('takeaway')}
              className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                diningMode === 'takeaway'
                  ? 'bg-white text-[#F0442B] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Take away</span>
            </button>
          </div>

          {/* Table Picker (When Dine In is selected) */}
          {diningMode === 'dine_in' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Select Table</span>
                <span className="text-[#F0442B] font-bold">Table #{selectedTableNumber}</span>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {tables.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTableNumber(t.table_number)}
                    className={`py-1 px-2.5 rounded-lg border text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedTableNumber === t.table_number
                        ? 'bg-[#F0442B] text-white border-[#F0442B] shadow-xs'
                        : t.status === 'occupied'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    T-{t.table_number}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Middle: Your order items list (flex-1 min-h-0 overflow-y-auto) */}
        <div className="flex-1 min-h-0 flex flex-col py-2">
          <div className="flex items-center justify-between pb-1 text-xs font-bold text-slate-700 shrink-0">
            <span>Order Items ({cart.reduce((s, c) => s + c.quantity, 0)})</span>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-[11px] text-slate-400 hover:text-rose-500 font-semibold transition cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-6 space-y-1.5">
                <ShoppingBag className="w-8 h-8 text-slate-300 stroke-1" />
                <p className="text-xs text-slate-400 font-medium">No items added yet</p>
                <p className="text-[10px] text-slate-400">Click any dish to add to order</p>
              </div>
            ) : (
              cart.map(c => {
                const price = (c.item.discount_price && c.item.discount_price > 0) ? c.item.discount_price : c.item.price;
                const lineTotal = (price + (c.selected_size_price || 0)) * c.quantity;
                return (
                  <div
                    key={c.item.id}
                    className="p-2 rounded-xl bg-slate-50/90 border border-slate-100 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={c.item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                        alt={c.item.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-800 truncate text-xs">{c.item.name}</h5>
                        <div className="text-[10px] text-slate-500 font-mono">{currencySymbol} {price.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(c.item.id, -1)}
                          className="w-4 h-4 rounded text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-4 text-center font-bold text-xs text-slate-800">{c.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(c.item.id, 1)}
                          className="w-4 h-4 rounded text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="w-11 text-right font-bold text-xs text-slate-900 font-mono">
                        {currencySymbol}{lineTotal.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(c.item.id)}
                        className="text-slate-300 hover:text-rose-500 p-0.5"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Cart Summary & Place Order Button */}
        <div className="shrink-0 pt-2.5 border-t border-slate-100 space-y-2 bg-white">
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center justify-between text-[11px]">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-slate-800">{currencySymbol} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>Tax / GST (5%)</span>
              <span className="font-mono font-bold text-slate-800">{currencySymbol} {tax.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
              <span>Total Payable</span>
              <span className="text-[#F0442B] font-mono text-sm sm:text-base font-black">{currencySymbol} {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={cart.length === 0 || placingOrder}
            className="w-full py-2.5 sm:py-3 rounded-xl bg-[#F0442B] hover:bg-[#d93822] disabled:opacity-40 text-white font-bold text-xs tracking-wide shadow-md shadow-[#F0442B]/20 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{placingOrder ? 'Sending to Kitchen...' : `Place Order (Table #${selectedTableNumber})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
