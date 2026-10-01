import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Expense } from '../types';
import { formatCurrency } from '../utils/conversions';
import { saveExpense, deleteExpense } from '../db/indexedDb';

export const ExpensesView: React.FC = () => {
  const { expenses, settings, refreshAllData, showToast } = useApp();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [category, setCategory] = useState<Expense['category']>('Tea & Food');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<Expense['paymentMethod']>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Month & Day summaries
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thisMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  const todayTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date === todayStr || e.createdAt.startsWith(todayStr))
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, todayStr]
  );

  const monthTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date.startsWith(thisMonthStr) || e.createdAt.startsWith(thisMonthStr))
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, thisMonthStr]
  );

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Please enter a valid expense amount', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please enter an expense description', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveExpense({
        category,
        description: description.trim(),
        amount,
        paymentMethod,
        notes: notes.trim(),
        date: todayStr,
      });

      showToast('Expense recorded successfully', 'success');
      await refreshAllData();
      setIsAddOpen(false);
      setDescription('');
      setAmount(0);
      setNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Delete this expense entry?')) {
      await deleteExpense(id);
      showToast('Expense deleted', 'info');
      await refreshAllData();
    }
  };

  const categories: Expense['category'][] = [
    'Transport',
    'Electricity',
    'Rent',
    'Salary',
    'Maintenance',
    'Tea & Food',
    'Packaging',
    'Other',
  ];

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150 space-y-4">
      {/* Top Banner with Daily & Monthly Expenses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-gradient-to-tr from-rose-700 to-pink-600 rounded-3xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-100">
              Today's Expenses
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono mt-0.5">
              {formatCurrency(todayTotal, settings.currencySymbol)}
            </div>
            <p className="text-xs text-rose-100 mt-1">Deducted from gross profit</p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-white text-rose-900 hover:bg-rose-50 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            + Add Expense
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs flex flex-col justify-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            This Month's Total Expenses
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(monthTotal, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {expenses.filter((e) => e.date.startsWith(thisMonthStr)).length} entries this month
          </p>
        </div>
      </div>

      {/* Expense Entries Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
          <span>Expense Activity Log</span>
          <span className="text-xs text-slate-400 font-normal">{expenses.length} records</span>
        </div>

        {expenses.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No expenses recorded yet. Tap "+ Add Expense" to log utility bills, tea, rent, or staff salaries.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                    💸
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {exp.description}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        {exp.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(exp.createdAt).toLocaleDateString('en-GB')} · Paid via {exp.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-sm text-rose-600 dark:text-rose-400">
                      -{formatCurrency(exp.amount, settings.currencySymbol)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {exp.expenseNumber}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Delete expense"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Daily Expense
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Shop tea and biscuits for mechanics"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Paid *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="Cash">Cash Drawer</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Online">Online Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Bill Ref (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Receipt # or staff name"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
