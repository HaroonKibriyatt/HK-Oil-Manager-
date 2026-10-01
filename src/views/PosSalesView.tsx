import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, SaleItem, Customer } from '../types';
import { formatCurrency, formatStockInUnits, getProductUnitOptions, roundToTwo } from '../utils/conversions';
import { executeSaleTransaction } from '../db/indexedDb';

export const PosSalesView: React.FC = () => {
  const {
    products,
    customers,
    settings,
    refreshAllData,
    openBarcodeScanner,
    openInvoiceModal,
    quickPosProduct,
    setQuickPosProduct,
    showToast,
  } = useApp();

  const currency = settings?.currencySymbol || 'Rs.';

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Active Cart Items
  const [cart, setCart] = useState<SaleItem[]>([]);

  // Customer & Payment state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [walkinName, setWalkinName] = useState('Walk-in Customer');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SaleItem['selectedUnit'] & ('Cash' | 'Credit' | 'Bank' | 'Online')>('Cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Customer Create Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Auto-add product if navigated from Barcode Scanner or Quick Trigger
  useEffect(() => {
    if (quickPosProduct) {
      addProductToCart(quickPosProduct);
      setQuickPosProduct(null);
    }
  }, [quickPosProduct, setQuickPosProduct]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Add product to cart with default unit (Bottle or Cotton)
  const addProductToCart = (product: Product, preferredUnit?: string) => {
    const unitOptions = getProductUnitOptions(product);
    const chosenUnit = preferredUnit
      ? unitOptions.find((u) => u.unitName === preferredUnit) || unitOptions[0]
      : unitOptions[0];

    // Check if already in cart with same unit
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.selectedUnit === chosenUnit.unitName
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      const item = updated[existingIndex];
      const nextQty = item.quantity + 1;
      const nextBaseQty = nextQty * item.unitMultiplier;

      // Check stock
      if (!settings.allowNegativeStock && nextBaseQty > product.currentStock) {
        showToast(`Cannot add more. Current available stock: ${product.currentStock} ${product.baseUnit}`, 'error');
        return;
      }

      item.quantity = nextQty;
      item.baseQuantity = nextBaseQty;
      item.totalPrice = roundToTwo(nextQty * item.unitSalePrice);
      item.netTotal = roundToTwo(item.totalPrice - item.discount);
      item.profit = roundToTwo(item.netTotal - item.unitPurchaseCost * nextQty);
      setCart(updated);
    } else {
      const baseQty = chosenUnit.multiplier * 1;
      if (!settings.allowNegativeStock && baseQty > product.currentStock) {
        showToast(`Insufficient stock! Available: ${product.currentStock} ${product.baseUnit}`, 'error');
        return;
      }

      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        barcode: product.barcode,
        category: product.category,
        imageBase64: product.imageBase64,
        selectedUnit: chosenUnit.unitName,
        unitMultiplier: chosenUnit.multiplier,
        quantity: 1,
        baseQuantity: chosenUnit.multiplier * 1,
        unitPurchaseCost: chosenUnit.purchaseRate,
        unitSalePrice: chosenUnit.saleRate,
        totalPrice: chosenUnit.saleRate,
        discount: 0,
        netTotal: chosenUnit.saleRate,
        profit: roundToTwo(chosenUnit.saleRate - chosenUnit.purchaseRate),
      };

      setCart([...cart, newItem]);
    }
  };

  // Change quantity
  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItemFromCart(index);
      return;
    }
    const updated = [...cart];
    const item = updated[index];
    const product = products.find((p) => p.id === item.productId);

    const requiredBaseQty = newQty * item.unitMultiplier;
    if (product && !settings.allowNegativeStock && requiredBaseQty > product.currentStock) {
      showToast(`Stock limit reached! Available: ${product.currentStock} ${product.baseUnit}`, 'error');
      return;
    }

    item.quantity = newQty;
    item.baseQuantity = requiredBaseQty;
    item.totalPrice = roundToTwo(newQty * item.unitSalePrice);
    item.netTotal = roundToTwo(item.totalPrice - item.discount);
    item.profit = roundToTwo(item.netTotal - item.unitPurchaseCost * newQty);
    setCart(updated);
  };

  // Switch unit for item in cart (e.g. Cotton to Bottle)
  const switchItemUnit = (index: number, newUnitName: string) => {
    const updated = [...cart];
    const item = updated[index];
    const product = products.find((p) => p.id === item.productId);
    if (!product) return;

    const unitOptions = getProductUnitOptions(product);
    const chosen = unitOptions.find((u) => u.unitName === newUnitName);
    if (!chosen) return;

    item.selectedUnit = chosen.unitName;
    item.unitMultiplier = chosen.multiplier;
    item.unitPurchaseCost = chosen.purchaseRate;
    item.unitSalePrice = chosen.saleRate;
    item.baseQuantity = item.quantity * chosen.multiplier;
    item.totalPrice = roundToTwo(item.quantity * chosen.saleRate);
    item.netTotal = roundToTwo(item.totalPrice - item.discount);
    item.profit = roundToTwo(item.netTotal - chosen.purchaseRate * item.quantity);

    setCart(updated);
  };

  // Remove item
  const removeItemFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const cartTotalDiscount = useMemo(() => {
    let disc = 0;
    if (discountType === 'PERCENT') {
      disc = roundToTwo((cartSubtotal * discountValue) / 100);
    } else {
      disc = Math.min(cartSubtotal, discountValue);
    }
    // Add line item discounts
    const lineDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
    return roundToTwo(disc + lineDiscounts);
  }, [cartSubtotal, discountType, discountValue, cart]);

  const cartTaxAmount = useMemo(() => {
    if (!settings.taxEnabled || settings.taxRatePercent <= 0) return 0;
    const taxable = cartSubtotal - cartTotalDiscount;
    return roundToTwo((taxable * settings.taxRatePercent) / 100);
  }, [cartSubtotal, cartTotalDiscount, settings.taxEnabled, settings.taxRatePercent]);

  const cartGrandTotal = useMemo(() => {
    return Math.max(0, roundToTwo(cartSubtotal - cartTotalDiscount + cartTaxAmount));
  }, [cartSubtotal, cartTotalDiscount, cartTaxAmount]);

  const cartTotalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPurchaseCost * item.quantity, 0);
  }, [cart]);

  const cartTotalProfit = useMemo(() => {
    return roundToTwo(cartGrandTotal - cartTotalCost);
  }, [cartGrandTotal, cartTotalCost]);

  // Default paid amount is grand total unless user edits or selects Credit
  const effectivePaidAmount = useMemo(() => {
    if (paidAmountInput !== '') {
      const parsed = parseFloat(paidAmountInput);
      return isNaN(parsed) ? 0 : parsed;
    }
    return paymentMethod === 'Credit' ? 0 : cartGrandTotal;
  }, [paidAmountInput, paymentMethod, cartGrandTotal]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, roundToTwo(cartGrandTotal - effectivePaidAmount));
  }, [cartGrandTotal, effectivePaidAmount]);

  // Handle Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Please add at least one product to the sale cart.', 'error');
      return;
    }

    if (remainingBalance > 0 && !selectedCustomerId && !walkinName.trim()) {
      showToast('Customer name or account is required for credit / unpaid sales.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const customerName = activeCustomer ? activeCustomer.name : walkinName || 'Walk-in Customer';
      const customerPhone = activeCustomer ? activeCustomer.phone : walkinPhone;

      const saleRecord = await executeSaleTransaction({
        customerId: selectedCustomerId || undefined,
        customerName,
        customerPhone,
        customerAddress: activeCustomer?.address,
        items: cart,
        discountType,
        discountValue,
        discountTotal: cartTotalDiscount,
        taxRatePercent: settings.taxEnabled ? settings.taxRatePercent : 0,
        taxAmount: cartTaxAmount,
        grandTotal: cartGrandTotal,
        totalCost: cartTotalCost,
        totalProfit: cartTotalProfit,
        paidAmount: effectivePaidAmount,
        balanceAmount: remainingBalance,
        paymentMethod,
        notes: invoiceNotes,
      });

      showToast(`Sale Invoice #${saleRecord.invoiceNumber} created successfully!`, 'success');
      await refreshAllData();

      // Reset cart
      setCart([]);
      setPaidAmountInput('');
      setDiscountValue(0);
      setInvoiceNotes('');
      setSelectedCustomerId('');
      setWalkinName('Walk-in Customer');
      setWalkinPhone('');

      // Open Invoice preview & WhatsApp share modal
      openInvoiceModal(saleRecord);
    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast(err.message || 'Failed to complete sale transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: { id: string; label: string; gradeFilter?: string }[] = [
    { id: 'ALL', label: 'All Oils (تمام)' },
    { id: '20W-50', label: '20W-50' },
    { id: '10W-40', label: '10W-40' },
    { id: '5W-30', label: '5W-30' },
    { id: '0W-20', label: '0W-20' },
    { id: '15W-40', label: 'Diesel 15W-40' },
    { id: 'Filter', label: 'Filters (فلٹر)' },
    { id: 'Gear', label: 'Gear / ATF' },
    { id: 'Cotton', label: 'Cotton Pkg (پیٹی)' },
  ];

  // Grade filter state
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');

  // Filtered product catalog with Grade matching
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'INACTIVE') return false;

      // Grade or Category filter
      let matchCatOrGrade = true;
      if (selectedGrade !== 'ALL') {
        if (selectedGrade === 'Filter') {
          matchCatOrGrade = p.category === 'Filter' || p.name.toLowerCase().includes('filter');
        } else if (selectedGrade === 'Gear') {
          matchCatOrGrade = p.name.toLowerCase().includes('gear') || p.name.toLowerCase().includes('atf');
        } else if (selectedGrade === 'Cotton') {
          matchCatOrGrade = (p.bottlesPerCotton || 0) > 1 || p.cottonSaleRate > 0;
        } else {
          // Specific viscosity like 20W-50, 10W-40, 5W-30
          matchCatOrGrade = p.name.toLowerCase().includes(selectedGrade.toLowerCase());
        }
      }

      const matchQuery =
        !searchTerm.trim() ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm.trim()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchCatOrGrade && matchQuery;
    });
  }, [products, selectedGrade, searchTerm]);

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Product Catalog & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Top Search & Barcode Trigger */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search oil, brand, barcode, SKU (تلاش کریں)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs text-slate-900 dark:text-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() =>
                openBarcodeScanner((code) => {
                  setSearchTerm(code);
                })
              }
              className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 shrink-0"
              title="Scan QR or Barcode"
            >
              <span>📷</span>
              <span className="hidden xs:inline">QR / Barcode</span>
            </button>
          </div>

          {/* Oil Grade & Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedGrade(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  selectedGrade === cat.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No products match "{searchTerm}". Try another search or scan a barcode.
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const isOutOfStock = prod.currentStock <= 0;
                const isLowStock = prod.currentStock <= prod.minStockAlert;

                return (
                  <div
                    key={prod.id}
                    onClick={() => !isOutOfStock && addProductToCart(prod)}
                    className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-3 flex flex-col justify-between transition-all select-none ${
                      isOutOfStock
                        ? 'opacity-60 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                        : 'border-slate-200 dark:border-slate-800 hover:border-sky-500/80 hover:shadow-md cursor-pointer active:scale-98'
                    }`}
                  >
                    <div>
                      {/* Product Image / Placeholder */}
                      <div className="w-full h-24 rounded-xl bg-slate-100 dark:bg-slate-800 mb-2 overflow-hidden flex items-center justify-center relative">
                        {prod.imageBase64 ? (
                          <img
                            src={prod.imageBase64}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-2xl opacity-60">🛢️</span>
                        )}

                        {/* Stock Tag on Top Corner */}
                        <div
                          className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold backdrop-blur-md ${
                            isOutOfStock
                              ? 'bg-rose-900/90 text-white'
                              : isLowStock
                              ? 'bg-amber-500/90 text-white'
                              : 'bg-slate-900/75 text-emerald-300'
                          }`}
                        >
                          {formatStockInUnits(prod.currentStock, prod.bottlesPerCotton, prod.baseUnit)}
                        </div>
                      </div>

                      {/* Brand & Name */}
                      {prod.brand && (
                        <p className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wide line-clamp-1">
                          {prod.brand}
                        </p>
                      )}
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {prod.name}
                      </h4>
                    </div>

                    {/* Rates & Quick Cotton button */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                          {formatCurrency(prod.saleRate, currency)}
                        </div>
                        <span className="text-[10px] text-slate-400 block -mt-0.5">
                          per {prod.baseUnit}
                        </span>
                      </div>

                      {/* Multi-unit quick trigger for Cotton */}
                      {prod.bottlesPerCotton > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addProductToCart(prod, 'Cotton');
                          }}
                          className="px-2 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold"
                          title={`Add 1 Cotton (${prod.bottlesPerCotton} bottles)`}
                        >
                          + Cotton
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS Cart & Checkout Drawer (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Sale Cart ({cart.length} items)
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Khata Selector */}
            <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer / Khata Account
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  + Add New
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Walk-in Customer (Cash Sale)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.currentBalance > 0 ? `(Khata Due: ${formatCurrency(c.currentBalance, currency)})` : ''}
                  </option>
                ))}
              </select>

              {!selectedCustomerId && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="Customer Name"
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="WhatsApp / Phone"
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="py-2 space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Cart is empty. Tap products on the left or scan a barcode to add.
                </div>
              ) : (
                cart.map((item, idx) => {
                  const product = products.find((p) => p.id === item.productId);
                  const availableUnits = product ? getProductUnitOptions(product) : [];

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {item.productName}
                          </h5>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatCurrency(item.unitSalePrice, currency)} / {item.selectedUnit}
                          </span>
                        </div>
                        <button
                          onClick={() => removeItemFromCart(idx)}
                          className="text-slate-400 hover:text-rose-500 text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Unit Selector & Quantity Adjuster */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        {/* Unit Switcher (PRD Section 12) */}
                        <select
                          value={item.selectedUnit}
                          onChange={(e) => switchItemUnit(idx, e.target.value)}
                          className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          {availableUnits.map((u) => (
                            <option key={u.unitName} value={u.unitName}>
                              {u.description}
                            </option>
                          ))}
                        </select>

                        {/* Qty Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateItemQuantity(idx, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs active:scale-95 shadow-2xs"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white px-1">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs active:scale-95 shadow-2xs"
                          >
                            +
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="font-mono font-bold text-xs text-slate-900 dark:text-white text-right">
                          {formatCurrency(item.netTotal, currency)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Payment & Bill Summary */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Discount row */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Discount:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-right"
                />
                <button
                  type="button"
                  onClick={() => setDiscountType(discountType === 'FIXED' ? 'PERCENT' : 'FIXED')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs border border-slate-200 dark:border-slate-700"
                >
                  {discountType === 'FIXED' ? currency : '%'}
                </button>
              </div>
            </div>

            {/* Payment Method Picker */}
            <div className="flex items-center justify-between gap-1 text-xs">
              {(['Cash', 'Credit', 'Bank', 'Online'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition-all ${
                    paymentMethod === method
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* Quick Cash Tender Notes */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                Quick Cash / نوٹ کا انتخاب:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPaidAmountInput(String(cartGrandTotal))}
                  className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-300 dark:border-emerald-800 text-[11px] whitespace-nowrap active:scale-95"
                >
                  Exact ({formatCurrency(cartGrandTotal, currency)})
                </button>
                <button
                  type="button"
                  onClick={() => setPaidAmountInput('500')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] whitespace-nowrap"
                >
                  Rs. 500 Note
                </button>
                <button
                  type="button"
                  onClick={() => setPaidAmountInput('1000')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] whitespace-nowrap"
                >
                  Rs. 1,000 Note
                </button>
                <button
                  type="button"
                  onClick={() => setPaidAmountInput('5000')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] whitespace-nowrap"
                >
                  Rs. 5,000 Note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaidAmountInput('0');
                    setPaymentMethod('Credit');
                  }}
                  className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-semibold rounded-lg border border-rose-200 dark:border-rose-900 text-[11px] whitespace-nowrap"
                >
                  Full Udhar (ادھار)
                </button>
              </div>
            </div>

            {/* Paid Amount vs Remaining Balance */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">
                  Paid Amount (وصول رقم):
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmountInput !== '' ? paidAmountInput : effectivePaidAmount}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">
                  Remaining Udhar (باقی کھاتہ):
                </label>
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                    remainingBalance > 0
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                      : 'bg-slate-50 dark:bg-slate-800 text-emerald-600 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {formatCurrency(remainingBalance, currency)}
                </div>
              </div>
            </div>

            {/* Change to Return Notice (بقایا رقم) */}
            {parseFloat(paidAmountInput || '0') > cartGrandTotal && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs animate-in fade-in">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <span>💵</span>
                  <span>Change Return (بقایا رقم واپس کریں):</span>
                </span>
                <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(roundToTwo(parseFloat(paidAmountInput) - cartGrandTotal), currency)}
                </span>
              </div>
            )}

            {/* Grand Total Bar */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Grand Total
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  Profit: {formatCurrency(cartTotalProfit, currency)}
                </span>
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(cartGrandTotal, currency)}
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              disabled={cart.length === 0 || isSubmitting}
              onClick={handleCheckout}
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
                cart.length === 0 || isSubmitting
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
              }`}
            >
              <span>{isSubmitting ? 'Processing Bill...' : 'Complete Sale & Print Bill'}</span>
              <span>🧾</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
