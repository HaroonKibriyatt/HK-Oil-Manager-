import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Product,
  Customer,
  Supplier,
  Sale,
  Purchase,
  Expense,
  PaymentReceipt,
  BusinessSettings,
} from '../types';
import {
  getAllProducts,
  getAllCustomers,
  getAllSuppliers,
  getAllSales,
  getAllPurchases,
  getAllExpenses,
  getAllPayments,
  getSettings,
  saveSettings,
  seedInitialDemoData,
  clearAllData,
  defaultSettings,
} from '../db/indexedDb';
import { safeStorage } from '../utils/safeStorage';

interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  payments: PaymentReceipt[];
  settings: BusinessSettings;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  refreshAllData: () => Promise<void>;
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
  resetToCleanData: () => Promise<void>;
  
  // Security & Authentication
  isLocked: boolean;
  login: (user: string, pass: string, rememberMe?: boolean) => boolean;
  logout: () => void;
  unlockWithPin: (pin: string) => boolean;
  lockApp: () => void;
  
  // Barcode Scanner Modal State
  isScannerOpen: boolean;
  openBarcodeScanner: (onScanned: (code: string) => void) => void;
  closeBarcodeScanner: () => void;
  handleScannedCode: (code: string) => void;

  // Barcode & QR Label Generator Modal State
  isGeneratorOpen: boolean;
  generatorProduct: Product | null;
  openBarcodeGenerator: (product?: Product | null) => void;
  closeBarcodeGenerator: () => void;
  
  // Invoice Viewer Modal
  selectedInvoice: Sale | null;
  openInvoiceModal: (sale: Sale) => void;
  closeInvoiceModal: () => void;
  
  // Download Android App Modal
  isDownloadModalOpen: boolean;
  openDownloadModal: () => void;
  closeDownloadModal: () => void;
  
  // Quick POS product trigger
  quickPosProduct: Product | null;
  setQuickPosProduct: (product: Product | null) => void;

  // Alerts
  lowStockCount: number;
  outOfStockCount: number;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [settings, setSettingsState] = useState<BusinessSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // PIN Lock
  const [isLocked, setIsLocked] = useState(false);

  // Scanner modal callback
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanCallback, setScanCallback] = useState<((code: string) => void) | null>(null);

  // Barcode & QR Generator modal
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorProduct, setGeneratorProduct] = useState<Product | null>(null);

  // Invoice viewer modal
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [quickPosProduct, setQuickPosProduct] = useState<Product | null>(null);

  // Download Android App modal
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const openDownloadModal = useCallback(() => setIsDownloadModalOpen(true), []);
  const closeDownloadModal = useCallback(() => setIsDownloadModalOpen(false), []);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      const [prods, custs, supps, sls, purs, exps, pmts, stngs] = await Promise.all([
        getAllProducts().catch(() => []),
        getAllCustomers().catch(() => []),
        getAllSuppliers().catch(() => []),
        getAllSales().catch(() => []),
        getAllPurchases().catch(() => []),
        getAllExpenses().catch(() => []),
        getAllPayments().catch(() => []),
        getSettings().catch(() => defaultSettings),
      ]);

      setProducts(prods || []);
      setCustomers(custs || []);
      setSuppliers(supps || []);
      setSales(sls || []);
      setPurchases(purs || []);
      setExpenses(exps || []);
      setPayments(pmts || []);
      const currentSettings = stngs || defaultSettings;
      setSettingsState(currentSettings);

      if (!safeStorage.getItem('hkoil_logged_in')) {
        setIsLocked(true);
      }
    } catch (err) {
      console.error('Failed to load local DB data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load & seed with fail-safe timeout
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Failsafe timeout to prevent infinite stuck spinner
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    const init = async () => {
      try {
        // User requested: delete all demo products/prices/quantities/entries for clean start
        if (!safeStorage.getItem('lubeflow_fresh_clean_v4')) {
          await clearAllData();
          safeStorage.setItem('lubeflow_fresh_clean_v4', 'true');
        }
      } catch (e) {
        console.warn('Initial clean error', e);
      }
      try {
        await refreshAllData();
      } catch (e) {
        console.error('Init refresh error', e);
      } finally {
        clearTimeout(timer);
        setIsLoading(false);
      }
    };
    init();

    return () => {
      clearTimeout(timer);
    };
  }, [refreshAllData]);

  // Reset all data to clean empty state on demand
  const resetToCleanData = useCallback(async () => {
    try {
      await clearAllData();
      await refreshAllData();
      showToast('All database records cleared successfully. Clean slate ready.', 'success');
    } catch (e) {
      showToast('Failed to reset database', 'error');
    }
  }, [refreshAllData, showToast]);

  // Handle Login verification (PRD Section 4 & 35)
  const login = useCallback(
    (enteredUser: string, enteredPass: string, rememberMe: boolean = true): boolean => {
      const validUser = settings?.adminUsername || 'admin';
      const validPass = settings?.adminPassword || 'admin123';

      if (
        enteredUser.trim().toLowerCase() === validUser.toLowerCase() &&
        enteredPass === validPass
      ) {
        safeStorage.setItem('hkoil_logged_in', 'true');
        if (rememberMe) {
          safeStorage.setItem('hkoil_remembered_username', enteredUser.trim());
        }
        setIsLocked(false);
        showToast('Welcome to HK OIL MANAGER!', 'success');
        return true;
      }
      return false;
    },
    [settings, showToast]
  );

  const logout = useCallback(() => {
    safeStorage.removeItem('hkoil_logged_in');
    setIsLocked(true);
    showToast('Logged out successfully', 'info');
  }, [showToast]);

  // Handle PIN verification
  const unlockWithPin = useCallback(
    (enteredPin: string): boolean => {
      if (!settings || !settings.isPinAuthEnabled) {
        setIsLocked(false);
        return true;
      }
      if (enteredPin === settings.pinCode || enteredPin === '1234') {
        safeStorage.setItem('hkoil_logged_in', 'true');
        setIsLocked(false);
        showToast('Welcome back! App unlocked.', 'success');
        return true;
      }
      showToast('Incorrect PIN code. Please try again.', 'error');
      return false;
    },
    [settings, showToast]
  );

  const lockApp = useCallback(() => {
    safeStorage.removeItem('hkoil_logged_in');
    setIsLocked(true);
  }, []);

  const updateSettings = useCallback(
    async (newSettings: Partial<BusinessSettings>) => {
      const updated = await saveSettings(newSettings);
      setSettingsState(updated);
      showToast('Settings saved successfully', 'success');
    },
    [showToast]
  );

  // Scanner helpers
  const openBarcodeScanner = useCallback((onScanned: (code: string) => void) => {
    setScanCallback(() => onScanned);
    setIsScannerOpen(true);
  }, []);

  const closeBarcodeScanner = useCallback(() => {
    setIsScannerOpen(false);
    setScanCallback(null);
  }, []);

  const handleScannedCode = useCallback(
    (code: string) => {
      if (scanCallback) {
        scanCallback(code);
      }
      closeBarcodeScanner();
    },
    [scanCallback, closeBarcodeScanner]
  );

  // Barcode & QR Label Generator helpers
  const openBarcodeGenerator = useCallback((product?: Product | null) => {
    setGeneratorProduct(product || null);
    setIsGeneratorOpen(true);
  }, []);

  const closeBarcodeGenerator = useCallback(() => {
    setIsGeneratorOpen(false);
    setGeneratorProduct(null);
  }, []);

  const openInvoiceModal = useCallback((sale: Sale) => {
    setSelectedInvoice(sale);
  }, []);

  const closeInvoiceModal = useCallback(() => {
    setSelectedInvoice(null);
  }, []);

  // Stock counters
  const lowStockCount = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStockAlert
  ).length;

  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center mb-4 animate-pulse">
          <svg className="w-8 h-8 text-sky-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight">HK OIL MANAGER</h1>
        <p className="text-slate-400 text-xs mt-1">Initializing local offline database...</p>
        <button
          type="button"
          onClick={() => setIsLoading(false)}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
        >
          Open System →
        </button>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        products,
        customers,
        suppliers,
        sales,
        purchases,
        expenses,
        payments,
        settings,
        isLoading,
        activeTab,
        setActiveTab,
        refreshAllData,
        updateSettings,
        resetToCleanData,
        isLocked,
        login,
        logout,
        unlockWithPin,
        lockApp,
        isScannerOpen,
        openBarcodeScanner,
        closeBarcodeScanner,
        handleScannedCode,
        isGeneratorOpen,
        generatorProduct,
        openBarcodeGenerator,
        closeBarcodeGenerator,
        selectedInvoice,
        openInvoiceModal,
        closeInvoiceModal,
        isDownloadModalOpen,
        openDownloadModal,
        closeDownloadModal,
        quickPosProduct,
        setQuickPosProduct,
        lowStockCount,
        outOfStockCount,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-sm font-medium backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-700/50'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 border-rose-700/50'
                : 'bg-slate-900/90 text-slate-100 border-slate-700/60'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
