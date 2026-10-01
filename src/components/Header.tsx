import React from 'react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const {
    settings,
    activeTab,
    setActiveTab,
    openBarcodeScanner,
    openBarcodeGenerator,
    lowStockCount,
    outOfStockCount,
    lockApp,
  } = useApp();

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Overview';
      case 'pos':
        return 'Quick POS & Billing';
      case 'purchases':
        return 'Purchase Orders';
      case 'products':
        return 'Product Catalog';
      case 'stock':
        return 'Stock & Inventory';
      case 'customers':
        return 'Customer Accounts';
      case 'suppliers':
        return 'Suppliers & Vendors';
      case 'expenses':
        return 'Expense Tracker';
      case 'reports':
        return 'Financial Reports';
      case 'closing':
        return 'Daily Closing';
      case 'settings':
        return 'System Settings';
      default:
        return 'LubeFlow Pro';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Active Page */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="cursor-pointer w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-sm shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
              {getTitle()}
            </h1>
            <p className="text-[11px] text-slate-500 truncate hidden xs:block">
              {settings?.businessName || 'LubeFlow Pro'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Stock Alert Badge */}
          {(lowStockCount > 0 || outOfStockCount > 0) && (
            <button
              onClick={() => setActiveTab('stock')}
              title={`${lowStockCount} low stock, ${outOfStockCount} out of stock`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{lowStockCount + outOfStockCount} Low</span>
            </button>
          )}

          {/* Instant QR & Camera Scan Button */}
          <button
            onClick={() => openBarcodeScanner(() => {})}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Scan QR Code or 1D Barcode"
          >
            <span className="text-sm">📷</span>
            <span className="hidden xs:inline">QR / Barcode</span>
          </button>

          {/* QR & Barcode Generator */}
          <button
            onClick={() => openBarcodeGenerator(null)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Generate & Print QR Stickers"
          >
            <span className="text-sm">🏷️</span>
            <span className="hidden sm:inline">Labels</span>
          </button>

          {/* Quick POS Button */}
          {activeTab !== 'pos' && (
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <span>+ Sale</span>
            </button>
          )}

          {/* Lock App */}
          {settings?.isPinAuthEnabled && (
            <button
              onClick={lockApp}
              title="Lock Application"
              className="w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
