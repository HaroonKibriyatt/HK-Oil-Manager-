import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, PurchaseItem } from '../types';
import { formatCurrency, formatStockInUnits, getProductUnitOptions, roundToTwo } from '../utils/conversions';
import { executePurchaseTransaction } from '../db/indexedDb';

export const PurchasesView: React.FC = () => {
  const {
    products,
    suppliers,
    purchases,
    settings,
    refreshAllData,
    openBarcodeScanner,
    showToast,
  } = useApp();

  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit' | 'Bank'>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product selector dropdown state
  const [prodSearch, setProdSearch] = useState('');

  // Selected supplier
  const activeSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );

  // Available products for adding to purchase
  const eligibleProducts = useMemo(() => {
    if (!prodSearch.trim()) return products.slice(0, 8);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
        p.brand?.toLowerCase().includes(prodSearch.toLowerCase()) ||
        p.barcode?.includes(prodSearch.trim())
    );
  }, [products, prodSearch]);

  const addItemToPurchase = (prod: Product, preferredUnit?: string) => {
    const unitOpts = getProductUnitOptions(prod);
    const chosen = preferredUnit
      ? unitOpts.find((u) => u.unitName === preferredUnit) || unitOpts[0]
      : unitOpts[0];

    const existingIdx = purchaseItems.findIndex(
      (i) => i.productId === prod.id && i.selectedUnit === chosen.unitName
    );

    if (existingIdx >= 0) {
      const updated = [...purchaseItems];
      const item = updated[existingIdx];
      item.quantity += 1;
      item.baseQuantity = item.quantity * item.unitMultiplier;
      item.totalPrice = roundToTwo(item.quantity * item.unitPurchaseRate);
      setPurchaseItems(updated);
    } else {
      const newItem: PurchaseItem = {
        productId: prod.id,
        productName: prod.name,
        brand: prod.brand,
        barcode: prod.barcode,
        selectedUnit: chosen.unitName,
        unitMultiplier: chosen.multiplier,
        quantity: 1,
        baseQuantity: chosen.multiplier * 1,
        unitPurchaseRate: chosen.purchaseRate,
        totalPrice: chosen.purchaseRate,
      };
      setPurchaseItems([...purchaseItems, newItem]);
    }
  };

  const updateItemQty = (idx: number, qty: number) => {
    if (qty <= 0) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
      return;
    }
    const updated = [...purchaseItems];
    const item = updated[idx];
    item.quantity = qty;
    item.baseQuantity = qty * item.unitMultiplier;
    item.totalPrice = roundToTwo(qty * item.unitPurchaseRate);
    setPurchaseItems(updated);
  };

  const updateItemRate = (idx: number, rate: number) => {
    const updated = [...purchaseItems];
    const item = updated[idx];
    item.unitPurchaseRate = rate;
    item.totalPrice = roundToTwo(item.quantity * rate);
    setPurchaseItems(updated);
  };

  // Calculations
  const subtotal = useMemo(
    () => purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0),
    [purchaseItems]
  );

  const netTotal = useMemo(
    () => Math.max(0, roundToTwo(subtotal - discount + additionalCharges)),
    [subtotal, discount, additionalCharges]
  );

  const effectivePaidAmount = useMemo(() => {
    if (paidAmountInput !== '') {
      const parsed = parseFloat(paidAmountInput);
      return isNaN(parsed) ? 0 : parsed;
    }
    return paymentMethod === 'Credit' ? 0 : netTotal;
  }, [paidAmountInput, paymentMethod, netTotal]);

  const balanceDue = useMemo(
    () => Math.max(0, roundToTwo(netTotal - effectivePaidAmount)),
    [netTotal, effectivePaidAmount]
  );

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId && !activeSupplier) {
      showToast('Please select a supplier', 'error');
      return;
    }

    if (purchaseItems.length === 0) {
      showToast('Please add at least one product to the purchase', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const purRecord = await executePurchaseTransaction({
        supplierId: selectedSupplierId,
        supplierName: activeSupplier?.name || 'Standard Vendor',
        supplierInvoiceRef,
        items: purchaseItems,
        subtotal,
        discount,
        additionalCharges,
        netTotal,
        paidAmount: effectivePaidAmount,
        balanceAmount: balanceDue,
        paymentMethod,
        notes,
      });

      showToast(`Purchase order #${purRecord.purchaseNumber} recorded! Stock updated.`, 'success');
      await refreshAllData();

      // Reset
      setPurchaseItems([]);
      setPaidAmountInput('');
      setAdditionalCharges(0);
      setDiscount(0);
      setSupplierInvoiceRef('');
      setNotes('');
      setIsNewPurchaseOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save purchase', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered purchase history
  const filteredPurchases = useMemo(() => {
    if (!searchTerm.trim()) return purchases;
    return purchases.filter(
      (p) =>
        p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierInvoiceRef?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchases, searchTerm]);

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search purchases by number, supplier..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>

        <button
          onClick={() => {
            setPurchaseItems([]);
            setIsNewPurchaseOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
        >
          <span>📥</span>
          <span>New Stock Purchase</span>
        </button>
      </div>

      {/* Purchases List */}
      <div className="space-y-3">
        {filteredPurchases.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
            No purchase records found. Tap "New Stock Purchase" to record inventory purchases.
          </div>
        ) : (
          filteredPurchases.map((pur) => (
            <div
              key={pur.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                    {pur.purchaseNumber}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {pur.supplierName}
                  </span>
                  {pur.supplierInvoiceRef && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                      Ref: {pur.supplierInvoiceRef}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {pur.items.length} items purchased · {new Date(pur.createdAt).toLocaleDateString('en-GB')}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {formatCurrency(pur.netTotal, settings.currencySymbol)}
                  </div>
                  {pur.balanceAmount > 0 ? (
                    <div className="text-[10px] font-bold text-rose-500">
                      Unpaid Due: {formatCurrency(pur.balanceAmount, settings.currencySymbol)}
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-emerald-500">
                      Paid ({pur.paymentMethod})
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* NEW PURCHASE MODAL */}
      {isNewPurchaseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Record Stock Purchase Order
                  </h3>
                  <p className="text-xs text-slate-500">
                    Stock increases automatically upon saving
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPurchaseOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Supplier & Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Supplier / Distributor *
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Payable: {formatCurrency(s.currentBalance, settings.currencySymbol)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier Invoice / Bilty #
                  </label>
                  <input
                    type="text"
                    value={supplierInvoiceRef}
                    onChange={(e) => setSupplierInvoiceRef(e.target.value)}
                    placeholder="e.g. PSO-INV-9921"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Product Selector Bar */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Add Products to Purchase
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      openBarcodeScanner((code) => {
                        const trimmed = code.trim();
                        const found = products.find(
                          (p) => (p.barcode && p.barcode === trimmed) || (p.sku && p.sku.toLowerCase() === trimmed.toLowerCase())
                        );
                        if (found) {
                          addItemToPurchase(found);
                          showToast(`Added ${found.name} to purchase order`, 'success');
                        } else {
                          setProdSearch(trimmed);
                          showToast(`Scanned: ${trimmed}`, 'info');
                        }
                      })
                    }
                    className="text-xs text-sky-600 font-bold flex items-center gap-1 hover:text-sky-700"
                  >
                    <span>📷</span>
                    <span>Scan Barcode</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Type product name or brand to select..."
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />

                {/* Quick Add Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {eligibleProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItemToPurchase(p)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      <span>+ {p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items in Purchase List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {purchaseItems.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No products added yet. Use the selector above to add items.
                  </div>
                ) : (
                  purchaseItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Unit: {item.selectedUnit} ({item.unitMultiplier} base units)
                        </div>
                      </div>

                      {/* Qty & Rate Inputs */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
                          />
                        </div>

                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPurchaseRate}
                            onChange={(e) => updateItemRate(idx, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-mono"
                          />
                        </div>

                        <div className="font-mono font-bold text-slate-900 dark:text-white w-24 text-right">
                          {formatCurrency(item.totalPrice, settings.currencySymbol)}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, 0)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Subtotal</label>
                    <div className="font-mono font-bold text-sm">
                      {formatCurrency(subtotal, settings.currencySymbol)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Discount (-)</label>
                    <input
                      type="number"
                      min="0"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Freight / Cartage (+)</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalCharges || ''}
                      onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Net Bill Amount</label>
                    <div className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(netTotal, settings.currencySymbol)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit (Pay Later)</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Paid Amount</label>
                    <input
                      type="number"
                      min="0"
                      value={paidAmountInput !== '' ? paidAmountInput : effectivePaidAmount}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Supplier Balance Due</label>
                    <div
                      className={`px-2 py-1.5 rounded-lg font-mono font-bold ${
                        balanceDue > 0 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(balanceDue, settings.currencySymbol)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || purchaseItems.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Record Purchase & Increase Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
