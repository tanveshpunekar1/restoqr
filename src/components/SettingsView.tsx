'use client';

import React, { useState } from 'react';
import { 
  Search, SlidersHorizontal, Store, Globe, Printer, CreditCard, 
  Users, Shield, Percent, Bell, Wifi, Archive, Moon, Volume2, 
  RefreshCw, Plus, Edit3, Trash2, Check, ChevronRight, Phone, Mail,
  Upload, X
} from 'lucide-react';
import { Restaurant } from '../types';
import { api } from '../lib/api';
import { useToast } from './Toast';

interface SettingsViewProps {
  restaurant: Restaurant | null;
  onRefresh: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onNavigateTab: (tab: string) => void;
}

interface UnitConversion {
  id: string;
  category: string;
  from_unit: string;
  to_unit: string;
  ratio: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  restaurant,
  onRefresh,
  soundEnabled,
  onToggleSound,
  onNavigateTab
}) => {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  // Unit Conversions State (Screenshot 4)
  const [conversions, setConversions] = useState<UnitConversion[]>([
    { id: '1', category: 'Weight', from_unit: 'kg', to_unit: 'gram', ratio: 1000 },
    { id: '2', category: 'Weight', from_unit: 'gram', to_unit: 'mg', ratio: 1000 },
    { id: '3', category: 'Volume', from_unit: 'Liter', to_unit: 'ml', ratio: 1000 }
  ]);
  const [showAddConversionModal, setShowAddConversionModal] = useState(false);
  const [conversionForm, setConversionForm] = useState({
    category: 'Weight',
    from_unit: '',
    to_unit: '',
    ratio: 1000
  });

  // Store Info Modal State
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: restaurant?.name || 'SuKopi',
    address: restaurant?.address || '123 Main Street, Anytown, USA',
    phone: restaurant?.phone || '(555) 123-4567',
    email: restaurant?.email || 'info@beanandbrew.com',
    opening_time: restaurant?.opening_time || '07:00 AM',
    closing_time: restaurant?.closing_time || '10:00 PM',
    tax_rate: restaurant?.tax_rate || 11.0,
    upi_id: restaurant?.upi_id || 'sukopi@upi'
  });
  const [savingStore, setSavingStore] = useState(false);

  // Handle Save Store Profile
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingStore(true);
      await api.updateRestaurantProfile({
        name: storeForm.name,
        address: storeForm.address,
        phone: storeForm.phone,
        opening_time: storeForm.opening_time,
        closing_time: storeForm.closing_time,
        tax_rate: storeForm.tax_rate,
        upi_id: storeForm.upi_id
      });
      showToast('Store settings saved successfully', 'success');
      setShowStoreModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save store settings', 'error');
    } finally {
      setSavingStore(false);
    }
  };

  // Add Unit Conversion
  const handleAddConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversionForm.from_unit || !conversionForm.to_unit) return;
    setConversions([
      ...conversions,
      {
        id: String(Date.now()),
        ...conversionForm
      }
    ]);
    setShowAddConversionModal(false);
    setConversionForm({ category: 'Weight', from_unit: '', to_unit: '', ratio: 1000 });
    showToast('Unit conversion rule added', 'success');
  };

  const handleDeleteConversion = (id: string) => {
    setConversions(conversions.filter(c => c.id !== id));
    showToast('Conversion rule removed', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header (Screenshot 4: "Settings - Configure your POS system", Search, Filter) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Configure your POS system</p>
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

      {/* Top Banner Card: Store Profile (Screenshot 4) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F0442B] text-white flex items-center justify-center shadow-md shadow-[#F0442B]/20 shrink-0">
            <Store className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg text-slate-900">{storeForm.name}</h3>
              <button
                type="button"
                onClick={() => setShowStoreModal(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Edit profile"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{storeForm.address}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5 font-medium">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{storeForm.phone}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{storeForm.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Open</span>
          </span>
        </div>
      </div>

      {/* 4 Grouped Cards Grid (Screenshot 4: Store, Business, System, Preferences) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GROUP 1: STORE */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Store</h4>
          <div className="bg-white border border-slate-200/80 rounded-3xl p-2 shadow-xs space-y-1">
            <div 
              onClick={() => setShowStoreModal(true)}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Store Information</h5>
                  <p className="text-[11px] text-slate-400">Name, address, operating hours</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>{storeForm.name}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => showToast('Region configured as USD · EST', 'info')}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Language & Region</h5>
                  <p className="text-[11px] text-slate-400">Language, currency, time zone</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>USD · EST</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => showToast('Receipt printer configured: Epson TM-T82X', 'info')}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Receipt & Printing</h5>
                  <p className="text-[11px] text-slate-400">Receipt template, printer settings</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>Epson TM-T82X</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 2: BUSINESS */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Business</h4>
          <div className="bg-white border border-slate-200/80 rounded-3xl p-2 shadow-xs space-y-1">
            <div 
              onClick={() => showToast('Cash at Table, Cash at Counter, UPI enabled', 'info')}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Payment Methods</h5>
                  <p className="text-[11px] text-slate-400">Manage accepted payment options</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>8 methods</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => onNavigateTab('staff')}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Staff & Permissions</h5>
                  <p className="text-[11px] text-slate-400">Roles, access levels, PIN code</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>5 staff</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => showToast('Security PIN active for cashier refunds and cancels', 'info')}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Security</h5>
                  <p className="text-[11px] text-slate-400">Password, PIN, session timeout</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>PIN enabled</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => setShowStoreModal(true)}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Taxes & Service Fees</h5>
                  <p className="text-[11px] text-slate-400">VAT settings, service fees</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>VAT {storeForm.tax_rate}%</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 3: SYSTEM */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">System</h4>
          <div className="bg-white border border-slate-200/80 rounded-3xl p-2 shadow-xs space-y-1">
            <div 
              onClick={() => showToast('All table calls and order notifications are enabled', 'info')}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Notifications</h5>
                  <p className="text-[11px] text-slate-400">Order, stock, shift notification preferences</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>All enabled</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => showToast('POS system is synchronized with backend server', 'info')}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Network & Synchronization</h5>
                  <p className="text-[11px] text-slate-400">Offline mode, data sync settings</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                <span>Online</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div 
              onClick={() => showToast('Automated backup scheduled every day at 2:00 AM', 'info')}
              className="p-3.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Backup & Recovery</h5>
                  <p className="text-[11px] text-slate-400">Data backup schedule</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span>Every day at 2 AM</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 4: PREFERENCES */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Preferences</h4>
          <div className="bg-white border border-slate-200/80 rounded-3xl p-2 shadow-xs space-y-1">
            {/* Dark Mode Toggle */}
            <div className="p-3.5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Dark Mode</h5>
                  <p className="text-[11px] text-slate-400">Switch to dark theme</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDarkMode(!darkMode);
                  showToast('Dark mode preference saved', 'info');
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                  darkMode ? 'bg-[#F0442B]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow-xs ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sound Alerts Toggle */}
            <div className="p-3.5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Sound Alerts</h5>
                  <p className="text-[11px] text-slate-400">Play sound on new orders</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSound}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                  soundEnabled ? 'bg-[#F0442B]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow-xs ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Automatic Synchronization Toggle */}
            <div className="p-3.5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#F0442B] flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Automatic Synchronization</h5>
                  <p className="text-[11px] text-slate-400">Sync data every 5 minutes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAutoSync(!autoSync);
                  showToast(`Automatic sync ${!autoSync ? 'enabled' : 'disabled'}`, 'info');
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                  autoSync ? 'bg-[#F0442B]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow-xs ${
                    autoSync ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Conversion Section (Screenshot 4: Clean Table & + Add Conversion) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-sm text-slate-900">Unit Conversion</h4>
          <button
            type="button"
            onClick={() => setShowAddConversionModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#F0442B] hover:bg-[#d93822] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-[#F0442B]/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Conversion</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">From Unit</th>
                  <th className="py-3.5 px-6">To Unit</th>
                  <th className="py-3.5 px-6">Ratio</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {conversions.map(conv => (
                  <tr key={conv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-6">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold text-[11px]">
                        {conv.category}
                      </span>
                    </td>
                    <td className="py-3 px-6 font-bold text-slate-900">{conv.from_unit}</td>
                    <td className="py-3 px-6 text-slate-600 flex items-center gap-1.5 pt-3.5">
                      <span className="text-slate-400">⇄</span>
                      <span>{conv.to_unit}</span>
                    </td>
                    <td className="py-3 px-6 font-mono font-bold text-slate-800">{conv.ratio}</td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => showToast(`Edit conversion for ${conv.from_unit}`, 'info')}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConversion(conv.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
        </div>
      </div>

      {/* Edit Store Profile Modal */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900 tracking-tight">Store Profile Configuration</h3>
              <button
                type="button"
                onClick={() => setShowStoreModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Restaurant / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Address</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={e => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={storeForm.phone}
                    onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={storeForm.email}
                    onChange={e => setStoreForm({ ...storeForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opening Time</label>
                  <input
                    type="text"
                    value={storeForm.opening_time}
                    onChange={e => setStoreForm({ ...storeForm, opening_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Closing Time</label>
                  <input
                    type="text"
                    value={storeForm.closing_time}
                    onChange={e => setStoreForm({ ...storeForm, closing_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT / Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={storeForm.tax_rate}
                    onChange={e => setStoreForm({ ...storeForm, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UPI ID for Payments</label>
                  <input
                    type="text"
                    value={storeForm.upi_id}
                    onChange={e => setStoreForm({ ...storeForm, upi_id: e.target.value })}
                    placeholder="sukopi@upi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStore}
                  className="px-5 py-2.5 rounded-xl bg-[#F0442B] hover:bg-[#d93822] text-white font-bold transition shadow-md shadow-[#F0442B]/20 cursor-pointer"
                >
                  {savingStore ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Unit Conversion Modal */}
      {showAddConversionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900 tracking-tight">Add Unit Conversion</h3>
              <button
                type="button"
                onClick={() => setShowAddConversionModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddConversion} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={conversionForm.category}
                  onChange={e => setConversionForm({ ...conversionForm, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                >
                  <option value="Weight">Weight</option>
                  <option value="Volume">Volume</option>
                  <option value="Count">Count / Pieces</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Unit *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kg, liter, box"
                    value={conversionForm.from_unit}
                    onChange={e => setConversionForm({ ...conversionForm, from_unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">To Unit *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. gram, ml, pcs"
                    value={conversionForm.to_unit}
                    onChange={e => setConversionForm({ ...conversionForm, to_unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Conversion Ratio *</label>
                <input
                  type="number"
                  required
                  placeholder="1000"
                  value={conversionForm.ratio}
                  onChange={e => setConversionForm({ ...conversionForm, ratio: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#F0442B]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddConversionModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#F0442B] hover:bg-[#d93822] text-white font-bold transition shadow-md shadow-[#F0442B]/20 cursor-pointer"
                >
                  Add Conversion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
