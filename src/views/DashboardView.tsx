import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatStockInUnits } from '../utils/conversions';
import { Customer, Supplier } from '../types';

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

  // Weekend alert configuration
  const daysOfWeek = [
    { en: 'Sunday', ur: 'اتوار (Sunday)' },
    { en: 'Monday', ur: 'پیر (Monday)' },
    { en: 'Tuesday', ur: 'منگل (Tuesday)' },
    { en: 'Wednesday', ur: 'بدھ (Wednesday)' },
    { en: 'Thursday', ur: 'جمعرات (Thursday)' },
    { en: 'Friday', ur: 'جمعہ (Friday)' },
    { en: 'Saturday', ur: 'ہفتہ (Saturday)' },
  ];

  const todayIndex = new Date().getDay();
  const todayDayName = daysOfWeek[todayIndex].en;
  const todayUrduName = daysOfWeek[todayIndex].ur;

  const configuredAlertDay = settings?.weekendAlertDay || 'Saturday';
  const isWeekendAlertToday = todayDayName.toLowerCase() === configuredAlertDay.toLowerCase();

  // Manual toggle to view alert on demand
  const [showWeekendSection, setShowWeekendSection] = useState<boolean>(true);
  const [alertActiveTab, setAlertActiveTab] = useState<'collect' | 'pay'>('collect');
  const [isChangingDay, setIsChangingDay] = useState(false);

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

  const todayCashSales = useMemo(
    () =>
      todaySales
        .filter((s) => s.paymentMethod === 'Cash')
        .reduce((sum, s) => sum + (s.paidAmount || 0), 0),
    [todaySales]
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

  // Total Receivables (Customers who owe us - لینی ہے)
  const customersWhoOwe = useMemo(
    () => customers.filter((c) => c.currentBalance > 0),
    [customers]
  );

  const totalReceivables = useMemo(
    () => customersWhoOwe.reduce((sum, c) => sum + c.currentBalance, 0),
    [customersWhoOwe]
  );

  // Total Payables (Suppliers we owe - دینی ہے)
  const suppliersWeOwe = useMemo(
    () => suppliers.filter((s) => s.currentBalance > 0),
    [suppliers]
  );

  const totalPayables = useMemo(
    () => suppliersWeOwe.reduce((sum, s) => sum + s.currentBalance, 0),
    [suppliersWeOwe]
  );

  // Inventory valuation
  const inventoryCostValue = useMemo(
    () => products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchaseRate || 0), 0),
    [products]
  );

  // WhatsApp Reminder Sender
  const sendWhatsAppReminder = (customer: Customer) => {
    const phone = customer.whatsapp || customer.phone;
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `السلام علیکم ${customer.name} صاحب!\n${settings?.businessName || 'LubeFlow Pro'} کی طرف سے آپ کے کھاتے کی بقایا رقم ${currency} ${customer.currentBalance} کی ہفتہ وار ادائیگی کی یاد دہانی ہے۔ برائے مہربانی آج حساب کلیئر کر دیں۔\nشکریہ!\nرابطہ: ${settings?.phone || ''}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleUpdateAlertDay = async (day: string) => {
    await updateSettings({ weekendAlertDay: day });
    setIsChangingDay(false);
  };

  return (
    <div className="space-y-5 pb-24 max-w-7xl mx-auto px-3 sm:px-6 pt-3 animate-in fade-in duration-150">
      {/* Top Banner: Greeting, Live Date & Weekend Alert Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white p-4 sm:p-6 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
                {settings?.businessName || 'LubeFlow Pro'} · لائیو کاؤنٹر
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight mt-0.5">
              خوش آمدید! آئل انوینٹری و کھاتہ مینجمنٹ
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
              <span>🗓️ آج کا دن: <strong className="text-white">{todayUrduName}</strong></span>
              <span>·</span>
              <span>تاريخ: {new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </p>
          </div>

          {/* Weekend Alert Badge & Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80">
            <div className="text-right pr-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Weekend Alert Day:
              </div>
              <div className="text-xs font-extrabold text-amber-400">
                {configuredAlertDay}
                {isWeekendAlertToday && <span className="ml-1 text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-bold">آج ہے!</span>}
              </div>
            </div>

            {/* Quick Change Day Dropdown */}
            <select
              value={configuredAlertDay}
              onChange={(e) => handleUpdateAlertDay(e.target.value)}
              className="bg-slate-900 text-sky-300 text-xs font-bold py-1.5 px-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
              title="Change Weekend Alert Day"
            >
              {daysOfWeek.map((d) => (
                <option key={d.en} value={d.en}>
                  {d.ur}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FRESH DATABASE EMPTY STATE (when 0 products exist) */}
      {products.length === 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-sky-500/10 to-indigo-500/10 dark:from-slate-900/90 dark:to-slate-800/90 rounded-3xl p-5 sm:p-6 border-2 border-dashed border-amber-300 dark:border-amber-700/50 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-amber-500/30">
                ✨
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    نیا اور صاف کھاتہ تیار ہے (Pristine Clean Start)
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                  آپ کی ہدایت پر تمام پرانا ڈیٹا، پراڈکٹس اور ریٹس مکمل ڈیلیٹ کر دیے گئے ہیں!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl">
                  اب آپ اپنے اسٹور کے تمام اصلی انجن آئل، فلٹرز، پیٹی/کاٹن اور گاہکوں کا کھاتہ خود اپنے مطابق درج کر سکتے ہیں۔
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('products')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>➕</span>
                <span>پہلا آئل پراڈکٹ شامل کریں (+ Add Product)</span>
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs"
              >
                + نیا گاہک (Customer)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEATURED: WEEKEND PAYMENT RECOVERY & DUE ALERT (ہفتہ وار ادھار وصولی و ادائیگی کاؤنٹر) */}
      <div className={`rounded-3xl border transition-all duration-300 overflow-hidden shadow-lg ${
        isWeekendAlertToday
          ? 'bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-indigo-500/15 dark:from-amber-950/40 dark:to-slate-900 border-amber-400 dark:border-amber-600/60 ring-2 ring-amber-400/30'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        {/* Widget Header */}
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm ${
              isWeekendAlertToday
                ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white animate-bounce'
                : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            }`}>
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  ہفتہ وار ادھار وصولی و ادائیگی الرٹ (Weekend Khata Alert)
                </h3>
                {isWeekendAlertToday ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold uppercase animate-pulse">
                    آج وصولی کا دن ہے!
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    مقررہ دن: {configuredAlertDay}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                ہر ویک اینڈ پر گاہکوں سے رقم وصول کرنے اور سپلائرز کو ادائیگی کی مکمل تفصیل
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
                وصول کرنا ہے ({customersWhoOwe.length})
              </button>
              <button
                onClick={() => setAlertActiveTab('pay')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  alertActiveTab === 'pay'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ادا کرنا ہے ({suppliersWeOwe.length})
              </button>
            </div>

            <button
              onClick={() => setShowWeekendSection(!showWeekendSection)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {showWeekendSection ? 'چھپائیں ▲' : 'دیکھیں ▼'}
            </button>
          </div>
        </div>

        {/* Content Body */}
        {showWeekendSection && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Top Summaries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: To Collect (وصول کرنی ہے) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                alertActiveTab === 'collect'
                  ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span>📥</span>
                    <span>گاہکوں سے کل وصول کرنا ہے (To Collect):</span>
                  </span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {customersWhoOwe.length} گاہک
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {formatCurrency(totalReceivables, currency)}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  مارکیٹ میں بقایا ادھار جو واپس آنا ہے
                </p>
              </div>

              {/* Card 2: To Pay (ادا کرنی ہے) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                alertActiveTab === 'pay'
                  ? 'bg-indigo-500/10 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/60 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span>📤</span>
                    <span>سپلائرز کو کل ادا کرنا ہے (To Pay):</span>
                  </span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">
                    {suppliersWeOwe.length} سپلائر
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatCurrency(totalPayables, currency)}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  کمپنی و آئل ایجنسیوں کا بقایا بل
                </p>
              </div>
            </div>

            {/* List Table: Either Customers to collect or Suppliers to pay */}
            {alertActiveTab === 'collect' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                  <span>گاہک کی تفصیل و بقایا رقم (Customer Dues):</span>
                  <button
                    onClick={() => setActiveTab('customers')}
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    مکمل کھاتہ دیکھیں →
                  </button>
                </div>

                {customersWhoOwe.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    🎉 ماشاءاللہ! کسی گاہک کی طرف کوئی ادھار باقی نہیں ہے۔
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
                            لینا ہے: {formatCurrency(c.currentBalance, currency)}
                          </div>
                        </div>

                        {/* WhatsApp Reminder Button */}
                        <div className="flex flex-col gap-1 shrink-0">
                          {c.phone ? (
                            <button
                              onClick={() => sendWhatsAppReminder(c)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition-all"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <span>📲</span>
                              <span>یاد دہانی</span>
                            </button>
                          ) : null}
                          <a
                            href={`tel:${c.phone}`}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-semibold text-center"
                          >
                            📞 کال
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                  <span>سپلائرز کی واجب الادا رقم (Suppliers to Pay):</span>
                  <button
                    onClick={() => setActiveTab('suppliers')}
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    سپلائرز لسٹ دیکھیں →
                  </button>
                </div>

                {suppliersWeOwe.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    🎉 کسی سپلائر کا بل بقایا نہیں ہے۔ تمام ادائیگیاں کلیئر ہیں!
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
                            ادا کرنا ہے: {formatCurrency(s.currentBalance, currency)}
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab('suppliers')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                        >
                          ادائیگی کریں
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

      {/* QUICK SPEED DIAL ACTION GRID */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            فوری شارٹ کٹس (Quick Actions)
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {/* New Sale */}
          <button
            onClick={() => setActiveTab('pos')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 group"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🛍️</span>
            <span className="text-[11px] font-bold">نئی سیل</span>
          </button>

          {/* QR & Barcode Scanner */}
          <button
            onClick={() => openBarcodeScanner(() => {})}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Scan QR Code or 1D Barcode"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📷</span>
            <span className="text-[11px] font-bold">اسکینر QR</span>
          </button>

          {/* QR & Barcode Generator */}
          <button
            onClick={() => openBarcodeGenerator(null)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 group"
            title="Generate Printable Stickers"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🏷️</span>
            <span className="text-[11px] font-bold">اسٹیکر لیبل</span>
          </button>

          {/* Add Product */}
          <button
            onClick={() => setActiveTab('products')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all active:scale-95 group"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📦</span>
            <span className="text-[11px] font-bold">نیا آئل</span>
          </button>

          {/* Purchases */}
          <button
            onClick={() => setActiveTab('purchases')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all active:scale-95 group"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📥</span>
            <span className="text-[11px] font-bold">خریداری</span>
          </button>

          {/* Customers & Khata */}
          <button
            onClick={() => setActiveTab('customers')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all active:scale-95 group"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">👥</span>
            <span className="text-[11px] font-bold">گاہک کھاتہ</span>
          </button>

          {/* Expenses */}
          <button
            onClick={() => setActiveTab('expenses')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95 group"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💸</span>
            <span className="text-[11px] font-bold">دکان خرچہ</span>
          </button>

          {/* Daily Closing */}
          <button
            onClick={() => setActiveTab('closing')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition-all active:scale-95 group"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📊</span>
            <span className="text-[11px] font-bold">کھاتہ بند</span>
          </button>
        </div>
      </div>

      {/* CORE FINANCIAL BENTO GRID */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            مالی رپورٹ و منافع (Financial Summary)
          </span>
          <span className="text-[11px] text-slate-500">لائیو اعداد و شمار</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Today's Sales */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">آج کی کل سیل (Sales)</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                {todaySales.length} بل
              </span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {formatCurrency(todaySalesTotal, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              کیش وصولی: {formatCurrency(todayCashSales, currency)}
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">مجموعی منافع (Gross)</span>
              <span className="text-emerald-500 text-xs font-bold">
                {todaySalesTotal > 0 ? `${Math.round((todayGrossProfit / todaySalesTotal) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(todayGrossProfit, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              مال کی لاگت: {formatCurrency(todayCostOfGoods, currency)}
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">آج کے اخراجات (Expenses)</span>
              <span className="text-rose-500 text-xs font-bold">{todayExpenses.length} انٹری</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(todayExpensesTotal, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              دکان بل و کرایہ
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-xs border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-300 mb-1">
              <span className="text-xs font-medium">خالص منافع (Net Profit)</span>
              <span className="text-sky-400 text-xs font-bold">خرچے نکال کر</span>
            </div>
            <div className={`text-lg sm:text-xl font-extrabold font-mono ${todayNetProfit >= 0 ? 'text-sky-300' : 'text-rose-400'}`}>
              {formatCurrency(todayNetProfit, currency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              منافع - دکان خرچہ
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY KPIS: STOCK & BALANCES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('stock')}
          className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 hover:border-sky-500/50 transition-colors"
        >
          <span className="text-xs text-slate-500">کل اسٹاک مالیت (Stock)</span>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5">
            {formatCurrency(inventoryCostValue, currency)}
          </div>
          <span className="text-[11px] text-sky-600 font-medium">
            {products.length} آئل و فلٹر درج ہیں
          </span>
        </div>

        <div
          onClick={() => setActiveTab('customers')}
          className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 hover:border-amber-500/50 transition-colors"
        >
          <span className="text-xs text-slate-500">گاہکوں سے لینا ہے (Udhar)</span>
          <div className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
            {formatCurrency(totalReceivables, currency)}
          </div>
          <span className="text-[11px] text-slate-500">
            {customersWhoOwe.length} گاہکوں کے ذمے بقایا
          </span>
        </div>

        <div
          onClick={() => setActiveTab('suppliers')}
          className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 hover:border-indigo-500/50 transition-colors"
        >
          <span className="text-xs text-slate-500">کمپنی کو دینا ہے (Payable)</span>
          <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
            {formatCurrency(totalPayables, currency)}
          </div>
          <span className="text-[11px] text-slate-500">
            {suppliersWeOwe.length} سپلائرز کا بل
          </span>
        </div>

        <div
          onClick={() => setActiveTab('stock')}
          className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 hover:border-rose-500/50 transition-colors"
        >
          <span className="text-xs text-slate-500">کم اسٹاک الرٹ (Low Stock)</span>
          <div className={`text-base font-bold font-mono mt-0.5 ${lowStockCount + outOfStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
            {lowStockCount + outOfStockCount} آئٹمز
          </div>
          <span className="text-[11px] text-slate-500">
            {outOfStockCount > 0 ? `${outOfStockCount} ختم ہو چکے ہیں` : 'اسٹاک تسلی بخش ہے'}
          </span>
        </div>
      </div>

      {/* RECENT SALES & QUICK INVOICES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              حالیہ فروخت و بل (Recent Sales Bills)
            </h3>
            <p className="text-xs text-slate-500">آخری بل اور انوائس پرنٹ کریں</p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            تمام رپورٹس دیکھیں →
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            ابھی تک کوئی سیل نہیں ہوئی۔ اوپر دیے گئے <strong>"نئی سیل"</strong> کے بٹن سے پہلا بل بنائیں۔
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
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-600 font-bold border border-rose-200 dark:border-rose-900">
                        ادھار: {formatCurrency(sale.balanceAmount, currency)}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 font-bold">
                        نقد وصول (Paid)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sale.items.length} آئٹمز · {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(sale.grandTotal, currency)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      منافع: {formatCurrency(sale.totalProfit, currency)}
                    </div>
                  </div>

                  <button
                    onClick={() => openInvoiceModal(sale)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                  >
                    بل دیکھیں / پرنٹ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAST STOCK AVAILABILITY CHECK */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              موجودہ آئل اسٹاک (Oil Inventory Status)
            </h3>
            <p className="text-xs text-slate-500">ریٹ اور دستیاب کاٹن و بوتلیں</p>
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            تمام پراڈکٹس ({products.length}) →
          </button>
        </div>

        {products.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            کوئی پراڈکٹ درج نہیں ہے۔ <strong>"نیا آئل"</strong> پر کلک کر کے پہلا آئل رجسٹر کریں۔
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
                    ریٹ: {formatCurrency(prod.saleRate, currency)} / {prod.baseUnit}
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
