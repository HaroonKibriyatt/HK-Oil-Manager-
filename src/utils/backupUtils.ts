import { exportDatabaseBackup } from '../db/indexedDb';
import { BusinessSettings } from '../types';

export interface BackupPackage {
  fileName: string;
  jsonContent: string;
  sizeKb: string;
  file: File;
  stats: {
    productsCount: number;
    salesCount: number;
    customersCount: number;
    suppliersCount: number;
    expensesCount: number;
  };
}

/**
 * Generate full database export package with metadata and file object
 */
export async function createFullBackupPackage(): Promise<BackupPackage> {
  const jsonContent = await exportDatabaseBackup();
  const parsed = JSON.parse(jsonContent);

  const productsCount = parsed.products?.length || 0;
  const salesCount = parsed.sales?.length || 0;
  const customersCount = parsed.customers?.length || 0;
  const suppliersCount = parsed.suppliers?.length || 0;
  const expensesCount = parsed.expenses?.length || 0;

  const now = new Date();
  const dateFormatted = now.toISOString().split('T')[0];
  const timeFormatted = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
  const fileName = `HK_OIL_MANAGER_Backup_${dateFormatted}_${timeFormatted}.json`;

  const blob = new Blob([jsonContent], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });
  const sizeKb = (blob.size / 1024).toFixed(1) + ' KB';

  return {
    fileName,
    jsonContent,
    sizeKb,
    file,
    stats: {
      productsCount,
      salesCount,
      customersCount,
      suppliersCount,
      expensesCount,
    },
  };
}

/**
 * Send full backup to user's Gmail ID (like WhatsApp chat/database backup)
 */
export async function sendBackupToGmail(
  gmailId: string,
  settings: BusinessSettings
): Promise<{ success: boolean; method: 'native_share' | 'gmail_mailto' }> {
  const pkg = await createFullBackupPackage();
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `[BACKUP] HK Oil Manager Database Record - ${dateStr}`;
  const emailBody = `HK OIL MANAGER - COMPLETE DATABASE BACKUP\n` +
    `===============================================\n` +
    `Business: ${settings.businessName}\n` +
    `Backup Date: ${dateStr}\n` +
    `Backup File: ${pkg.fileName} (${pkg.sizeKb})\n\n` +
    `DATABASE RECORDS SUMMARY:\n` +
    `-----------------------------------------------\n` +
    `• Products in Catalog: ${pkg.stats.productsCount}\n` +
    `• Total Sales / Invoices: ${pkg.stats.salesCount}\n` +
    `• Registered Customers: ${pkg.stats.customersCount}\n` +
    `• Suppliers & Accounts: ${pkg.stats.suppliersCount}\n` +
    `• Recorded Expenses: ${pkg.stats.expensesCount}\n\n` +
    `HOW TO RESTORE ON ANY PHONE OR DEVICE:\n` +
    `1. Download the attached backup JSON file from this email.\n` +
    `2. Open HK Oil Manager app -> Go to Settings -> Backup & Restore.\n` +
    `3. Tap "Restore from Backup" and select this file.\n\n` +
    `Generated securely by HK OIL MANAGER.`;

  // On Android phones or mobile browsers supporting file sharing:
  if (navigator.canShare && navigator.canShare({ files: [pkg.file] })) {
    try {
      await navigator.share({
        title: subject,
        text: emailBody,
        files: [pkg.file],
      });
      return { success: true, method: 'native_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') return { success: false, method: 'native_share' };
      console.warn('Native share failed, using Gmail web/mailto fallback', err);
    }
  }

  // Fallback: Trigger download of backup file so user has it immediately
  const downloadUrl = URL.createObjectURL(pkg.file);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = pkg.fileName;
  a.click();
  URL.revokeObjectURL(downloadUrl);

  // Open Gmail web compose or mailto
  const targetEmail = gmailId.trim() || settings.email || 'haroonkibriyatt@gmail.com';
  const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  
  // Try opening mailto
  window.open(mailtoUrl, '_blank');

  return { success: true, method: 'gmail_mailto' };
}
