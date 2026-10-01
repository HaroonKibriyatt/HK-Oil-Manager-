import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessSettings } from '../types';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  clearAllDatabaseData,
  seedInitialDemoData,
} from '../db/indexedDb';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetToCleanData, refreshAllData, showToast } = useApp();

  // Local state for editing profile
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [phone, setPhone] = useState(settings.phone);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
  const [address, setAddress] = useState(settings.address);
  const [email, setEmail] = useState(settings.email);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [purchasePrefix, setPurchasePrefix] = useState(settings.purchasePrefix);
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(settings.invoiceFooterNote);
  const [taxEnabled, setTaxEnabled] = useState(settings.taxEnabled);
  const [taxRatePercent, setTaxRatePercent] = useState(settings.taxRatePercent);
  const [allowNegativeStock, setAllowNegativeStock] = useState(settings.allowNegativeStock);
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState(
    settings.defaultLowStockThreshold
  );

  // Weekend Payment Alert
  const [weekendAlertDay, setWeekendAlertDay] = useState(settings.weekendAlertDay || 'Saturday');
  const [weekendAlertEnabled, setWeekendAlertEnabled] = useState(
    settings.weekendAlertEnabled !== false
  );

  // PIN settings
  const [isPinAuthEnabled, setIsPinAuthEnabled] = useState(settings.isPinAuthEnabled);
  const [newPin, setNewPin] = useState(settings.pinCode);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        businessName,
        tagline,
        phone,
        whatsapp,
        address,
        email,
        currencySymbol,
        invoicePrefix,
        purchasePrefix,
        invoiceFooterNote,
        taxEnabled,
        taxRatePercent,
        allowNegativeStock,
        defaultLowStockThreshold,
        weekendAlertDay,
        weekendAlertEnabled,
        isPinAuthEnabled,
        pinCode: newPin,
      });
      showToast('Settings saved successfully! (ترتیبات محفوظ ہو گئیں)', 'success');
    } catch (err: any) {
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Full Database Backup Export (PRD Section 34)
  const handleExportBackup = async () => {
    try {
      const jsonBackup = await exportDatabaseBackup();
      const blob = new Blob([jsonBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LubeFlowPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Database backup downloaded successfully', 'success');
    } catch (e) {
      showToast('Backup export failed', 'error');
    }
  };

  // Restore Database Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (
        window.confirm(
          'Restoring this backup will replace current local database records with the backup file data. Continue?'
        )
      ) {
        try {
          await importDatabaseBackup(content);
          showToast('Database restored successfully!', 'success');
          await refreshAllData();
        } catch (err: any) {
          showToast(err.message || 'Failed to restore backup', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  // Reset to Demo Data
  const handleResetDemoData = async () => {
    if (
      window.confirm(
        'Reset to initial sample demo data? Any existing custom records will be replaced.'
      )
    ) {
      await clearAllDatabaseData();
      await seedInitialDemoData();
      await refreshAllData();
      showToast('Demo data reloaded successfully', 'success');
    }
  };

  // Clear All Data
  const handleClearAllData = async () => {
    if (
      window.confirm(
        '⚠️ DANGER: This will permanently delete ALL products, sales, purchases, customers, and history. Are you sure?'
      )
    ) {
      await clearAllDatabaseData();
      await refreshAllData();
      showToast('Database cleared. Clean slate ready.', 'info');
    }
  };

  return (
    <div className="pb-28 max-w-4xl mx-auto px-4 sm:px-6 pt-3 animate-in fade-in duration-150 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          System & Business Settings
        </h2>
        <p className="text-xs text-slate-500">
          Configure shop identity, receipt format, currency, security PIN, and database backup
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Business Profile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Business / Shop Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Shop / Company Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Number (for direct sharing)
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Physical Shop Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="Rs."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="SALE-"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Footer Note (Printed on Bill & WhatsApp)
              </label>
              <input
                type="text"
                value={invoiceFooterNote}
                onChange={(e) => setInvoiceFooterNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Weekend Payment Alert Day Configuration */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-lg">🚨</span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              2. Weekend Payment & Due Alert (ہفتہ وار ادھار وصولی الرٹ)
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={weekendAlertEnabled}
                onChange={(e) => setWeekendAlertEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Enable Weekend Payment Due Alert (ہفتہ وار ادائیگی و وصولی الرٹ فعال کریں)
              </span>
            </label>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Alert Day / ویک اینڈ کا دن منتخب کریں:
              </label>
              <select
                value={weekendAlertDay}
                onChange={(e) => setWeekendAlertDay(e.target.value)}
                className="max-w-xs w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
              >
                <option value="Saturday">ہفتہ (Saturday)</option>
                <option value="Sunday">اتوار (Sunday)</option>
                <option value="Friday">جمعہ (Friday)</option>
                <option value="Thursday">جمعرات (Thursday)</option>
                <option value="Monday">پیر (Monday)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                اس مقررہ دن پر ڈیش بورڈ پر تمام گاہکوں سے رقم وصول کرنے اور سپلائرز کو ادائیگی کا الرٹ شو ہو گا۔
              </p>
            </div>
          </div>
        </div>

        {/* Security & PIN Setup (PRD Section 3) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            3. Security & PIN Lock
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinAuthEnabled}
                onChange={(e) => setIsPinAuthEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Enable App Security PIN Lock
              </span>
            </label>

            {isPinAuthEnabled && (
              <div className="max-w-xs pt-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Master Security PIN (4 digits)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-lg font-bold"
                />
              </div>
            )}
          </div>
        </div>

        {/* Inventory Rules */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            3. Inventory & Stock Controls
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Allow Negative Stock Billing (Sell even if recorded stock is 0)
              </span>
            </label>

            <div className="max-w-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Minimum Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={defaultLowStockThreshold}
                onChange={(e) => setDefaultLowStockThreshold(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
          >
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Database Backup & Restore (PRD Section 34) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            4. Offline Database Backup & Restore
          </h3>
          <p className="text-xs text-slate-500">
            Export a full encrypted backup of all your products, sales, customers, and stock history.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                Download Database Backup File
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Save an offline JSON snapshot file to your phone or Google Drive.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>💾</span>
              <span>Backup Database Now</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                Restore From Backup File
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Select a previously saved .json backup file to restore.
              </p>
            </div>
            <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <span>📂</span>
              <span>Choose Backup File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Demo Data & Danger Area */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleResetDemoData}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold underline"
          >
            Reset Demo Oil & Filter Data
          </button>

          <button
            type="button"
            onClick={handleClearAllData}
            className="text-rose-600 hover:text-rose-700 font-bold"
          >
            Clear Entire Database (Production Reset)
          </button>
        </div>
      </div>
    </div>
  );
};
