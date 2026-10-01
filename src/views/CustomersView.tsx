import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { formatCurrency } from '../utils/conversions';
import { saveCustomer, recordPaymentReceipt } from '../db/indexedDb';

export const CustomersView: React.FC = () => {
  const { customers, sales, settings, refreshAllData, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Payment collection modal state
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank' | 'Online'>('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer statement detail modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // Filtered
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm.trim()) ||
        c.whatsapp?.includes(searchTerm.trim())
    );
  }, [customers, searchTerm]);

  // Total Receivables
  const totalReceivables = useMemo(
    () => customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0),
    [customers]
  );

  const openNewCustomerModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setWhatsapp('');
    setAddress('');
    setOpeningBalance(0);
    setNotes('');
    setIsEditorOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setWhatsapp(c.whatsapp || '');
    setAddress(c.address || '');
    setOpeningBalance(c.openingBalance || 0);
    setNotes(c.notes || '');
    setIsEditorOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveCustomer({
        id: editingCustomer?.id,
        name: name.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        address: address.trim(),
        openingBalance,
        currentBalance: editingCustomer ? editingCustomer.currentBalance : openingBalance,
        notes: notes.trim(),
      });

      showToast(
        editingCustomer ? 'Customer updated' : 'Customer account registered',
        'success'
      );
      await refreshAllData();
      setIsEditorOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit payment receipt
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || payAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await recordPaymentReceipt(
        'CUSTOMER_PAYMENT',
        paymentCustomer.id,
        paymentCustomer.name,
        paymentCustomer.phone,
        payAmount,
        payMethod,
        payNotes
      );

      showToast(
        `Payment receipt #${receipt.receiptNumber} recorded! Customer balance updated.`,
        'success'
      );
      await refreshAllData();
      setPaymentCustomer(null);
      setPayAmount(0);
      setPayNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sales for active statement customer
  const customerSales = useMemo(() => {
    if (!statementCustomer) return [];
    return sales.filter((s) => s.customerId === statementCustomer.id);
  }, [sales, statementCustomer]);

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150 space-y-4">
      {/* Top Banner with Total Khata Due */}
      <div className="bg-gradient-to-tr from-amber-600 to-orange-500 rounded-3xl p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
            Total Customer Khata / Receivables
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono mt-0.5">
            {formatCurrency(totalReceivables, settings.currencySymbol)}
          </div>
          <p className="text-xs text-amber-100 mt-1">
            {customers.filter((c) => c.currentBalance > 0).length} customers currently have outstanding balances
          </p>
        </div>

        <button
          onClick={openNewCustomerModal}
          className="px-4 py-2.5 bg-white text-slate-900 hover:bg-amber-50 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 shrink-0"
        >
          + Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer name, phone, WhatsApp..."
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
        />
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No customers found. Tap "+ Add Customer" to add one.
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {c.name}
                  </h4>
                  <span
                    className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                      c.currentBalance > 0
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {c.currentBalance > 0
                      ? `Due: ${formatCurrency(c.currentBalance, settings.currencySymbol)}`
                      : 'Clear (0.00)'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  {c.phone && <p>📞 {c.phone}</p>}
                  {c.address && <p className="truncate">📍 {c.address}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setStatementCustomer(c)}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  View History
                </button>

                <div className="flex items-center gap-1.5">
                  {c.currentBalance > 0 && (
                    <button
                      onClick={() => {
                        setPaymentCustomer(c);
                        setPayAmount(c.currentBalance);
                        setPayMethod('Cash');
                        setPayNotes('');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                    >
                      Receive Cash
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(c)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD / EDIT CUSTOMER MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer / Khata'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Workshop Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Auto Care"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Same as phone"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workshop / Shop Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Shell Pump, Ferozepur Road"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              {!editingCustomer && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Balance (Previous Khata Due)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE PAYMENT MODAL (PRD Section 47) */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Receive Customer Payment
                </h4>
                <p className="text-xs text-slate-500">{paymentCustomer.name}</p>
              </div>
              <button
                onClick={() => setPaymentCustomer(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl flex justify-between text-xs">
                <span className="text-amber-800 dark:text-amber-200 font-semibold">
                  Current Khata Balance:
                </span>
                <span className="font-mono font-extrabold text-amber-900 dark:text-amber-100">
                  {formatCurrency(paymentCustomer.currentBalance, settings.currencySymbol)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Received *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={paymentCustomer.currentBalance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-extrabold text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="Cash">Cash Drawer</option>
                  <option value="Bank">Bank Deposit / Cheque</option>
                  <option value="Online">JazzCash / EasyPaisa / Raast</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Remarks / Notes
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Received full settlement"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmitting ? 'Recording...' : 'Record Payment Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER STATEMENT / SALES HISTORY MODAL */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Customer Account Statement
                </h4>
                <p className="text-xs text-slate-500">
                  {statementCustomer.name} · Phone: {statementCustomer.phone || '-'}
                </p>
              </div>
              <button
                onClick={() => setStatementCustomer(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
              <span>Current Outstanding Balance:</span>
              <span className="font-mono font-bold text-base text-rose-600">
                {formatCurrency(statementCustomer.currentBalance, settings.currencySymbol)}
              </span>
            </div>

            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Purchased Invoices ({customerSales.length})
            </h5>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
              {customerSales.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No sales recorded for this customer yet.
                </div>
              ) : (
                customerSales.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold">{s.invoiceNumber}</span>
                      <p className="text-[11px] text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString('en-GB')} · {s.items.length} items
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">
                        {formatCurrency(s.grandTotal, settings.currencySymbol)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Paid: {formatCurrency(s.paidAmount, settings.currencySymbol)} | Due:{' '}
                        {formatCurrency(s.balanceAmount, settings.currencySymbol)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
