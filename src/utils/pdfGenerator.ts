import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Sale, Purchase, Product, BusinessSettings, DailyClosing, Customer, Supplier } from '../types';
import { formatCurrency, formatStockInUnits, roundToTwo } from './conversions';

/**
 * Generate high-quality A4 or Thermal Customer Sale Invoice PDF with embedded QR Code
 */
export function generateSaleInvoicePdf(
  sale: Sale,
  settings: BusinessSettings,
  isThermal = false,
  qrCodeDataUrl?: string
): jsPDF {
  if (isThermal) {
    // 80mm roll receipt: 80mm width x dynamic height
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 210 + sale.items.length * 15 + (qrCodeDataUrl ? 35 : 0)],
    });

    let y = 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(settings.businessName, 40, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (settings.tagline) {
      doc.text(settings.tagline, 40, y, { align: 'center' });
      y += 4;
    }
    doc.text(settings.address, 40, y, { align: 'center', maxWidth: 70 });
    y += 6;
    doc.text(`Tel / WA: ${settings.phone}`, 40, y, { align: 'center' });
    y += 5;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y, 75, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`INVOICE: ${sale.invoiceNumber}`, 5, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const dateFormatted = new Date(sale.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(dateFormatted, 75, y, { align: 'right' });
    y += 5;

    doc.text(`Customer: ${sale.customerName}`, 5, y);
    y += 4;
    if (sale.customerPhone) {
      doc.text(`Phone: ${sale.customerPhone}`, 5, y);
      y += 4;
    }

    doc.line(5, y, 75, y);
    y += 2;

    const tableRows = sale.items.map((item) => [
      `${item.productName}\n(${item.quantity} ${item.selectedUnit} @ ${item.unitSalePrice})`,
      formatCurrency(item.netTotal, settings.currencySymbol),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: 5, right: 5 },
      body: tableRows,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
      theme: 'plain',
    });

    const finalY = (doc as any).lastAutoTable.finalY + 4;
    doc.line(5, finalY, 75, finalY);

    let summaryY = finalY + 5;
    doc.setFontSize(8);
    doc.text('Subtotal:', 5, summaryY);
    doc.text(formatCurrency(sale.subtotal, settings.currencySymbol), 75, summaryY, { align: 'right' });
    summaryY += 4;

    if (sale.discountTotal > 0) {
      doc.text('Discount:', 5, summaryY);
      doc.text(`-${formatCurrency(sale.discountTotal, settings.currencySymbol)}`, 75, summaryY, { align: 'right' });
      summaryY += 4;
    }

    if (sale.taxAmount > 0) {
      doc.text(`Tax (${sale.taxRatePercent}%):`, 5, summaryY);
      doc.text(formatCurrency(sale.taxAmount, settings.currencySymbol), 75, summaryY, { align: 'right' });
      summaryY += 4;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('GRAND TOTAL:', 5, summaryY);
    doc.text(formatCurrency(sale.grandTotal, settings.currencySymbol), 75, summaryY, { align: 'right' });
    summaryY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Paid (${sale.paymentMethod}):`, 5, summaryY);
    doc.text(formatCurrency(sale.paidAmount, settings.currencySymbol), 75, summaryY, { align: 'right' });
    summaryY += 4;

    if (sale.balanceAmount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 0, 0);
      doc.text('Balance Due:', 5, summaryY);
      doc.text(formatCurrency(sale.balanceAmount, settings.currencySymbol), 75, summaryY, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      summaryY += 5;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 130, 0);
      doc.text('Payment Status:', 5, summaryY);
      doc.text('PAID IN FULL', 75, summaryY, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      summaryY += 5;
    }

    if (qrCodeDataUrl) {
      try {
        doc.addImage(qrCodeDataUrl, 'PNG', 26, summaryY, 28, 28);
        summaryY += 30;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Scan to verify Bill #${sale.invoiceNumber}`, 40, summaryY, { align: 'center' });
        summaryY += 5;
      } catch (e) {
        console.warn('Could not render QR code in thermal receipt', e);
      }
    }

    doc.line(5, summaryY, 75, summaryY);
    summaryY += 5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text(settings.invoiceFooterNote, 40, summaryY, { align: 'center', maxWidth: 70 });

    return doc;
  }

  // Standard Commercial A4 Document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  // Business Name & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.businessName, 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  if (settings.tagline) {
    doc.text(settings.tagline, 14, 21);
  }
  doc.text(`${settings.address} | Ph: ${settings.phone}`, 14, 27);

  // Invoice Title Right side
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SALE INVOICE', 196, 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  doc.text(`# ${sale.invoiceNumber}`, 196, 24, { align: 'right' });

  // Bill To & Invoice Info Cards
  let y = 44;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILLED TO:', 14, y);
  doc.text('INVOICE DETAILS:', 130, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(sale.customerName, 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const formattedDate = new Date(sale.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Date & Time: ${formattedDate}`, 130, y);
  y += 5;

  if (sale.customerPhone) {
    doc.text(`Phone: ${sale.customerPhone}`, 14, y);
  }
  doc.text(`Payment Method: ${sale.paymentMethod}`, 130, y);
  y += 5;

  if (sale.customerAddress) {
    doc.text(`Address: ${sale.customerAddress}`, 14, y);
  }
  doc.text(`Status: ${sale.status}`, 130, y);
  y += 8;

  // Table Items
  const tableData = sale.items.map((item, index) => [
    index + 1,
    `${item.productName}\n${item.brand ? `[${item.brand}] ` : ''}${item.barcode ? `Barcode: ${item.barcode}` : ''}`,
    item.selectedUnit,
    item.quantity,
    formatCurrency(item.unitSalePrice, settings.currencySymbol),
    item.discount > 0 ? `-${formatCurrency(item.discount, settings.currencySymbol)}` : '-',
    formatCurrency(item.netTotal, settings.currencySymbol),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Product Description', 'Unit', 'Qty', 'Unit Rate', 'Disc', 'Total Amount']],
    body: tableData,
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 78 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Bottom Summary Box
  const summaryX = 125;
  let currY = finalY;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(summaryX - 5, currY - 2, 76, 42, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');

  doc.text('Subtotal:', summaryX, currY + 4);
  doc.text(formatCurrency(sale.subtotal, settings.currencySymbol), 194, currY + 4, { align: 'right' });
  currY += 7;

  if (sale.discountTotal > 0) {
    doc.text('Total Discount:', summaryX, currY + 4);
    doc.text(`-${formatCurrency(sale.discountTotal, settings.currencySymbol)}`, 194, currY + 4, { align: 'right' });
    currY += 7;
  }

  if (sale.taxAmount > 0) {
    doc.text(`Tax (${sale.taxRatePercent}%):`, summaryX, currY + 4);
    doc.text(formatCurrency(sale.taxAmount, settings.currencySymbol), 194, currY + 4, { align: 'right' });
    currY += 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', summaryX, currY + 5);
  doc.text(formatCurrency(sale.grandTotal, settings.currencySymbol), 194, currY + 5, { align: 'right' });
  currY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Amount Paid:', summaryX, currY + 4);
  doc.text(formatCurrency(sale.paidAmount, settings.currencySymbol), 194, currY + 4, { align: 'right' });
  currY += 6;

  if (sale.balanceAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(190, 18, 60);
    doc.text('Balance Due:', summaryX, currY + 4);
    doc.text(formatCurrency(sale.balanceAmount, settings.currencySymbol), 194, currY + 4, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Payment Status:', summaryX, currY + 4);
    doc.text('PAID IN FULL', 194, currY + 4, { align: 'right' });
  }

  // Left Note & Signature area
  if (sale.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Notes / Remarks:', 14, finalY + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.notes, 14, finalY + 10, { maxWidth: 100 });
  }

  // Left: Verification QR Code Card for A4
  const qrCardY = finalY + (sale.notes ? 20 : 4);
  if (qrCodeDataUrl) {
    try {
      // Rounded Card Background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, qrCardY, 102, 34, 2, 2, 'FD');

      // QR Image (28mm x 28mm)
      doc.addImage(qrCodeDataUrl, 'PNG', 17, qrCardY + 3, 28, 28);

      // QR details text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Scan QR to Verify Bill', 48, qrCardY + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Official Invoice: #${sale.invoiceNumber}`, 48, qrCardY + 15);
      doc.text(`Customer: ${sale.customerName}`, 48, qrCardY + 20);
      doc.text(`Total: ${settings.currencySymbol} ${sale.grandTotal} (${sale.balanceAmount > 0 ? 'Balance ' + sale.balanceAmount : 'PAID'})`, 48, qrCardY + 25);
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ Authentic HK Oil Manager Bill', 48, qrCardY + 30);
    } catch (e) {
      console.warn('Could not embed QR code in A4 PDF', e);
    }
  }

  // Footer notes & signature lines
  const footerY = 265;
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, footerY, 70, footerY);
  doc.line(140, footerY, 196, footerY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Customer Signature', 42, footerY + 4, { align: 'center' });
  doc.text('Authorized Signature & Stamp', 168, footerY + 4, { align: 'center' });

  doc.text(settings.invoiceFooterNote, 105, 280, { align: 'center' });
  doc.text('Generated by HK OIL MANAGER - Professional Oil & Inventory POS', 105, 285, { align: 'center' });

  return doc;
}

