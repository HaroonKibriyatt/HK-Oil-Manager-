import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/conversions';

export const ReportsView: React.FC = () => {
  const { sales, expenses, settings, openInvoiceModal } = useApp();
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');

  // Date filtering logic
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const startOfMonthStr = todayStr.slice(0, 7);

    const fSales = sales.filter((s) => {
      const date = s.createdAt.split('T')[0];
      if (period === 'today') return date === todayStr;
      if (period === 'yesterday') return date === yesterdayStr;
      if (period === 'week') return date >= startOfWeekStr;
      if (period === 'month') return date.startsWith(startOfMonthStr);
      return true;
    });

    const fExpenses = expenses.filter((e) => {
      const date = e.date || e.createdAt.split('T')[0];
      if (period === 'today') return date === todayStr;
      if (period === 'yesterday') return date === yesterdayStr;
      if (period === 'week') return date >= startOfWeekStr;
      if (period === 'month') return date.startsWith(startOfMonthStr);
      return true;
    });

    return { fSales, fExpenses };
  }, [sales, expenses, period]);

  // Aggregate stats
  const totalSalesAmount = useMemo(
    () => filteredData.fSales.reduce((sum, s) => sum + s.grandTotal, 0),
    [filteredData.fSales]
  );

  const totalCostOfGoods = useMemo(
    () => filteredData.fSales.reduce((sum, s) => sum + s.totalCost, 0),
    [filteredData.fSales]
  );

  const grossProfit = useMemo(
    () => totalSalesAmount - totalCostOfGoods,
    [totalSalesAmount, totalCostOfGoods]
  );

  const totalExpenses = useMemo(
    () => filteredData.fExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredData.fExpenses]
  );

  const netCleanProfit = useMemo(
    () => grossProfit - totalExpenses,
    [grossProfit, totalExpenses]
  );

  // Top products in period
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    filteredData.fSales.forEach((s) => {
      s.items.forEach((item) => {
        const existing = map.get(item.productId) || {
          name: item.productName,
          qty: 0,
          revenue: 0,
          profit: 0,
        };
        existing.qty += item.baseQuantity;
        existing.revenue += item.netTotal;
        existing.profit += item.profit;
        map.set(item.productId, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [filteredData.fSales]);

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150 space-y-4">
      {/* Time Period Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                period === t.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* P&L Financial Cards (PRD Section 25) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Gross Sales</span>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalSalesAmount, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">{filteredData.fSales.length} Invoices</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Cost of Goods (COGS)</span>
          <div className="text-xl font-black font-mono text-slate-700 dark:text-slate-300 mt-1">
            {formatCurrency(totalCostOfGoods, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">Inventory purchase cost</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Gross Profit</span>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatCurrency(grossProfit, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-emerald-600">
            {totalSalesAmount > 0 ? `${Math.round((grossProfit / totalSalesAmount) * 100)}% Margin` : '0%'}
          </span>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-2xs border border-slate-700">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold uppercase">Net Clean Profit</span>
            <span className="text-[10px] text-slate-400">Less: {formatCurrency(totalExpenses, settings.currencySymbol)} Exp</span>
          </div>
          <div
            className={`text-xl font-black font-mono mt-1 ${
              netCleanProfit >= 0 ? 'text-sky-300' : 'text-rose-400'
            }`}
          >
            {formatCurrency(netCleanProfit, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">Final Take-home Profit</span>
        </div>
      </div>

      {/* Top Selling Products in Period */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
          Top-Selling Products by Revenue
        </h4>

        {topProducts.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No sales recorded during this selected period.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topProducts.map((p, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.qty} base units sold</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(p.revenue, settings.currencySymbol)}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    Profit: +{formatCurrency(p.profit, settings.currencySymbol)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
          <span>Sales Invoices Breakdown ({filteredData.fSales.length})</span>
        </div>

        {filteredData.fSales.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No invoices for this selected timeframe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Invoice #</th>
                  <th className="py-2.5 px-3 font-bold">Date</th>
                  <th className="py-2.5 px-3 font-bold">Customer</th>
                  <th className="py-2.5 px-3 font-bold text-center">Items</th>
                  <th className="py-2.5 px-3 font-bold text-right">Grand Total</th>
                  <th className="py-2.5 px-3 font-bold text-right">Profit</th>
                  <th className="py-2.5 px-3 font-bold text-center">Payment</th>
                  <th className="py-2.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredData.fSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {s.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {s.customerName}
                    </td>
                    <td className="py-2.5 px-3 text-center">{s.items.length}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {formatCurrency(s.grandTotal, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                      +{formatCurrency(s.totalProfit, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.balanceAmount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {s.balanceAmount > 0 ? 'Credit / Udhar' : 'Paid in Full'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => openInvoiceModal(s)}
                        className="text-xs text-sky-600 font-bold hover:underline"
                      >
                        Print / Share
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
