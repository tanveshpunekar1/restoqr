'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, Download, Plus, MoreVertical, 
  Edit3, Trash2, Copy, Sparkles, Check, CheckSquare, Square, 
  ArrowUpDown, Filter, AlertCircle, Upload, X, Coffee
} from 'lucide-react';
import { Category, MenuItem } from '../types';
import { api } from '../lib/api';
import { useToast } from './Toast';

interface MenuCatalogViewProps {
  items: MenuItem[];
  categories: Category[];
  onRefresh: () => void;
  currencySymbol?: string;
  adminRestaurantId?: string;
}

export const MenuCatalogView: React.FC<MenuCatalogViewProps> = ({
  items,
  categories,
  onRefresh,
  currencySymbol = '$',
  adminRestaurantId
}) => {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'stock'>('name');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    sku: '',
    price: 2.50,
    cost_price: 1.00,
    stock: 40,
    tag: '',
    description: '',
    image: '',
    weight: '250ml',
    is_veg: true,
    is_available: true,
    is_bestseller: false,
    prep_time: 5
  });

  // Filter & Sort
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(it => {
      if (selectedCategory !== 'all' && it.category_id !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          it.name.toLowerCase().includes(q) ||
          (it.sku || '').toLowerCase().includes(q) ||
          (it.description || '').toLowerCase().includes(q) ||
          (it.tag || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'stock') return (a.stock || 0) - (b.stock || 0);
      return 0;
    });

    return result;
  }, [items, selectedCategory, searchQuery, sortBy]);

  // Bulk Selection
  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredAndSortedItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredAndSortedItems.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  // Toggle Availability Switch (Screenshot 3)
  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const nextStatus = !item.is_available;
      await api.updateMenuItem(item.id, { is_available: nextStatus }, adminRestaurantId);
      showToast(`${item.name} is now ${nextStatus ? 'Available' : 'Unavailable'}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update availability', 'error');
    }
  };

  // Open Add Product Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id || 'cat-coffee',
      sku: `AF-CF-${String(items.length + 10).padStart(3, '0')}`,
      price: 2.50,
      cost_price: 1.20,
      stock: 40,
      tag: 'Classic',
      description: '',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      weight: '250ml',
      is_veg: true,
      is_available: true,
      is_bestseller: false,
      prep_time: 5
    });
    setShowProductModal(true);
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category_id: item.category_id,
      sku: item.sku || `AF-CF-0${item.id.slice(-2)}`,
      price: item.price,
      cost_price: item.cost_price || 1.00,
      stock: item.stock !== undefined ? item.stock : 40,
      tag: item.tag || '',
      description: item.description || '',
      image: item.image || '',
      weight: item.weight || '',
      is_veg: item.is_veg,
      is_available: item.is_available,
      is_bestseller: item.is_bestseller,
      prep_time: item.prep_time || 5
    });
    setOpenActionDropdownId(null);
    setShowProductModal(true);
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category_id || formData.price <= 0) {
      showToast('Please enter name, category, and valid price', 'error');
      return;
    }

    try {
      setSavingItem(true);
      if (editingItem) {
        await api.updateMenuItem(editingItem.id, formData, adminRestaurantId);
        showToast('Product updated successfully', 'success');
      } else {
        await api.createMenuItem(formData, adminRestaurantId);
        showToast('New product added to catalog', 'success');
      }
      setShowProductModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  // Duplicate Product
  const handleDuplicateProduct = async (item: MenuItem) => {
    try {
      await api.duplicateMenuItem(item.id, adminRestaurantId);
      showToast(`Duplicated ${item.name}`, 'success');
      setOpenActionDropdownId(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to duplicate product', 'error');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await api.deleteMenuItem(item.id, adminRestaurantId);
      showToast('Product removed from catalog', 'success');
      setOpenActionDropdownId(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  // Export Catalog to CSV
  const handleExportCatalog = () => {
    try {
      const headers = ['Name', 'Category', 'SKU', 'Stock', 'Price', 'Status'];
      const rows = filteredAndSortedItems.map(it => {
        const cat = categories.find(c => c.id === it.category_id)?.name || 'General';
        return [
          `"${it.name.replace(/"/g, '""')}"`,
          `"${cat}"`,
          `"${it.sku || ''}"`,
          it.stock || 0,
          it.price,
          it.is_available ? 'Available' : 'Out of Stock'
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `sukopi-products-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Catalog exported to CSV successfully', 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  // Gemini AI Description Generator
  const handleGenerateAiDescription = async () => {
    if (!formData.name.trim()) {
      showToast('Please enter the product name first', 'info');
      return;
    }
    const cat = categories.find(c => c.id === formData.category_id);
    try {
      setGeneratingAi(true);
      const token = localStorage.getItem('restoqr_token');
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: cat?.name || 'Coffee',
          is_veg: formData.is_veg
        })
      });
      const data = await res.json();
      if (data.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        showToast('Appetizing description generated with Gemini AI!', 'success');
      } else {
        showToast(data.error || 'Could not generate description', 'error');
      }
    } catch {
      showToast('AI generation failed', 'error');
    } finally {
      setGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header (Screenshot 3: "Product - Manage your menu catalog", Search, Filter) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Product</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Manage your menu catalog</p>
        </div>

        {/* Search bar + filter button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-[#F0442B] focus:ring-1 focus:ring-[#F0442B]"
            />
          </div>
          <button
            type="button"
            className="p-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 shadow-xs hover:border-slate-300 transition shrink-0 cursor-pointer"
            title="Filter"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subheader Controls (Screenshot 3: Category dropdown, Sort dropdown, item count, Export, + Add Product) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-transparent">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2 shadow-xs">
            <span className="text-slate-400">Category</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2 shadow-xs">
            <span className="text-slate-400">Sort</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="name">Name</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock">Stock Quantity</option>
            </select>
          </div>

          {/* Products Count */}
          <div className="text-xs font-bold text-slate-500 pl-1">
            {filteredAndSortedItems.length} products
          </div>
        </div>

        {/* Action Buttons: Export & + Add Product */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCatalog}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-2xl bg-[#F0442B] hover:bg-[#d93822] text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-[#F0442B]/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Product Management Table (Matches Screenshot 3) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedItemIds.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#F0442B] focus:ring-[#F0442B] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4">Product</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">SKU</th>
                <th className="py-4 px-4">Stock</th>
                <th className="py-4 px-4">Price</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    No products found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map(item => {
                  const catName = categories.find(c => c.id === item.category_id)?.name || 'Coffee';
                  const isLowStock = (item.stock || 0) <= 20;
                  const isChecked = selectedItemIds.has(item.id);

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-slate-50/60 transition group"
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectItem(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#F0442B] focus:ring-[#F0442B] cursor-pointer"
                        />
                      </td>

                      {/* Product (Thumbnail + Title + Subtag / Badge) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 group-hover:text-[#F0442B] transition">
                                {item.name}
                              </span>
                              {item.tag === 'NEW' && (
                                <span className="px-1.5 py-0.2 rounded-md bg-[#F0442B] text-white font-bold text-[9px] uppercase">
                                  NEW
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {item.tag && item.tag !== 'NEW' ? item.tag : (item.weight || 'Signature')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {catName}
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {item.sku || 'AF-CF-010'}
                      </td>

                      {/* Stock (Highlighted orange if low) */}
                      <td className="py-3 px-4">
                        <span className={`font-bold ${isLowStock ? 'text-amber-500' : 'text-slate-800'}`}>
                          {item.stock !== undefined ? item.stock : 40}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {currencySymbol}{item.price.toFixed(2)}
                      </td>

                      {/* Status Toggle Switch (Screenshot 3: iOS green toggle) */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                            item.is_available ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={item.is_available ? 'Click to disable' : 'Click to enable'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow-xs ${
                              item.is_available ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions (3-dots dropdown) */}
                      <td className="py-3 px-4 text-right relative">
                        <button
                          type="button"
                          onClick={() => setOpenActionDropdownId(openActionDropdownId === item.id ? null : item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Dropdown Menu */}
                        {openActionDropdownId === item.id && (
                          <div className="absolute right-4 top-10 w-36 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 p-1.5 space-y-1 text-left">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateProduct(item)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Duplicate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(item)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900 tracking-tight">
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Caffe Mocha, Butter Croissant"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="AF-CF-012"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tag (Subtext)</label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={e => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="Signature / NEW"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Appetizing Description</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={generatingAi}
                    className="text-[11px] text-[#F0442B] hover:text-[#d93822] font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generatingAi ? 'Generating...' : 'AI Generate'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Rich aroma, single-origin beans..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-[#F0442B] focus:ring-[#F0442B]"
                  />
                  <span className="font-bold text-slate-700">Available in POS</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_bestseller}
                    onChange={e => setFormData({ ...formData, is_bestseller: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-[#F0442B] focus:ring-[#F0442B]"
                  />
                  <span className="font-bold text-slate-700">Bestseller Badge</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2.5 rounded-xl bg-[#F0442B] hover:bg-[#d93822] text-white font-bold transition shadow-md shadow-[#F0442B]/20 cursor-pointer"
                >
                  {savingItem ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