/**
 * Async helper to generate sale invoice PDF with QR code automatically embedded
 */
export async function generateSaleInvoicePdfWithQr(
  sale: Sale,
  settings: BusinessSettings,
  isThermal = false
): Promise<jsPDF> {
  let qrCodeDataUrl: string | undefined = undefined;
  try {
    const qrData = `HK OIL MANAGER\nBill: ${sale.invoiceNumber}\nDate: ${new Date(sale.createdAt).toLocaleDateString('en-GB')}\nCustomer: ${sale.customerName}\nTotal: ${settings.currencySymbol} ${sale.grandTotal}\nStatus: ${sale.balanceAmount > 0 ? 'Balance ' + sale.balanceAmount : 'PAID'}`;
    qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 240,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch (err) {
    console.warn('Failed to generate QR data URL for PDF', err);
  }
  return generateSaleInvoicePdf(sale, settings, isThermal, qrCodeDataUrl);
}

/**
 * Generate Stock Valuation & Inventory Report PDF
 */
export function generateStockReportPdf(products: Product[], settings: BusinessSettings): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.businessName, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Official Stock Valuation & Inventory Status Report - ${new Date().toLocaleDateString('en-GB')}`, 14, 20);

  // Summary Metrics
  const totalStockQty = products.reduce((sum, p) => sum + p.currentStock, 0);
  const totalCostVal = products.reduce((sum, p) => sum + p.currentStock * p.purchaseRate, 0);
  const totalRetailVal = products.reduce((sum, p) => sum + p.currentStock * p.saleRate, 0);
  const potentialProfit = totalRetailVal - totalCostVal;

  const tableData = products.map((p, idx) => {
    const costVal = p.currentStock * p.purchaseRate;
    const saleVal = p.currentStock * p.saleRate;
    const status = p.currentStock <= 0 ? 'OUT OF STOCK' : p.currentStock <= p.minStockAlert ? 'LOW STOCK' : 'IN STOCK';
    return [
      idx + 1,
      p.name,
      p.category,
      p.barcode || '-',
      formatStockInUnits(p.currentStock, p.bottlesPerCotton, p.baseUnit),
      p.currentStock,
      formatCurrency(p.purchaseRate, settings.currencySymbol),
      formatCurrency(p.saleRate, settings.currencySymbol),
      formatCurrency(costVal, settings.currencySymbol),
      formatCurrency(saleVal, settings.currencySymbol),
      status,
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [[
      '#',
      'Product Name',
      'Category',
      'Barcode',
      'Stock (Pkg)',
      'Base Qty',
      'Cost Rate',
      'Sale Rate',
      'Total Cost',
      'Total Retail',
      'Status',
    ]],
    body: tableData,
    headStyles: { fillColor: [30, 41, 59], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 26, halign: 'right' },
      9: { cellWidth: 26, halign: 'right' },
      10: { cellWidth: 25, halign: 'center' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Summary: Total Items: ${products.length} | Base Units: ${totalStockQty} | Stock Cost Value: ${formatCurrency(totalCostVal, settings.currencySymbol)} | Expected Retail Value: ${formatCurrency(totalRetailVal, settings.currencySymbol)} | Projected Gross Profit: ${formatCurrency(potentialProfit, settings.currencySymbol)}`,
    14,
    finalY > 190 ? 195 : finalY
  );

  return doc;
}

