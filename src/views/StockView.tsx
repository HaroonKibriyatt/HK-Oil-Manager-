import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StockMovement } from '../types';
import { formatCurrency, formatStockInUnits } from '../utils/conversions';
import { getStockMovements } from '../db/indexedDb';
import { generateStockReportPdf } from '../utils/pdfGenerator';

export const StockView: React.FC = () => {
  const { products, settings, showToast } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'movements'>('inventory');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'movements') {
      setIsLoadingMovements(true);
      getStockMovements()
        .then((list) => setMovements(list))
        .catch(() => showToast('Failed to load stock movements', 'error'))
        .finally(() => setIsLoadingMovements(false));
    }
  }, [activeSubTab, showToast]);

  // Inventory KPI calculations (PRD Section 44)
  const totalBaseUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.currentStock, 0),
    [products]
  );

  const totalCostValuation = useMemo(
    () => products.reduce((sum, p) => sum + p.currentStock * p.purchaseRate, 0),
    [products]
  );

  const totalRetailValuation = useMemo(
    () => products.reduce((sum, p) => sum + p.currentStock * p.saleRate, 0),
    [products]
  );

  const projectedProfit = useMemo(
    () => totalRetailValuation - totalCostValuation,
    [totalRetailValuation, totalCostValuation]
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (stockFilter === 'low' && (p.currentStock <= 0 || p.currentStock > p.minStockAlert)) {
        return false;
      }
      if (stockFilter === 'out' && p.currentStock > 0) {
        return false;
      }
      if (
        searchTerm.trim() &&
        !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.barcode?.includes(searchTerm.trim())
      ) {
        return false;
      }
      return true;
    });
  }, [products, stockFilter, searchTerm]);

  // Export PDF
  const handleExportStockPdf = () => {
    try {
      const doc = generateStockReportPdf(filteredProducts, settings);
      doc.save(`Stock_Valuation_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Stock Valuation Report PDF exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export PDF', 'error');
    }
  };

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150 space-y-4">
      {/* Subtab Navigation & PDF Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'inventory'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Inventory Valuation ({products.length})
          </button>
          <button
            onClick={() => setActiveSubTab('movements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'movements'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Stock Audit Log
          </button>
        </div>

        {activeSubTab === 'inventory' && (
          <button
            onClick={handleExportStockPdf}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors w-fit"
          >
            <span>📄</span>
            <span>Download Stock PDF Report</span>
          </button>
        )}
      </div>

      {/* Stock Valuation Summary Banner (PRD Section 44) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Stock Quantity
          </span>
          <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            {totalBaseUnits.toLocaleString()} Units
          </div>
          <span className="text-[11px] text-slate-400">Across {products.length} catalog items</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Purchase Cost
          </span>
          <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalCostValuation, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">Total invested in stock</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Estimated Retail Value
          </span>
          <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalRetailValuation, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">At current selling rates</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Potential Gross Profit
          </span>
          <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatCurrency(projectedProfit, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">
            Margin:{' '}
            {totalRetailValuation > 0
              ? `${Math.round((projectedProfit / totalRetailValuation) * 100)}%`
              : '0%'}
          </span>
        </div>
      </div>

      {/* INVENTORY TAB CONTENT */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  stockFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800'
                }`}
              >
                All Products ({products.length})
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  stockFilter === 'low'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-amber-600 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Low Stock (
                {products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockAlert).length}
                )
              </button>
              <button
                onClick={() => setStockFilter('out')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  stockFilter === 'out'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-rose-600 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Out of Stock ({products.filter((p) => p.currentStock <= 0).length})
              </button>
            </div>

            <div className="relative max-w-xs w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter stock table..."
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-bold">Product</th>
                    <th className="py-3 px-3 font-bold">Unit / Packaging</th>
                    <th className="py-3 px-3 font-bold text-center">Available Stock</th>
                    <th className="py-3 px-3 font-bold text-right">Purchase Price</th>
                    <th className="py-3 px-3 font-bold text-right">Sale Price</th>
                    <th className="py-3 px-3 font-bold text-right">Total Cost</th>
                    <th className="py-3 px-4 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.map((p) => {
                    const isOut = p.currentStock <= 0;
                    const isLow = p.currentStock <= p.minStockAlert;
                    const costVal = p.currentStock * p.purchaseRate;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.barcode || p.sku || p.category}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {p.baseUnit} ({formatStockInUnits(p.currentStock, p.bottlesPerCotton, p.baseUnit)})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {p.currentStock} {p.baseUnit}s
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatCurrency(p.purchaseRate, settings.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(p.saleRate, settings.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(costVal, settings.currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                : isLow
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MOVEMENTS AUDIT TAB CONTENT (PRD Section 22) */}
      {activeSubTab === 'movements' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
          {isLoadingMovements ? (
            <div className="p-10 text-center text-xs text-slate-400">Loading audit history...</div>
          ) : movements.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">No stock movements recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-bold">Date & Time</th>
                    <th className="py-3 px-4 font-bold">Product</th>
                    <th className="py-3 px-3 font-bold">Action</th>
                    <th className="py-3 px-3 font-bold text-center">Change</th>
                    <th className="py-3 px-3 font-bold text-center">Before</th>
                    <th className="py-3 px-3 font-bold text-center">After</th>
                    <th className="py-3 px-4 font-bold">Reference / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleDateString('en-GB')}{' '}
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {m.productName}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'SALE'
                              ? 'bg-rose-50 text-rose-600'
                              : m.type === 'PURCHASE'
                              ? 'bg-indigo-50 text-indigo-600'
                              : m.type === 'OPENING'
                              ? 'bg-sky-50 text-sky-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-mono font-bold ${
                          m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {m.beforeStock}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {m.afterStock}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {m.referenceNumber ? `[${m.referenceNumber}] ` : ''}
                        {m.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
