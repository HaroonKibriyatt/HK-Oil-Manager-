import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useApp } from '../context/AppContext';
import { findProductByBarcode, getAllSales } from '../db/indexedDb';
import { Product, Sale } from '../types';
import { formatCurrency } from '../utils/conversions';
import { safeStorage } from '../utils/safeStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned?: (code: string, product?: Product) => void;
  mode?: 'pos' | 'search' | 'add_product';
}

export const BarcodeScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCodeScanned,
  mode = 'pos',
}) => {
  const { handleScannedCode, setActiveTab, setQuickPosProduct, openInvoiceModal, settings } = useApp();
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scannedInvoice, setScannedInvoice] = useState<Sale | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [codeType, setCodeType] = useState<'BARCODE' | 'QR' | 'UNKNOWN'>('BARCODE');

  // Scanner preferences
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanShape, setScanShape] = useState<'auto' | 'square' | 'wide'>('auto');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerId = 'barcode-reader-container';

  // Sound beep on successful scan
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    } catch (e) {
      // Audio might be blocked if user hasn't interacted yet
    }
  }, []);

  const handleBarcodeIdentified = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode) return;

      playBeep();
      setLastScannedCode(cleanCode);

      // Check if QR code format vs 1D barcode
      const isQr = cleanCode.startsWith('http') || cleanCode.startsWith('SALE-') || cleanCode.includes('{') || cleanCode.length > 25;
      setCodeType(isQr ? 'QR' : 'BARCODE');

      // 1. Check if it's an Invoice Number
      if (cleanCode.startsWith('SALE-')) {
        try {
          const allSales = await getAllSales();
          const foundSale = allSales.find((s) => s.invoiceNumber === cleanCode);
          if (foundSale) {
            setScannedInvoice(foundSale);
            setScannedProduct(null);
            return;
          }
        } catch (e) {}
      }

      // 2. Check if product exists in catalog
      const product = await findProductByBarcode(cleanCode);

      if (product) {
        setScannedProduct(product);
        setScannedInvoice(null);
        if (onCodeScanned) {
          onCodeScanned(cleanCode, product);
        } else {
          handleScannedCode(cleanCode);
        }
      } else {
        setScannedProduct(null);
        setScannedInvoice(null);
        if (onCodeScanned) {
          onCodeScanned(cleanCode);
        }
      }
    },
    [playBeep, onCodeScanned, handleScannedCode]
  );

  // File upload scan (Scan QR / Barcode from gallery or image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      let tempScanner = scannerRef.current;
      if (!tempScanner) {
        tempScanner = new Html5Qrcode(containerId, { verbose: false });
      }

      const decodedResult = await tempScanner.scanFile(file, true);
      if (decodedResult) {
        handleBarcodeIdentified(decodedResult);
      }
    } catch (err: any) {
      console.warn('Image barcode scan error', err);
      setErrorMessage('No valid Barcode or QR code was detected in this image. Please ensure the code is clear.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle not supported on this device', err);
    }
  };

  // Switch Camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    let isMounted = true;
    let localScanner: Html5Qrcode | null = null;

    if (isOpen) {
      setErrorMessage(null);
      setScannedProduct(null);
      setScannedInvoice(null);
      setLastScannedCode(null);
      setManualCode('');

      const startScanner = async () => {
        try {
          const element = document.getElementById(containerId);
          if (!element || !isMounted) return;

          const scanner = new Html5Qrcode(containerId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.CODABAR,
            ],
            verbose: false,
          });

          scannerRef.current = scanner;
          localScanner = scanner;

          const qrboxDims =
            scanShape === 'square'
              ? { width: 230, height: 230 }
              : scanShape === 'wide'
              ? { width: 270, height: 140 }
              : { width: 250, height: 200 };

          await scanner.start(
            { facingMode },
            {
              fps: 16,
              qrbox: qrboxDims,
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (isMounted) {
                handleBarcodeIdentified(decodedText);
              }
            },
            () => {
              // Frame scan failure ignored
            }
          );

          if (isMounted) {
            setIsScanning(true);
            // Check torch capability
            try {
              const capabilities = scanner.getRunningTrackCapabilities();
              if ((capabilities as any)?.torch) {
                setHasTorch(true);
              }
            } catch (e) {}
          }
        } catch (err: any) {
          console.warn('Camera scan initialization failed:', err);
          if (isMounted) {
            setErrorMessage(
              'Camera access was unavailable or denied. You can upload an image from gallery or enter the code manually below.'
            );
          }
        }
      };

      const timer = setTimeout(startScanner, 250);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        setIsScanning(false);
        const toClean = localScanner || scannerRef.current;
        scannerRef.current = null;
        if (toClean) {
          try {
            const state = toClean.getState();
            if (state === 2 || state === 3) {
              toClean
                .stop()
                .then(() => {
                  try {
                    toClean.clear();
                  } catch (e) {}
                })
                .catch(() => {});
            } else {
              try {
                toClean.clear();
              } catch (e) {}
            }
          } catch (e) {}
        }
      };
    } else {
      setIsScanning(false);
      if (scannerRef.current) {
        const toClean = scannerRef.current;
        scannerRef.current = null;
        try {
          const state = toClean.getState();
          if (state === 2 || state === 3) {
            toClean
              .stop()
              .then(() => {
                try {
                  toClean.clear();
                } catch (e) {}
              })
              .catch(() => {});
          } else {
            try {
              toClean.clear();
            } catch (e) {}
          }
        } catch (e) {}
      }
    }
  }, [isOpen, facingMode, scanShape, handleBarcodeIdentified]);

  if (!isOpen) return null;

  const currency = settings?.currencySymbol || 'Rs.';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header with Title and Mode */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              📷
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <span>QR & Barcode Scanner</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold uppercase tracking-wider">
                  Dual Mode
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                1D Barcode & 2D QR Code support
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Camera Controls Bar */}
        <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between text-xs border-b border-slate-800">
          {/* Target Shape Toggle */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setScanShape('auto')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                scanShape === 'auto' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Auto (Both)
            </button>
            <button
              onClick={() => setScanShape('square')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                scanShape === 'square' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              QR Code 🔲
            </button>
            <button
              onClick={() => setScanShape('wide')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                scanShape === 'wide' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Barcode ▌▌
            </button>
          </div>

          {/* Camera Controls */}
          <div className="flex items-center gap-2">
            {/* Gallery Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload QR or Barcode image from gallery"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700"
            >
              <span>🖼️ Gallery</span>
            </button>

            {/* Flip Camera */}
            <button
              onClick={toggleCamera}
              title="Switch Front/Back Camera"
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
            >
              🔄
            </button>

            {/* Torch Toggle (if available) */}
            {hasTorch && (
              <button
                onClick={toggleTorch}
                title="Toggle Torch Light"
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                  isTorchOn ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300'
                }`}
              >
                🔦
              </button>
            )}
          </div>
        </div>

        {/* Viewfinder Canvas */}
        <div className="relative bg-black min-h-[250px] flex items-center justify-center overflow-hidden">
          <div id={containerId} className="w-full h-full min-h-[250px]" />

          {/* Target Reticle Overlay */}
          {isScanning && !errorMessage && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`border-2 border-sky-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all ${
                  scanShape === 'square'
                    ? 'w-56 h-56'
                    : scanShape === 'wide'
                    ? 'w-64 h-32'
                    : 'w-60 h-48'
                }`}
              >
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-sky-400 rounded-tl-sm -mt-0.5 -ml-0.5" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-sky-400 rounded-tr-sm -mt-0.5 -mr-0.5" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-sky-400 rounded-bl-sm -mb-0.5 -ml-0.5" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-sky-400 rounded-br-sm -mb-0.5 -mr-0.5" />
                <div className="w-full h-0.5 bg-sky-400/90 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2.5 text-xl">
                ⚠️
              </div>
              <p className="text-xs font-medium text-slate-300 mb-3 max-w-xs">{errorMessage}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                📁 Select Photo from Phone
              </button>
            </div>
          )}
        </div>

        {/* Scan Results & Actions */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {/* If Product Found */}
          {scannedProduct && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {scannedProduct.imageBase64 ? (
                  <img
                    src={scannedProduct.imageBase64}
                    alt={scannedProduct.name}
                    className="w-12 h-12 object-cover rounded-xl border border-emerald-300 dark:border-emerald-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-200 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs">
                    {scannedProduct.category}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                      {codeType} MATCH
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {scannedProduct.name}
                    </h4>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>
                      Stock: {scannedProduct.currentStock} {scannedProduct.baseUnit}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(scannedProduct.saleRate, currency)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setQuickPosProduct(scannedProduct);
                  setActiveTab('pos');
                  onClose();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap"
              >
                + Add to POS
              </button>
            </div>
          )}

          {/* If Invoice QR Found */}
          {scannedInvoice && (
            <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 font-bold">
                  INVOICE QR DETECTED
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                  Invoice #{scannedInvoice.invoiceNumber}
                </h4>
                <p className="text-xs text-slate-500">
                  {scannedInvoice.customerName} · Total: {formatCurrency(scannedInvoice.grandTotal, currency)}
                </p>
              </div>
              <button
                onClick={() => {
                  openInvoiceModal(scannedInvoice);
                  onClose();
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                View / Print Bill
              </button>
            </div>
          )}

          {/* If Code Scanned but NOT found in DB */}
          {lastScannedCode && !scannedProduct && !scannedInvoice && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-600 text-base">⚠️</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {codeType === 'QR' ? 'QR Code' : 'Barcode'} Not Registered
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Code <span className="font-mono font-semibold">{lastScannedCode}</span> is not yet linked to any product or bill.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setLastScannedCode(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    safeStorage.setItem('prefill_barcode', lastScannedCode);
                    setActiveTab('products');
                    onClose();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
                >
                  + Register This Oil Product
                </button>
              </div>
            </div>
          )}

          {/* Fast Manual Search / Keyboard Entry */}
          <div className="pt-1">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Manual Barcode or QR Text Entry (دستی کوڈ درج کریں)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualCode.trim()) {
                    handleBarcodeIdentified(manualCode.trim());
                  }
                }}
                placeholder="Type or paste Barcode / QR..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualCode.trim()) {
                    handleBarcodeIdentified(manualCode.trim());
                  }
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
              >
                Lookup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
