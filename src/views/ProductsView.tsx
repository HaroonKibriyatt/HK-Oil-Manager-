import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, ProductUnit } from '../types';
import { formatCurrency, formatStockInUnits, calculateProductDerivedRates, roundToTwo } from '../utils/conversions';
import { saveProduct, deleteProduct, adjustStock } from '../db/indexedDb';
import { compressImage } from '../utils/imageUtils';
import { safeStorage } from '../utils/safeStorage';

export const ProductsView: React.FC = () => {
  const {
    products,
    suppliers,
    settings,
    refreshAllData,
    openBarcodeScanner,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Oil');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [baseUnit, setBaseUnit] = useState<ProductUnit>('Bottle');
  const [bottlesPerCotton, setBottlesPerCotton] = useState<number>(12);
  const [cottonPurchaseRate, setCottonPurchaseRate] = useState<number>(0);
  const [cottonSaleRate, setCottonSaleRate] = useState<number>(0);
  const [purchaseRate, setPurchaseRate] = useState<number>(0);
  const [saleRate, setSaleRate] = useState<number>(0);
  const [bottleSizeLiters, setBottleSizeLiters] = useState<number>(1);
  const [gallonSizeLiters, setGallonSizeLiters] = useState<number>(0);
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(10);
  const [supplierId, setSupplierId] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock Adjust Modal State
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<'ADJUSTMENT' | 'DAMAGED'>('ADJUSTMENT');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Check if prefill barcode exists from scanner (PRD Section 7)
  useEffect(() => {
    const prefill = safeStorage.getItem('prefill_barcode');
    if (prefill) {
      safeStorage.removeItem('prefill_barcode');
      openNewProductModal(prefill);
    }
  }, []);

  const openNewProductModal = (prefilledBarcode?: string) => {
    setEditingProduct(null);
    setName('');
    setBrand('');
    setGenericName('');
    setCategory('Oil');
    setBarcode(prefilledBarcode || '');
    setSku('SKU-' + Date.now().toString().slice(-6));
    setBaseUnit('Bottle');
    setBottlesPerCotton(12);
    setCottonPurchaseRate(0);
    setCottonSaleRate(0);
    setPurchaseRate(0);
    setSaleRate(0);
    setBottleSizeLiters(1);
    setGallonSizeLiters(0);
    setOpeningStock(0);
    setMinStockAlert(settings.defaultLowStockThreshold || 10);
    setSupplierId('');
    setImageBase64(undefined);
    setNotes('');
    setIsEditorOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBrand(p.brand);
    setGenericName(p.genericName || '');
    setCategory(p.category);
    setBarcode(p.barcode || '');
    setSku(p.sku || '');
    setBaseUnit(p.baseUnit);
    setBottlesPerCotton(p.bottlesPerCotton || 12);
    setCottonPurchaseRate(p.cottonPurchaseRate || 0);
    setCottonSaleRate(p.cottonSaleRate || 0);
    setPurchaseRate(p.purchaseRate);
    setSaleRate(p.saleRate);
    setBottleSizeLiters(p.bottleSizeLiters || 1);
    setGallonSizeLiters(p.gallonSizeLiters || 0);
    setOpeningStock(p.openingStock || 0);
    setMinStockAlert(p.minStockAlert || 10);
    setSupplierId(p.supplierId || '');
    setImageBase64(p.imageBase64);
    setNotes(p.notes || '');
    setIsEditorOpen(true);
  };

  // Sync rates when user modifies cotton or bottle pricing
  const handleCottonSaleChange = (val: number) => {
    setCottonSaleRate(val);
    const count = Math.max(1, bottlesPerCotton || 12);
    if (val > 0) {
      setSaleRate(roundToTwo(val / count));
    }
  };

  const handleCottonPurchaseChange = (val: number) => {
    setCottonPurchaseRate(val);
    const count = Math.max(1, bottlesPerCotton || 12);
    if (val > 0) {
      setPurchaseRate(roundToTwo(val / count));
    }
  };

  const handleBottleSaleChange = (val: number) => {
    setSaleRate(val);
    const count = Math.max(1, bottlesPerCotton || 12);
    if (val > 0) {
      setCottonSaleRate(roundToTwo(val * count));
    }
  };

  const handleBottlePurchaseChange = (val: number) => {
    setPurchaseRate(val);
    const count = Math.max(1, bottlesPerCotton || 12);
    if (val > 0) {
      setCottonPurchaseRate(roundToTwo(val * count));
    }
  };

  // Handle Photo input with compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 640, 640, 0.82);
        setImageBase64(compressed);
        showToast('Product photo captured and optimized', 'success');
      } catch (err) {
        showToast('Failed to process photo', 'error');
      }
    }
  };

  // Save product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }

    if (saleRate <= 0 && cottonSaleRate <= 0) {
      showToast('Please enter a valid selling price', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const derived = calculateProductDerivedRates({
        baseUnit,
        bottlesPerCotton,
        cottonPurchaseRate,
        cottonSaleRate,
        purchaseRate,
        saleRate,
        gallonSizeLiters,
      });

      const selectedSupplier = suppliers.find((s) => s.id === supplierId);

      await saveProduct({
        id: editingProduct?.id,
        name: name.trim(),
        brand: brand.trim(),
        genericName: genericName.trim(),
        category,
        barcode: barcode.trim(),
        sku: sku.trim(),
        baseUnit,
        bottlesPerCotton: Math.max(1, bottlesPerCotton || 1),
        cottonPurchaseRate: derived.cottonPurchaseRate,
        cottonSaleRate: derived.cottonSaleRate,
        bottleSizeLiters,
        gallonSizeLiters,
        purchaseRate: derived.purchaseRate,
        saleRate: derived.saleRate,
        profitAmount: derived.profitAmount,
        profitMarginPercent: derived.profitMarginPercent,
        openingStock: editingProduct ? editingProduct.openingStock : openingStock,
        currentStock: editingProduct ? editingProduct.currentStock : openingStock,
        minStockAlert,
        supplierId: supplierId || undefined,
        supplierName: selectedSupplier?.name,
        imageBase64,
        notes: notes.trim(),
        status: 'ACTIVE',
      });

      showToast(
        editingProduct ? 'Product updated successfully' : 'New product registered',
        'success'
      );
      await refreshAllData();
      setIsEditorOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (p: Product) => {
    if (window.confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)) {
      try {
        await deleteProduct(p.id);
        showToast(`Deleted ${p.name}`, 'info');
        await refreshAllData();
      } catch (e) {
        showToast('Failed to delete product', 'error');
      }
    }
  };

  // Submit stock adjustment
  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;
    try {
      await adjustStock(
        adjustModalProduct.id,
        adjustNewStock,
        adjustReason,
        adjustNotes
      );
      showToast(`Stock updated for ${adjustModalProduct.name}`, 'success');
      await refreshAllData();
      setAdjustModalProduct(null);
    } catch (err: any) {
      showToast(err.message || 'Stock adjustment failed', 'error');
    }
  };

  // Filtered list
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchQuery =
        !searchTerm.trim() ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm.trim()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchTerm]);

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name, barcode, SKU..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Scanner */}
          <button
            onClick={() =>
              openBarcodeScanner((code) => {
                setSearchTerm(code);
              })
            }
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>📷</span>
            <span>Scan</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={() => openNewProductModal()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span>+</span>
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar mb-3 text-xs">
        {['ALL', 'Oil', 'Cotton', 'Bottle', 'Gallon', 'Filter', 'Other'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat === 'ALL' ? 'All Products' : cat}
          </button>
        ))}
      </div>

      {/* Product List Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-14 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center text-2xl mb-3">
              🛢️
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">
              No Products Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Add your first engine oil, gallon, bottle, or filter to start managing inventory and sales.
            </p>
            <button
              onClick={() => openNewProductModal()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span>+</span>
              <span>Add First Product</span>
            </button>
          </div>
        ) : (
          filtered.map((prod) => {
            const isOutOfStock = prod.currentStock <= 0;
            const isLowStock = prod.currentStock <= prod.minStockAlert;

            return (
              <div
                key={prod.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {prod.imageBase64 ? (
                      <img
                        src={prod.imageBase64}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🛢️</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        {prod.brand || prod.category}
                      </span>
                      {prod.barcode && (
                        <span className="text-[10px] font-mono text-slate-400">
                          #{prod.barcode}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {prod.name}
                    </h4>

                    {/* Multi-unit packaging info */}
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {prod.bottlesPerCotton > 1 && (
                        <span>1 Ctn = {prod.bottlesPerCotton} {prod.baseUnit}s · </span>
                      )}
                      <span>Stock: </span>
                      <span
                        className={`font-bold font-mono ${
                          isOutOfStock
                            ? 'text-rose-600'
                            : isLowStock
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {formatStockInUnits(prod.currentStock, prod.bottlesPerCotton, prod.baseUnit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rates & Profit */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Purchase</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(prod.purchaseRate, settings.currencySymbol)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sale</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(prod.saleRate, settings.currencySymbol)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Profit</span>
                    <span className="font-mono font-bold text-emerald-600">
                      +{formatCurrency(prod.profitAmount, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setAdjustModalProduct(prod);
                      setAdjustNewStock(prod.currentStock);
                      setAdjustReason('ADJUSTMENT');
                      setAdjustNotes('');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Adjust Stock
                  </button>
                  <button
                    onClick={() => openEditProductModal(prod)}
                    className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(prod)}
                    className="px-2 py-1 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Product Photo & Barcode Fast Scan */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                {/* Image Preview & Pickers (PRD Section 8: Camera & Gallery) */}
                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col items-center justify-center text-center p-1">
                      {imageBase64 ? (
                        <img src={imageBase64} alt="Product" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <span className="text-2xl mb-1">🛢️</span>
                          <span className="text-[10px] text-slate-400">No Image</span>
                        </>
                      )}
                    </div>
                    {imageBase64 && (
                      <button
                        type="button"
                        onClick={() => setImageBase64(undefined)}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center shadow-md"
                        title="Remove Image"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {/* Camera Button */}
                    <label className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all text-center justify-center">
                      <span>📷</span>
                      <span>Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Gallery Button */}
                    <label className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all text-center justify-center">
                      <span>🖼️</span>
                      <span>Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Barcode scanner action */}
                <div className="flex-1 w-full space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Product Barcode / QR Code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan or enter barcode number"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        openBarcodeScanner((code) => {
                          setBarcode(code);
                        })
                      }
                      className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 shadow-sm"
                    >
                      <span>📷</span>
                      <span>Scan Camera</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Leave blank to auto-generate an internal barcode SKU.
                  </p>
                </div>
              </div>

              {/* Title & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. ZIC X7 10W-40 Synthetic (4L)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. ZIC, Shell, Mobil, Havoline, Guard"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Category & Unit Configuration (PRD Section 8, 9, 10, 11) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="Oil">Engine Oil</option>
                    <option value="Cotton">Cotton Package</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Gallon">Gallon</option>
                    <option value="Filter">Filter</option>
                    <option value="Lubricant">Grease / Gear</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Base Stock Unit
                  </label>
                  <select
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value as ProductUnit)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="Bottle">Bottle</option>
                    <option value="Liter">Liter</option>
                    <option value="Gallon">Gallon</option>
                    <option value="Piece">Piece / Can</option>
                    <option value="Drum">Drum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bottles in 1 Cotton
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bottlesPerCotton}
                    onChange={(e) => setBottlesPerCotton(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Size (Liters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={bottleSizeLiters}
                    onChange={(e) => setBottleSizeLiters(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 1L, 4L, 5L"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Pricing Engine & Dynamic Multiplier (PRD Section 9, 21, 59) */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                    Pricing & Auto-Calculated Unit Rates
                  </h4>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    1 Cotton = {bottlesPerCotton} {baseUnit}s
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Cotton Purchase Rate
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={cottonPurchaseRate || ''}
                      onChange={(e) => handleCottonPurchaseChange(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Cotton Sale Rate
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={cottonSaleRate || ''}
                      onChange={(e) => handleCottonSaleChange(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      1 {baseUnit} Purchase Rate
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={purchaseRate || ''}
                      onChange={(e) => handleBottlePurchaseChange(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      1 {baseUnit} Sale Rate
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={saleRate || ''}
                      onChange={(e) => handleBottleSaleChange(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>
                    Profit per {baseUnit}:{' '}
                    <strong className="text-emerald-600">
                      {formatCurrency(saleRate - purchaseRate, settings.currencySymbol)}
                    </strong>
                  </span>
                  <span>
                    Profit per Cotton:{' '}
                    <strong className="text-emerald-600">
                      {formatCurrency(cottonSaleRate - cottonPurchaseRate, settings.currencySymbol)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Stock Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Opening Stock ({baseUnit}s)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={openingStock}
                      onChange={(e) => setOpeningStock(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Stock Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Supplier
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Notes / Application Specs
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Recommended for Corolla, Civic, Sportage, etc."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Adjust Stock Quantity
                </h4>
                <p className="text-xs text-slate-500">{adjustModalProduct.name}</p>
              </div>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Current Stock: {adjustModalProduct.currentStock} {adjustModalProduct.baseUnit}s
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  placeholder="Enter new actual physical count"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Adjustment Reason
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="ADJUSTMENT">Physical Recount / Stock Tally</option>
                  <option value="DAMAGED">Damaged / Leaked / Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Month-end inventory audit count"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
