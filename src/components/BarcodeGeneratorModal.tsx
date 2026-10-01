import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { formatCurrency } from '../utils/conversions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
}

export const BarcodeGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialProduct,
}) => {
  const { products, settings } = useApp();
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || (products[0]?.id ?? '')
  );
  const [customText, setCustomText] = useState<string>(
    initialProduct?.barcode || (products[0]?.barcode ?? 'OIL-1001')
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [labelSize, setLabelSize] = useState<'standard' | 'small' | 'large'>('standard');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || initialProduct;

  useEffect(() => {
    if (selectedProduct) {
      setCustomText(selectedProduct.barcode);
    }
  }, [selectedProductId, selectedProduct]);

  useEffect(() => {
    const textToEncode = customText.trim() || 'LUBEFLOW';
    QRCode.toDataURL(textToEncode, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [customText]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = settings?.currencySymbol || 'Rs.';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
              🏷️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                QR & Barcode Label Generator
              </h3>
              <p className="text-xs text-slate-500">
                Generate and print stickers for oil cans, cartons & filters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Select Product */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Product from Catalog:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Barcode: {p.barcode} ({formatCurrency(p.saleRate, currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Code text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Barcode / QR Payload Data:
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. 896400123456"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white"
            />
          </div>

          {/* Sticker Label Preview Box */}
          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Printable Sticker Preview (50mm × 30mm)
            </span>

            <div
              ref={printAreaRef}
              id="printable-sticker"
              className="bg-white text-slate-900 p-3.5 rounded-xl border border-slate-300 shadow-sm w-72 flex flex-col items-center text-center select-none"
            >
              {/* Business Name */}
              <div className="text-[11px] font-bold text-slate-800 tracking-tight truncate max-w-full">
                {settings?.businessName || 'LubeFlow Pro Oil Traders'}
              </div>

              {/* Product Title */}
              <div className="text-xs font-extrabold text-slate-900 mt-1 line-clamp-1">
                {selectedProduct?.name || 'Engine Oil Lubricant'}
              </div>

              {/* Grade / Brand badge */}
              <div className="text-[10px] text-slate-600 font-medium">
                {selectedProduct?.brand || 'Premium'} · {selectedProduct?.category || 'Oil'}
              </div>

              {/* Dual Codes: QR Code + Barcode Simulation */}
              <div className="flex items-center justify-center gap-3 my-2 bg-slate-50 p-2 rounded-lg border border-slate-200 w-full">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-16 h-16 object-contain bg-white rounded border border-slate-200"
                  />
                )}

                {/* Simulated 1D Barcode with real text */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="h-10 flex items-center justify-center gap-[2px] w-full px-1">
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 4, 2, 1, 3].map(
                      (w, i) => (
                        <div
                          key={i}
                          className="bg-slate-900 h-9"
                          style={{ width: `${w * 1.2}px` }}
                        />
                      )
                    )}
                  </div>
                  <div className="font-mono text-[10px] font-bold tracking-wider text-slate-800 mt-0.5">
                    {customText}
                  </div>
                </div>
              </div>

              {/* Price & Unit */}
              <div className="w-full flex items-center justify-between border-t border-slate-200 pt-1 text-xs">
                <span className="font-extrabold text-sky-800">
                  {formatCurrency(selectedProduct?.saleRate || 0, currency)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Per {selectedProduct?.baseUnit || 'Bottle'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <span>🖨️ Print Label Sticker</span>
            </button>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`${customText || 'product'}-qr.png`}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1"
              >
                <span>💾 Save QR Image</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
