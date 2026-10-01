import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Product,
  PriceHistory,
  StockMovement,
  Customer,
  Supplier,
  Sale,
  Purchase,
  Expense,
  ReturnRecord,
  PaymentReceipt,
  DailyClosing,
  BusinessSettings,
  AuditLog,
} from '../types';
import { roundToTwo } from '../utils/conversions';

interface OilPosDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: {
      'by-barcode': string;
      'by-category': string;
      'by-name': string;
    };
  };
  price_history: {
    key: string;
    value: PriceHistory;
    indexes: {
      'by-product': string;
      'by-date': string;
    };
  };
  stock_movements: {
    key: string;
    value: StockMovement;
    indexes: {
      'by-product': string;
      'by-date': string;
      'by-type': string;
    };
  };
  customers: {
    key: string;
    value: Customer;
    indexes: {
      'by-phone': string;
      'by-name': string;
    };
  };
  suppliers: {
    key: string;
    value: Supplier;
    indexes: {
      'by-phone': string;
      'by-name': string;
    };
  };
  sales: {
    key: string;
    value: Sale;
    indexes: {
      'by-invoice': string;
      'by-customer': string;
      'by-date': string;
    };
  };
  purchases: {
    key: string;
    value: Purchase;
    indexes: {
      'by-number': string;
      'by-supplier': string;
      'by-date': string;
    };
  };
  expenses: {
    key: string;
    value: Expense;
    indexes: {
      'by-date': string;
      'by-category': string;
    };
  };
  returns: {
    key: string;
    value: ReturnRecord;
    indexes: {
      'by-number': string;
      'by-date': string;
    };
  };
  payments: {
    key: string;
    value: PaymentReceipt;
    indexes: {
      'by-party': string;
      'by-date': string;
      'by-type': string;
    };
  };
  daily_closings: {
    key: string;
    value: DailyClosing;
    indexes: {
      'by-date': string;
    };
  };
  settings: {
    key: string;
    value: { key: string; data: any };
  };
  audit_logs: {
    key: string;
    value: AuditLog;
    indexes: {
      'by-date': string;
    };
  };
}

const DB_NAME = 'LubeFlowPro_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OilPosDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<OilPosDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OilPosDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Products
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-barcode', 'barcode');
        productStore.createIndex('by-category', 'category');
        productStore.createIndex('by-name', 'name');

        // Price History
        const priceHistoryStore = db.createObjectStore('price_history', { keyPath: 'id' });
        priceHistoryStore.createIndex('by-product', 'productId');
        priceHistoryStore.createIndex('by-date', 'changedAt');

        // Stock Movements
        const stockStore = db.createObjectStore('stock_movements', { keyPath: 'id' });
        stockStore.createIndex('by-product', 'productId');
        stockStore.createIndex('by-date', 'timestamp');
        stockStore.createIndex('by-type', 'type');

        // Customers
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
        customerStore.createIndex('by-phone', 'phone');
        customerStore.createIndex('by-name', 'name');

        // Suppliers
        const supplierStore = db.createObjectStore('suppliers', { keyPath: 'id' });
        supplierStore.createIndex('by-phone', 'phone');
        supplierStore.createIndex('by-name', 'name');

        // Sales
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('by-invoice', 'invoiceNumber', { unique: true });
        salesStore.createIndex('by-customer', 'customerId');
        salesStore.createIndex('by-date', 'createdAt');

        // Purchases
        const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id' });
        purchaseStore.createIndex('by-number', 'purchaseNumber', { unique: true });
        purchaseStore.createIndex('by-supplier', 'supplierId');
        purchaseStore.createIndex('by-date', 'createdAt');

        // Expenses
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('by-date', 'date');
        expenseStore.createIndex('by-category', 'category');

        // Returns
        const returnStore = db.createObjectStore('returns', { keyPath: 'id' });
        returnStore.createIndex('by-number', 'returnNumber', { unique: true });
        returnStore.createIndex('by-date', 'createdAt');

        // Payments
        const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
        paymentStore.createIndex('by-party', 'partyId');
        paymentStore.createIndex('by-date', 'date');
        paymentStore.createIndex('by-type', 'type');

        // Daily Closings
        const closingStore = db.createObjectStore('daily_closings', { keyPath: 'id' });
        closingStore.createIndex('by-date', 'date');

        // Settings
        db.createObjectStore('settings', { keyPath: 'key' });

        // Audit Logs
        const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
        auditStore.createIndex('by-date', 'timestamp');
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export const defaultSettings: BusinessSettings = {
  businessName: 'Al-Madina Oil Traders & Auto Care',
  tagline: 'Wholesale & Retail Engine Oil, Lubricants & Filters',
  phone: '+92 300 1234567',
  whatsapp: '+92 300 1234567',
  address: 'Shop # 12, Main Auto Market, Circular Road, Lahore',
  email: 'info@almadinaoil.com',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  invoicePrefix: 'SALE-',
  purchasePrefix: 'PUR-',
  invoiceFooterNote: 'Thank you for your business! Warranty valid with original bill.',
  taxEnabled: false,
  taxRatePercent: 0,
  allowNegativeStock: false,
  defaultLowStockThreshold: 10,
  autoLockMinutes: 0, // 0 = disabled
  pinCode: '1234',
  isPinAuthEnabled: false,
  isSetupCompleted: true,
  weekendAlertDay: 'Saturday',
  weekendAlertEnabled: true,
  language: 'en',
  theme: 'light',
};