/**
 * Generate Daily Closing Summary Report PDF
 */
export function generateDailyClosingPdf(closing: DailyClosing, settings: BusinessSettings): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.businessName, 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Official End-of-Day Cash & Financial Reconciliation Report`, 14, 21);

  let y = 40;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Closing Date: ${closing.date}`, 14, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Closed At: ${new Date(closing.closedAt).toLocaleTimeString()}`, 140, y);
  y += 10;

  const tableRows = [
    ['1', 'Opening Cash in Drawer', formatCurrency(closing.openingCash, settings.currencySymbol)],
    ['2', '(+) Cash Sales Collected', formatCurrency(closing.cashSales, settings.currencySymbol)],
    ['3', '(+) Customer Debt Collections Received', formatCurrency(closing.customerPayments, settings.currencySymbol)],
    ['4', '(-) Cash Purchases Paid Out', formatCurrency(closing.cashPurchases, settings.currencySymbol)],
    ['5', '(-) Supplier Debt Payments Paid', formatCurrency(closing.supplierPayments, settings.currencySymbol)],
    ['6', '(-) Operational Expenses Paid', formatCurrency(closing.expenses, settings.currencySymbol)],
    ['7', '(=) EXPECTED CASH IN HAND', formatCurrency(closing.expectedCash, settings.currencySymbol)],
    ['8', 'ACTUAL PHYSICAL CASH COUNTED', formatCurrency(closing.actualCash, settings.currencySymbol)],
    [
      '9',
      closing.difference === 0 ? 'RECONCILIATION RESULT' : closing.difference > 0 ? 'CASH SURPLUS (+)' : 'CASH SHORTAGE (-)',
      formatCurrency(Math.abs(closing.difference), settings.currencySymbol),
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['#', 'Financial Metric / Cash Flow Description', 'Amount']],
    body: tableRows,
    headStyles: { fillColor: [30, 41, 59], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9.5, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 130 },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  if (closing.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Closing Notes / Remarks:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(closing.notes, 14, finalY + 6);
  }

  return doc;
}
