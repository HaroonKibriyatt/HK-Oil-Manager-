import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openDownloadModal } = useApp();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainTabs = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'products',
      label: 'Products',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: 'pos',
      label: 'POS Sale',
      isCenter: true,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
    {
      id: 'stock',
      label: 'Stock',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'more',
      label: 'More',
      isMore: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
  ];

  const moreMenuItems = [
    { id: 'purchases', label: 'Purchases (Incoming Stock)', icon: '📥', desc: 'Vendor orders & batch rates' },
    { id: 'customers', label: 'Customers & Credit Ledger', icon: '👥', desc: 'Accounts, credit & balances' },
    { id: 'suppliers', label: 'Suppliers & Vendors', icon: '🏭', desc: 'Petroleum distributors & dues' },
    { id: 'expenses', label: 'Daily Expenses', icon: '💸', desc: 'Shop rent, electricity & bills' },
    { id: 'reports', label: 'Reports & Analytics', icon: '📊', desc: 'Profit, sales & PDF statements' },
    { id: 'closing', label: 'Daily Cash Closing', icon: '🔒', desc: 'Day-end cash drawer tally' },
    { id: 'settings', label: 'Settings & Backup', icon: '⚙️', desc: 'Shop profile, units & PIN' },
    { id: 'download_app', label: 'Download Android APK', icon: '📱', desc: 'Direct GitHub live download' },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMoreMenuOpen && (
        <div
          onClick={() => setIsMoreMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-16 inset-x-0 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 shadow-2xl max-w-lg mx-auto max-h-[75vh] overflow-y-auto"
          >
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Management & Operations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {moreMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'download_app') {
                      openDownloadModal();
                    } else {
                      setActiveTab(item.id);
                    }
                    setIsMoreMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                    activeTab === item.id
                      ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/80 text-sky-900 dark:text-sky-200'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xl p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs">
                    {item.icon}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold leading-tight">{item.label}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 select-none pb-safe">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            if (tab.isCenter) {
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setActiveTab(tab.id);
                  }}
                  className="relative -top-3 flex flex-col items-center group"
                >
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-transform active:scale-95 group-hover:scale-105">
                    {tab.icon}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {tab.label}
                  </span>
                </button>
              );
            }

            if (tab.isMore) {
              const isMoreActive =
                isMoreMenuOpen ||
                ['purchases', 'customers', 'suppliers', 'expenses', 'reports', 'closing', 'settings'].includes(
                  activeTab
                );
              return (
                <button
                  key={tab.id}
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
                    isMoreActive
                      ? 'text-sky-600 dark:text-sky-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  <div className="p-1 rounded-xl">{tab.icon}</div>
                  <span className="text-[10px] mt-0.5">{tab.label}</span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setActiveTab(tab.id);
                }}
                className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <div className="p-1 rounded-xl">{tab.icon}</div>
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