// ----------------- SETTINGS & AUDIT -----------------

export async function getSettings(): Promise<BusinessSettings> {
  try {
    const db = await getDB();
    const row = await db.get('settings', 'business_config');
    if (row && row.data) {
      return { ...defaultSettings, ...row.data };
    }
    // Directly save defaultSettings without calling saveSettings to prevent recursion
    await db.put('settings', { key: 'business_config', data: defaultSettings });
    return defaultSettings;
  } catch (err) {
    console.error('getSettings error, using defaults:', err);
    return defaultSettings;
  }
}

export async function saveSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
  const db = await getDB();
  const row = await db.get('settings', 'business_config');
  const existing: BusinessSettings = row && row.data ? { ...defaultSettings, ...row.data } : defaultSettings;
  const updated: BusinessSettings = { ...existing, ...settings };
  await db.put('settings', { key: 'business_config', data: updated });
  try {
    await logAudit('SETTINGS', 'business_config', 'Updated business profile and system preferences');
  } catch (err) {
    // Ignore audit logging errors during settings save
  }
  return updated;
}

export async function logAudit(
  entityType: AuditLog['entityType'],
  entityId: string | undefined,
  details: string
): Promise<void> {
  try {
    const db = await getDB();
    const log: AuditLog = {
      id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      action: details,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    await db.put('audit_logs', log);
  } catch (err) {
    console.error('Audit log error', err);
  }
}

// ----------------- PRODUCTS -----------------

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();
  return db.getAll('products');
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const db = await getDB();
  return db.get('products', id);
}

export async function findProductByBarcode(barcode: string): Promise<Product | undefined> {
  if (!barcode || !barcode.trim()) return undefined;
  const db = await getDB();
  const cleanBarcode = barcode.trim();
  const exact = await db.getFromIndex('products', 'by-barcode', cleanBarcode);
  if (exact) return exact;

  // Fallback search across all products (e.g. if barcode matches SKU or trimmed)
  const all = await db.getAll('products');
  return all.find(
    (p) =>
      p.barcode?.toLowerCase() === cleanBarcode.toLowerCase() ||
      p.sku?.toLowerCase() === cleanBarcode.toLowerCase()
  );
}

