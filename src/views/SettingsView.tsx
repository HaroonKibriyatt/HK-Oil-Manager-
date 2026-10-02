import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessSettings } from '../types';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  clearAllDatabaseData,
  seedInitialDemoData,
} from '../db/indexedDb';
import { sendBackupToGmail, createFullBackupPackage } from '../utils/backupUtils';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetToCleanData, refreshAllData, showToast } = useApp();

  // Local state for editing profile
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [phone, setPhone] = useState(settings.phone);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
  const [address, setAddress] = useState(settings.address);
  const [email, setEmail] = useState(settings.email);
  const [backupGmailId, setBackupGmailId] = useState(
    settings.backupGmailId || settings.email || 'haroonkibriyatt@gmail.com'
  );
  const [isBackingUp, setIsBackingUp] = useState(false);
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
        backupGmailId,
        isPinAuthEnabled,
        pinCode: newPin,
      });
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // WhatsApp-Style Full Database Backup to Gmail ID
  const handleBackupToGmail = async () => {
    setIsBackingUp(true);
    try {
      const res = await sendBackupToGmail(backupGmailId, settings);
      const pkg = await createFullBackupPackage();
      const now = new Date().toISOString();
      await updateSettings({
        backupGmailId,
        lastBackupDate: now,
        lastBackupSize: pkg.sizeKb,
      });
      if (res.method === 'native_share') {
        showToast('Choose Gmail or Google Drive to complete backup save', 'info');
      } else {
        showToast(`Backup downloaded & Gmail pre-addressed to ${backupGmailId}!`, 'success');
      }
    } catch (err: any) {
      showToast('Backup to Gmail failed', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Save Backup to Google Drive
  const handleSaveToGoogleDrive = async () => {
    try {
      const pkg = await createFullBackupPackage();
      const blob = new Blob([pkg.jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pkg.fileName;
      a.click();
      URL.revokeObjectURL(url);
      window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
      showToast('Backup file downloaded! Open Google Drive to upload and keep safe.', 'success');
    } catch (err) {
      showToast('Could not prepare Google Drive backup', 'error');
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
      a.download = `HK_OIL_MANAGER_Backup_${new Date().toISOString().split('T')[0]}.json`;
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
      try {
        await importDatabaseBackup(content);
        showToast('Database restored successfully!', 'success');
        await refreshAllData();
      } catch (err: any) {
        showToast(err.message || 'Failed to restore backup', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Reset to Demo Data
  const handleResetDemoData = async () => {
    await clearAllDatabaseData();
    await seedInitialDemoData();
    await refreshAllData();
    showToast('Data refreshed successfully', 'success');
  };

  // Clear All Data
  const handleClearAllData = async () => {
    await resetToCleanData();
    setShowClearConfirm(false);
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
              2. Weekend Payment & Due Clearance Alert
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
                Enable Weekend Payment Due Alert
              </span>
            </label>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Alert Day:
              </label>
              <select
                value={weekendAlertDay}
                onChange={(e) => setWeekendAlertDay(e.target.value)}
                className="max-w-xs w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
              >
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
                <option value="Friday">Friday</option>
                <option value="Thursday">Thursday</option>
                <option value="Monday">Monday</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                On this day, the dashboard will highlight pending customer receivables and supplier payables.
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

      {/* Google Account & WhatsApp-Style Gmail Cloud Backup */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">☁️</span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                4. Google Account (Gmail) & Cloud Backup
              </h3>
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                WhatsApp Style
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Back up all your business products, stock, sales, expenses, and closings to your Google Account / Gmail ID.
            </p>
          </div>
        </div>

        {/* WhatsApp-Style Backup Info Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl shadow-md shadow-emerald-600/20 shrink-0">
                <span>📧</span>
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Google Account / Gmail ID
                </span>
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate block">
                  {backupGmailId}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right flex flex-row sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-500/10">
              <span className="text-[11px] text-slate-500 block">Last Backup:</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {settings.lastBackupDate
                  ? new Date(settings.lastBackupDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Never'}
              </span>
              {settings.lastBackupSize && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  Size: {settings.lastBackupSize}
                </span>
              )}
            </div>
          </div>

          {/* Gmail Input Configuration */}
          <div className="pt-2 border-t border-emerald-500/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Backup Gmail Address:
            </label>
            <input
              type="email"
              value={backupGmailId}
              onChange={(e) => setBackupGmailId(e.target.value)}
              placeholder="e.g. haroonkibriyatt@gmail.com"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Primary Action Button: Backup to Gmail ID Now */}
          <button
            type="button"
            onClick={handleBackupToGmail}
            disabled={isBackingUp}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isBackingUp ? '⏳' : '☁️'}</span>
            <span>{isBackingUp ? 'Preparing Backup...' : 'Back Up to Gmail ID Now'}</span>
            <span className="bg-emerald-950/40 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Full Record
            </span>
          </button>
        </div>

        {/* Secondary Backup & Restore Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Save to Google Drive */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2.5">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>📁</span> Google Drive
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download file & upload directly to your Google Drive account.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveToGoogleDrive}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Save to Drive
            </button>
          </div>

          {/* Offline JSON Download */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2.5">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>💾</span> Download JSON
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Save an offline JSON snapshot file to this device's storage.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Download File
            </button>
          </div>

          {/* Restore From Backup */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2.5">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>📂</span> Restore Backup
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload any previous backup JSON file to restore all records.
              </p>
            </div>
            <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer text-center">
              <span>Choose File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Danger Area & Clean Start */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-500 text-[11px]">
            Permanently erase all local records to start with a fresh clean database.
          </p>

          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl font-bold border border-rose-200 dark:border-rose-900 transition-colors"
            >
              🗑️ Clear Entire Database (Clean Reset)
            </button>
          ) : (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="font-bold text-rose-600">Are you sure you want to delete all data?</span>
              <button
                type="button"
                onClick={handleClearAllData}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold shadow-sm"
              >
                Yes, Delete All
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
