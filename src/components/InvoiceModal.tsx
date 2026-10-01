import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Sale } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/conversions';
import { generateSaleInvoicePdf } from '../utils/pdfGenerator';
import { shareInvoicePdf, shareViaWhatsApp, printInvoiceDirectly } from '../utils/shareUtils';

interface Props {
  sale: Sale;
  onClose: () => void;
}

export const InvoiceModal: React.FC<Props> = ({ sale, onClose }) => {
  const { settings, showToast } = useApp();
  const [isThermalView, setIsThermalView] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (sale.invoiceNumber) {
      QRCode.toDataURL(sale.invoiceNumber, {
        width: 140,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [sale.invoiceNumber]);

  const handleDownloadPdf = () => {
    try {
      const doc = generateSaleInvoicePdf(sale, settings, isThermalView);
      doc.save(`${sale.invoiceNumber}.pdf`);
      showToast(`Invoice PDF downloaded (${sale.invoiceNumber})`, 'success');
    } catch (e) {
      showToast('Failed to generate PDF document', 'error');
    }
  };

  const handlePrint = () => {
    printInvoiceDirectly(sale, settings, isThermalView);
  };

  const handleShareNative = async () => {
    setIsSharing(true);
    try {
      await shareInvoicePdf(sale, settings, isThermalView);
    } catch (err) {
      showToast('Share failed', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleWhatsApp = () => {
    shareViaWhatsApp(sale, settings);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Invoice {sale.invoiceNumber}
              </h3>
              <p className="text-xs text-slate-500">
                {new Date(sale.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Thermal / A4 switcher */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setIsThermalView(false)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  !isThermalView
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                A4 Bill
              </button>
              <button
                onClick={() => setIsThermalView(true)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isThermalView
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Thermal (80mm)
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Invoice Paper Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60">
          <div
            className={`mx-auto bg-white text-slate-900 shadow-md border border-slate-200 transition-all ${
              isThermalView
                ? 'max-w-xs p-4 rounded-xl font-mono text-xs'
                : 'max-w-xl p-6 sm:p-8 rounded-2xl'
            }`}
          >
            {/* Header info */}
            <div className="text-center pb-4 border-b border-slate-200">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                {settings.businessName}
              </h2>
              {settings.tagline && (
                <p className="text-xs text-slate-500 mt-0.5">{settings.tagline}</p>
              )}
              <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
              <p className="text-xs text-slate-600 font-semibold">
                Phone / WhatsApp: {settings.phone}
              </p>
            </div>

            {/* Bill info */}
            <div className="py-3 border-b border-slate-200 text-xs flex justify-between gap-4">
              <div>
                <span className="text-slate-400 font-medium block">Billed To:</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {sale.customerName}
                </span>
                {sale.customerPhone && (
                  <span className="text-slate-600 block">{sale.customerPhone}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-medium block">Invoice #:</span>
                <span className="font-mono font-bold text-slate-900 block">
                  {sale.invoiceNumber}
                </span>
                <span className="text-slate-500 block">
                  {new Date(sale.createdAt).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 text-left font-semibold">
                    <th className="py-1">Item Description</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="py-1.5">
                      <td className="py-1.5 pr-2">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.selectedUnit} {item.brand ? `· ${item.brand}` : ''}
                        </div>
                      </td>
                      <td className="py-1.5 text-center font-medium">
                        {item.quantity} {item.selectedUnit}
                      </td>
                      <td className="py-1.5 text-right text-slate-600 font-mono">
                        {formatCurrency(item.unitSalePrice, settings.currencySymbol)}
                      </td>
                      <td className="py-1.5 text-right font-bold font-mono text-slate-900">
                        {formatCurrency(item.netTotal, settings.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals */}
            <div className="pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">
                  {formatCurrency(sale.subtotal, settings.currencySymbol)}
                </span>
              </div>

              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">
                    -{formatCurrency(sale.discountTotal, settings.currencySymbol)}
                  </span>
                </div>
              )}

              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({sale.taxRatePercent}%):</span>
                  <span className="font-mono">
                    {formatCurrency(sale.taxAmount, settings.currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono">
                  {formatCurrency(sale.grandTotal, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between text-slate-700 pt-1">
                <span>Amount Paid ({sale.paymentMethod}):</span>
                <span className="font-mono font-medium">
                  {formatCurrency(sale.paidAmount, settings.currencySymbol)}
                </span>
              </div>

              {sale.balanceAmount > 0 ? (
                <div className="flex justify-between text-rose-600 font-bold bg-rose-50 p-2 rounded-lg mt-1">
                  <span>Remaining Balance:</span>
                  <span className="font-mono">
                    {formatCurrency(sale.balanceAmount, settings.currencySymbol)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg mt-1">
                  <span>Payment Status:</span>
                  <span>PAID IN FULL</span>
                </div>
              )}
            </div>

            {/* Invoice QR Code for instant warranty & verification */}
            {qrCodeUrl && (
              <div className="mt-4 pt-3 border-t border-dashed border-slate-200 flex flex-col items-center justify-center">
                <img
                  src={qrCodeUrl}
                  alt={`Invoice ${sale.invoiceNumber} QR`}
                  className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1"
                />
                <span className="text-[10px] font-mono text-slate-500 mt-1">
                  Scan to verify Bill #{sale.invoiceNumber}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-slate-200 text-center text-[11px] text-slate-500">
              <p className="italic">{settings?.invoiceFooterNote}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* PDF Download */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            <span>📄</span>
            <span>Download PDF</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            <span>🖨️</span>
            <span>Print Bill</span>
          </button>

          {/* WhatsApp Direct Share (PRD Section 20) */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <span>💬</span>
            <span>WhatsApp</span>
          </button>

          {/* Android Web Share */}
          <button
            onClick={handleShareNative}
            disabled={isSharing}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <span>📤</span>
            <span>{isSharing ? 'Sharing...' : 'Share PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