export async function saveProduct(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Product> {
  const db = await getDB();
  const now = new Date().toISOString();
  const isNew = !productData.id;
  const id = productData.id || 'PROD-' + Date.now();

  const existing = !isNew ? await db.get('products', id) : undefined;

  // Track price history if rates changed
  if (existing) {
    if (
      existing.purchaseRate !== productData.purchaseRate ||
      existing.saleRate !== productData.saleRate
    ) {
      const historyRecord: PriceHistory = {
        id: 'PRC-' + Date.now(),
        productId: id,
        productName: productData.name,
        oldPurchaseRate: existing.purchaseRate,
        newPurchaseRate: productData.purchaseRate,
        oldSaleRate: existing.saleRate,
        newSaleRate: productData.saleRate,
        changedAt: now,
        reason: 'Price updated in product editor',
      };
      await db.put('price_history', historyRecord);
    }
  }

  const product: Product = {
    ...productData,
    id,
    currentStock: isNew ? (productData.openingStock || 0) : (existing?.currentStock ?? productData.openingStock ?? 0),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await db.put('products', product);

  // If new product with opening stock, log stock movement
  if (isNew && product.openingStock > 0) {
    const movement: StockMovement = {
      id: 'MOV-' + Date.now(),
      productId: id,
      productName: product.name,
      type: 'OPENING',
      quantityChange: product.openingStock,
      unitName: product.baseUnit,
      beforeStock: 0,
      afterStock: product.openingStock,
      notes: 'Initial opening stock',
      timestamp: now,
    };
    await db.put('stock_movements', movement);
  }

  await logAudit('PRODUCT', id, `${isNew ? 'Added' : 'Updated'} product: ${product.name}`);
  return product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const db = await getDB();
  const product = await db.get('products', id);
  if (!product) return false;
  await db.delete('products', id);
  await logAudit('PRODUCT', id, `Deleted product: ${product.name}`);
  return true;
}

// ----------------- STOCK ADJUSTMENT -----------------

export async function adjustStock(
  productId: string,
  newStock: number,
  reason: 'ADJUSTMENT' | 'DAMAGED',
  notes: string
): Promise<Product> {
  const db = await getDB();
  const tx = db.transaction(['products', 'stock_movements', 'audit_logs'], 'readwrite');
  const productStore = tx.objectStore('products');
  const movementStore = tx.objectStore('stock_movements');
  const auditStore = tx.objectStore('audit_logs');

  const product = await productStore.get(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const beforeStock = product.currentStock;
  const quantityDiff = newStock - beforeStock;
  const now = new Date().toISOString();

  product.currentStock = newStock;
  product.updatedAt = now;
  await productStore.put(product);

  const movement: StockMovement = {
    id: 'MOV-' + Date.now(),
    productId,
    productName: product.name,
    type: reason,
    quantityChange: quantityDiff,
    unitName: product.baseUnit,
    beforeStock,
    afterStock: newStock,
    notes: notes || `Manual stock adjustment (${quantityDiff > 0 ? '+' : ''}${quantityDiff})`,
    timestamp: now,
  };
  await movementStore.put(movement);

  const audit: AuditLog = {
    id: 'AUD-' + Date.now(),
    action: `Stock adjusted for ${product.name} from ${beforeStock} to ${newStock} (${notes})`,
    entityType: 'STOCK',
    entityId: productId,
    details: `Delta: ${quantityDiff}`,
    timestamp: now,
  };
  await auditStore.put(audit);

  await tx.done;
  return product;
}

export async function getStockMovements(productId?: string): Promise<StockMovement[]> {
  const db = await getDB();
  if (productId) {
    const list = await db.getAllFromIndex('stock_movements', 'by-product', productId);
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  const all = await db.getAll('stock_movements');
  return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ----------------- SEQUENTIAL NUMBERS -----------------

export async function getNextDocumentNumber(type: 'SALE' | 'PUR' | 'RET' | 'EXP' | 'RCP'): Promise<string> {
  const db = await getDB();
  let prefix = type + '-';
  let storeName: 'sales' | 'purchases' | 'returns' | 'expenses' | 'payments' = 'sales';

  if (type === 'SALE') storeName = 'sales';
  else if (type === 'PUR') storeName = 'purchases';
  else if (type === 'RET') storeName = 'returns';
  else if (type === 'EXP') storeName = 'expenses';
  else if (type === 'RCP') storeName = 'payments';

  const count = await db.count(storeName);
  const nextNum = (count + 1).toString().padStart(6, '0');
  return `${prefix}${nextNum}`;
}

// ----------------- SALES TRANSACTION (PRD Section 36) -----------------

export interface SaleTransactionInput {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Sale['items'];
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountTotal: number;
  taxRatePercent: number;
  taxAmount: number;
  grandTotal: number;
  totalCost: number;
  totalProfit: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: Sale['paymentMethod'];
  notes?: string;
}

export async function executeSaleTransaction(input: SaleTransactionInput): Promise<Sale> {
  const db = await getDB();
  const settings = await getSettings();

  const tx = db.transaction(
    ['products', 'sales', 'stock_movements', 'customers', 'audit_logs'],
    'readwrite'
  );

  const productStore = tx.objectStore('products');
  const salesStore = tx.objectStore('sales');
  const stockStore = tx.objectStore('stock_movements');
  const customerStore = tx.objectStore('customers');
  const auditStore = tx.objectStore('audit_logs');

  // Step 1: Validate stock for all items
  for (const item of input.items) {
    const product = await productStore.get(item.productId);
    if (!product) {
      throw new Error(`Product "${item.productName}" was not found in the database.`);
    }

    if (!settings.allowNegativeStock && product.currentStock < item.baseQuantity) {
      throw new Error(
        `Insufficient stock for "${item.productName}". Available: ${product.currentStock} ${product.baseUnit}, Required: ${item.baseQuantity} ${product.baseUnit}.`
      );
    }
  }

  // Step 2: Generate unique sequential invoice number
  const totalSalesCount = await salesStore.count();
  const invoiceNumber = `${settings.invoicePrefix}${(totalSalesCount + 1).toString().padStart(6, '0')}`;
  const now = new Date().toISOString();
  const saleId = 'SALE-' + Date.now();

  // Step 3: Deduct stock and write stock movements
  for (const item of input.items) {
    const product = (await productStore.get(item.productId))!;
    const beforeStock = product.currentStock;
    const afterStock = beforeStock - item.baseQuantity;

    product.currentStock = afterStock;
    product.updatedAt = now;
    await productStore.put(product);

    const movement: StockMovement = {
      id: 'MOV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      productId: item.productId,
      productName: item.productName,
      type: 'SALE',
      quantityChange: -item.baseQuantity,
      unitName: item.selectedUnit,
      beforeStock,
      afterStock,
      referenceId: saleId,
      referenceNumber: invoiceNumber,
      notes: `Sold ${item.quantity} ${item.selectedUnit} on ${invoiceNumber}`,
      timestamp: now,
    };
    await stockStore.put(movement);
  }

  // Step 4: Update customer balance if credit sale
  if (input.customerId && input.balanceAmount > 0) {
    const customer = await customerStore.get(input.customerId);
    if (customer) {
      customer.currentBalance = roundToTwo(customer.currentBalance + input.balanceAmount);
      customer.updatedAt = now;
      await customerStore.put(customer);
    }
  }

  // Step 5: Save Sale record
  const saleRecord: Sale = {
    id: saleId,
    invoiceNumber,
    customerId: input.customerId,
    customerName: input.customerName || 'Walk-in Customer',
    customerPhone: input.customerPhone,
    customerAddress: input.customerAddress,
    items: input.items,
    subtotal: input.items.reduce((acc, i) => acc + i.totalPrice, 0),
    discountType: input.discountType,
    discountValue: input.discountValue,
    discountTotal: input.discountTotal,
    taxRatePercent: input.taxRatePercent,
    taxAmount: input.taxAmount,
    grandTotal: input.grandTotal,
    totalCost: input.totalCost,
    totalProfit: input.totalProfit,
    paidAmount: input.paidAmount,
    balanceAmount: input.balanceAmount,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    status: 'COMPLETED',
    createdAt: now,
    updatedAt: now,
  };
  await salesStore.put(saleRecord);

  // Step 6: Log audit
  const audit: AuditLog = {
    id: 'AUD-' + Date.now(),
    action: `Created Sale Invoice #${invoiceNumber} for ${saleRecord.customerName} - Total: ${saleRecord.grandTotal}`,
    entityType: 'SALE',
    entityId: saleId,
    details: `${input.items.length} items, paid: ${input.paidAmount}, balance: ${input.balanceAmount}`,
    timestamp: now,
  };
  await auditStore.put(audit);

  // Commit transaction
  await tx.done;
  return saleRecord;
}

// ----------------- PURCHASES TRANSACTION -----------------

export interface PurchaseTransactionInput {
  supplierId?: string;
  supplierName: string;
  supplierInvoiceRef?: string;
  items: Purchase['items'];
  subtotal: number;
  discount: number;
  additionalCharges: number;
  netTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: Purchase['paymentMethod'];
  notes?: string;
}

export async function executePurchaseTransaction(input: PurchaseTransactionInput): Promise<Purchase> {
  const db = await getDB();
  const settings = await getSettings();

  const tx = db.transaction(
    ['products', 'purchases', 'stock_movements', 'suppliers', 'price_history', 'audit_logs'],
    'readwrite'
  );

  const productStore = tx.objectStore('products');
  const purchaseStore = tx.objectStore('purchases');
  const stockStore = tx.objectStore('stock_movements');
  const supplierStore = tx.objectStore('suppliers');
  const priceHistoryStore = tx.objectStore('price_history');
  const auditStore = tx.objectStore('audit_logs');

  const totalPurCount = await purchaseStore.count();
  const purchaseNumber = `${settings.purchasePrefix}${(totalPurCount + 1).toString().padStart(6, '0')}`;
  const now = new Date().toISOString();
  const purchaseId = 'PUR-' + Date.now();

  // Add stock & update purchase price history
  for (const item of input.items) {
    const product = await productStore.get(item.productId);
    if (product) {
      const beforeStock = product.currentStock;
      const afterStock = beforeStock + item.baseQuantity;

      // Base purchase rate per single base unit
      const newBasePurchaseRate = item.unitMultiplier > 1 
        ? roundToTwo(item.unitPurchaseRate / item.unitMultiplier)
        : item.unitPurchaseRate;

      if (product.purchaseRate !== newBasePurchaseRate && newBasePurchaseRate > 0) {
        const history: PriceHistory = {
          id: 'PRC-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          productId: product.id,
          productName: product.name,
          oldPurchaseRate: product.purchaseRate,
          newPurchaseRate: newBasePurchaseRate,
          oldSaleRate: product.saleRate,
          newSaleRate: product.saleRate,
          changedAt: now,
          reason: `Purchased via ${purchaseNumber}`,
        };
        await priceHistoryStore.put(history);
        product.purchaseRate = newBasePurchaseRate;
        product.profitAmount = roundToTwo(product.saleRate - newBasePurchaseRate);
        product.profitMarginPercent = newBasePurchaseRate > 0
          ? roundToTwo((product.profitAmount / newBasePurchaseRate) * 100)
          : 0;
      }

      product.currentStock = afterStock;
      product.updatedAt = now;
      await productStore.put(product);

      const movement: StockMovement = {
        id: 'MOV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        productId: item.productId,
        productName: item.productName,
        type: 'PURCHASE',
        quantityChange: item.baseQuantity,
        unitName: item.selectedUnit,
        beforeStock,
        afterStock,
        referenceId: purchaseId,
        referenceNumber: purchaseNumber,
        notes: `Purchased ${item.quantity} ${item.selectedUnit} from ${input.supplierName}`,
        timestamp: now,
      };
      await stockStore.put(movement);
    }
  }

  // Update supplier balance if balance unpaid
  if (input.supplierId && input.balanceAmount > 0) {
    const supplier = await supplierStore.get(input.supplierId);
    if (supplier) {
      supplier.currentBalance = roundToTwo(supplier.currentBalance + input.balanceAmount);
      supplier.updatedAt = now;
      await supplierStore.put(supplier);
    }
  }

  const purchaseRecord: Purchase = {
    id: purchaseId,
    purchaseNumber,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    supplierInvoiceRef: input.supplierInvoiceRef,
    items: input.items,
    subtotal: input.subtotal,
    discount: input.discount,
    additionalCharges: input.additionalCharges,
    netTotal: input.netTotal,
    paidAmount: input.paidAmount,
    balanceAmount: input.balanceAmount,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  await purchaseStore.put(purchaseRecord);

  const audit: AuditLog = {
    id: 'AUD-' + Date.now(),
    action: `Created Purchase #${purchaseNumber} from ${input.supplierName} - Net: ${input.netTotal}`,
    entityType: 'PURCHASE',
    entityId: purchaseId,
    details: `${input.items.length} items, paid: ${input.paidAmount}, balance: ${input.balanceAmount}`,
    timestamp: now,
  };
  await auditStore.put(audit);

  await tx.done;
  return purchaseRecord;
}

// ----------------- CUSTOMERS & SUPPLIERS -----------------

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  return db.getAll('customers');
}

export async function saveCustomer(
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Customer> {
  const db = await getDB();
  const now = new Date().toISOString();
  const isNew = !data.id;
  const id = data.id || 'CUST-' + Date.now();
  const existing = !isNew ? await db.get('customers', id) : undefined;

  const customer: Customer = {
    ...data,
    id,
    currentBalance: isNew ? data.openingBalance : (existing?.currentBalance ?? data.openingBalance),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await db.put('customers', customer);
  await logAudit('CUSTOMER', id, `${isNew ? 'Added' : 'Updated'} customer: ${customer.name}`);
  return customer;
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDB();
  return db.getAll('suppliers');
}

export async function saveSupplier(
  data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Supplier> {
  const db = await getDB();
  const now = new Date().toISOString();
  const isNew = !data.id;
  const id = data.id || 'SUPP-' + Date.now();
  const existing = !isNew ? await db.get('suppliers', id) : undefined;

  const supplier: Supplier = {
    ...data,
    id,
    currentBalance: isNew ? data.openingBalance : (existing?.currentBalance ?? data.openingBalance),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await db.put('suppliers', supplier);
  await logAudit('SUPPLIER', id, `${isNew ? 'Added' : 'Updated'} supplier: ${supplier.name}`);
  return supplier;
}

// ----------------- PAYMENTS (RECEIPTS) -----------------

export async function recordPaymentReceipt(
  type: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT',
  partyId: string,
  partyName: string,
  partyPhone: string | undefined,
  amount: number,
  paymentMethod: PaymentReceipt['paymentMethod'],
  notes?: string
): Promise<PaymentReceipt> {
  const db = await getDB();
  const tx = db.transaction(['customers', 'suppliers', 'payments', 'audit_logs'], 'readwrite');
  const customerStore = tx.objectStore('customers');
  const supplierStore = tx.objectStore('suppliers');
  const paymentStore = tx.objectStore('payments');
  const auditStore = tx.objectStore('audit_logs');

  let prevBalance = 0;
  let newBalance = 0;
  const now = new Date().toISOString();

  if (type === 'CUSTOMER_PAYMENT') {
    const cust = await customerStore.get(partyId);
    if (!cust) throw new Error('Customer not found');
    prevBalance = cust.currentBalance;
    newBalance = roundToTwo(prevBalance - amount); // Customer pays off their debt
    cust.currentBalance = newBalance;
    cust.updatedAt = now;
    await customerStore.put(cust);
  } else {
    const supp = await supplierStore.get(partyId);
    if (!supp) throw new Error('Supplier not found');
    prevBalance = supp.currentBalance;
    newBalance = roundToTwo(prevBalance - amount); // Business pays off supplier debt
    supp.currentBalance = newBalance;
    supp.updatedAt = now;
    await supplierStore.put(supp);
  }

  const count = await paymentStore.count();
  const receiptNumber = `RCP-${(count + 1).toString().padStart(6, '0')}`;
  const receipt: PaymentReceipt = {
    id: 'RCP-' + Date.now(),
    receiptNumber,
    type,
    partyId,
    partyName,
    partyPhone,
    amount,
    paymentMethod,
    previousBalance: prevBalance,
    newBalance,
    notes,
    date: now.split('T')[0],
    createdAt: now,
  };
  await paymentStore.put(receipt);

  const audit: AuditLog = {
    id: 'AUD-' + Date.now(),
    action: `Recorded ${type === 'CUSTOMER_PAYMENT' ? 'Customer' : 'Supplier'} Payment: ${amount} (${receiptNumber})`,
    entityType: type === 'CUSTOMER_PAYMENT' ? 'CUSTOMER' : 'SUPPLIER',
    entityId: partyId,
    details: `Previous Balance: ${prevBalance}, New Balance: ${newBalance}`,
    timestamp: now,
  };
  await auditStore.put(audit);

  await tx.done;
  return receipt;
}

export async function getAllPayments(): Promise<PaymentReceipt[]> {
  const db = await getDB();
  const list = await db.getAll('payments');
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ----------------- EXPENSES -----------------

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDB();
  const list = await db.getAll('expenses');
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveExpense(
  data: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt'>
): Promise<Expense> {
  const db = await getDB();
  const count = await db.count('expenses');
  const expenseNumber = `EXP-${(count + 1).toString().padStart(6, '0')}`;
  const now = new Date().toISOString();

  const expense: Expense = {
    ...data,
    id: 'EXP-' + Date.now(),
    expenseNumber,
    createdAt: now,
  };
  await db.put('expenses', expense);
  await logAudit('EXPENSE', expense.id, `Added expense: ${expense.category} - Rs. ${expense.amount} (${expense.description})`);
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('expenses', id);
}

// ----------------- SALES & PURCHASES LISTS -----------------

export async function getAllSales(): Promise<Sale[]> {
  const db = await getDB();
  const list = await db.getAll('sales');
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSaleById(id: string): Promise<Sale | undefined> {
  const db = await getDB();
  return db.get('sales', id);
}

export async function getAllPurchases(): Promise<Purchase[]> {
  const db = await getDB();
  const list = await db.getAll('purchases');
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ----------------- DAILY CLOSING (PRD Section 45) -----------------

export async function getDailyClosings(): Promise<DailyClosing[]> {
  const db = await getDB();
  const list = await db.getAll('daily_closings');
  return list.sort((a, b) => b.closedAt.localeCompare(a.closedAt));
}

export async function calculateTodayClosingStats(dateStr?: string) {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const allSales = await getAllSales();
  const allPurchases = await getAllPurchases();
  const allExpenses = await getAllExpenses();
  const allPayments = await getAllPayments();

  // Filter for today
  const todaySales = allSales.filter((s) => s.createdAt.startsWith(today));
  const todayPurchases = allPurchases.filter((p) => p.createdAt.startsWith(today));
  const todayExpenses = allExpenses.filter((e) => e.date === today || e.createdAt.startsWith(today));
  const todayPayments = allPayments.filter((p) => p.date === today || p.createdAt.startsWith(today));

  const cashSales = todaySales
    .filter((s) => s.paymentMethod === 'Cash')
    .reduce((sum, s) => sum + s.paidAmount, 0);

  const creditSales = todaySales
    .filter((s) => s.paymentMethod === 'Credit' || s.balanceAmount > 0)
    .reduce((sum, s) => sum + s.balanceAmount, 0);

  const customerPayments = todayPayments
    .filter((p) => p.type === 'CUSTOMER_PAYMENT' && p.paymentMethod === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const cashPurchases = todayPurchases
    .filter((p) => p.paymentMethod === 'Cash')
    .reduce((sum, p) => sum + p.paidAmount, 0);

  const supplierPayments = todayPayments
    .filter((p) => p.type === 'SUPPLIER_PAYMENT' && p.paymentMethod === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const expenses = todayExpenses
    .filter((e) => e.paymentMethod === 'Cash')
    .reduce((sum, e) => sum + e.amount, 0);

  const grossSalesTotal = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
  const costOfGoodsSold = todaySales.reduce((sum, s) => sum + s.totalCost, 0);
  const grossProfit = roundToTwo(grossSalesTotal - costOfGoodsSold);
  const netProfit = roundToTwo(grossProfit - todayExpenses.reduce((sum, e) => sum + e.amount, 0));

  return {
    today,
    salesCount: todaySales.length,
    grossSalesTotal,
    costOfGoodsSold,
    grossProfit,
    netProfit,
    cashSales: roundToTwo(cashSales),
    creditSales: roundToTwo(creditSales),
    customerPayments: roundToTwo(customerPayments),
    cashPurchases: roundToTwo(cashPurchases),
    supplierPayments: roundToTwo(supplierPayments),
    expenses: roundToTwo(expenses),
  };
}

export async function executeDailyClosing(
  openingCash: number,
  actualCash: number,
  notes?: string
): Promise<DailyClosing> {
  const db = await getDB();
  const stats = await calculateTodayClosingStats();
  const expectedCash = roundToTwo(
    openingCash + stats.cashSales + stats.customerPayments - stats.cashPurchases - stats.supplierPayments - stats.expenses
  );
  const difference = roundToTwo(actualCash - expectedCash);

  const closing: DailyClosing = {
    id: 'CLS-' + Date.now(),
    date: stats.today,
    openingCash,
    cashSales: stats.cashSales,
    creditSales: stats.creditSales,
    customerPayments: stats.customerPayments,
    cashPurchases: stats.cashPurchases,
    supplierPayments: stats.supplierPayments,
    expenses: stats.expenses,
    expectedCash,
    actualCash,
    difference,
    notes,
    closedAt: new Date().toISOString(),
  };

  await db.put('daily_closings', closing);
  await logAudit('CLOSING', closing.id, `Daily closing for ${stats.today}. Diff: ${difference}`);
  return closing;
}

// ----------------- AUDIT LOGS -----------------

export async function getAuditLogs(): Promise<AuditLog[]> {
  const db = await getDB();
  const list = await db.getAll('audit_logs');
  return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ----------------- BACKUP & RESTORE (PRD Section 34) -----------------

export async function exportDatabaseBackup(): Promise<string> {
  const db = await getDB();
  const backup = {
    version: DB_VERSION,
    appName: 'LubeFlow Pro',
    exportedAt: new Date().toISOString(),
    products: await db.getAll('products'),
    price_history: await db.getAll('price_history'),
    stock_movements: await db.getAll('stock_movements'),
    customers: await db.getAll('customers'),
    suppliers: await db.getAll('suppliers'),
    sales: await db.getAll('sales'),
    purchases: await db.getAll('purchases'),
    expenses: await db.getAll('expenses'),
    returns: await db.getAll('returns'),
    payments: await db.getAll('payments'),
    daily_closings: await db.getAll('daily_closings'),
    settings: await db.getAll('settings'),
    audit_logs: await db.getAll('audit_logs'),
  };
  return JSON.stringify(backup, null, 2);
}

export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  const parsed = JSON.parse(jsonString);
  if (!parsed.products || !parsed.sales) {
    throw new Error('Invalid backup file format.');
  }

  const db = await getDB();
  const tx = db.transaction(
    [
      'products',
      'price_history',
      'stock_movements',
      'customers',
      'suppliers',
      'sales',
      'purchases',
      'expenses',
      'returns',
      'payments',
      'daily_closings',
      'settings',
      'audit_logs',
    ],
    'readwrite'
  );

  // Clear current data safely
  await Promise.all([
    tx.objectStore('products').clear(),
    tx.objectStore('price_history').clear(),
    tx.objectStore('stock_movements').clear(),
    tx.objectStore('customers').clear(),
    tx.objectStore('suppliers').clear(),
    tx.objectStore('sales').clear(),
    tx.objectStore('purchases').clear(),
    tx.objectStore('expenses').clear(),
    tx.objectStore('returns').clear(),
    tx.objectStore('payments').clear(),
    tx.objectStore('daily_closings').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('audit_logs').clear(),
  ]);

  // Restore stores
  for (const p of parsed.products || []) await tx.objectStore('products').put(p);
  for (const ph of parsed.price_history || []) await tx.objectStore('price_history').put(ph);
  for (const sm of parsed.stock_movements || []) await tx.objectStore('stock_movements').put(sm);
  for (const c of parsed.customers || []) await tx.objectStore('customers').put(c);
  for (const s of parsed.suppliers || []) await tx.objectStore('suppliers').put(s);
  for (const sl of parsed.sales || []) await tx.objectStore('sales').put(sl);
  for (const pu of parsed.purchases || []) await tx.objectStore('purchases').put(pu);
  for (const e of parsed.expenses || []) await tx.objectStore('expenses').put(e);
  for (const r of parsed.returns || []) await tx.objectStore('returns').put(r);
  for (const pm of parsed.payments || []) await tx.objectStore('payments').put(pm);
  for (const dc of parsed.daily_closings || []) await tx.objectStore('daily_closings').put(dc);
  for (const st of parsed.settings || []) await tx.objectStore('settings').put(st);
  for (const al of parsed.audit_logs || []) await tx.objectStore('audit_logs').put(al);

  await tx.done;
  await saveSettings({ lastBackupDate: new Date().toISOString() });
  return true;
}

export async function clearAllDatabaseData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'products',
      'price_history',
      'stock_movements',
      'customers',
      'suppliers',
      'sales',
      'purchases',
      'expenses',
      'returns',
      'payments',
      'daily_closings',
      'audit_logs',
    ],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('products').clear(),
    tx.objectStore('price_history').clear(),
    tx.objectStore('stock_movements').clear(),
    tx.objectStore('customers').clear(),
    tx.objectStore('suppliers').clear(),
    tx.objectStore('sales').clear(),
    tx.objectStore('purchases').clear(),
    tx.objectStore('expenses').clear(),
    tx.objectStore('returns').clear(),
    tx.objectStore('payments').clear(),
    tx.objectStore('daily_closings').clear(),
    tx.objectStore('audit_logs').clear(),
  ]);

  await tx.done;
}

// ----------------- SEED INITIAL DEMO DATA -----------------
// Fresh installation starts completely empty so the shopkeeper adds their own catalog and entries.
export async function seedInitialDemoData(): Promise<void> {
  return;
}
