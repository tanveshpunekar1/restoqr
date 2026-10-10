'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { Restaurant, Category, MenuItem, RestaurantTable, Order, OrderItem } from '../types';
import { useToast } from '../components/Toast';
import { 
  ShoppingBag, Wifi, MapPin, Phone, Clock, ArrowLeft, 
  Plus, Minus, Check, CheckCircle2, AlertCircle, Sparkles, 
  CreditCard, Banknote, Store, Globe, ChevronRight, X, Utensils,
  Search, Flame, ShieldCheck, HeartHandshake, Receipt, BellRing,
  Coffee, RefreshCw, QrCode, User, History, LogIn, LogOut, Smartphone
} from 'lucide-react';
import { OnlineUpiPaymentModal } from '../components/OnlineUpiPaymentModal';

interface CustomerMenuProps {
  slug: string;
  tableNumber?: number;
  onNavigate: (path: string) => void;
}

export interface SelectedCartItem {
  id: string; // unique cart entry id (to support multiple customizations of same dish)
  item: MenuItem;
  quantity: number;
  selected_size?: string;
  selected_size_price: number;
  selected_addons: { id: string; name: string; price: number }[];
  spice_level?: string;
  special_instructions?: string;
  unit_price: number;
}

type Language = 'en' | 'hi' | 'mr';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    table: 'TABLE',
    orderingFrom: "You're ordering from Table",
    searchPlaceholder: 'Search dishes, pizzas, coffee...',
    recommended: 'Chef Recommended & Bestsellers',
    all: 'All Dishes',
    vegOnly: 'Veg Only',
    bestseller: 'Bestseller',
    add: 'ADD',
    customisable: 'Customisable',
    viewOrder: 'SHOW MY ORDER',
    viewTableBill: 'Table Running Tab',
    callWaiter: 'Call Waiter',
    specialInstructions: 'Special cooking instructions (e.g. less spicy, extra napkins)',
    selectSize: 'Select Size / Portion',
    choiceOfAddons: 'Customise with Add-ons',
    spiceLevel: 'Spice Level',
    payMethod: 'Select Payment Method',
    onlineUpi: 'Online UPI / Card',
    cashTable: 'Cash at Table',
    cashCounter: 'Pay at Counter',
    confirmOrder: 'CONFIRM ORDER',
    orderConfirmed: 'ORDER CONFIRMED & SENT TO KITCHEN',
    orderMore: 'ORDER MORE / BACK TO MENU',
    close: 'Close',
    clearCart: 'Clear Cart',
    addMoreItems: '+ ADD MORE ITEMS',
    coupon: 'Have a Promo / Coupon Code?',
    apply: 'APPLY',
    subtotal: 'Subtotal',
    discount: 'Coupon Savings',
    gstTax: 'Restaurant GST / Tax',
    serviceCharge: 'Service Charge',
    total: 'Grand Total',
    wifi: 'Free Guest Wi-Fi',
    guestDetails: 'Guest Details (Optional - for order updates)',
    prepTime: 'mins prep',
    runningBillTitle: 'Table Running Bill & Active Orders',
    assistanceTitle: 'Need Assistance at Table?',
    sendRequest: 'Call Staff Now',
    itemCustomized: 'Item customized and added to cart!',
    couponSuccess: 'Coupon applied successfully!',
    orderSuccess: 'Order confirmed and sent to kitchen display!'
  },
  hi: {
    table: 'टेबल',
    orderingFrom: 'आप टेबल से ऑर्डर कर रहे हैं',
    searchPlaceholder: 'स्वादिष्ट व्यंजन, पिज्जा, कॉफ़ी खोजें...',
    recommended: 'विशेष शेफ सिफारिशें एवं लोकप्रिय',
    all: 'सभी व्यंजन',
    vegOnly: 'केवल शाकाहारी',
    bestseller: 'सबसे लोकप्रिय',
    add: 'जोड़ें',
    customisable: 'अनुकूलन योग्य',
    viewOrder: 'मेरा ऑर्डर देखें',
    viewTableBill: 'टेबल का कुल बिल',
    callWaiter: 'वेटर को बुलाएं',
    specialInstructions: 'विशेष निर्देश (उदा. कम तीखा, अतिरिक्त नैपकिन)',
    selectSize: 'आकार / सर्विंग चुनें',
    choiceOfAddons: 'अतिरिक्त टॉपिंग / ऐड-ऑन्स',
    spiceLevel: 'तीखापन स्तर',
    payMethod: 'भुगतान का तरीका चुनें',
    onlineUpi: 'ऑनलाइन यूपीआई / कार्ड',
    cashTable: 'टेबल पर नकद',
    cashCounter: 'काउंटर पर भुगतान',
    confirmOrder: 'ऑर्डर कन्फर्म करें',
    orderConfirmed: 'ऑर्डर कन्फर्म हुआ और किचन भेजा गया',
    orderMore: 'और ऑर्डर करें / मेनू पर वापस जाएं',
    close: 'बंद करें',
    clearCart: 'कार्ट खाली करें',
    addMoreItems: '+ और व्यंजन जोड़ें',
    coupon: 'कूपन कोड दर्ज करें',
    apply: 'लागू करें',
    subtotal: 'उप-योग',
    discount: 'कूपन छूट',
    gstTax: 'जीएसटी एवं कर',
    serviceCharge: 'सर्विस चार्ज',
    total: 'कुल देय राशि',
    wifi: 'मुफ्त गेस्ट वाई-फाई',
    guestDetails: 'अतिथि विवरण (वैकल्पिक)',
    prepTime: 'मिनट तैयारी',
    runningBillTitle: 'टेबल का चालू बिल और सक्रिय ऑर्डर',
    assistanceTitle: 'टेबल पर सहायता चाहिए?',
    sendRequest: 'स्टाफ को बुलाएं',
    itemCustomized: 'आइटम को अनुकूलित कर कार्ट में जोड़ा गया!',
    couponSuccess: 'कूपन सफलतापूर्वक लागू हुआ!',
    orderSuccess: 'ऑर्डर किचन में सफलतापूर्वक भेजा गया!'
  },
  mr: {
    table: 'टेबल',
    orderingFrom: 'तुम्ही टेबलवरून ऑर्डर करत आहात',
    searchPlaceholder: 'स्वादिष्ट पदार्थ, पिझ्झा, कॉफी शोधा...',
    recommended: 'शेफची शिफारस आणि लोकप्रिय',
    all: 'सर्व पदार्थ',
    vegOnly: 'फक्त शाकाहारी',
    bestseller: 'सर्वात लोकप्रिय',
    add: 'जोडा',
    customisable: 'सानुकूल पर्याय',
    viewOrder: 'माझी ऑर्डर पहा',
    viewTableBill: 'टेबलचे चालू बिल',
    callWaiter: 'वेटरला बोलवा',
    specialInstructions: 'विशेष सूचना (उदा. कमी तिखट, अतिरिक्त नॅपकिन)',
    selectSize: 'आकार / प्रमाण निवडा',
    choiceOfAddons: 'अतिरिक्त टॉपिंग्ज / ॲड-ऑन्स',
    spiceLevel: 'तिखटपणा',
    payMethod: 'पेमेंट पद्धत निवडा',
    onlineUpi: 'ऑनलाइन यूपीआय / कार्ड',
    cashTable: 'टेबलवर रोख द्या',
    cashCounter: 'काउंटरवर पैसे द्या',
    confirmOrder: 'ऑर्डर कन्फर्म करा',
    orderConfirmed: 'ऑर्डर निश्चित झाली आणि स्वयंपाकघरात पाठवली',
    orderMore: 'आणखी ऑर्डर करा / मेनूकडे परत',
    close: 'बंद करा',
    clearCart: 'कार्ट रिकामी करा',
    addMoreItems: '+ आणखी पदार्थ जोडा',
    coupon: 'कूपन कोड आहे का?',
    apply: 'लागू करा',
    subtotal: 'एकूण किंमत',
    discount: 'कूपन सवलत',
    gstTax: 'जीएसटी आणि कर',
    serviceCharge: 'सर्व्हिस चार्ज',
    total: 'एकूण देय रक्कम',
    wifi: 'मोफत गेस्ट वाय-फाय',
    guestDetails: 'ग्राहक तपशील (ऐच्छिक)',
    prepTime: 'मिनिटे वेळ',
    runningBillTitle: 'टेबलचे चालू बिल आणि सक्रिय ऑर्डर्स',
    assistanceTitle: 'टेबलवर मदत हवी आहे का?',
    sendRequest: 'स्टाफला बोलवा',
    itemCustomized: 'पदार्थ सानुकूल करून कार्टमध्ये जोडला गेला!',
    couponSuccess: 'कूपन यशस्वीरित्या लागू झाले!',
    orderSuccess: 'ऑर्डर निश्चित झाली व स्वयंपाकघरात पाठवली गेली!'
  }
};

