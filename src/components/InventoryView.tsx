'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, Search, AlertTriangle, CheckCircle2, XCircle, 
  Plus, Minus, RefreshCw, ArrowUpDown, Filter, Edit3, X
} from 'lucide-react';
import { MenuItem, Category } from '../types';
import { api } from '../lib/api';
import { useToast } from './Toast';

interface InventoryViewProps {
  items: MenuItem[];
  categories: Category[];
  onRefresh: () => void;
  currencySymbol?: string;
  adminRestaurantId?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  categories,
  onRefresh,
  currencySymbol = '$',
  adminRestaurantId
}) => {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out'>('all');
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);

  // Stats
  const totalItems = items.length;
  const lowStockItems = useMemo(() => items.filter(i => (i.stock || 0) > 0 && (i.stock || 0) <= 20), [items]);
  const outOfStockItems = useMemo(() => items.filter(i => (i.stock || 0) === 0), [items]);
  const totalStockCount = useMemo(() => items.reduce((sum, i) => sum + (i.stock || 0), 0), [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const stock = it.stock || 0;
      if (filterMode === 'low' && (stock <= 0 || stock > 20)) return false;
      if (filterMode === 'out' && stock > 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          it.name.toLowerCase().includes(q) ||
          (it.sku || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, filterMode, searchQuery]);

  // Adjust stock handler
  const handleQuickAdjust = async (item: MenuItem, delta: number) => {
    const current = item.stock || 0;
    const newStock = Math.max(0, current + delta);
    try {
      setAdjustingItemId(item.id);
      await api.updateMenuItem(item.id, { stock: newStock }, adminRestaurantId);
      showToast(`Updated stock for ${item.name} to ${newStock}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stock', 'error');
    } finally {
      setAdjustingItemId(null);
    }
  };

  const handleSetStock = async (item: MenuItem, target: number) => {
    try {
      setAdjustingItemId(item.id);
      await api.updateMenuItem(item.id, { stock: target }, adminRestaurantId);
      showToast(`Restocked ${item.name} to ${target}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stock', 'error');
    } finally {
      setAdjustingItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Inventory</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Track real-time stock levels, low-stock warnings, and restock actions</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search SKU, item name..."
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-[#F0442B]"
          />
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilterMode('all')}
          className={`p-5 rounded-3xl bg-white border transition cursor-pointer shadow-xs ${
            filterMode === 'all' ? 'border-[#F0442B] ring-1 ring-[#F0442B]/20' : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-bold text-slate-400">Total Tracked Products</div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalItems}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">{totalStockCount} units in stock</div>
        </div>

        <div 
          onClick={() => setFilterMode('low')}
          className={`p-5 rounded-3xl bg-white border transition cursor-pointer shadow-xs ${
            filterMode === 'low' ? 'border-[#F0442B] ring-1 ring-[#F0442B]/20' : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock (≤ 20)</span>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{lowStockItems.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Reorder recommended</div>
        </div>

        <div 
          onClick={() => setFilterMode('out')}
          className={`p-5 rounded-3xl bg-white border transition cursor-pointer shadow-xs ${
            filterMode === 'out' ? 'border-[#F0442B] ring-1 ring-[#F0442B]/20' : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Out of Stock</span>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">{outOfStockItems.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Disabled in POS</div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-400">Est. Inventory Value</div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {currencySymbol}{(items.reduce((sum, i) => sum + (i.price * (i.stock || 0)), 0)).toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">Active valuation</div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Product</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6">Current Stock</th>
                <th className="py-4 px-6">Stock Status</th>
                <th className="py-4 px-6 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const stock = item.stock !== undefined ? item.stock : 40;
                  const catName = categories.find(c => c.id === item.category_id)?.name || 'General';
                  const isLow = stock > 0 && stock <= 20;
                  const isOut = stock === 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-sm text-slate-900 block">{item.name}</span>
                            <span className="text-[11px] text-slate-400">{item.weight || 'Standard'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-6 text-slate-600 font-medium">{catName}</td>
                      <td className="py-3 px-6 font-mono text-slate-500 text-[11px]">{item.sku || 'AF-CF-010'}</td>

                      <td className="py-3 px-6 font-bold text-sm text-slate-900">
                        <span className={isOut ? 'text-rose-600' : isLow ? 'text-amber-500' : 'text-slate-900'}>
                          {stock}
                        </span>
                      </td>

                      <td className="py-3 px-6">
                        {isOut ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 font-bold text-[10px]">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={adjustingItemId === item.id}
                            onClick={() => handleQuickAdjust(item, -5)}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
                            title="Subtract 5 units"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            disabled={adjustingItemId === item.id}
                            onClick={() => handleQuickAdjust(item, 10)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
                            title="Add 10 units"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            disabled={adjustingItemId === item.id}
                            onClick={() => handleSetStock(item, 50)}
                            className="px-3 py-1 rounded-lg bg-[#F0442B] hover:bg-[#d93822] text-white font-bold text-xs transition shadow-xs cursor-pointer"
                            title="Restock to 50"
                          >
                            Restock 50
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
