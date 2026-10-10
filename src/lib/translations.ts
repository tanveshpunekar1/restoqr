export type Language = 'en' | 'hi' | 'mr';

export interface TranslationDictionary {
  table: string;
  ordering_from_table: string;
  all_items: string;
  recommended: string;
  search_placeholder: string;
  search_results: string;
  no_items_found: string;
  veg_only: string;
  non_veg: string;
  bestseller: string;
  spicy: string;
  add: string;
  added: string;
  customise: string;
  out_of_stock: string;
  show_order: string;
  my_order: string;
  add_more_items: string;
  clear_cart: string;
  clear_cart_confirm: string;
  have_coupon: string;
  coupon_applied: string;
  coupon_placeholder: string;
  apply: string;
  remove: string;
  special_instructions: string;
  special_instructions_placeholder: string;
  customer_info: string;
  customer_name: string;
  customer_phone: string;
  bill_details: string;
  item_subtotal: string;
  coupon_discount: string;
  service_charge: string;
  tax: string;
  grand_total: string;
  payment_method: string;
  pay_online: string;
  cash_table: string;
  cash_counter: string;
  confirm_order: string;
  placing_order: string;
  order_confirmed: string;
  order_number: string;
  estimated_prep_time: string;
  verification_pin_notice: string;
  status_received: string;
  status_accepted: string;
  status_preparing: string;
  status_ready: string;
  status_served: string;
  status_completed: string;
  table_running_bill: string;
  view_table_bill: string;
  running_total: string;
  order_again: string;
  back_to_menu: string;
  restaurant_closed_notice: string;
  order_notes: string;
  select_size: string;
  add_ons: string;
  spice_level: string;
  item_instructions: string;
  item_instructions_placeholder: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    table: 'TABLE',
    ordering_from_table: "You're ordering from Table",
    all_items: 'All Items',
    recommended: 'Recommended & Bestsellers',
    search_placeholder: 'Search delicious food, drinks, pizzas...',
    search_results: 'Search Results',
    no_items_found: 'No dishes found matching your search.',
    veg_only: 'Veg Only',
    non_veg: 'Non-Veg',
    bestseller: 'Bestseller',
    spicy: 'Spicy',
    add: 'ADD',
    added: 'ADDED',
    customise: 'Customise',
    out_of_stock: 'OUT OF STOCK',
    show_order: 'SHOW MY ORDER',
    my_order: 'MY ORDER',
    add_more_items: '+ ADD MORE ITEMS',
    clear_cart: 'Clear Cart',
    clear_cart_confirm: 'Are you sure you want to clear your cart?',
    have_coupon: 'Have a coupon code?',
    coupon_applied: 'Coupon Applied',
    coupon_placeholder: 'ENTER COUPON (e.g. SAVE50)',
    apply: 'APPLY',
    remove: 'REMOVE',
    special_instructions: 'Special instructions for chef',
    special_instructions_placeholder: 'e.g. Less spicy, serve starters first, extra napkins',
    customer_info: 'Your Details (Optional)',
    customer_name: 'Your Name (Optional)',
    customer_phone: 'Mobile Number (For order status)',
    bill_details: 'Bill Breakdown',
    item_subtotal: 'Item Subtotal',
    coupon_discount: 'Coupon Savings',
    service_charge: 'Service Charge',
    tax: 'GST & Taxes',
    grand_total: 'Total Payable',
    payment_method: 'Select Payment Method',
    pay_online: 'Pay Online (Instant UPI / Cards)',
    cash_table: 'Cash at Table',
    cash_counter: 'Cash at Counter',
    confirm_order: 'CONFIRM ORDER',
    placing_order: 'Placing order with kitchen...',
    order_confirmed: 'ORDER CONFIRMED',
    order_number: 'Order',
    estimated_prep_time: 'Est. Prep Time',
    verification_pin_notice: 'Please share this PIN with your table server:',
    status_received: 'Order Received',
    status_accepted: 'Accepted',
    status_preparing: 'Preparing in Kitchen',
    status_ready: 'Ready for Serving',
    status_served: 'Served at Table',
    status_completed: 'Dining Completed',
    table_running_bill: 'Table Running Bill',
    view_table_bill: 'View Table Bill',
    running_total: 'Running Total',
    order_again: '+ Add More Items (Next Round)',
    back_to_menu: 'Back to Menu',
    restaurant_closed_notice: "We're currently not accepting orders. Please browse the menu.",
    order_notes: 'Notes',
    select_size: 'Select Portion / Size',
    add_ons: 'Select Add-ons',
    spice_level: 'Spice Level',
    item_instructions: 'Special note for this item',
    item_instructions_placeholder: 'e.g. No onion, extra crispy'
  },
  hi: {
    table: 'टेबल',
    ordering_from_table: 'आप ऑर्डर कर रहे हैं टेबल',
    all_items: 'सभी व्यंजन',
    recommended: 'लोकप्रिय और खास व्यंजन',
    search_placeholder: 'व्यंजन, ड्रिंक्स, पिज्जा खोजें...',
    search_results: 'खोज परिणाम',
    no_items_found: 'कोई व्यंजन नहीं मिला।',
    veg_only: 'केवल शाकाहारी',
    non_veg: 'मांसाहारी',
    bestseller: 'बेस्टसेलर',
    spicy: 'तीखा',
    add: 'जोड़ें',
    added: 'जोड़ा गया',
    customise: 'कस्टमाइज़',
    out_of_stock: 'स्टॉक में नहीं',
    show_order: 'मेरा ऑर्डर देखें',
    my_order: 'मेरी ऑर्डर सूची',
    add_more_items: '+ और व्यंजन जोड़ें',
    clear_cart: 'कार्ट खाली करें',
    clear_cart_confirm: 'क्या आप अपनी कार्ट खाली करना चाहते हैं?',
    have_coupon: 'क्या आपके पास कूपन कोड है?',
    coupon_applied: 'कूपन लागू हुआ',
    coupon_placeholder: 'कूपन दर्ज करें (उदा. SAVE50)',
    apply: 'लागू करें',
    remove: 'हटाएं',
    special_instructions: 'शेफ के लिए विशेष निर्देश',
    special_instructions_placeholder: 'उदा. कम तीखा, स्टार्टर पहले लाएं',
    customer_info: 'आपकी जानकारी (वैकल्पिक)',
    customer_name: 'आपका नाम (वैकल्पिक)',
    customer_phone: 'मोबाइल नंबर',
    bill_details: 'बिल विवरण',
    item_subtotal: 'व्यंजन उप-योग',
    coupon_discount: 'कूपन छूट',
    service_charge: 'सेवा शुल्क',
    tax: 'जीएसटी और कर',
    grand_total: 'कुल देय राशि',
    payment_method: 'भुगतान का तरीका चुनें',
    pay_online: 'ऑनलाइन भुगतान (UPI / कार्ड)',
    cash_table: 'टेबल पर नकद',
    cash_counter: 'काउंटर पर नकद',
    confirm_order: 'ऑर्डर कन्फर्म करें',
    placing_order: 'रसोई को ऑर्डर भेजा जा रहा है...',
    order_confirmed: 'ऑर्डर कन्फर्म हुआ!',
    order_number: 'ऑर्डर क्रमांक',
    estimated_prep_time: 'अनुमानित तैयारी समय',
    verification_pin_notice: 'कृपया यह पिन अपने वेटर को बताएं:',
    status_received: 'ऑर्डर प्राप्त हुई',
    status_accepted: 'स्वीकृत',
    status_preparing: 'रसोई में तैयारी चल रही है',
    status_ready: 'परोसने के लिए तैयार',
    status_served: 'टेबल पर परोसा गया',
    status_completed: 'भोजन पूर्ण हुआ',
    table_running_bill: 'टेबल का रनिंग बिल',
    view_table_bill: 'टेबल बिल देखें',
    running_total: 'कुल रनिंग राशि',
    order_again: '+ अगला राउंड ऑर्डर करें',
    back_to_menu: 'मेन्यू पर वापस जाएं',
    restaurant_closed_notice: 'वर्तमान में नए ऑर्डर स्वीकार नहीं किए जा रहे हैं।',
    order_notes: 'नोट्स',
    select_size: 'आकार / मात्रा चुनें',
    add_ons: 'ऐड-ऑन चुनें',
    spice_level: 'तीखापन स्तर',
    item_instructions: 'इस व्यंजन के लिए निर्देश',
    item_instructions_placeholder: 'उदा. बिना प्याज, कुरकुरा बनाएं'
  },
  mr: {
    table: 'टेबल',
    ordering_from_table: 'तुम्ही ऑर्डर करत आहात टेबल',
    all_items: 'सर्व पदार्थ',
    recommended: 'लोकप्रिय व शिफारस केलेले',
    search_placeholder: 'पदार्थ, पेये, पिझ्झा शोधा...',
    search_results: 'शोध निकाल',
    no_items_found: 'कोणताही पदार्थ सापडला नाही.',
    veg_only: 'फक्त शाकाहारी',
    non_veg: 'मांसाहारी',
    bestseller: 'बेस्टसेलर',
    spicy: 'तिखट',
    add: 'जोडा',
    added: 'जोडले',
    customise: 'कस्टमाइझ',
    out_of_stock: 'उपलब्ध नाही',
    show_order: 'माझी ऑर्डर पहा',
    my_order: 'माझी ऑर्डर',
    add_more_items: '+ आणखी पदार्थ जोडा',
    clear_cart: 'कार्ट रिकामी करा',
    clear_cart_confirm: 'तुम्हाला कार्ट रिकामी करायची आहे का?',
    have_coupon: 'तुमच्याकडे कूपन कोड आहे का?',
    coupon_applied: 'कूपन लागू झाले',
    coupon_placeholder: 'कूपन कोड टाका (उदा. SAVE50)',
    apply: 'लागू करा',
    remove: 'काढून टाका',
    special_instructions: 'शेफसाठी विशेष सूचना',
    special_instructions_placeholder: 'उदा. कमी तिखट, स्टार्टर आधी द्या',
    customer_info: 'तुमची माहिती (पर्यायी)',
    customer_name: 'तुमचे नाव (पर्यायी)',
    customer_phone: 'मोबाईल नंबर',
    bill_details: 'बिल तपशील',
    item_subtotal: 'पदार्थांची एकूण किंमत',
    coupon_discount: 'कूपन सवलत',
    service_charge: 'सर्व्हिस चार्ज',
    tax: 'जीएसटी आणि कर',
    grand_total: 'एकूण देय रक्कम',
    payment_method: 'पेमेंट पद्धत निवडा',
    pay_online: 'ऑनलाइन पेमेंट (UPI / कार्ड)',
    cash_table: 'टेबलावर रोख',
    cash_counter: 'काउंटरवर रोख',
    confirm_order: 'ऑर्डर निश्चित करा',
    placing_order: 'किचनकडे ऑर्डर पाठवत आहे...',
    order_confirmed: 'ऑर्डर निश्चित झाली!',
    order_number: 'ऑर्डर क्र.',
    estimated_prep_time: 'अंदाजे वेळ',
    verification_pin_notice: 'कृपया हा पिन तुमच्या वेटरला सांगा:',
    status_received: 'ऑर्डर स्वीकारली',
    status_accepted: 'मंजूर',
    status_preparing: 'किचनमध्ये तयारी सुरू आहे',
    status_ready: 'सर्व्ह करण्यासाठी तयार',
    status_served: 'टेबलावर सर्व्ह केले',
    status_completed: 'भोजन पूर्ण झाले',
    table_running_bill: 'टेबलचे चालू बिल',
    view_table_bill: 'टेबल बिल पहा',
    running_total: 'चालू एकूण रक्कम',
    order_again: '+ पुढील फेरी ऑर्डर करा',
    back_to_menu: 'मेन्यूकडे परत जा',
    restaurant_closed_notice: 'सध्या नवीन ऑर्डर्स स्वीकारल्या जात नाहीत.',
    order_notes: 'सूचना',
    select_size: 'आकार / प्रमाण निवडा',
    add_ons: 'ऐड-ऑन जोडा',
    spice_level: 'तिखटपणाची पातळी',
    item_instructions: 'या पदार्थासाठी विशेष सूचना',
    item_instructions_placeholder: 'उदा. कांदा नको, जास्त कुरकुरीत'
  }
};
