import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DailyClosing } from '../types';
import { formatCurrency, roundToTwo } from '../utils/conversions';
import {
  calculateTodayClosingStats,
  executeDailyClosing,
  getDailyClosings,
} from '../db/indexedDb';
import { generateDailyClosingPdf } from '../utils/pdfGenerator';

export const DailyClosingView: React.FC = () => {
  const { settings, showToast } = useApp();
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [actualCash, setActualCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [closingStats, setClosingStats] = useState<any>(null);
  const [pastClosings, setPastClosings] = useState<DailyClosing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stats = await calculateTodayClosingStats();
        setClosingStats(stats);
        const list = await getDailyClosings();
        setPastClosings(list);
      } catch (e) {
        showToast('Failed to load closing data', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [showToast]);

  const expectedCash = closingStats
    ? roundToTwo(
        openingCash +
          closingStats.cashSales +
          closingStats.customerPayments -
          closingStats.cashPurchases -
          closingStats.supplierPayments -
          closingStats.expenses
      )
    : 0;

  const cashDifference = roundToTwo(actualCash - expectedCash);

  const handleExecuteClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const record = await executeDailyClosing(openingCash, actualCash, closingNotes);
      showToast(`Day closed successfully for ${record.date}`, 'success');

      // Export PDF report
      const doc = generateDailyClosingPdf(record, settings);
      doc.save(`Daily_Closing_${record.date}.pdf`);

      const list = await getDailyClosings();
      setPastClosings(list);
    } catch (err: any) {
      showToast(err.message || 'Closing failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPastClosingPdf = (closing: DailyClosing) => {
    try {
      const doc = generateDailyClosingPdf(closing, settings);
      doc.save(`Daily_Closing_${closing.date}.pdf`);
      showToast('Daily Closing PDF downloaded', 'success');
    } catch (e) {
      showToast('Failed to generate PDF', 'error');
    }
  };

  if (isLoading || !closingStats) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading daily cash flow...</div>;
  }

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150 space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-tr from-purple-800 to-indigo-700 rounded-3xl p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
            End-of-Day Financial Reconciliation
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-0.5">Daily Cash Drawer Closing</h2>
          <p className="text-xs text-purple-200 mt-1">
            Reconcile physical cash counted in drawer against today's sales and disbursements
          </p>
        </div>
        <div className="text-xs font-mono font-bold bg-white/10 px-3 py-1.5 rounded-xl self-start sm:self-center">
          Date: {closingStats.today}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Today's Auto-Calculated Cash Flow Breakdown (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Today's System Cash Flow Breakdown
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                (+) Today's Cash Sales Collected ({closingStats.salesCount} bills):
              </span>
              <span className="font-mono font-bold text-emerald-600">
                +{formatCurrency(closingStats.cashSales, settings.currencySymbol)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                (+) Customer Khata Debt Payments Received:
              </span>
              <span className="font-mono font-bold text-emerald-600">
                +{formatCurrency(closingStats.customerPayments, settings.currencySymbol)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                (-) Cash Stock Purchases Paid Out:
              </span>
              <span className="font-mono font-bold text-rose-600">
                -{formatCurrency(closingStats.cashPurchases, settings.currencySymbol)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                (-) Supplier Khata Payments Paid:
              </span>
              <span className="font-mono font-bold text-rose-600">
                -{formatCurrency(closingStats.supplierPayments, settings.currencySymbol)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                (-) Shop Operating Expenses:
              </span>
              <span className="font-mono font-bold text-rose-600">
                -{formatCurrency(closingStats.expenses, settings.currencySymbol)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
              System Expected Drawer Cash:
            </span>
            <span className="text-lg font-black font-mono text-purple-950 dark:text-purple-100">
              {formatCurrency(expectedCash, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* RIGHT: Closing Submission Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
            Count & Reconcile Physical Cash
          </h3>

          <form onSubmit={handleExecuteClosing} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Morning Opening Cash in Drawer
              </label>
              <input
                type="number"
                min="0"
                value={openingCash || ''}
                onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Actual Physical Cash Counted Now *
              </label>
              <input
                type="number"
                required
                min="0"
                value={actualCash || ''}
                onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
                placeholder="Count all physical notes in cash drawer"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-mono font-black text-indigo-600"
              />
            </div>

            {/* Reconciliation Difference Indicator */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                cashDifference === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200'
                  : cashDifference > 0
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border-sky-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200'
              }`}
            >
              <span className="font-bold">
                {cashDifference === 0
                  ? 'Exact Match'
                  : cashDifference > 0
                  ? 'Cash Surplus (+)'
                  : 'Cash Shortage (-)'}
              </span>
              <span className="font-mono font-black text-sm">
                {formatCurrency(cashDifference, settings.currencySymbol)}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Closing Remarks / Reason for Difference
              </label>
              <textarea
                rows={2}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="e.g. Verified by Haroon Bhai. Cash locked in safe."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-98"
            >
              {isSubmitting ? 'Closing Day...' : 'Close Day & Generate PDF Report'}
            </button>
          </form>
        </div>
      </div>

      {/* Past Closings History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
          <span>Daily Closing History Log</span>
          <span className="text-xs text-slate-400 font-normal">{pastClosings.length} records</span>
        </div>

        {pastClosings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No previous daily closings recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pastClosings.map((c) => (
              <div
                key={c.id}
                className="p-3.5 sm:px-5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {c.date}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Expected: {formatCurrency(c.expectedCash, settings.currencySymbol)} · Actual:{' '}
                    {formatCurrency(c.actualCash, settings.currencySymbol)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      c.difference === 0
                        ? 'bg-emerald-50 text-emerald-600'
                        : c.difference > 0
                        ? 'bg-sky-50 text-sky-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {c.difference > 0 ? `+${c.difference}` : c.difference}
                  </span>

                  <button
                    onClick={() => handleDownloadPastClosingPdf(c)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
