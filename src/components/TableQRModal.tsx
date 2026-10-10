import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { RestaurantTable, Restaurant } from '../types';
import { Download, Printer, X, Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from './Toast';

interface TableQRModalProps {
  table?: RestaurantTable | null;
  restaurant: Restaurant;
  allTables?: RestaurantTable[];
  isAllMode?: boolean;
  onClose: () => void;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({
  table,
  restaurant,
  allTables = [],
  isAllMode = false,
  onClose
}) => {
  const { showToast } = useToast();
  const [singleQrUrl, setSingleQrUrl] = useState<string>('');
  const [allQrUrls, setAllQrUrls] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const getTableUrl = (tableNum: number) => {
    return `${window.location.origin}/menu/${restaurant.slug}/table/${tableNum}`;
  };

  useEffect(() => {
    if (!isAllMode && table) {
      const url = getTableUrl(table.table_number);
      QRCode.toDataURL(url, { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(setSingleQrUrl)
        .catch(console.error);
    } else if (isAllMode && allTables.length > 0) {
      const generateAll = async () => {
        const urls: Record<number, string> = {};
        for (const t of allTables) {
          const url = getTableUrl(t.table_number);
          urls[t.table_number] = await QRCode.toDataURL(url, {
            width: 260,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' }
          });
        }
        setAllQrUrls(urls);
      };
      generateAll();
    }
  }, [table, isAllMode, allTables, restaurant.slug]);

  const handleCopyLink = () => {
    if (!table) return;
    const url = getTableUrl(table.table_number);
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast('Menu URL copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    if (!singleQrUrl || !table) return;
    const a = document.createElement('a');
    a.href = singleQrUrl;
    a.download = `${restaurant.slug}-table-${table.table_number}-qr.png`;
    a.click();
    showToast(`Table ${table.table_number} QR downloaded`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {isAllMode ? `Print All Table QR Cards (${allTables.length} Tables)` : `Table ${table?.table_number} QR Card`}
            </h3>
            <p className="text-xs text-slate-500">
              {isAllMode ? 'High-resolution printable standees for your restaurant tables' : 'Unique QR code mapped directly to this dining table'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50" ref={printAreaRef}>
          {!isAllMode && table && (
            <div className="flex flex-col items-center">
              {/* Standee Card Preview */}
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm max-w-sm w-full text-center flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-orange-500 to-amber-500" />
                
                <img
                  src={restaurant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80'}
                  alt={restaurant.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm mb-3 mt-2"
                />
                
                <h4 className="text-lg font-black text-slate-900 tracking-tight">{restaurant.name}</h4>
                <div className="my-3 px-4 py-1.5 bg-orange-50 text-orange-700 rounded-full font-extrabold text-sm uppercase tracking-wider border border-orange-200">
                  TABLE {table.table_number}
                </div>

                <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-inner my-2">
                  {singleQrUrl ? (
                    <img src={singleQrUrl} alt={`Table ${table.table_number} QR`} className="w-52 h-52 object-contain" />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-slate-100 text-slate-400 text-xs animate-pulse">
                      Generating QR...
                    </div>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-700 mt-2">
                  Scan with Camera to View Menu & Order
                </p>
                <p className="text-[11px] text-slate-400 mt-1">No app download required</p>

                {restaurant.wifi_info && (
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-200 w-full text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Free Guest WiFi:</span> {restaurant.wifi_info}
                  </div>
                )}
              </div>

              {/* URL bar */}
              <div className="mt-6 w-full max-w-sm flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="truncate flex-1 font-mono text-[11px]">{getTableUrl(table.table_number)}</span>
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
                  title="Copy Link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={getTableUrl(table.table_number)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
                  title="Open Customer Menu"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {isAllMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
              {allTables.map(t => (
                <div
                  key={t.id}
                  className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm text-center flex flex-col items-center relative overflow-hidden break-inside-avoid"
                >
                  <div className="absolute top-0 inset-x-0 h-2 bg-orange-500" />
                  <h4 className="text-base font-black text-slate-900 mt-2">{restaurant.name}</h4>
                  <div className="my-2 px-3 py-1 bg-orange-50 text-orange-700 rounded-full font-extrabold text-xs uppercase tracking-wider border border-orange-200">
                    TABLE {t.table_number}
                  </div>
                  {allQrUrls[t.table_number] ? (
                    <img
                      src={allQrUrls[t.table_number]}
                      alt={`Table ${t.table_number} QR`}
                      className="w-44 h-44 object-contain my-1"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                      Generating...
                    </div>
                  )}
                  <p className="text-[11px] font-semibold text-slate-700 mt-1">Scan to View Menu & Order</p>
                  {restaurant.wifi_info && (
                    <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-dashed border-slate-100 w-full truncate">
                      WiFi: {restaurant.wifi_info}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            {!isAllMode && (
              <button
                onClick={handleDownloadSingle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition shadow-sm"
              >
                <Download className="w-4 h-4" /> Download QR
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition shadow-sm shadow-orange-500/20"
            >
              <Printer className="w-4 h-4" /> {isAllMode ? 'Print All Cards' : 'Print Table Standee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
