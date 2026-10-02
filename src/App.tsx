import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './components/LoginScreen';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { BarcodeGeneratorModal } from './components/BarcodeGeneratorModal';
import { InvoiceModal } from './components/InvoiceModal';

import { DashboardView } from './views/DashboardView';
import { PosSalesView } from './views/PosSalesView';
import { ProductsView } from './views/ProductsView';
import { StockView } from './views/StockView';
import { PurchasesView } from './views/PurchasesView';
import { CustomersView } from './views/CustomersView';
import { SuppliersView } from './views/SuppliersView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsView } from './views/ReportsView';
import { DailyClosingView } from './views/DailyClosingView';
import { SettingsView } from './views/SettingsView';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    isLocked,
    isScannerOpen,
    closeBarcodeScanner,
    handleScannedCode,
    isGeneratorOpen,
    generatorProduct,
    closeBarcodeGenerator,
    selectedInvoice,
    closeInvoiceModal,
  } = useApp();

  if (isLocked) {
    return <LoginScreen />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <PosSalesView />;
      case 'products':
        return <ProductsView />;
      case 'stock':
        return <StockView />;
      case 'purchases':
        return <PurchasesView />;
      case 'customers':
        return <CustomersView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'expenses':
        return <ExpensesView />;
      case 'reports':
        return <ReportsView />;
      case 'closing':
        return <DailyClosingView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main View Router */}
      <main className="flex-1 w-full">{renderActiveView()}</main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Barcode Camera Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={closeBarcodeScanner}
          onCodeScanned={handleScannedCode}
        />
      )}

      {/* Barcode & QR Label Generator Modal */}
      {isGeneratorOpen && (
        <BarcodeGeneratorModal
          isOpen={isGeneratorOpen}
          onClose={closeBarcodeGenerator}
          initialProduct={generatorProduct}
        />
      )}

      {/* Invoice Viewer, Print & WhatsApp Sharing Modal */}
      {selectedInvoice && (
        <InvoiceModal sale={selectedInvoice} onClose={closeInvoiceModal} />
      )}
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