export const CustomerMenu: React.FC<CustomerMenuProps> = ({ 
  slug, 
  tableNumber: initialTableNumber, 
  onNavigate 
}) => {
  const { showToast } = useToast();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [availableTables, setAvailableTables] = useState<{ table_number: number }[]>([]);
  
  // Table context & language
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | undefined>(initialTableNumber);
  const [language, setLanguage] = useState<Language>('en');
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false);

  // Cart & Checkout
  const [cart, setCart] = useState<SelectedCartItem[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash_table' | 'online' | 'cash_counter'>('cash_table');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'all' | 'phonepe' | 'gpay' | 'paytm' | 'qr'>('all');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Customer Account & Old Orders State
  const [loggedInCustomer, setLoggedInCustomer] = useState<any | null>(null);
  const [showCustomerAuthModal, setShowCustomerAuthModal] = useState(false);
  const [customerLoginPhone, setCustomerLoginPhone] = useState('');
  const [customerLoginName, setCustomerLoginName] = useState('');
  const [loggingInCustomer, setLoggingInCustomer] = useState(false);
  const [customerOldOrders, setCustomerOldOrders] = useState<Order[]>([]);
  const [loadingOldOrders, setLoadingOldOrders] = useState(false);

  // Food Customization Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [modalSize, setModalSize] = useState<string>('');
  const [modalAddons, setModalAddons] = useState<{ id: string; name: string; price: number }[]>([]);
  const [modalSpice, setModalSpice] = useState<string>('');
  const [modalInstructions, setModalInstructions] = useState<string>('');
  const [modalQuantity, setModalQuantity] = useState<number>(1);

  // Table Running Bill Modal
  const [showRunningBillModal, setShowRunningBillModal] = useState(false);
  const [runningBillLoading, setRunningBillLoading] = useState(false);
  const [runningBillData, setRunningBillData] = useState<{
    table_number: number;
    running_total: number;
    total_items: number;
    orders: Order[];
  } | null>(null);

  // Service Request / Call Waiter Modal
  const [showAssistanceModal, setShowAssistanceModal] = useState(false);
  const [assistanceType, setAssistanceType] = useState<string>('waiter');
  const [assistanceNote, setAssistanceNote] = useState<string>('');
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [activeTableAlert, setActiveTableAlert] = useState<{
    type: 'water' | 'bill' | 'waiter' | string;
    table: number;
    time: string;
    status: 'pending' | 'attended' | 'resolved';
    message: string;
    attendedBy?: string;
  } | null>(null);

  // Online UPI Payment Modal (PhonePe, GPay, Paytm)
  const [showOnlineUpiModal, setShowOnlineUpiModal] = useState(false);
  const [onlineUpiAmount, setOnlineUpiAmount] = useState<number>(0);
  const [onlineUpiContext, setOnlineUpiContext] = useState<'cart_checkout' | 'table_bill' | 'order_view'>('cart_checkout');


  // Confirmed Order Screen
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [callingStaffBill, setCallingStaffBill] = useState(false);
  const [staffBillCalled, setStaffBillCalled] = useState(false);

  // Recent Orders History (Session & Table)
  const [showRecentOrdersModal, setShowRecentOrdersModal] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(false);
  const [recentOrdersTab, setRecentOrdersTab] = useState<'session' | 'history' | 'phone'>('session');
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);

  // Load menu data dynamically
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        setError(null);

        let loadedRest: Restaurant;
        if (initialTableNumber) {
          const res = await api.getPublicTableMenu(slug, initialTableNumber);
          loadedRest = res.restaurant;
          setRestaurant(res.restaurant);
          setCategories(res.categories);
          setItems(res.items);
          setSelectedTableNumber(res.table.table_number);
        } else {
          const res = await api.getPublicMenu(slug);
          loadedRest = res.restaurant;
          setRestaurant(res.restaurant);
          setCategories(res.categories);
          setItems(res.items);
          setAvailableTables(res.available_tables || []);
          if (res.available_tables?.length > 0 && !selectedTableNumber) {
            setSelectedTableNumber(res.available_tables[0].table_number);
          }
        }

        if (loadedRest?.pay_counter_only) {
          setPaymentMethod('cash_counter');
        }

        // Auto-load customer phone from localStorage if previously logged in
        const savedPhone = localStorage.getItem('restoqr_customer_phone');
        const savedName = localStorage.getItem('restoqr_customer_name');
        if (savedPhone) {
          setCustomerPhone(savedPhone);
          setCustomerLoginPhone(savedPhone);
          if (savedName) {
            setCustomerName(savedName);
            setCustomerLoginName(savedName);
          }
          api.getCustomerPastOrders(savedPhone, loadedRest?.id).then(custRes => {
            if (custRes.customer) setLoggedInCustomer(custRes.customer);
            if (custRes.orders) setCustomerOldOrders(custRes.orders);
          }).catch(() => {});
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load restaurant menu');
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [slug, initialTableNumber]);

  // Listen to Real-Time SSE updates for all session and table orders
  useEffect(() => {
    if (!restaurant?.id) return;

    const eventSource = new EventSource(`/api/realtime/events?restaurantId=${restaurant.id}`);

    eventSource.addEventListener('ORDER_STATUS_UPDATED', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        const updatedOrder = payload.data as Order;
        if (!updatedOrder) return;

        // Update confirmedOrder if active
        if (confirmedOrder && confirmedOrder.id === updatedOrder.id) {
          setConfirmedOrder(updatedOrder);
        }

        // Update in recent orders list
        setRecentOrders(prev => {
          const index = prev.findIndex(o => o.id === updatedOrder.id);
          if (index !== -1) {
            const nextList = [...prev];
            nextList[index] = updatedOrder;
            return nextList;
          }
          if (selectedTableNumber && updatedOrder.table_number === selectedTableNumber) {
            return [updatedOrder, ...prev];
          }
          return prev;
        });

        // Show toast notification for this table or session
        if (
          (selectedTableNumber && updatedOrder.table_number === selectedTableNumber) ||
          (confirmedOrder && confirmedOrder.id === updatedOrder.id)
        ) {
          const statusNice = 
            updatedOrder.status === 'PREPARING' ? 'Cooking in Kitchen 🔥' :
            updatedOrder.status === 'READY' ? 'Ready to Serve! 🛎️' :
            updatedOrder.status === 'SERVED' ? 'Served at Table' :
            updatedOrder.status === 'COMPLETED' ? 'Completed & Paid' : updatedOrder.status;

          showToast(`Order #${updatedOrder.order_number} is now ${statusNice}`, 'info');
        }
      } catch (err) {
        console.error('SSE error:', err);
      }
    });

    eventSource.addEventListener('ORDER_PAYMENT_UPDATED', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        const updatedOrder = payload.data as Order;
        if (!updatedOrder) return;

        if (confirmedOrder && confirmedOrder.id === updatedOrder.id) {
          setConfirmedOrder(updatedOrder);
        }

        setRecentOrders(prev => {
          const index = prev.findIndex(o => o.id === updatedOrder.id);
          if (index !== -1) {
            const nextList = [...prev];
            nextList[index] = updatedOrder;
            return nextList;
          }
          return prev;
        });

        if (selectedTableNumber && updatedOrder.table_number === selectedTableNumber) {
          showToast(`Payment for Order #${updatedOrder.order_number} confirmed!`, 'success');
        }
      } catch (err) {
        console.error('SSE error:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [restaurant?.id, confirmedOrder?.id, selectedTableNumber]);

  // Fetch Recent Orders (Current Table Session & Browser Local Storage)
  const fetchRecentOrders = async (silent = false) => {
    if (!restaurant?.id) return;
    try {
      if (!silent) setRecentOrdersLoading(true);
      let orderIds: string[] = [];
      try {
        const storageKey = `restoqr_orders_${slug}`;
        orderIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
      } catch (e) {
        console.warn('Could not read session order ids', e);
      }

      const res = await api.getRecentOrders({
        restaurant_id: restaurant.id,
        order_ids: orderIds,
        table_number: selectedTableNumber
      });

      if (res.success && Array.isArray(res.orders)) {
        setRecentOrders(res.orders);
        // Also sync runningBillData
        if (selectedTableNumber) {
          const tableOrders = res.orders.filter(o => o.table_number === selectedTableNumber && o.status !== 'CANCELLED');
          const runningTotal = tableOrders.reduce((sum, o) => sum + o.total, 0);
          const totalItems = tableOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
          setRunningBillData({
            table_number: selectedTableNumber,
            running_total: Math.round(runningTotal * 100) / 100,
            total_items: totalItems,
            orders: tableOrders
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to load recent orders:', err);
    } finally {
      if (!silent) setRecentOrdersLoading(false);
    }
  };

  // Reorder items from a past order
  const handleReorderOrder = (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    setReorderingOrderId(order.id);
    
    let addedCount = 0;
    order.items.forEach(ordItem => {
      const matchedItem = items.find(
        i => i.id === ordItem.menu_item_id || i.name.toLowerCase() === ordItem.item_name_snapshot.toLowerCase()
      );
      if (matchedItem && matchedItem.is_available) {
        const newCartEntry: SelectedCartItem = {
          id: `${matchedItem.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          item: matchedItem,
          quantity: ordItem.quantity || 1,
          selected_size: ordItem.selected_size,
          selected_size_price: ordItem.selected_size_price || 0,
          selected_addons: ordItem.selected_addons || [],
          spice_level: ordItem.spice_level,
          special_instructions: ordItem.special_instructions,
          unit_price: ordItem.price_snapshot || matchedItem.price
        };
        setCart(prev => [...prev, newCartEntry]);
        addedCount++;
      }
    });

    setReorderingOrderId(null);
    if (addedCount > 0) {
      showToast(`✓ Added ${addedCount} dish${addedCount > 1 ? 'es' : ''} to cart! Opening cart...`, 'success');
      setShowRecentOrdersModal(false);
      setShowCartModal(true);
    } else {
      showToast('Dishes from this order are currently unavailable on the active menu.', 'error');
    }
  };

  // Auto-fetch recent orders when table or restaurant is available
  useEffect(() => {
    if (restaurant?.id) {
      fetchRecentOrders(true);
    }
  }, [restaurant?.id, selectedTableNumber]);

  // Fetch Table Running Bill
  const fetchTableBill = async () => {
    if (!slug || !selectedTableNumber) return;
    try {
      setRunningBillLoading(true);
      const res = await api.getPublicTableOrders(slug, selectedTableNumber);
      setRunningBillData(res);
      setShowRunningBillModal(true);
    } catch (err: any) {
      showToast(err.message || 'Could not load table bill', 'error');
    } finally {
      setRunningBillLoading(false);
    }
  };

  // Dispatch Call Waiter / Service Request
  const handleCallWaiter = async () => {
    if (!restaurant) return;
    const targetTable = selectedTableNumber || (availableTables.length > 0 ? availableTables[0].table_number : 1);
    if (!selectedTableNumber) {
      setSelectedTableNumber(targetTable);
    }

    try {
      setCallingWaiter(true);
      await api.callWaiter({
        restaurant_id: restaurant.id,
        table_number: targetTable,
        request_type: assistanceType,
        note: assistanceNote.trim() || undefined
      });

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setActiveTableAlert({
        type: assistanceType,
        table: targetTable,
        time: timeStr,
        status: 'pending',
        message: `🛎️ Staff alerted for Table #${targetTable}! Waiting for staff...`
      });

      showToast(`Staff notified! Alert sent for Table #${targetTable}.`, 'success');
      setShowAssistanceModal(false);
      setAssistanceNote('');
    } catch (err: any) {
      showToast(err.message || 'Failed to alert staff', 'error');
    } finally {
      setCallingWaiter(false);
    }
  };

  // Quick 1-Tap Service Alert (Water, Bill, Waiter)
  const handleQuickServiceAlert = async (type: 'water' | 'bill' | 'waiter') => {
    if (!restaurant) return;
    const targetTable = selectedTableNumber || (availableTables.length > 0 ? availableTables[0].table_number : 1);
    if (!selectedTableNumber) {
      setSelectedTableNumber(targetTable);
    }

    try {
      setCallingWaiter(true);
      const note = type === 'water' 
        ? 'Customer requested fresh drinking water for the table.' 
        : type === 'bill' 
        ? 'Customer requested final bill settlement for the table.' 
        : 'Customer requested waiter assistance.';

      await api.callWaiter({
        restaurant_id: restaurant.id,
        table_number: targetTable,
        request_type: type,
        note
      });

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setActiveTableAlert({
        type,
        table: targetTable,
        time: timeStr,
        status: 'pending',
        message: type === 'water' 
          ? `💧 Drinking water requested for Table #${targetTable} at ${timeStr}` 
          : type === 'bill' 
          ? `🧾 Final Bill requested for Table #${targetTable} at ${timeStr}` 
          : `🛎️ Staff alerted for Table #${targetTable} at ${timeStr}`
      });

      showToast(
        type === 'water' 
          ? `💧 Drinking water requested! Staff alerted for Table #${targetTable}.` 
          : type === 'bill' 
          ? `🧾 Bill requested! Staff alerted to bring your bill to Table #${targetTable}.` 
          : `🛎️ Staff alerted! Waiter is heading to Table #${targetTable}.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to alert staff', 'error');
    } finally {
      setCallingWaiter(false);
    }
  };

  // Live status tracker for customer activeTableAlert
  useEffect(() => {
    if (!activeTableAlert || !restaurant?.id || activeTableAlert.status === 'resolved') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getTableServiceRequest(restaurant.id, activeTableAlert.table);
        if (res.active_request) {
          if (res.active_request.status === 'attended' && activeTableAlert.status !== 'attended') {
            setActiveTableAlert(prev => prev ? ({
              ...prev,
              status: 'attended',
              attendedBy: res.active_request?.attended_by || 'Staff',
              message: `🏃 Staff is on the way to Table #${prev.table}! (${res.active_request?.attended_by || 'Staff'})`
            }) : null);
            showToast(`🏃 Staff is on the way to Table #${activeTableAlert.table}!`, 'info');
          }
        } else {
          // No active request left for this table (resolved/completed by staff!)
          setActiveTableAlert(prev => prev ? ({
            ...prev,
            status: 'resolved',
            message: `✅ Table #${prev.table} request attended & completed! Thank you.`
          }) : null);
          showToast(`✅ Table #${activeTableAlert.table} attended!`, 'success');
          setTimeout(() => {
            setActiveTableAlert(null);
          }, 6000);
        }
      } catch {
        // silent
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeTableAlert, restaurant?.id]);

  // Check on mount or table change if there is an ongoing active call for this table
  useEffect(() => {
    if (!restaurant?.id || !selectedTableNumber) return;
    api.getTableServiceRequest(restaurant.id, selectedTableNumber)
      .then(res => {
        if (res.active_request && res.active_request.status !== 'resolved') {
          const req = res.active_request;
          const timeStr = new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const typeLabel = req.request_type === 'water' ? '💧 Water' : req.request_type === 'bill' ? '🧾 Final Bill' : '🛎️ Waiter Assistance';
          setActiveTableAlert({
            type: req.request_type,
            table: req.table_number,
            time: timeStr,
            status: req.status,
            attendedBy: req.attended_by,
            message: req.status === 'attended'
              ? `🏃 Staff (${req.attended_by || 'Floor Team'}) is on the way to Table #${req.table_number}!`
              : `🛎️ Table #${req.table_number}: ${typeLabel} requested at ${timeStr}. Waiting for staff...`
          });
        }
      })
      .catch(() => {});
  }, [restaurant?.id, selectedTableNumber]);


  // Open Customization Modal
  const openCustomization = (item: MenuItem) => {
    setCustomizingItem(item);
    const defaultSize = item.sizes && item.sizes.length > 0 ? item.sizes[0].name : '';
    setModalSize(defaultSize);
    setModalAddons([]);
    const defaultSpice = item.spice_options && item.spice_options.length > 0 ? item.spice_options[0] : '';
    setModalSpice(defaultSpice);
    setModalInstructions('');
    setModalQuantity(1);
  };

  // Modal Price Calculation
  const modalCalculatedUnitPrice = useMemo(() => {
    if (!customizingItem) return 0;
    let base = (customizingItem.discount_price && customizingItem.discount_price > 0)
      ? customizingItem.discount_price
      : customizingItem.price;

    if (modalSize && customizingItem.sizes) {
      const foundSize = customizingItem.sizes.find(s => s.name === modalSize);
      if (foundSize) base += foundSize.price_delta;
    }

    const addonsCost = modalAddons.reduce((sum, a) => sum + a.price, 0);
    return base + addonsCost;
  }, [customizingItem, modalSize, modalAddons]);

  // Add Customized Item to Cart
  const handleAddCustomizedToCart = () => {
    if (!customizingItem) return;

    let sizeDelta = 0;
    if (modalSize && customizingItem.sizes) {
      const s = customizingItem.sizes.find(sz => sz.name === modalSize);
      if (s) sizeDelta = s.price_delta;
    }

    const cartEntryId = `${customizingItem.id}-${modalSize}-${modalAddons.map(a => a.id).sort().join(',')}-${modalSpice}-${modalInstructions}`;

    setCart(prev => {
      const existing = prev.find(c => c.id === cartEntryId);
      if (existing) {
        return prev.map(c => c.id === cartEntryId ? { ...c, quantity: c.quantity + modalQuantity } : c);
      }
      return [
        ...prev,
        {
          id: cartEntryId,
          item: customizingItem,
          quantity: modalQuantity,
          selected_size: modalSize || undefined,
          selected_size_price: sizeDelta,
          selected_addons: modalAddons,
          spice_level: modalSpice || undefined,
          special_instructions: modalInstructions.trim() || undefined,
          unit_price: modalCalculatedUnitPrice
        }
      ];
    });

    setCustomizingItem(null);
    showToast(t.itemCustomized, 'success');
  };

  // Simple Add (or open modal if item has sizes/addons)
  const handleQuickAdd = (item: MenuItem) => {
    const hasOptions = (item.sizes && item.sizes.length > 0) || (item.add_ons && item.add_ons.length > 0) || (item.spice_options && item.spice_options.length > 0);
    if (hasOptions) {
      openCustomization(item);
      return;
    }

    const cartEntryId = `${item.id}-default`;
    const price = (item.discount_price && item.discount_price > 0) ? item.discount_price : item.price;

    setCart(prev => {
      const existing = prev.find(c => c.id === cartEntryId);
      if (existing) {
        return prev.map(c => c.id === cartEntryId ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [
        ...prev,
        {
          id: cartEntryId,
          item,
          quantity: 1,
          selected_addons: [],
          selected_size_price: 0,
          unit_price: price
        }
      ];
    });
  };

  const handleIncrementCart = (cartEntryId: string) => {
    setCart(prev => prev.map(c => c.id === cartEntryId ? { ...c, quantity: c.quantity + 1 } : c));
  };

  const handleDecrementCart = (cartEntryId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === cartEntryId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.id === cartEntryId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.id !== cartEntryId);
    });
  };

  const handleRemoveCartItem = (cartEntryId: string) => {
    setCart(prev => prev.filter(c => c.id !== cartEntryId));
  };

  const handleClearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setShowCartModal(false);
  };

  // Item total count in cart for a specific dish
  const getItemQuantityInCart = (itemId: string) => {
    return cart
      .filter(c => c.item.id === itemId)
      .reduce((sum, c) => sum + c.quantity, 0);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, c) => sum + (c.unit_price * c.quantity), 0);
  }, [cart]);

  const discountAmount = appliedCoupon ? appliedCoupon.calculated_discount : 0;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  
  const taxRate = restaurant?.tax_rate ?? 5.0;
  const taxAmount = Math.round((taxableSubtotal * taxRate) / 100 * 100) / 100;

  const serviceChargeRate = restaurant?.service_charge_rate ?? 0;
  const serviceChargeAmount = Math.round((taxableSubtotal * serviceChargeRate) / 100 * 100) / 100;

  const grandTotal = Math.round((taxableSubtotal + taxAmount + serviceChargeAmount) * 100) / 100;
  const totalItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !restaurant) return;
    try {
      setApplyingCoupon(true);
      const res = await api.validateCoupon(restaurant.id, couponCode.trim(), subtotal);
      setAppliedCoupon(res.coupon);
      showToast(`${t.couponSuccess} (Saved ₹${res.coupon.calculated_discount})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Invalid coupon code', 'error');
    } finally {
      setApplyingCoupon(false);
    }
  };

  // CONFIRM ORDER (Dine-in Order Placement)
  const handleInitiateOrderOrPayment = () => {
    if (!restaurant) return;

    if (!selectedTableNumber) {
      const targetTable = availableTables.length > 0 ? availableTables[0].table_number : 1;
      setSelectedTableNumber(targetTable);
    }

    if (cart.length === 0) {
      showToast('Your order cart is empty', 'error');
      return;
    }

    if (paymentMethod === 'online') {
      setOnlineUpiAmount(grandTotal);
      setOnlineUpiContext('cart_checkout');
      setShowOnlineUpiModal(true);
      return;
    }

    handleExecuteOrderPlacement(paymentMethod, 'pending');
  };

  const handleExecuteOrderPlacement = async (
    method: 'online' | 'cash_table' | 'cash_counter',
    paymentStatus: 'paid' | 'pending' = 'pending',
    additionalNote?: string
  ) => {
    if (!restaurant) return;
    const tableNum = selectedTableNumber || (availableTables.length > 0 ? availableTables[0].table_number : 1);
    if (!selectedTableNumber) {
      setSelectedTableNumber(tableNum);
    }

    try {
      setPlacingOrder(true);
      const combinedNotes = [additionalNote, orderNotes.trim()].filter(Boolean).join(' | ') || undefined;

      const payload = {
        restaurant_id: restaurant.id,
        table_number: tableNum,
        items: cart.map(c => ({
          menu_item_id: c.item.id,
          name: c.item.name,
          quantity: c.quantity,
          selected_size: c.selected_size,
          selected_addons: c.selected_addons,
          spice_level: c.spice_level,
          special_instructions: c.special_instructions,
          customization: [
            c.selected_size ? `Size: ${c.selected_size}` : '',
            c.selected_addons.length > 0 ? `Add-ons: ${c.selected_addons.map(a => a.name).join(', ')}` : '',
            c.spice_level ? `Spice: ${c.spice_level}` : '',
            c.special_instructions ? `Note: ${c.special_instructions}` : ''
          ].filter(Boolean).join(' | ') || undefined
        })),
        coupon_code: appliedCoupon?.code || undefined,
        payment_method: method,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        notes: combinedNotes,
        special_instructions: combinedNotes
      };

      const res = await api.placeOrder(payload);
      let newOrder = res.order;

      // If online paid, sync payment status
      if (paymentStatus === 'paid' && newOrder.payment_status !== 'paid') {
        try {
          const verifyRes = await api.verifyPayment(newOrder.id, 'paid');
          if (verifyRes.order) {
            newOrder = verifyRes.order;
          }
        } catch {
          // quiet
        }
      }

      setConfirmedOrder(newOrder);
      setRecentOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
      try {
        const storageKey = `restoqr_orders_${slug}`;
        const storedIds: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!storedIds.includes(newOrder.id)) {
          storedIds.unshift(newOrder.id);
          localStorage.setItem(storageKey, JSON.stringify(storedIds.slice(0, 30)));
        }
      } catch (e) {
        console.warn('Storage save failed', e);
      }
      setCart([]);
      setAppliedCoupon(null);
      setShowCartModal(false);
      showToast(t.orderSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || 'Unable to place order. Please try again.', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleOnlinePaymentSuccess = async (paymentData: { app: string; utr?: string }) => {
    setShowOnlineUpiModal(false);

    if (onlineUpiContext === 'cart_checkout') {
      const appLabel = paymentData.app === 'phonepe' ? 'PhonePe' : paymentData.app === 'gpay' ? 'Google Pay' : paymentData.app === 'paytm' ? 'Paytm' : 'UPI';
      const appNote = `Paid ₹${grandTotal} via ${appLabel}${paymentData.utr ? ` (UTR: ${paymentData.utr})` : ''}`;
      await handleExecuteOrderPlacement('online', 'paid', appNote);
      showToast(`🎉 Order Placed & Paid ₹${grandTotal} via ${appLabel}!`, 'success');
    } else if (onlineUpiContext === 'table_bill' && restaurant && selectedTableNumber) {
      try {
        await api.payTableBillOnline({
          restaurant_id: restaurant.id,
          table_number: selectedTableNumber,
          utr: paymentData.utr
        });
        showToast(`🎉 Table #${selectedTableNumber} bill of ₹${onlineUpiAmount} settled successfully via UPI!`, 'success');
        setShowRunningBillModal(false);
        fetchRecentOrders();
      } catch (err: any) {
        showToast(err.message || 'Failed to settle table bill', 'error');
      }
    } else if (onlineUpiContext === 'order_view' && confirmedOrder) {
      try {
        await api.verifyPayment(confirmedOrder.id, 'paid');
        setConfirmedOrder(prev => prev ? ({ ...prev, payment_status: 'paid' }) : null);
        showToast('🎉 Online payment confirmed successfully!', 'success');
        fetchRecentOrders();
      } catch (err: any) {
        showToast(err.message || 'Payment update failed', 'error');
      }
    }
  };

  const handleConfirmOrder = () => {
    handleInitiateOrderOrPayment();
  };


  // Online Payment Simulation
  const handleSimulateOnlinePayment = async () => {
    if (!confirmedOrder) return;
    try {
      setSimulatingPayment(true);
      const res = await api.verifyOnlinePayment(confirmedOrder.id, 'paid');
      setConfirmedOrder(res.order);
      showToast('Payment successful! Verified by payment gateway.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Payment confirmation failed', 'error');
    } finally {
      setSimulatingPayment(false);
    }
  };

  // Immediate Call Staff / Request Final Bill
  const handleCallStaffForBill = async (tblNum?: number) => {
    const targetTable = tblNum || confirmedOrder?.table_number || selectedTableNumber;
    if (!restaurant || !targetTable) return;
    try {
      setCallingStaffBill(true);
      await api.callWaiter({
        restaurant_id: restaurant.id,
        table_number: targetTable,
        request_type: 'bill',
        note: `Customer finished dining at Table ${targetTable}. Requesting bill settlement.`
      });
      setStaffBillCalled(true);
      showToast(`🛎️ Staff alerted! Waiter is on the way to Table ${targetTable}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to alert staff', 'error');
    } finally {
      setCallingStaffBill(false);
    }
  };

  // Customer Phone Login and Past Orders retrieval
  const handleCustomerLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = customerLoginPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      showToast('Please enter a valid mobile phone number', 'error');
      return;
    }

    try {
      setLoggingInCustomer(true);
      const res = await api.customerPhoneLogin({
        phone: customerLoginPhone.trim(),
        name: customerLoginName.trim() || undefined,
        restaurant_id: restaurant?.id
      });

      setLoggedInCustomer(res.customer);
      setCustomerOldOrders(res.orders || []);
      setCustomerPhone(res.customer.phone);
      if (res.customer.name) {
        setCustomerName(res.customer.name);
      }

      localStorage.setItem('restoqr_customer_phone', res.customer.phone);
      if (res.customer.name) {
        localStorage.setItem('restoqr_customer_name', res.customer.name);
      }

      showToast(`Welcome back ${res.customer.name || res.customer.phone}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check your number.', 'error');
    } finally {
      setLoggingInCustomer(false);
    }
  };

  const handleCustomerLogout = () => {
    setLoggedInCustomer(null);
    setCustomerOldOrders([]);
    localStorage.removeItem('restoqr_customer_phone');
    localStorage.removeItem('restoqr_customer_name');
    showToast('Logged out of diner account', 'info');
  };

  const loadCustomerOrders = async (phone: string) => {
    try {
      setLoadingOldOrders(true);
      const res = await api.getCustomerPastOrders(phone, restaurant?.id);
      setCustomerOldOrders(res.orders || []);
      if (res.customer) setLoggedInCustomer(res.customer);
    } catch (err: any) {
      console.error('Error fetching old orders:', err);
    } finally {
      setLoadingOldOrders(false);
    }
  };

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (selectedCategory === 'recommended') {
        if (!item.is_recommended && !item.is_bestseller) return false;
      } else if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
        return false;
      }

      // Veg filter
      if (vegOnlyFilter && !item.is_veg) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, selectedCategory, vegOnlyFilter, searchQuery]);

  // Recommended dishes list for top hero section
  const recommendedDishes = useMemo(() => {
    return items.filter(i => (i.is_recommended || i.is_bestseller) && i.is_available);
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-800 tracking-wide">Opening Table Menu...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Notice</h2>
          <p className="text-sm text-slate-600 mb-6">{error || 'Restaurant ordering is currently unavailable.'}</p>
          <button
            onClick={() => onNavigate('/login')}
            className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            Go to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-32 text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* PERSISTENT STICKY CALL ALERT BANNER FOR CUSTOMER */}
      {activeTableAlert && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-4 py-3 shadow-xl border-b border-orange-500/30 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-3 h-3 rounded-full bg-orange-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-black flex items-center gap-2 truncate">
                <span>Table #{activeTableAlert.table} Call Active:</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  activeTableAlert.status === 'attended'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : activeTableAlert.status === 'resolved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}>
                  {activeTableAlert.status === 'attended' ? '🏃 Staff On The Way' : activeTableAlert.status === 'resolved' ? '✅ Completed' : '⏳ Floor Staff Alerted'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {activeTableAlert.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTableAlert(null)}
            className="text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Large Restaurant Cover Image Banner */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
        <img
          src={restaurant.cover_image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200'}
          alt={restaurant.name}
          className="w-full h-full object-cover opacity-85 scale-105 transition-transform duration-700 hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

        {/* Top Floating Controls */}
        <div className="absolute top-4 inset-x-4 max-w-2xl mx-auto flex items-center justify-between z-10">
          <button
            onClick={() => onNavigate('/login')}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition shadow-lg border border-white/10"
            title="Go to login"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Quick Actions, Customer Login & Language Selector */}
          <div className="flex items-center gap-2">
            {/* Recent Orders History Button */}
            <button
              onClick={() => {
                fetchRecentOrders();
                setShowRecentOrdersModal(true);
              }}
              className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 hover:bg-black/70 transition border border-white/15 shadow-lg cursor-pointer active:scale-95"
              title="View recent orders for your table or session"
            >
              <History className="w-3.5 h-3.5 text-orange-400" />
              <span>Recent Orders</span>
              {recentOrders.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  recentOrders.some(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED')
                    ? 'bg-orange-500 text-white animate-pulse'
                    : 'bg-slate-700 text-slate-200'
                }`}>
                  {recentOrders.length}
                </span>
              )}
            </button>

            {/* Quick Call Waiter Button */}
            <button
              onClick={() => setShowAssistanceModal(true)}
              className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 hover:bg-black/60 transition border border-white/10 shadow-lg cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.callWaiter}</span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10 text-white text-xs font-bold shadow-lg">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-full transition ${language === 'en' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2 py-0.5 rounded-full transition ${language === 'hi' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                हिं
              </button>
              <button
                onClick={() => setLanguage('mr')}
                className={`px-2 py-0.5 rounded-full transition ${language === 'mr' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                मरा
              </button>
            </div>
          </div>
        </div>

        {/* Floating Table Confirmation Ribbon */}
        <div className="absolute bottom-16 inset-x-4 max-w-2xl mx-auto flex items-center justify-between text-white/90 text-xs">
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <Utensils className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-semibold">{t.orderingFrom} <strong className="text-orange-400">#{selectedTableNumber || 'DINE-IN'}</strong></span>
          </div>

          {selectedTableNumber && (
            <button
              onClick={() => {
                fetchRecentOrders();
                setShowRecentOrdersModal(true);
              }}
              className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15 hover:bg-black/70 transition cursor-pointer font-semibold shadow"
            >
              <History className="w-3.5 h-3.5 text-orange-400" />
              <span>{recentOrders.length > 0 ? `Recent Orders (${recentOrders.length})` : t.viewTableBill}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Overlapping Restaurant Profile Card */}
      <div className="max-w-2xl mx-auto px-4 -mt-10 relative z-10">
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/70 border border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Table Number Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-50 text-orange-700 font-black text-xs tracking-wider uppercase border border-orange-200/80 mb-2">
                <Utensils className="w-3.5 h-3.5" />
                <span>{t.table} {selectedTableNumber || 'DINE-IN'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {restaurant.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs font-bold text-orange-600 bg-orange-50/80 px-2.5 py-0.5 rounded-md border border-orange-100">
                  {restaurant.cuisine_type || 'Artisan Cafe'}
                </span>
                {restaurant.rating && (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    ★ {restaurant.rating} <span className="text-[10px] text-emerald-600 font-semibold">({restaurant.rating_count || 120}+)</span>
                  </span>
                )}
                {restaurant.accepting_orders === false && (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                    Kitchen Paused
                  </span>
                )}
              </div>
            </div>

            <img
              src={restaurant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'}
              alt={restaurant.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
            />
          </div>

          {restaurant.description && (
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              {restaurant.description}
            </p>
          )}

          {/* Details Row: Address, Hours & Wi-Fi */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="truncate">{restaurant.address}, {restaurant.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{restaurant.opening_time} - {restaurant.closing_time}</span>
            </div>
            {restaurant.wifi_info && (
              <div className="flex items-center gap-2 col-span-1 sm:col-span-2 text-slate-700 bg-orange-50/70 p-2.5 rounded-2xl border border-orange-100">
                <Wifi className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="font-semibold text-xs">{t.wifi}: <code className="font-mono text-orange-950 font-bold">{restaurant.wifi_info}</code></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2.5 Table Quick Alerts & Service Bar (Water, Bill, Waiter) */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center text-xs font-black">
                🛎️
              </span>
              <div>
                <span className="text-xs font-extrabold text-slate-900">Table Quick Actions</span>
                <span className="text-[10px] text-slate-500 ml-2">Table #{selectedTableNumber || 'Dine-in'}</span>
              </div>
            </div>

            {selectedTableNumber && (
              <button
                onClick={() => fetchTableBill()}
                className="text-[11px] text-orange-600 hover:text-orange-700 font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Running Tab</span>
              </button>
            )}
          </div>

          {/* Quick 1-Tap Buttons: Water, Bill, Call Staff */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickServiceAlert('water')}
              disabled={callingWaiter}
              className="py-2.5 px-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-black transition flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50 shadow-sm"
              title="Alert staff to bring fresh drinking water"
            >
              <span className="text-base">💧</span>
              <span className="text-[11px]">Need Water</span>
            </button>

            <button
              onClick={() => handleQuickServiceAlert('bill')}
              disabled={callingWaiter}
              className="py-2.5 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-black transition flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50 shadow-sm"
              title="Request final bill settlement to your table"
            >
              <span className="text-base">🧾</span>
              <span className="text-[11px]">Request Bill</span>
            </button>

            <button
              onClick={() => setShowAssistanceModal(true)}
              className="py-2.5 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black transition flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-sm"
              title="Call waiter or request cutlery/cleaning"
            >
              <span className="text-base">🛎️</span>
              <span className="text-[11px]">Call Waiter</span>
            </button>
          </div>

          {/* Active Alert Notification Banner if active */}
          {activeTableAlert && (
            <div className="p-2.5 rounded-2xl bg-slate-900 text-white text-xs flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold truncate">{activeTableAlert.message}</span>
              </div>
              <button
                onClick={() => setActiveTableAlert(null)}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800 shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Search & Veg Toggle Filter */}
      <div className="max-w-2xl mx-auto px-4 mt-5">
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Veg Only Toggle */}
          <button
            onClick={() => setVegOnlyFilter(prev => !prev)}
            className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition shadow-sm shrink-0 cursor-pointer ${
              vegOnlyFilter 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20' 
                : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${vegOnlyFilter ? 'border-white' : 'border-emerald-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${vegOnlyFilter ? 'bg-white' : 'bg-emerald-600'}`} />
            </span>
            <span>{t.vegOnly}</span>
          </button>
        </div>
      </div>

      {/* 4. Horizontal Scrollable Category Tabs */}
      <div className="sticky top-0 z-20 bg-[#f8f9fa]/95 backdrop-blur-md pt-4 pb-3 border-b border-slate-200/70 mt-3">
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Recommended Tab */}
          <button
            onClick={() => setSelectedCategory('recommended')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === 'recommended'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/25 ring-2 ring-orange-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Recommended ({recommendedDishes.length})</span>
          </button>

          {/* All Items Tab */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-orange-500 text-white shadow-orange-500/25'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {t.all} ({items.length})
          </button>

          {/* Dynamic Categories */}
          {categories.map(cat => {
            const count = items.filter(i => i.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-orange-500/25'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Recommended Highlights Carousel (when viewing 'all' or 'recommended') */}
      {(selectedCategory === 'all' || selectedCategory === 'recommended') && recommendedDishes.length > 0 && !searchQuery && (
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{t.recommended}</span>
            </h2>
            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
              Top Picks
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar -mx-4 px-4">
            {recommendedDishes.map(item => {
              const qty = getItemQuantityInCart(item.id);
              const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
              const displayPrice = hasDiscount ? item.discount_price : item.price;
              const hasOptions = (item.sizes && item.sizes.length > 0) || (item.add_ons && item.add_ons.length > 0);

              return (
                <div
                  key={`rec-${item.id}`}
                  onClick={() => openCustomization(item)}
                  className="w-60 shrink-0 bg-white rounded-3xl p-3 shadow-md hover:shadow-lg transition-all border border-slate-100 flex flex-col justify-between cursor-pointer group"
                >
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-slate-100 mb-2.5">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      {item.is_veg ? (
                        <span className="w-4 h-4 rounded bg-white/90 backdrop-blur-sm border border-emerald-600 flex items-center justify-center shadow">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded bg-white/90 backdrop-blur-sm border border-rose-600 flex items-center justify-center shadow">
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                        </span>
                      )}
                      {item.is_bestseller && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider shadow">
                          Bestseller
                        </span>
                      )}
                    </div>

                    {item.prep_time && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white font-bold text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-400" />
                        {item.prep_time}m
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 tracking-tight line-clamp-1">{item.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{item.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black text-slate-900 font-mono">₹{displayPrice}</span>
                      {hasDiscount && (
                        <span className="text-[10px] text-slate-400 line-through font-mono">₹{item.price}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAdd(item);
                      }}
                      className="px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      {qty > 0 ? `Added (${qty})` : (hasOptions ? 'Customise +' : 'ADD +')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Food Items List */}
      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
        {filteredDishes.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/60 shadow-sm">
            <Coffee className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No dishes match your selection</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or vegetarian filter.</p>
          </div>
        ) : (
          filteredDishes.map(item => {
            const qty = getItemQuantityInCart(item.id);
            const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
            const displayPrice = hasDiscount ? item.discount_price : item.price;
            const hasOptions = (item.sizes && item.sizes.length > 0) || (item.add_ons && item.add_ons.length > 0) || (item.spice_options && item.spice_options.length > 0);

            return (
              <div
                key={item.id}
                onClick={() => openCustomization(item)}
                className={`bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/70 flex gap-4 items-center justify-between transition hover:shadow-md cursor-pointer group ${
                  !item.is_available ? 'opacity-60 bg-slate-50' : ''
                }`}
              >
                {/* Item Details */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Veg / Non-Veg Indicator */}
                    {item.is_veg ? (
                      <span className="w-4 h-4 rounded border border-emerald-600 flex items-center justify-center shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded border border-rose-600 flex items-center justify-center shrink-0">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                      </span>
                    )}

                    {item.is_bestseller && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] uppercase tracking-wider">
                        ★ {t.bestseller}
                      </span>
                    )}

                    {item.prep_time && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {item.prep_time} {t.prepTime}
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-base text-slate-900 tracking-tight group-hover:text-orange-600 transition">
                    {item.name}
                  </h3>
                  {item.weight && <span className="text-[11px] font-semibold text-slate-400">{item.weight}</span>}

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Price & Customisable Tag */}
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-black text-slate-900 font-mono">₹{displayPrice}</span>
                      {hasDiscount && (
                        <span className="text-xs text-slate-400 line-through font-mono">₹{item.price}</span>
                      )}
                    </div>

                    {hasOptions && (
                      <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                        {t.customisable}
                      </span>
                    )}
                  </div>
                </div>

                {/* Food Image + Quantity Controls */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden relative shadow-inner bg-slate-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-1 text-center">
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">Out of stock</span>
                      </div>
                    )}
                  </div>

                  {item.is_available && (
                    <div className="-mt-4 z-10">
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(item);
                          }}
                          className="px-5 py-2 rounded-full bg-white hover:bg-orange-50 text-orange-600 font-black text-xs uppercase tracking-wider shadow-md border border-orange-200 transition active:scale-95 cursor-pointer"
                        >
                          {t.add} +
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasOptions) {
                              openCustomization(item);
                            } else {
                              setShowCartModal(true);
                            }
                          }}
                          className="px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/25 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{qty} IN CART</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 7. Sticky Bottom "SHOW MY ORDER" Bar */}
      {cart.length > 0 && !showCartModal && !confirmedOrder && (
        <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto z-40 animate-in slide-in-from-bottom-4">
          <button
            onClick={() => setShowCartModal(true)}
            className="w-full py-4 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm tracking-wide shadow-2xl shadow-orange-500/35 flex items-center justify-between transition active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center font-mono font-black text-xs shadow-inner">
                {totalItemCount}
              </div>
              <div className="text-left leading-tight">
                <div className="uppercase tracking-wider font-black">{t.viewOrder}</div>
                <div className="text-[10px] font-semibold text-white/80">{t.table} #{selectedTableNumber}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-base font-black">
              <span>₹{grandTotal}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* Floating Live Active Order Tracker Banner */}
      {recentOrders.some(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED') && !confirmedOrder && (
        <div className={`fixed ${cart.length > 0 ? 'bottom-20' : (selectedTableNumber ? 'bottom-20' : 'bottom-4')} inset-x-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-2`}>
          {(() => {
            const activeOrder = recentOrders.find(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED') || recentOrders[0];
            const isCooking = activeOrder.status === 'PREPARING';
            const isReady = activeOrder.status === 'READY';
            const isAccepted = activeOrder.status === 'ACCEPTED';
            
            return (
              <button
                onClick={() => {
                  fetchRecentOrders();
                  setShowRecentOrdersModal(true);
                }}
                className="w-full bg-slate-900/95 hover:bg-slate-900 text-white rounded-2xl p-3 shadow-2xl backdrop-blur-md border border-slate-700/80 flex items-center justify-between transition cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                  </span>
                  <div className="text-left">
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>Order #{activeOrder.order_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCooking ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        isReady ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        isAccepted ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      }`}>
                        {isCooking ? '🔥 Cooking in Kitchen' :
                         isReady ? '🛎️ Food Ready to Serve!' :
                         isAccepted ? '👨‍🍳 Accepted by Chef' : '⏳ Order Received'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Table #{activeOrder.table_number} • {activeOrder.items?.length || 1} items • Tap to track live
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-orange-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Track ({recentOrders.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })()}
        </div>
      )}

      {/* Floating Bottom Quick Bar when cart is empty */}
      {cart.length === 0 && !confirmedOrder && selectedTableNumber && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40 flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <button
            onClick={() => handleCallStaffForBill(selectedTableNumber)}
            disabled={callingStaffBill}
            className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <BellRing className={`w-4 h-4 ${callingStaffBill ? 'animate-spin' : ''}`} />
            <span>{callingStaffBill ? 'Calling Staff...' : (staffBillCalled ? '✓ Staff Alerted' : '🛎️ Call Staff / Waiter')}</span>
          </button>

          {recentOrders.length > 0 && (
            <button
              onClick={() => {
                fetchRecentOrders();
                setShowRecentOrdersModal(true);
              }}
              className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xl flex items-center gap-2 transition cursor-pointer"
            >
              <History className="w-4 h-4 text-orange-400" />
              <span>Orders ({recentOrders.length}): ₹{recentOrders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)}</span>
            </button>
          )}
        </div>
      )}

      {/* 8. FOOD DETAIL & CUSTOMIZATION MODAL (Item Sheet) */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            {/* Header Image */}
            <div className="relative h-48 sm:h-56 w-full bg-slate-900 shrink-0">
              <img
                src={customizingItem.image}
                alt={customizingItem.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

              <button
                onClick={() => setCustomizingItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center hover:bg-black/70 transition shadow"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  {customizingItem.is_veg ? (
                    <span className="w-4 h-4 rounded bg-white/95 border border-emerald-600 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded bg-white/95 border border-rose-600 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                    </span>
                  )}
                  {customizingItem.is_bestseller && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[9px] uppercase tracking-wider">
                      Bestseller
                    </span>
                  )}
                  {customizingItem.prep_time && (
                    <span className="text-[11px] font-semibold text-slate-200">
                      • {customizingItem.prep_time}m prep
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black">{customizingItem.name}</h3>
              </div>
            </div>

            {/* Scrollable Customization Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                {customizingItem.description}
              </p>

              {/* 1. Size Options */}
              {customizingItem.sizes && customizingItem.sizes.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {t.selectSize}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Required</span>
                  </div>

                  <div className="space-y-2">
                    {customizingItem.sizes.map(size => {
                      const isSelected = modalSize === size.name;
                      return (
                        <label
                          key={size.name}
                          onClick={() => setModalSize(size.name)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50/50 text-slate-900 font-bold' 
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-orange-500' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                            </div>
                            <span className="text-xs font-semibold">{size.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {size.price_delta > 0 ? `+₹${size.price_delta}` : 'Included'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Add-ons Selection */}
              {customizingItem.add_ons && customizingItem.add_ons.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {t.choiceOfAddons}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Optional</span>
                  </div>

                  <div className="space-y-2">
                    {customizingItem.add_ons.map(addon => {
                      const isChecked = modalAddons.some(a => a.id === addon.id);
                      return (
                        <label
                          key={addon.id}
                          onClick={() => {
                            setModalAddons(prev => 
                              isChecked ? prev.filter(a => a.id !== addon.id) : [...prev, addon]
                            );
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                            isChecked 
                              ? 'border-orange-500 bg-orange-50/50 text-slate-900 font-bold' 
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isChecked ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300'}`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-semibold">{addon.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900">
                            +₹{addon.price}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Spice Level Options */}
              {customizingItem.spice_options && customizingItem.spice_options.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                    {t.spiceLevel}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {customizingItem.spice_options.map(spice => (
                      <button
                        key={spice}
                        type="button"
                        onClick={() => setModalSpice(spice)}
                        className={`p-2.5 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                          modalSpice === spice
                            ? 'border-orange-500 bg-orange-50 text-orange-950 font-black'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {spice}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Special Instructions */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                  Special Notes
                </label>
                <textarea
                  value={modalInstructions}
                  onChange={e => setModalInstructions(e.target.value)}
                  placeholder={t.specialInstructions}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* Modal Bottom Sticky Action */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              {/* Quantity Stepper */}
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
                <button
                  onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                  className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-black font-black"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-black text-sm min-w-[16px] text-center">{modalQuantity}</span>
                <button
                  onClick={() => setModalQuantity(q => q + 1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-black font-black"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add Button with Total */}
              <button
                onClick={handleAddCustomizedToCart}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-orange-500/25 transition active:scale-[0.98] flex items-center justify-between cursor-pointer"
              >
                <span>ADD TO CART</span>
                <span className="font-mono">₹{modalCalculatedUnitPrice * modalQuantity}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. CART DRAWER / ORDER REVIEW SHEET */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-lg text-slate-900 tracking-tight">MY DINING ORDER</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-black">
                  {t.table} #{selectedTableNumber}
                </span>
              </div>
              <button
                onClick={() => setShowCartModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action: "+ ADD MORE ITEMS" */}
            <div className="bg-orange-50/70 px-5 py-2.5 border-b border-orange-100 flex items-center justify-between">
              <span className="text-xs font-bold text-orange-950">Want to order more starters or drinks?</span>
              <button
                onClick={() => setShowCartModal(false)}
                className="text-xs font-black text-orange-600 hover:text-orange-700 uppercase tracking-wider cursor-pointer"
              >
                {t.addMoreItems}
              </button>
            </div>

            {/* Cart Items Scroll */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="divide-y divide-slate-100">
                {cart.map(c => {
                  return (
                    <div key={c.id} className="py-3.5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <img
                          src={c.item.image}
                          alt={c.item.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100 shadow-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-sm text-slate-900 truncate">{c.item.name}</div>
                          
                          {/* Size & Addon tags */}
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {c.selected_size && (
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {c.selected_size}
                              </span>
                            )}
                            {c.selected_addons.map(a => (
                              <span key={a.id} className="text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                +{a.name}
                              </span>
                            ))}
                            {c.spice_level && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                {c.spice_level}
                              </span>
                            )}
                          </div>

                          {c.special_instructions && (
                            <p className="text-[11px] text-slate-400 italic mt-0.5">"{c.special_instructions}"</p>
                          )}

                          <div className="text-xs text-slate-500 font-mono mt-1">₹{c.unit_price} each</div>
                        </div>
                      </div>

                      {/* Quantity & Price */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-full px-2 py-1">
                          <button
                            onClick={() => handleDecrementCart(c.id)}
                            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-xs min-w-[14px] text-center">{c.quantity}</span>
                          <button
                            onClick={() => handleIncrementCart(c.id)}
                            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono font-black text-sm text-slate-900">
                          ₹{c.unit_price * c.quantity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Promo / Coupon input */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.coupon}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SAVE50 or WELCOME20"
                    disabled={Boolean(appliedCoupon)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                  {appliedCoupon ? (
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode('');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-600 text-xs font-bold transition cursor-pointer"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {applyingCoupon ? 'Checking...' : t.apply}
                    </button>
                  )}
                </div>

                {/* Quick Coupon Suggestions */}
                {!appliedCoupon && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setCouponCode('SAVE50');
                      }}
                      className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 px-2 py-1 rounded-md border border-amber-200 hover:bg-amber-100 cursor-pointer"
                    >
                      SAVE50 (₹50 off)
                    </button>
                    <button
                      onClick={() => {
                        setCouponCode('WELCOME20');
                      }}
                      className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 px-2 py-1 rounded-md border border-amber-200 hover:bg-amber-100 cursor-pointer"
                    >
                      WELCOME20 (20% off)
                    </button>
                  </div>
                )}

                {appliedCoupon && (
                  <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Coupon {appliedCoupon.code} applied! Saved ₹{appliedCoupon.calculated_discount}</span>
                  </p>
                )}
              </div>

              {/* Customer details with Phone Login link */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    {t.guestDetails}
                  </label>
                  {loggedInCustomer ? (
                    <button
                      type="button"
                      onClick={() => {
                        loadCustomerOrders(loggedInCustomer.phone);
                        setShowCustomerAuthModal(true);
                      }}
                      className="text-[11px] text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <User className="w-3 h-3" />
                      <span>{loggedInCustomer.name || loggedInCustomer.phone} (View Old Orders)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustomerAuthModal(true)}
                      className="text-[11px] text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Sign In & View Old Orders</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Your Name (Optional)"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => {
                      setCustomerPhone(e.target.value);
                      setCustomerLoginPhone(e.target.value);
                    }}
                    placeholder="Phone (For order updates)"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <input
                  type="text"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder={t.specialInstructions}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    {t.payMethod}
                  </label>
                  {restaurant?.pay_counter_only && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Counter Payment Only
                    </span>
                  )}
                </div>

                {restaurant?.pay_counter_only ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border-2 border-amber-400 text-amber-950 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                        Pay at Counter Only
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                        Please settle your bill at the restaurant cashier counter after dining. Your order will be sent to the kitchen instantly.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash_table')}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                        paymentMethod === 'cash_table'
                          ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote className="w-5 h-5 text-orange-500" />
                      <span className="text-[11px] leading-tight font-bold">{t.cashTable}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                        paymentMethod === 'online'
                          ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-orange-500" />
                      <span className="text-[11px] leading-tight font-bold">{t.onlineUpi}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash_counter')}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                        paymentMethod === 'cash_counter'
                          ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Store className="w-5 h-5 text-orange-500" />
                      <span className="text-[11px] leading-tight font-bold">{t.cashCounter}</span>
                    </button>
                  </div>
                )}

                {!restaurant?.pay_counter_only && paymentMethod === 'online' && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-left space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-indigo-600" />
                        <span>Instant 1-Tap UPI Payment:</span>
                      </span>
                      <span className="text-xs font-black font-mono text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                        ₹{grandTotal}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOnlineUpiAmount(grandTotal);
                          setOnlineUpiContext('cart_checkout');
                          setShowOnlineUpiModal(true);
                        }}
                        className="p-2 rounded-xl bg-[#5f259f] hover:bg-[#4d1d82] text-white text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span className="text-xs font-black">पे PhonePe</span>
                        <span className="text-[10px] opacity-90 font-mono">₹{grandTotal}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOnlineUpiAmount(grandTotal);
                          setOnlineUpiContext('cart_checkout');
                          setShowOnlineUpiModal(true);
                        }}
                        className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span className="text-xs font-black flex items-center">
                          <span className="text-blue-600">G</span>
                          <span className="text-rose-600">P</span>
                          <span className="text-amber-500">a</span>
                          <span className="text-emerald-600">y</span>
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">₹{grandTotal}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOnlineUpiAmount(grandTotal);
                          setOnlineUpiContext('cart_checkout');
                          setShowOnlineUpiModal(true);
                        }}
                        className="p-2 rounded-xl bg-[#002e6e] hover:bg-[#002252] text-white text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span className="text-xs font-black">Paytm</span>
                        <span className="text-[10px] opacity-90 font-mono">₹{grandTotal}</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500">
                      Tap any app above or tap <strong>Pay Online</strong> below to open payment modal with dynamic QR and exact amount prefilled.
                    </p>
                  </div>
                )}
                {!restaurant?.pay_counter_only && paymentMethod === 'cash_counter' && (
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 p-2.5 rounded-xl font-medium mt-2">
                    💵 <strong>Pay at Cash Counter:</strong> Order goes straight to kitchen. Settle the bill of ₹{grandTotal} at the cashier counter after your meal.
                  </p>
                )}
              </div>

              {/* Itemized Bill Breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>{t.subtotal}</span>
                  <span className="font-mono text-slate-800">₹{subtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{t.discount}</span>
                    <span className="font-mono">-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t.gstTax} ({taxRate}%)</span>
                  <span className="font-mono text-slate-800">₹{taxAmount}</span>
                </div>
                {serviceChargeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>{t.serviceCharge} ({serviceChargeRate}%)</span>
                    <span className="font-mono text-slate-800">₹{serviceChargeAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>{t.total}</span>
                  <span className="font-mono text-orange-600">₹{grandTotal}</span>
                </div>
              </div>
            </div>

            {/* Cart Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={handleClearCart}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-600 transition cursor-pointer"
              >
                {t.clearCart}
              </button>

              <button
                onClick={handleConfirmOrder}
                disabled={placingOrder}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-orange-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {placingOrder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Placing Your Order...</span>
                  </>
                ) : paymentMethod === 'online' ? (
                  <span>Pay Online ₹{grandTotal} (PhonePe/GPay/Paytm)</span>
                ) : (
                  <span>{t.confirmOrder} (₹{grandTotal})</span>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 10. ORDER CONFIRMED SCREEN (Section 26 & Live Status Tracker) */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 text-center">
            {/* Animated Celebration Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100 animate-bounce">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {t.orderConfirmed}
            </span>

            <h2 className="text-3xl font-black text-slate-900 mt-2">
              Order #{confirmedOrder.order_number}
            </h2>
            <p className="text-xs font-bold text-orange-600 mt-0.5 uppercase tracking-wider">
              {t.table} #{confirmedOrder.table_number}
            </p>

            {/* Estimated Prep Time & Verification PIN */}
            <div className="flex items-center justify-center gap-3 my-3">
              {confirmedOrder.estimated_prep_time && (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  <span>Est. Prep: ~{confirmedOrder.estimated_prep_time} mins</span>
                </span>
              )}

              {confirmedOrder.verification_code && (
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>OTP: <strong>{confirmedOrder.verification_code}</strong></span>
                </span>
              )}
            </div>

            {/* LIVE KITCHEN PROGRESS TRACKER */}
            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left">
              <div className="text-[11px] font-bold uppercase text-slate-400 mb-3 tracking-wider text-center">
                Live Kitchen Order Tracker
              </div>

              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mb-1 shadow-sm">
                    ✓
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">Received</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 shadow-sm transition-all ${
                    ['PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(confirmedOrder.status)
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    {['PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(confirmedOrder.status) ? '✓' : '○'}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    ['PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(confirmedOrder.status)
                      ? 'text-blue-700 font-extrabold'
                      : 'text-slate-400'
                  }`}>
                    Cooking
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 shadow-sm transition-all ${
                    ['READY', 'SERVED', 'COMPLETED'].includes(confirmedOrder.status)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    {['READY', 'SERVED', 'COMPLETED'].includes(confirmedOrder.status) ? '✓' : '○'}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    ['READY', 'SERVED', 'COMPLETED'].includes(confirmedOrder.status)
                      ? 'text-emerald-700 font-extrabold'
                      : 'text-slate-400'
                  }`}>
                    Ready
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 shadow-sm transition-all ${
                    ['SERVED', 'COMPLETED'].includes(confirmedOrder.status)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    {['SERVED', 'COMPLETED'].includes(confirmedOrder.status) ? '✓' : '○'}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    ['SERVED', 'COMPLETED'].includes(confirmedOrder.status)
                      ? 'text-emerald-700 font-extrabold'
                      : 'text-slate-400'
                  }`}>
                    Served
                  </span>
                </div>
              </div>
            </div>

            {/* Ordered Items List */}
            <div className="text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 mb-4">
              <div className="font-black text-slate-800 mb-1">Ordered Dishes:</div>
              {confirmedOrder.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="text-slate-700 font-medium">
                    <span className="font-bold text-slate-900 mr-1.5">{it.quantity}×</span>
                    <span>{it.item_name_snapshot}</span>
                    {it.customization && (
                      <span className="block text-[10px] text-slate-400 pl-4">{it.customization}</span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-800 shrink-0">₹{it.price_snapshot * it.quantity}</span>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-200 mt-2 space-y-1 text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{confirmedOrder.subtotal}</span>
                </div>
                {confirmedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{confirmedOrder.discount}</span>
                  </div>
                )}
                {confirmedOrder.service_charge ? (
                  <div className="flex justify-between">
                    <span>Service Charge:</span>
                    <span className="font-mono">₹{confirmedOrder.service_charge}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>GST & Tax:</span>
                  <span className="font-mono">₹{confirmedOrder.tax}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span className="font-mono text-emerald-600">₹{confirmedOrder.total}</span>
                </div>
              </div>

              {/* Payment status badge */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Payment Method & Status:</span>
                <span className={`font-black uppercase px-2.5 py-0.5 rounded-full ${
                  confirmedOrder.payment_status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {confirmedOrder.payment_method === 'cash_counter' ? '💵 Cash Counter' : confirmedOrder.payment_method === 'online' ? '📱 Online UPI' : '💵 Cash at Table'} • {confirmedOrder.payment_status.toUpperCase()}
                </span>
              </div>

              {/* REAL RESTAURANT DIRECT ONLINE UPI PAYMENT (Direct to Restaurant Bank) */}
              {confirmedOrder.payment_method === 'online' && confirmedOrder.payment_status !== 'paid' && (() => {
                const restUpi = restaurant?.upi_id?.trim() || '';
                const hasValidUpi = Boolean(restUpi && restUpi.includes('@'));
                const upiLink = hasValidUpi
                  ? `upi://pay?pa=${encodeURIComponent(restUpi)}&pn=${encodeURIComponent(restaurant?.name || 'Restaurant')}&am=${confirmedOrder.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Table ${confirmedOrder.table_number} Order #${confirmedOrder.order_number}`)}`
                  : '';
                const qrUrl = hasValidUpi 
                  ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`
                  : '';

                return (
                  <div className="mt-4 p-4 rounded-2xl bg-indigo-50/80 border-2 border-indigo-200 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-indigo-600" />
                        <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                          Direct Restaurant UPI Payment
                        </span>
                      </div>
                      <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        ₹{confirmedOrder.total}
                      </span>
                    </div>

                    {hasValidUpi ? (
                      <>
                        <p className="text-[11px] text-slate-600 leading-tight">
                          This dynamic QR code pays <strong>₹{confirmedOrder.total}</strong> directly to <strong>{restaurant?.name}</strong>'s UPI ID (<strong>{restUpi}</strong>) with no middleman.
                        </p>

                        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                          <img
                            src={qrUrl}
                            alt="Restaurant UPI QR Code"
                            className="w-44 h-44 object-contain rounded-lg border border-slate-100"
                          />
                          <div className="mt-2 text-center">
                            <div className="text-[11px] font-mono font-bold text-slate-800">UPI ID: {restUpi}</div>
                            <div className="text-[10px] text-slate-500 font-semibold">{restaurant?.name} • Total Bill: ₹{confirmedOrder.total}</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left">
                        <div className="text-xs font-bold text-amber-900">⚠️ Restaurant UPI ID Not Configured</div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          The cafe owner hasn't set their UPI address yet. Please pay in cash to the staff or at the cash counter.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOnlineUpiAmount(confirmedOrder.total);
                          setOnlineUpiContext('order_view');
                          setShowOnlineUpiModal(true);
                        }}
                        className="w-full py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs text-center transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 cursor-pointer active:scale-95"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Pay ₹{confirmedOrder.total} via PhonePe / GPay / Paytm</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSimulateOnlinePayment}
                        disabled={simulatingPayment}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{simulatingPayment ? 'Verifying payment...' : 'I Have Paid Online (Verify Payment)'}</span>
                      </button>
                    </div>
                  </div>

                );
              })()}

              {/* CASH COUNTER PAYMENT INSTRUCTIONS */}
              {confirmedOrder.payment_method === 'cash_counter' && (
                <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-left flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-amber-950 uppercase tracking-wide">
                      Pay at Cash Counter
                    </div>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-snug">
                      Your order has reached the kitchen! After your meal, please pay <strong className="font-mono text-amber-950 font-black">₹{confirmedOrder.total}</strong> at the cashier counter with <strong>Order #{confirmedOrder.order_number}</strong> (Table #{confirmedOrder.table_number}).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* FINISHED DINING / CALL STAFF BUTTON ("jab customer ka khatam hojayega to call staff ka button") */}
            <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 text-left space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-base shadow-sm shrink-0">
                  🛎️
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Finished Dining? Call Staff to Table
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Food finished? Tap below to call staff to Table #{confirmedOrder.table_number} for the bill or table clearing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCallStaffForBill(confirmedOrder.table_number)}
                disabled={callingStaffBill}
                className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <BellRing className={`w-4 h-4 ${callingStaffBill ? 'animate-spin' : 'animate-bounce'}`} />
                <span>
                  {callingStaffBill 
                    ? 'Calling Floor Staff...' 
                    : (staffBillCalled ? '✓ Staff Alerted (On the Way!)' : '🛎️ CALL STAFF TO TABLE / REQUEST BILL')}
                </span>
              </button>

              {staffBillCalled && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Floor waiter notified for Table #{confirmedOrder.table_number}. Waiter is on the way!</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setConfirmedOrder(null);
                  fetchRecentOrders();
                  setShowRecentOrdersModal(true);
                }}
                className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-orange-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <History className="w-4 h-4" />
                <span>View Recent Orders History ({recentOrders.length})</span>
              </button>

              <button
                onClick={() => setConfirmedOrder(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition cursor-pointer"
              >
                {t.orderMore}
              </button>

              <button
                onClick={() => {
                  setShowAssistanceModal(true);
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Utensils className="w-3.5 h-3.5 text-orange-500" />
                <span>Need Water, Extra Cutlery or Assistance?</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. RECENT ORDERS HISTORY & RUNNING TAB VIEW */}
      {(showRecentOrdersModal || showRunningBillModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20 shadow-sm">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">
                    Recent Orders & Table Tab
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-orange-600">Table #{selectedTableNumber || 'Dine-In'}</span>
                    <span>•</span>
                    <span>{restaurant.name}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fetchRecentOrders()}
                  disabled={recentOrdersLoading}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 transition shadow-sm cursor-pointer"
                  title="Refresh order status"
                >
                  <RefreshCw className={`w-4 h-4 ${recentOrdersLoading ? 'animate-spin text-orange-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecentOrdersModal(false);
                    setShowRunningBillModal(false);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Session Stats Banner */}
            {(() => {
              const activeOrdersList = recentOrders.length > 0 ? recentOrders : (runningBillData?.orders || []);
              const validOrders = activeOrdersList.filter(o => o.status !== 'CANCELLED');
              const runningTabTotal = validOrders.reduce((sum, o) => sum + o.total, 0);
              const cookingCount = validOrders.filter(o => o.status === 'PREPARING' || o.status === 'ACCEPTED').length;
              const readyCount = validOrders.filter(o => o.status === 'READY').length;

              return (
                <div className="p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-b border-orange-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-orange-900">
                      Table Session Running Tab
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                      <span className="font-bold text-slate-900">{validOrders.length} Order Round{validOrders.length === 1 ? '' : 's'}</span>
                      {cookingCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                          <Flame className="w-3 h-3 text-amber-600" />
                          <span>{cookingCount} Cooking</span>
                        </span>
                      )}
                      {readyCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                          <BellRing className="w-3 h-3 text-emerald-600" />
                          <span>{readyCount} Ready!</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Total</div>
                    <div className="text-xl font-black font-mono text-orange-600">
                      ₹{runningTabTotal}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Navigation Tabs (Table Session vs Phone History) */}
            <div className="px-4 pt-3 flex border-b border-slate-100 bg-white gap-2">
              <button
                type="button"
                onClick={() => setRecentOrdersTab('session')}
                className={`pb-2.5 px-3 text-xs font-black transition relative cursor-pointer flex items-center gap-1.5 ${
                  recentOrdersTab === 'session'
                    ? 'text-orange-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Table Orders ({recentOrders.length > 0 ? recentOrders.length : (runningBillData?.orders?.length || 0)})</span>
                {recentOrdersTab === 'session' && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-orange-500 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setRecentOrdersTab('phone')}
                className={`pb-2.5 px-3 text-xs font-black transition relative cursor-pointer flex items-center gap-1.5 ${
                  recentOrdersTab === 'phone'
                    ? 'text-orange-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Lookup by Phone</span>
                {recentOrdersTab === 'phone' && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-orange-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {recentOrdersTab === 'session' ? (
                /* TAB 1: TABLE SESSION ORDERS */
                (() => {
                  const ordersToDisplay = recentOrders.length > 0 
                    ? recentOrders 
                    : (runningBillData?.orders || []);

                  if (recentOrdersLoading && ordersToDisplay.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <div className="w-8 h-8 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-xs text-slate-500 font-bold">Retrieving recent table orders...</p>
                      </div>
                    );
                  }

                  if (ordersToDisplay.length === 0) {
                    return (
                      <div className="py-10 px-4 text-center bg-slate-50 rounded-3xl border border-slate-200/80">
                        <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                          <Utensils className="w-7 h-7" />
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 mb-1">
                          No Orders Placed Yet for Table #{selectedTableNumber || 'Dine-In'}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5 leading-relaxed">
                          Your food and beverage orders will appear here in real-time with live kitchen preparation updates and one-click reordering.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRecentOrdersModal(false);
                            setShowRunningBillModal(false);
                          }}
                          className="px-6 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
                        >
                          + Explore Menu & Order
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {ordersToDisplay.map((ord, idx) => {
                        const roundNum = ordersToDisplay.length - idx;
                        const isExpanded = expandedReceiptId === ord.id;
                        const isReordering = reorderingOrderId === ord.id;

                        // Stepper progress logic (0: placed, 1: confirmed, 2: preparing, 3: ready/served)
                        const getStepIndex = (status: string) => {
                          if (status === 'PENDING') return 0;
                          if (status === 'ACCEPTED' || status === 'CONFIRMED') return 1;
                          if (status === 'PREPARING') return 2;
                          if (status === 'READY' || status === 'SERVED' || status === 'COMPLETED') return 3;
                          return 0;
                        };
                        const currentStep = getStepIndex(ord.status);

                        const formattedDate = new Date(ord.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div
                            key={ord.id}
                            className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:shadow-md"
                          >
                            {/* Order Header Ribbon */}
                            <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                                  R{roundNum}
                                </span>
                                <div>
                                  <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                                    <span>Order #{ord.order_number}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">({formattedDate})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Table #{ord.table_number} • {ord.items?.length || 0} item{ord.items?.length === 1 ? '' : 's'}
                                  </div>
                                </div>
                              </div>

                              {/* Status Chip */}
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                                  ord.status === 'PREPARING' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                  ord.status === 'READY' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse' :
                                  ord.status === 'SERVED' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                                  ord.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                                  ord.status === 'COMPLETED' ? 'bg-slate-200 text-slate-800' :
                                  ord.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                                  'bg-orange-100 text-orange-900 border border-orange-200'
                                }`}>
                                  {ord.status === 'PREPARING' && <Flame className="w-3 h-3 text-amber-600 animate-bounce" />}
                                  {ord.status === 'READY' && <BellRing className="w-3 h-3 text-emerald-600" />}
                                  {ord.status === 'SERVED' && <Check className="w-3 h-3 text-purple-600" />}
                                  <span>
                                    {ord.status === 'PREPARING' ? 'Cooking' :
                                     ord.status === 'READY' ? 'Ready to Serve' :
                                     ord.status === 'SERVED' ? 'Served' :
                                     ord.status === 'ACCEPTED' ? 'Accepted' :
                                     ord.status === 'COMPLETED' ? 'Completed' : ord.status}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* 4-Step Progress Tracker Bar */}
                            {ord.status !== 'CANCELLED' && (
                              <div className="px-4 py-3 bg-white border-b border-slate-100">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                                  <span className={currentStep >= 0 ? 'text-orange-600 font-black' : ''}>1. Received</span>
                                  <span className={currentStep >= 1 ? 'text-blue-600 font-black' : ''}>2. Accepted</span>
                                  <span className={currentStep >= 2 ? 'text-amber-600 font-black' : ''}>3. Cooking</span>
                                  <span className={currentStep >= 3 ? 'text-emerald-600 font-black' : ''}>4. Served</span>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                  <div className={`h-1.5 rounded-full transition-all ${currentStep >= 0 ? 'bg-orange-500' : 'bg-slate-200'}`} />
                                  <div className={`h-1.5 rounded-full transition-all ${currentStep >= 1 ? 'bg-blue-500' : 'bg-slate-200'}`} />
                                  <div className={`h-1.5 rounded-full transition-all ${currentStep >= 2 ? 'bg-amber-500' : 'bg-slate-200'}`} />
                                  <div className={`h-1.5 rounded-full transition-all ${currentStep >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                </div>
                              </div>
                            )}

                            {/* Cooking Notice if In Progress */}
                            {ord.status === 'PREPARING' && (
                              <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-100 text-[11px] text-amber-900 font-medium flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Chef is preparing your round in the kitchen. Freshly cooked to order!</span>
                              </div>
                            )}

                            {/* Items Breakdown */}
                            <div className="p-4 space-y-2.5">
                              {ord.items?.map((it, i) => (
                                <div key={i} className="flex justify-between items-start text-xs text-slate-800">
                                  <div className="flex-1 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                        {it.quantity}×
                                      </span>
                                      <span className="font-extrabold text-slate-900">{it.item_name_snapshot}</span>
                                    </div>

                                    {/* Customization Details */}
                                    <div className="flex flex-wrap gap-1 mt-1 pl-6">
                                      {it.selected_size && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-semibold">
                                          Size: {it.selected_size}
                                        </span>
                                      )}
                                      {it.spice_level && (
                                        <span className="px-1.5 py-0.5 rounded bg-orange-50 text-[10px] text-orange-700 font-semibold">
                                          🌶️ {it.spice_level}
                                        </span>
                                      )}
                                      {it.selected_addons && it.selected_addons.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-[10px] text-amber-800 font-semibold">
                                          +{it.selected_addons.map(a => a.name).join(', ')}
                                        </span>
                                      )}
                                      {it.special_instructions && (
                                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[10px] text-blue-700 italic">
                                          "{it.special_instructions}"
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="font-mono font-bold text-slate-900">
                                      ₹{it.price_snapshot * it.quantity}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Round Totals & Payment Status Pill */}
                            <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                              <div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Payment Mode
                                </div>
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] mt-0.5">
                                  {ord.payment_method === 'online' ? (
                                    <>
                                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Online UPI</span>
                                    </>
                                  ) : ord.payment_method === 'cash_counter' ? (
                                    <>
                                      <Store className="w-3.5 h-3.5 text-slate-600" />
                                      <span>Pay at Counter</span>
                                    </>
                                  ) : (
                                    <>
                                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Cash at Table</span>
                                    </>
                                  )}

                                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                    ord.payment_status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {ord.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Round Total
                                </div>
                                <div className="text-base font-black font-mono text-orange-600">
                                  ₹{ord.total}
                                </div>
                              </div>
                            </div>

                            {/* Expandable Receipt Breakdown Details */}
                            {isExpanded && (
                              <div className="p-4 bg-slate-100/60 border-t border-slate-200/80 text-[11px] text-slate-600 space-y-1.5 animate-in fade-in">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span className="font-mono font-bold">₹{ord.subtotal}</span>
                                </div>
                                {ord.discount > 0 && (
                                  <div className="flex justify-between text-emerald-700">
                                    <span>Coupon Discount ({ord.coupon_code || 'Promo'}):</span>
                                    <span className="font-mono font-bold">-₹{ord.discount}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span>Taxes & GST:</span>
                                  <span className="font-mono">₹{ord.tax}</span>
                                </div>
                                {ord.service_charge !== undefined && ord.service_charge > 0 && (
                                  <div className="flex justify-between">
                                    <span>Service Charge:</span>
                                    <span className="font-mono">₹{ord.service_charge}</span>
                                  </div>
                                )}
                                <div className="pt-1 border-t border-slate-200 flex justify-between font-black text-slate-900">
                                  <span>Total Amount:</span>
                                  <span className="font-mono text-orange-600">₹{ord.total}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 pt-1">
                                  Order Ref: {ord.id} • Verified via Table #{ord.table_number}
                                </div>
                              </div>
                            )}

                            {/* Action Bar for This Order */}
                            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedReceiptId(isExpanded ? null : ord.id)}
                                className="text-slate-500 hover:text-slate-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                                <span>{isExpanded ? 'Hide Receipt' : 'View Receipt'}</span>
                              </button>

                              <div className="flex items-center gap-2">
                                {/* If online payment pending */}
                                {ord.payment_method === 'online' && ord.payment_status !== 'paid' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await api.verifyOnlinePayment(ord.id, 'paid');
                                        showToast('Payment confirmed successfully!', 'success');
                                        fetchRecentOrders();
                                      } catch (err: any) {
                                        showToast(err.message || 'Payment simulation failed', 'error');
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Pay ₹{ord.total}</span>
                                  </button>
                                )}

                                {/* One-click Reorder this round */}
                                <button
                                  type="button"
                                  onClick={() => handleReorderOrder(ord)}
                                  disabled={isReordering}
                                  className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  title="Add all dishes from this order back to your active cart"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${isReordering ? 'animate-spin' : ''}`} />
                                  <span>Reorder Round</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                /* TAB 2: LOOKUP BY PHONE & ACCOUNT HISTORY */
                <div className="space-y-4">
                  {!loggedInCustomer ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/80">
                        <div className="flex items-center gap-2 text-orange-950 font-bold text-xs mb-1">
                          <Phone className="w-4 h-4 text-orange-600" />
                          <span>Mobile Order Lookup</span>
                        </div>
                        <p className="text-[11px] text-orange-900 leading-relaxed">
                          Enter your phone number to retrieve all past dining orders, receipts, and order rounds associated with your mobile number.
                        </p>
                      </div>

                      <form onSubmit={handleCustomerLogin} className="space-y-3">
                        <div>
                          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                            Mobile Phone Number *
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-slate-400">
                              +91
                            </span>
                            <input
                              type="tel"
                              value={customerLoginPhone}
                              onChange={e => setCustomerLoginPhone(e.target.value)}
                              placeholder="98765 43210"
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                            Your Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={customerLoginName}
                            onChange={e => setCustomerLoginName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loggingInCustomer || !customerLoginPhone.trim()}
                          className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                        >
                          {loggingInCustomer ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Searching Orders...</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4" />
                              <span>Retrieve Orders</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* Customer Past Orders List */
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                            {(loggedInCustomer.name || loggedInCustomer.phone || 'D')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-white">
                              {loggedInCustomer.name || 'Valued Diner'}
                            </div>
                            <div className="text-xs text-orange-400 font-mono">
                              {loggedInCustomer.phone}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCustomerLogout}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>

                      {customerOldOrders.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 p-6">
                          <p className="text-xs font-bold text-slate-700">No past orders found for this phone number</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customerOldOrders.map(ord => (
                            <div key={ord.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-black text-slate-900">Order #{ord.order_number}</div>
                                  <div className="text-[10px] text-slate-500">{new Date(ord.created_at).toLocaleDateString()}</div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-800">
                                  {ord.status}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-slate-200 flex justify-between font-black">
                                <span>Total:</span>
                                <span className="font-mono text-orange-600">₹{ord.total}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleReorderOrder(ord)}
                                className="w-full py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs"
                              >
                                Reorder This Past Order
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center gap-2">
              {(() => {
                const activeOrdersList = recentOrders.length > 0 ? recentOrders : (runningBillData?.orders || []);
                const unpaidOrders = activeOrdersList.filter(o => o.status !== 'CANCELLED' && o.payment_status !== 'paid');
                const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + o.total, 0);

                if (unpaidTotal > 0) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setOnlineUpiAmount(unpaidTotal);
                        setOnlineUpiContext('table_bill');
                        setShowOnlineUpiModal(true);
                      }}
                      className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 active:scale-95"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Pay Bill Online ₹{unpaidTotal} (PhonePe/GPay/Paytm)</span>
                    </button>
                  );
                }
                return null;
              })()}

              <button
                type="button"
                onClick={() => {
                  setShowRecentOrdersModal(false);
                  setShowRunningBillModal(false);
                  setShowAssistanceModal(true);
                  setAssistanceType('waiter');
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <BellRing className="w-4 h-4 text-orange-400" />
                <span>Call Waiter to Table #{selectedTableNumber || ''}</span>
              </button>


              <button
                type="button"
                onClick={() => {
                  setShowRecentOrdersModal(false);
                  setShowRunningBillModal(false);
                  setShowAssistanceModal(true);
                  setAssistanceType('bill');
                }}
                className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Receipt className="w-4 h-4" />
                <span>Request Printed Bill</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRecentOrdersModal(false);
                  setShowRunningBillModal(false);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. CALL WAITER / TABLE ASSISTANCE MODAL */}
      {showAssistanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-base text-slate-900">{t.assistanceTitle}</h3>
              </div>
              <button
                onClick={() => setShowAssistanceModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600">
                Staff serving Table <strong>#{selectedTableNumber}</strong> will receive an immediate notification.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssistanceType('waiter')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition text-left cursor-pointer ${
                    assistanceType === 'waiter' 
                      ? 'border-orange-500 bg-orange-50 text-orange-950 font-black' 
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  🛎️ Call Waiter
                </button>
                <button
                  type="button"
                  onClick={() => setAssistanceType('water')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition text-left cursor-pointer ${
                    assistanceType === 'water' 
                      ? 'border-orange-500 bg-orange-50 text-orange-950 font-black' 
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  💧 Drinking Water
                </button>
                <button
                  type="button"
                  onClick={() => setAssistanceType('cutlery')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition text-left cursor-pointer ${
                    assistanceType === 'cutlery' 
                      ? 'border-orange-500 bg-orange-50 text-orange-950 font-black' 
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  🍴 Extra Cutlery
                </button>
                <button
                  type="button"
                  onClick={() => setAssistanceType('bill')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition text-left cursor-pointer ${
                    assistanceType === 'bill' 
                      ? 'border-orange-500 bg-orange-50 text-orange-950 font-black' 
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  🧾 Print Final Bill
                </button>
              </div>

              <input
                type="text"
                value={assistanceNote}
                onChange={e => setAssistanceNote(e.target.value)}
                placeholder="Optional note for staff..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={handleCallWaiter}
                disabled={callingWaiter}
                className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition disabled:opacity-50 cursor-pointer shadow-md shadow-orange-500/20"
              >
                {callingWaiter ? 'Alerting Staff...' : t.sendRequest}
              </button>
              <button
                onClick={() => setShowAssistanceModal(false)}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. CUSTOMER AUTH & OLD ORDERS MODAL */}
      {showCustomerAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">Diner Account & Order History</h3>
                  <p className="text-[11px] text-slate-500">Track and view your current and previous dining orders</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerAuthModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 overflow-y-auto flex-1 space-y-4">
              {!loggedInCustomer ? (
                /* Login / Phone Identification Form */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/80">
                    <div className="flex items-center gap-2 text-orange-950 font-bold text-xs mb-1">
                      <Phone className="w-4 h-4 text-orange-600" />
                      <span>Instant Mobile Login</span>
                    </div>
                    <p className="text-[11px] text-orange-900 leading-relaxed">
                      Enter your phone number to view all previous orders, dish customizations, running tabs, and receipts for this restaurant.
                    </p>
                  </div>

                  <form onSubmit={handleCustomerLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                        Mobile Phone Number *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-slate-400">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={customerLoginPhone}
                          onChange={e => setCustomerLoginPhone(e.target.value)}
                          placeholder="98765 43210"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerLoginName}
                        onChange={e => setCustomerLoginName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loggingInCustomer || !customerLoginPhone.trim()}
                      className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                    >
                      {loggingInCustomer ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Searching Orders...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Login & View My Orders</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Privacy & Order Security</span>
                    </div>
                    <p className="text-slate-500">
                      Your mobile number is only used to retrieve your dine-in table history and display live preparation updates.
                    </p>
                  </div>
                </div>
              ) : (
                /* Logged In Customer Profile & Order History */
                <div className="space-y-4">
                  {/* Customer Banner */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                        {(loggedInCustomer.name || loggedInCustomer.phone || 'D')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-white">
                          {loggedInCustomer.name || 'Valued Diner'}
                        </div>
                        <div className="text-xs text-orange-400 font-mono">
                          {loggedInCustomer.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadCustomerOrders(loggedInCustomer.phone)}
                        disabled={loadingOldOrders}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                        title="Refresh Orders"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingOldOrders ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={handleCustomerLogout}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Sign out of this number"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>

                  {/* Previous Orders Title */}
                  <div className="flex items-center justify-between pt-1">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-4 h-4 text-orange-500" />
                      <span>Past Orders ({customerOldOrders.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Konse number se kya order hua tha
                    </span>
                  </div>

                  {/* List of Old Orders */}
                  {loadingOldOrders ? (
                    <div className="py-8 text-center">
                      <div className="w-8 h-8 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">Loading your order history...</p>
                    </div>
                  ) : customerOldOrders.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 p-6">
                      <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700 mb-1">No past orders found yet</p>
                      <p className="text-[11px] text-slate-500">
                        When you place orders using {loggedInCustomer.phone}, they will appear here with complete details and item breakdowns.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerOldOrders.map((ord) => {
                        const dateStr = new Date(ord.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div
                            key={ord.id}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-sm space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm text-slate-900">
                                    Order #{ord.order_number}
                                  </span>
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                    Table #{ord.table_number}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {dateStr}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  ord.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                  ord.status === 'READY' ? 'bg-blue-100 text-blue-800' :
                                  ord.status === 'PREPARING' ? 'bg-amber-100 text-amber-800' :
                                  ord.status === 'SERVED' ? 'bg-purple-100 text-purple-800' :
                                  'bg-slate-200 text-slate-700'
                                }`}>
                                  {ord.status}
                                </span>
                                <div className="text-[10px] font-bold mt-1 text-slate-600">
                                  {ord.payment_method === 'cash_counter' ? '🏪 Pay at Counter' :
                                   ord.payment_method === 'online' ? '💳 Online UPI' : '💵 Cash at Table'}
                                  {ord.payment_status === 'paid' ? ' (Paid)' : ' (Unpaid)'}
                                </div>
                              </div>
                            </div>

                            {/* Food Items Ordered */}
                            <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                              {ord.items?.map((it, idx) => (
                                <div key={idx} className="flex justify-between items-start text-xs text-slate-700">
                                  <div>
                                    <span className="font-bold text-slate-900">{it.quantity}×</span>{' '}
                                    <span>{it.item_name_snapshot}</span>
                                    {it.customization && (
                                      <span className="text-[10px] text-orange-600 block pl-4">
                                        ({it.customization})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono font-bold text-slate-800">
                                    ₹{it.price_snapshot * it.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Order Total */}
                            <div className="pt-2 border-t border-slate-200/70 flex justify-between items-center text-xs font-black text-slate-900">
                              <span>Total Bill:</span>
                              <span className="font-mono text-base text-orange-600">
                                ₹{ord.total}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowCustomerAuthModal(false)}
                className="px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONLINE UPI PAYMENT MODAL (PhonePe, Google Pay, Paytm) */}
      <OnlineUpiPaymentModal
        isOpen={showOnlineUpiModal}
        amount={onlineUpiAmount}
        restaurantName={restaurant?.name || 'Restaurant'}
        restaurantUpiId={restaurant?.upi_id || ''}
        tableNumber={selectedTableNumber}
        orderNumber={confirmedOrder?.order_number}
        onSuccess={handleOnlinePaymentSuccess}
        onClose={() => setShowOnlineUpiModal(false)}
      />
    </div>
  );
};

