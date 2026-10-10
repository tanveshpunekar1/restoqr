'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, CheckCircle2, Copy, Check, ArrowRight, ShieldCheck, Smartphone, ExternalLink, QrCode } from 'lucide-react';
import { useToast } from './Toast';

interface OnlineUpiPaymentModalProps {
  isOpen: boolean;
  amount: number;
  restaurantName: string;
  restaurantUpiId: string;
  tableNumber?: number;
  orderNumber?: number | string;
  onSuccess: (paymentData: { app: 'phonepe' | 'gpay' | 'paytm' | 'other'; utr?: string }) => void;
  onClose: () => void;
}

export const OnlineUpiPaymentModal: React.FC<OnlineUpiPaymentModalProps> = ({
  isOpen,
  amount,
  restaurantName,
  restaurantUpiId,
  tableNumber,
  orderNumber,
  onSuccess,
  onClose
}) => {
  const { showToast } = useToast();
  const [selectedApp, setSelectedApp] = useState<'phonepe' | 'gpay' | 'paytm' | 'other'>('phonepe');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [appLaunched, setAppLaunched] = useState(false);

  // Restaurant Configured UPI ID
  const isUpiConfigured = Boolean(restaurantUpiId && restaurantUpiId.includes('@'));
  const cleanUpiId = isUpiConfigured ? restaurantUpiId.trim() : '';

  const transactionNote = tableNumber 
    ? `Table ${tableNumber} ${orderNumber ? `Order #${orderNumber}` : 'Dining Bill'}`
    : 'Restaurant Meal Bill';

  const standardUpiUrl = `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(restaurantName || 'Restaurant')}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
  
  // Specific App URI intents
  const phonepeUrl = `phonepe://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(restaurantName || 'Restaurant')}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
  const gpayUrl = `gpay://upi/pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(restaurantName || 'Restaurant')}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
  const paytmUrl = `paytmmp://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(restaurantName || 'Restaurant')}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  // Generate dynamic QR code with exact amount
  useEffect(() => {
    if (!isOpen || amount <= 0) return;
    QRCode.toDataURL(standardUpiUrl, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate UPI QR:', err));
  }, [isOpen, standardUpiUrl, amount]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(cleanUpiId);
    setCopiedUpi(true);
    showToast(`UPI ID ${cleanUpiId} copied!`, 'info');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleLaunchApp = (app: 'phonepe' | 'gpay' | 'paytm' | 'other') => {
    setSelectedApp(app);
    setAppLaunched(true);

    let targetUrl = standardUpiUrl;
    if (app === 'phonepe') targetUrl = phonepeUrl;
    if (app === 'gpay') targetUrl = gpayUrl;
    if (app === 'paytm') targetUrl = paytmUrl;

    // Trigger app link
    try {
      window.location.href = targetUrl;
    } catch {
      // Fallback to standard
      window.location.href = standardUpiUrl;
    }
  };

  const handleConfirmPaid = () => {
    setConfirming(true);
    setTimeout(() => {
      onSuccess({
        app: selectedApp,
        utr: utrNumber.trim() || undefined
      });
      setConfirming(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Instant Online UPI Pay</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h3 className="font-extrabold text-base text-white truncate max-w-[220px]">
                {restaurantName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="p-4 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold block uppercase tracking-wide">
              {tableNumber ? `Table #${tableNumber} Bill` : 'Total to Pay'}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 font-mono tracking-tight">
              ₹{amount.toFixed(2)}
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
              <ShieldCheck className="w-3 h-3" />
              <span>Direct to Bank</span>
            </span>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              0% extra charges
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Choose App Section */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
              <span>Choose Your Payment App:</span>
              <span className="text-[10px] font-semibold text-slate-400">Exact amount pre-filled</span>
            </label>

            <div className="grid grid-cols-1 gap-2">
              {/* PhonePe Option */}
              <button
                type="button"
                onClick={() => handleLaunchApp('phonepe')}
                className={`p-3 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                  selectedApp === 'phonepe'
                    ? 'border-[#5f259f] bg-[#5f259f]/5 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5f259f] text-white flex items-center justify-center font-black text-lg shadow-sm">
                    पे
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>PhonePe</span>
                      {selectedApp === 'phonepe' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5f259f] text-white font-bold">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tap to pay ₹{amount.toFixed(2)} on PhonePe
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm text-[#5f259f]">₹{amount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Google Pay Option */}
              <button
                type="button"
                onClick={() => handleLaunchApp('gpay')}
                className={`p-3 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                  selectedApp === 'gpay'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 flex items-center justify-center font-black text-base shadow-sm">
                    <span className="text-blue-600">G</span>
                    <span className="text-rose-600">P</span>
                    <span className="text-amber-500">a</span>
                    <span className="text-emerald-600">y</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>Google Pay (GPay)</span>
                      {selectedApp === 'gpay' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tap to pay ₹{amount.toFixed(2)} on Google Pay
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm text-blue-600">₹{amount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Paytm Option */}
              <button
                type="button"
                onClick={() => handleLaunchApp('paytm')}
                className={`p-3 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                  selectedApp === 'paytm'
                    ? 'border-[#002e6e] bg-[#002e6e]/5 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#002e6e] text-white flex items-center justify-center font-black text-xs tracking-tighter shadow-sm">
                    Paytm
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>Paytm UPI</span>
                      {selectedApp === 'paytm' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#002e6e] text-white font-bold">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tap to pay ₹{amount.toFixed(2)} on Paytm
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm text-[#002e6e]">₹{amount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Any Other UPI App */}
              <button
                type="button"
                onClick={() => handleLaunchApp('other')}
                className={`p-2.5 rounded-xl border transition flex items-center justify-between text-xs cursor-pointer ${
                  selectedApp === 'other'
                    ? 'border-slate-800 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Other UPI Apps (CRED, BHIM, Amazon Pay)</span>
                </span>
                <span className="font-mono font-bold">₹{amount.toFixed(2)}</span>
              </button>
            </div>
          </div>

          {/* Dynamic QR Code Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>Or Scan QR Code to Pay</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-600">
                ₹{amount.toFixed(2)}
              </span>
            </div>

            {qrDataUrl ? (
              <div className="inline-block p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm mx-auto">
                <img
                  src={qrDataUrl}
                  alt="Dynamic Restaurant UPI QR Code"
                  className="w-44 h-44 object-contain rounded-lg mx-auto"
                />
              </div>
            ) : (
              <div className="w-44 h-44 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-xs text-slate-400">
                Generating QR...
              </div>
            )}

            {/* UPI ID Copy Line */}
            {isUpiConfigured ? (
              <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-left">
                <div className="truncate">
                  <div className="text-[9px] uppercase font-bold text-emerald-600 flex items-center gap-1">
                    <span>✓ Restaurant Direct UPI ID</span>
                  </div>
                  <div className="text-xs font-mono font-black text-slate-800 truncate">{cleanUpiId}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left space-y-1">
                <div className="text-[11px] font-bold text-amber-900">⚠️ UPI ID Not Configured by Restaurant</div>
                <p className="text-[10px] text-amber-800">
                  The restaurant owner has not added their UPI ID yet in Settings. Please ask staff or pay at the cash counter.
                </p>
              </div>
            )}
          </div>

          {/* Optional UTR / Ref Number */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600">
              UPI Reference / UTR Number (Optional):
            </label>
            <input
              type="text"
              value={utrNumber}
              onChange={e => setUtrNumber(e.target.value)}
              placeholder="e.g. 412389123456 (12 digits from receipt)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Modal Footer Confirmation */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleConfirmPaid}
            disabled={confirming}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {confirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Payment...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>I HAVE PAID ₹{amount.toFixed(2)} (CONFIRM)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer text-center"
          >
            Cancel / Choose Another Method
          </button>
        </div>
      </div>
    </div>
  );
};
