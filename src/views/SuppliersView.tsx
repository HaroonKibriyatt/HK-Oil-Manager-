import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { formatCurrency } from '../utils/conversions';
import { saveSupplier, recordPaymentReceipt } from '../db/indexedDb';

export const SuppliersView: React.FC = () => {
  const { suppliers, purchases, settings, refreshAllData, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Pay Supplier Modal
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank' | 'Online'>('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View supplier details
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.includes(searchTerm.trim()) ||
        s.whatsapp?.includes(searchTerm.trim())
    );
  }, [suppliers, searchTerm]);

  const totalPayables = useMemo(
    () => suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0),
    [suppliers]
  );

  const openNewSupplierModal = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setWhatsapp('');
    setAddress('');
    setOpeningBalance(0);
    setNotes('');
    setIsEditorOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setPhone(s.phone || '');
    setWhatsapp(s.whatsapp || '');
    setAddress(s.address || '');
    setOpeningBalance(s.openingBalance || 0);
    setNotes(s.notes || '');
    setIsEditorOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Supplier name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveSupplier({
        id: editingSupplier?.id,
        name: name.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        address: address.trim(),
        openingBalance,
        currentBalance: editingSupplier ? editingSupplier.currentBalance : openingBalance,
        notes: notes.trim(),
      });

      showToast(
        editingSupplier ? 'Supplier updated' : 'Supplier registered',
        'success'
      );
      await refreshAllData();
      setIsEditorOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save supplier', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupplierPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier || payAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await recordPaymentReceipt(
        'SUPPLIER_PAYMENT',
        paySupplier.id,
        paySupplier.name,
        paySupplier.phone,
        payAmount,
        payMethod,
        payNotes
      );

      showToast(`Supplier payment of ${formatCurrency(payAmount, settings.currencySymbol)} recorded (#${receipt.receiptNumber})`, 'success');
      await refreshAllData();
      setPaySupplier(null);
      setPayAmount(0);
      setPayNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record supplier payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const supplierPurchases = useMemo(() => {
    if (!detailSupplier) return [];
    return purchases.filter((p) => p.supplierId === detailSupplier.id);
  }, [purchases, detailSupplier]);

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150 space-y-4">
      {/* Top Banner with Total Payables */}
      <div className="bg-gradient-to-tr from-indigo-700 to-blue-600 rounded-3xl p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">
            Total Supplier Payables / Vendor Dues
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono mt-0.5">
            {formatCurrency(totalPayables, settings.currencySymbol)}
          </div>
          <p className="text-xs text-indigo-100 mt-1">
            Amount owed to petroleum oil companies & distributors
          </p>
        </div>

        <button
          onClick={openNewSupplierModal}
          className="px-4 py-2.5 bg-white text-slate-900 hover:bg-indigo-50 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 shrink-0"
        >
          + Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by supplier name, phone..."
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
        />
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No suppliers found. Tap "+ Add Supplier" to register one.
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {s.name}
                  </h4>
                  <span
                    className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                      s.currentBalance > 0
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {s.currentBalance > 0
                      ? `Payable: ${formatCurrency(s.currentBalance, settings.currencySymbol)}`
                      : 'Clear (0.00)'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  {s.phone && <p>📞 {s.phone}</p>}
                  {s.address && <p className="truncate">📍 {s.address}</p>}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setDetailSupplier(s)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Purchases History
                </button>

                <div className="flex items-center gap-1.5">
                  {s.currentBalance > 0 && (
                    <button
                      onClick={() => {
                        setPaySupplier(s);
                        setPayAmount(s.currentBalance);
                        setPayMethod('Cash');
                        setPayNotes('');
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                    >
                      Pay Due
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(s)}
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

      {/* ADD / EDIT SUPPLIER MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier / Distributor Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PSO Petroleum Depot"
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
                    WhatsApp
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
                  Warehouse / Office Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Kot Lakhpat Industrial Area"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              {!editingSupplier && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Payable Balance (Previous Dues)
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY SUPPLIER MODAL */}
      {paySupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Pay Supplier / Distributor
                </h4>
                <p className="text-xs text-slate-500">{paySupplier.name}</p>
              </div>
              <button
                onClick={() => setPaySupplier(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSupplierPaymentSubmit} className="space-y-3">
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl flex justify-between text-xs">
                <span className="text-indigo-800 dark:text-indigo-200 font-semibold">
                  Total Payable Dues:
                </span>
                <span className="font-mono font-extrabold text-indigo-900 dark:text-indigo-100">
                  {formatCurrency(paySupplier.currentBalance, settings.currencySymbol)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Paid *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={paySupplier.currentBalance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-extrabold text-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Source
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="Cash">Cash Drawer</option>
                  <option value="Bank">Bank Transfer / Cheque</option>
                  <option value="Online">Online Banking</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Notes / Cheque #
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid via HBL Online / Cash"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaySupplier(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmitting ? 'Processing...' : 'Record Payment Made'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Supplier Purchase History
                </h4>
                <p className="text-xs text-slate-500">
                  {detailSupplier.name} · Phone: {detailSupplier.phone || '-'}
                </p>
              </div>
              <button
                onClick={() => setDetailSupplier(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
              <span>Current Outstanding Payable:</span>
              <span className="font-mono font-bold text-base text-rose-600">
                {formatCurrency(detailSupplier.currentBalance, settings.currencySymbol)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
              {supplierPurchases.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No purchases recorded from this supplier yet.
                </div>
              ) : (
                supplierPurchases.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold">{p.purchaseNumber}</span>
                      <p className="text-[11px] text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString('en-GB')} · {p.items.length} items
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">
                        {formatCurrency(p.netTotal, settings.currencySymbol)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Paid: {formatCurrency(p.paidAmount, settings.currencySymbol)} | Due:{' '}
                        {formatCurrency(p.balanceAmount, settings.currencySymbol)}
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
