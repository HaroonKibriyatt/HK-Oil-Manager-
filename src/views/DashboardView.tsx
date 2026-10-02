import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatStockInUnits } from '../utils/conversions';
import { Customer } from '../types';

export const DashboardView: React.FC = () => {
  const {
    products,
    sales,
    purchases,
    expenses,
    customers,
    suppliers,
    settings,
    updateSettings,
    setActiveTab,
    openBarcodeScanner,
    openBarcodeGenerator,
    openInvoiceModal,
    lowStockCount,
    outOfStockCount,
  } = useApp();

  const currency = settings?.currencySymbol || 'Rs.';

  // Weekend alert day configuration
  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const todayIndex = new Date().getDay();
  const todayDayName = daysOfWeek[todayIndex];

  const configuredAlertDay = settings?.weekendAlertDay || 'Saturday';
  const isWeekendAlertToday = todayDayName.toLowerCase() === configuredAlertDay.toLowerCase();

  // Manual toggle to view alert on demand
  const [showWeekendSection, setShowWeekendSection] = useState<boolean>(true);
  const [alertActiveTab, setAlertActiveTab] = useState<'collect' | 'pay'>('collect');

  // Today metrics
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todaySales = useMemo(
    () => sales.filter((s) => s.createdAt.startsWith(todayStr)),
    [sales, todayStr]
  );

  const todayPurchases = useMemo(
    () => purchases.filter((p) => p.createdAt.startsWith(todayStr)),
    [purchases, todayStr]
  );

  const todayExpenses = useMemo(
    () => expenses.filter((e) => e.date === todayStr || e.createdAt.startsWith(todayStr)),
    [expenses, todayStr]
  );

  const todaySalesTotal = useMemo(
    () => todaySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0),
    [todaySales]
  );

  const todayPurchasesTotal = useMemo(
    () => todayPurchases.reduce((sum, p) => sum + (p.netTotal || 0), 0),
    [todayPurchases]
  );

  const todayCostOfGoods = useMemo(
    () => todaySales.reduce((sum, s) => sum + (s.totalCost || 0), 0),
    [todaySales]
  );

  const todayGrossProfit = useMemo(
    () => todaySalesTotal - todayCostOfGoods,
    [todaySalesTotal, todayCostOfGoods]
  );

  const todayExpensesTotal = useMemo(
    () => todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [todayExpenses]
  );

  const todayNetProfit = useMemo(
    () => todayGrossProfit - todayExpensesTotal,
    [todayGrossProfit, todayExpensesTotal]
  );

  // Total Stock Units
  const totalStockUnits = useMemo(
    () => products.reduce((sum, p) => sum + (p.currentStock || 0), 0),
    [products]
  );

  // Total Receivables (Customers who owe business)
  const customersWhoOwe = useMemo(
    () => customers.filter((c) => c.currentBalance > 0),
    [customers]
  );

  const totalReceivables = useMemo(
    () => customersWhoOwe.reduce((sum, c) => sum + c.currentBalance, 0),
    [customersWhoOwe]
  );

  // Total Payables (Suppliers business owes)
  const suppliersWeOwe = useMemo(
    () => suppliers.filter((s) => s.currentBalance > 0),
    [suppliers]
  );

  const totalPayables = useMemo(
    () => suppliersWeOwe.reduce((sum, s) => sum + s.currentBalance, 0),
    [suppliersWeOwe]
  );

  // Stock inventory valuation
  const inventoryCostValue = useMemo(
    () => products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchaseRate || 0), 0),
    [products]
  );

  // WhatsApp Reminder Sender (English only)
  const sendWhatsAppReminder = (customer: Customer) => {
    const phone = customer.whatsapp || customer.phone;
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${customer.name},\nThis is a friendly weekend reminder from HK OIL MANAGER regarding your outstanding balance of ${currency} ${customer.currentBalance}. Please arrange payment at your earliest convenience.\nThank you!\nContact: ${settings?.phone || ''}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleUpdateAlertDay = async (day: string) => {
    await updateSettings({ weekendAlertDay: day });
  };

  return (
    <div className="space-y-5 pb-24 max-w-7xl mx-auto px-3 sm:px-6 pt-3 animate-in fade-in duration-150">
      {/* Top Branding Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white p-4 sm:p-6 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono">
                HK OIL MANAGER
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Dashboard Overview
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
              <span>Today: <strong className="text-white">{todayDayName}</strong></span>
              <span>·</span>
              <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>·</span>
              <span className="text-emerald-400 font-medium">Offline-Ready System</span>
            </p>
          </div>

          {/* Weekend Payment Alert Day Configuration */}
          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80">
            <div className="text-right pr-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Weekend Alert Day:
              </div>
              <div className="text-xs font-extrabold text-amber-400">
                {configuredAlertDay}
                {isWeekendAlertToday && (
                  <span className="ml-1 text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold">
                    Active Today
                  </span>
                )}
              </div>
            </div>

            <select
              value={configuredAlertDay}
              onChange={(e) => handleUpdateAlertDay(e.target.value)}
              className="bg-slate-900 text-sky-300 text-xs font-bold py-1.5 px-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
              title="Change Weekend Alert Day"
            >
              {daysOfWeek.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FRESH ONBOARDING CALLOUT (When 0 products exist) */}
      {products.length === 0 && (
        <div className="bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-emerald-500/10 dark:from-slate-900/90 dark:to-slate-800/90 rounded-3xl p-5 sm:p-6 border-2 border-dashed border-sky-400/50 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-sky-600/30">
                🛢️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Clean Database Ready
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                  Welcome to HK OIL MANAGER!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl">
                  Your oil inventory is fresh and empty. Start by adding your first engine oil, gallon, bottle, or filter.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('products')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>+</span>
                <span>Add First Product</span>
              </button>
              <button
                onClick={() => openBarcodeScanner(() => {})}
                className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs flex items-center justify-center gap-1"
              >
                <span>📷</span>
                <span>Scan Barcode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: PRIMARY PRD DASHBOARD CARDS */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Key Performance Indicators
          </span>
          <span className="text-[11px] text-slate-500">Live Statistics</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Products */}
          <div
            onClick={() => setActiveTab('products')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-sky-500/50 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Total Products</span>
              <span className="text-base">📦</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {products.length}
            </div>
            <p className="text-[11px] text-sky-600 font-medium mt-1">
              Registered items
            </p>
          </div>

          {/* Card 2: Current Stock */}
          <div
            onClick={() => setActiveTab('stock')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-sky-500/50 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Current Stock</span>
              <span className="text-base">🛢️</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {totalStockUnits} <span className="text-xs font-normal text-slate-500">Units</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Valuation: {formatCurrency(inventoryCostValue, currency)}
            </p>
          </div>

          {/* Card 3: Today's Sales */}
          <div
            onClick={() => setActiveTab('pos')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-emerald-500/50 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Today's Sales</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                {todaySales.length} Bills
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(todaySalesTotal, currency)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Gross profit: +{formatCurrency(todayGrossProfit, currency)}
            </p>
          </div>

          {/* Card 4: Today's Purchases */}
          <div
            onClick={() => setActiveTab('purchases')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-indigo-500/50 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Today's Purchases</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                {todayPurchases.length} Orders
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {formatCurrency(todayPurchasesTotal, currency)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Incoming stock cost
            </p>
          </div>
        </div>

        {/* Second Row of KPIs: Expenses, Net Profit, Low Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {/* Today's Expenses */}
          <div
            onClick={() => setActiveTab('expenses')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-rose-500/50 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Today's Expenses</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                {todayExpenses.length} Entries
              </span>
            </div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(todayExpensesTotal, currency)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Operating costs & bills
            </p>
          </div>

          {/* Today's Net Profit */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-xs border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-300 mb-1">
              <span className="text-xs font-semibold">Today's Net Profit</span>
              <span className="text-xs font-bold text-sky-400">After Expenses</span>
            </div>
            <div className={`text-xl font-black font-mono ${todayNetProfit >= 0 ? 'text-sky-300' : 'text-rose-400'}`}>
              {formatCurrency(todayNetProfit, currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sales - Cost of Goods - Expenses
            </p>
          </div>

          {/* Low Stock Alert */}
          <div
            onClick={() => setActiveTab('stock')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-amber-500/50 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Low Stock Products</span>
              <span className="text-base">⚠️</span>
            </div>
            <div className={`text-xl font-black font-mono ${lowStockCount + outOfStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
              {lowStockCount + outOfStockCount} <span className="text-xs font-normal text-slate-500">Products</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lowStockCount > 0 ? `${lowStockCount} below minimum threshold` : 'Stock levels adequate'}
            </p>
          </div>
        </div>
      </div>

      {/* WEEKEND PAYMENT & DUE ALERT WIDGET */}
      <div
        className={`rounded-3xl border transition-all duration-300 overflow-hidden shadow-lg ${
          isWeekendAlertToday
            ? 'bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-indigo-500/15 dark:from-amber-950/40 dark:to-slate-900 border-amber-400 dark:border-amber-600/60 ring-2 ring-amber-400/30'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm ${
                isWeekendAlertToday
                  ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white animate-bounce'
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Weekend Payment & Due Clearance Alert
                </h3>
                {isWeekendAlertToday ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold uppercase animate-pulse">
                    Alert Day Active
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    Scheduled: {configuredAlertDay}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Track customer receivables to collect and supplier payables to settle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* View Switcher: Collect vs Pay */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setAlertActiveTab('collect')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  alertActiveTab === 'collect'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                To Collect ({customersWhoOwe.length})
              </button>
              <button
                onClick={() => setAlertActiveTab('pay')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  alertActiveTab === 'pay'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                To Pay ({suppliersWeOwe.length})
              </button>
            </div>

            <button
              onClick={() => setShowWeekendSection(!showWeekendSection)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {showWeekendSection ? 'Hide ▲' : 'Show ▼'}
            </button>
          </div>
        </div>

        {showWeekendSection && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* To Collect */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  alertActiveTab === 'collect'
                    ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Customer Receivables (To Collect):</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {customersWhoOwe.length} Customers
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {formatCurrency(totalReceivables, currency)}
                </div>
              </div>

              {/* To Pay */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  alertActiveTab === 'pay'
                    ? 'bg-indigo-500/10 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/60 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Supplier Payables (To Pay):</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">
                    {suppliersWeOwe.length} Suppliers
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatCurrency(totalPayables, currency)}
                </div>
              </div>
            </div>

            {/* List */}
            {alertActiveTab === 'collect' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                  <span>Customers with Pending Balance:</span>
                  <button
                    onClick={() => setActiveTab('customers')}
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    View All Accounts →
                  </button>
                </div>

                {customersWhoOwe.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    No outstanding customer balances. All accounts settled.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {customersWhoOwe.slice(0, 6).map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs hover:border-amber-400 transition-colors"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {c.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {c.phone || 'No phone'}
                          </p>
                          <div className="text-xs font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                            Due: {formatCurrency(c.currentBalance, currency)}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          {c.phone && (
                            <button
                              onClick={() => sendWhatsAppReminder(c)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition-all"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <span>📲</span>
                              <span>Remind</span>
                            </button>
                          )}
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-semibold text-center"
                            >
                              Call
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                  <span>Suppliers with Pending Payment:</span>
                  <button
                    onClick={() => setActiveTab('suppliers')}
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    View Suppliers →
                  </button>
                </div>

                {suppliersWeOwe.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    No supplier dues. All vendor accounts are clear.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {suppliersWeOwe.slice(0, 6).map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs hover:border-indigo-400 transition-colors"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {s.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {s.phone}
                          </p>
                          <div className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            Payable: {formatCurrency(s.currentBalance, currency)}
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab('suppliers')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                        >
                          Pay
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

      {/* QUICK ACTIONS SPEED DIAL */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Quick Actions
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {/* New Sale */}
          <button
            onClick={() => setActiveTab('pos')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Start New Sale (POS)"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🛍️</span>
            <span className="text-[11px] font-bold">New Sale</span>
          </button>

          {/* Barcode Scanner */}
          <button
            onClick={() => openBarcodeScanner(() => {})}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Scan QR Code or Barcode"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📷</span>
            <span className="text-[11px] font-bold">Scan</span>
          </button>

          {/* Print Labels */}
          <button
            onClick={() => openBarcodeGenerator(null)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Print Barcode & QR Labels"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🏷️</span>
            <span className="text-[11px] font-bold">Labels</span>
          </button>

          {/* Add Product */}
          <button
            onClick={() => setActiveTab('products')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Manage Product Catalog"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📦</span>
            <span className="text-[11px] font-bold">Products</span>
          </button>

          {/* Record Purchase */}
          <button
            onClick={() => setActiveTab('purchases')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Incoming Stock & Purchases"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📥</span>
            <span className="text-[11px] font-bold">Purchase</span>
          </button>

          {/* Customer Accounts */}
          <button
            onClick={() => setActiveTab('customers')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Customer Accounts & Credit Ledger"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">👥</span>
            <span className="text-[11px] font-bold">Customers</span>
          </button>

          {/* Expenses */}
          <button
            onClick={() => setActiveTab('expenses')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Track Daily Expenses"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💸</span>
            <span className="text-[11px] font-bold">Expenses</span>
          </button>

          {/* Daily Closing */}
          <button
            onClick={() => setActiveTab('closing')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition-all active:scale-95 group"
            title="Daily Cash Drawer Closing"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📊</span>
            <span className="text-[11px] font-bold">Closing</span>
          </button>
        </div>
      </div>

      {/* RECENT SALES TRANSACTIONS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Recent Sales Transactions
            </h3>
            <p className="text-xs text-slate-500">View and print invoices</p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            View All Reports →
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No sales recorded yet. Tap <strong>"New Sale"</strong> above to make your first transaction.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {sale.invoiceNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">·</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {sale.customerName}
                    </span>
                    {sale.balanceAmount > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-600 font-bold border border-rose-200 dark:border-rose-900">
                        Due: {formatCurrency(sale.balanceAmount, currency)}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 font-bold">
                        Paid in Full
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sale.items.length} Items · {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {sale.paymentMethod}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(sale.grandTotal, currency)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      Profit: +{formatCurrency(sale.totalProfit, currency)}
                    </div>
                  </div>

                  <button
                    onClick={() => openInvoiceModal(sale)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                  >
                    View Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK INVENTORY STATUS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Inventory Stock Levels
            </h3>
            <p className="text-xs text-slate-500">Available oil products & stock counts</p>
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            All Products ({products.length}) →
          </button>
        </div>

        {products.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No products registered. Tap <strong>"Products"</strong> to add your first stock item.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {products.slice(0, 6).map((prod) => (
              <div
                key={prod.id}
                className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {prod.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Price: {formatCurrency(prod.saleRate, currency)} / {prod.baseUnit}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                      prod.currentStock <= 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : prod.currentStock <= prod.minStockAlert
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {formatStockInUnits(prod.currentStock, prod.bottlesPerCotton, prod.baseUnit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
