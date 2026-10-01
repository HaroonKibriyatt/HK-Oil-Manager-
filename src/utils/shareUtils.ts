import { Sale, BusinessSettings } from '../types';
import { generateSaleInvoicePdf } from './pdfGenerator';
import { formatCurrency } from './conversions';

/**
 * Format invoice into a clean, professional WhatsApp text message
 */
export function formatWhatsAppInvoiceText(sale: Sale, settings: BusinessSettings): string {
  const lines: string[] = [];
  lines.push(`*${settings.businessName.toUpperCase()}*`);
  if (settings.tagline) lines.push(`_${settings.tagline}_`);
  lines.push(`📞 ${settings.phone} | 📍 ${settings.address}`);
  lines.push(`----------------------------------`);
  lines.push(`*SALE INVOICE: ${sale.invoiceNumber}*`);
  lines.push(`Customer: ${sale.customerName}`);
  lines.push(`Date: ${new Date(sale.createdAt).toLocaleDateString('en-GB')} ${new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  lines.push(`----------------------------------`);
  lines.push(`*ITEMS PURCHASED:*`);

  sale.items.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. *${item.productName}*\n   ${item.quantity} ${item.selectedUnit} × ${formatCurrency(item.unitSalePrice, settings.currencySymbol)} = ${formatCurrency(item.netTotal, settings.currencySymbol)}`
    );
  });

  lines.push(`----------------------------------`);
  lines.push(`Subtotal: ${formatCurrency(sale.subtotal, settings.currencySymbol)}`);
  if (sale.discountTotal > 0) {
    lines.push(`Discount: -${formatCurrency(sale.discountTotal, settings.currencySymbol)}`);
  }
  if (sale.taxAmount > 0) {
    lines.push(`Tax (${sale.taxRatePercent}%): ${formatCurrency(sale.taxAmount, settings.currencySymbol)}`);
  }
  lines.push(`*GRAND TOTAL: ${formatCurrency(sale.grandTotal, settings.currencySymbol)}*`);
  lines.push(`Paid Amount: ${formatCurrency(sale.paidAmount, settings.currencySymbol)} (${sale.paymentMethod})`);

  if (sale.balanceAmount > 0) {
    lines.push(`*⚠️ REMAINING BALANCE: ${formatCurrency(sale.balanceAmount, settings.currencySymbol)}*`);
  } else {
    lines.push(`*✅ STATUS: PAID IN FULL*`);
  }

  lines.push(`----------------------------------`);
  lines.push(`_${settings.invoiceFooterNote}_`);

  return lines.join('\n');
}

/**
 * Open WhatsApp with prefilled message to customer's phone or general share
 */
export function shareViaWhatsApp(sale: Sale, settings: BusinessSettings) {
  const text = formatWhatsAppInvoiceText(sale, settings);
  const encodedText = encodeURIComponent(text);

  let cleanPhone = sale.customerPhone ? sale.customerPhone.replace(/[^0-9]/g, '') : '';
  // If pakistani local format 0300... convert to 92300...
  if (cleanPhone.startsWith('03')) {
    cleanPhone = '92' + cleanPhone.substring(1);
  }

  if (cleanPhone.length >= 10) {
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  } else {
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  }
}

/**
 * Native Android Web Share with PDF File or Text Fallback
 */
export async function shareInvoicePdf(sale: Sale, settings: BusinessSettings, isThermal = false): Promise<boolean> {
  const doc = generateSaleInvoicePdf(sale, settings, isThermal);
  const pdfBlob = doc.output('blob');
  const fileName = `${sale.invoiceNumber}.pdf`;
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
  const text = formatWhatsAppInvoiceText(sale, settings);

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Invoice ${sale.invoiceNumber} - ${settings.businessName}`,
        text: `Invoice #${sale.invoiceNumber} for ${sale.customerName}. Total: ${formatCurrency(sale.grandTotal, settings.currencySymbol)}`,
        files: [file],
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      console.warn('Native file share failed, trying text share', err);
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Invoice ${sale.invoiceNumber}`,
        text,
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
    }
  }

  // Fallback to WhatsApp URL
  shareViaWhatsApp(sale, settings);
  return true;
}

/**
 * Trigger print dialog directly from generated PDF
 */
export function printInvoiceDirectly(sale: Sale, settings: BusinessSettings, isThermal = false) {
  const doc = generateSaleInvoicePdf(sale, settings, isThermal);
  const blobUrl = doc.output('bloburl');

  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  printFrame.src = blobUrl.toString();

  document.body.appendChild(printFrame);

  printFrame.onload = () => {
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        window.open(blobUrl.toString(), '_blank');
      }
    }, 400);
  };
}
