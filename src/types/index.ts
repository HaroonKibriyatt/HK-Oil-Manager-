export type ProductCategory = 'Oil' | 'Cotton' | 'Bottle' | 'Gallon' | 'Filter' | 'Lubricant' | 'Other';

export type ProductUnit = 'Bottle' | 'Cotton' | 'Gallon' | 'Liter' | 'Piece' | 'Can' | 'Drum' | 'Other';

export interface Product {
  id: string;
  name: string;
  brand: string;
  genericName?: string;
  category: ProductCategory;
  subCategory?: string;
  barcode: string;
  sku?: string;
  
  // Units & Package conversion
  baseUnit: ProductUnit; // Base stock count is usually in Bottles or Liters
  bottlesPerCotton: number; // e.g. 12 bottles per cotton
  cottonPurchaseRate: number; // Rate for 1 cotton
  cottonSaleRate: number; // Rate for 1 cotton
  
  bottleSizeLiters: number; // e.g. 1L, 4L, 5L
  gallonSizeLiters: number; // e.g. 4L or 10L
  
  // Rates for base unit (Bottle or Liter)
  purchaseRate: number;
  saleRate: number;
  profitAmount: number;
  profitMarginPercent: number;
  
  // Stock
  openingStock: number;
  currentStock: number; // Stored in base units (e.g. bottles)
  minStockAlert: number;
  
  supplierId?: string;
  supplierName?: string;
  imageBase64?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: string;
  productId: string;
  productName: string;
  oldPurchaseRate: number;
  newPurchaseRate: number;
  oldSaleRate: number;
  newSaleRate: number;
  changedAt: string;
  reason?: string;
}

export type StockMovementType = 
  | 'OPENING'
  | 'PURCHASE'
  | 'SALE'
  | 'SALE_RETURN'
  | 'PURCHASE_RETURN'
  | 'DAMAGED'
  | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantityChange: number; // positive or negative in base units
  unitName: string;
  beforeStock: number;
  afterStock: number;
  referenceId?: string;
  referenceNumber?: string;
  notes?: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  email?: string;
  openingBalance: number;
  currentBalance: number; // positive means customer owes business (receivable)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  openingBalance: number;
  currentBalance: number; // positive means business owes supplier (payable)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  brand: string;
  barcode: string;
  category: ProductCategory;
  imageBase64?: string;
  
  selectedUnit: 'Bottle' | 'Cotton' | 'Gallon' | 'Liter' | 'Piece' | string;
  unitMultiplier: number; // e.g. 1 Cotton = 12 bottles (so multiplier = 12)
  quantity: number; // Quantity of selectedUnit sold
  baseQuantity: number; // quantity * unitMultiplier
  
  unitPurchaseCost: number; // Historical purchase cost of this unit at time of sale
  unitSalePrice: number; // Historical sale price of this unit at time of sale
  totalPrice: number; // quantity * unitSalePrice
  discount: number; // Discount on this line item
  netTotal: number; // totalPrice - discount
  profit: number; // netTotal - (unitPurchaseCost * quantity)
}

export type PaymentMethod = 'Cash' | 'Credit' | 'Bank' | 'Online';

export interface Sale {
  id: string;
  invoiceNumber: string; // e.g. SALE-000001
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: SaleItem[];
  
  subtotal: number;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountTotal: number;
  taxRatePercent: number;
  taxAmount: number;
  grandTotal: number;
  
  totalCost: number;
  totalProfit: number;
  
  paidAmount: number;
  balanceAmount: number; // Credit amount owed
  paymentMethod: PaymentMethod;
  notes?: string;
  status: 'COMPLETED' | 'RETURNED' | 'PARTIAL_RETURN';
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  brand: string;
  barcode: string;
  selectedUnit: string;
  unitMultiplier: number;
  quantity: number;
  baseQuantity: number;
  unitPurchaseRate: number;
  totalPrice: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string; // e.g. PUR-000001
  supplierId?: string;
  supplierName: string;
  supplierInvoiceRef?: string;
  items: PurchaseItem[];
  
  subtotal: number;
  discount: number;
  additionalCharges: number;
  netTotal: number;
  paidAmount: number;
  balanceAmount: number; // Payable to supplier
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string; // e.g. EXP-000001
  category: 'Transport' | 'Electricity' | 'Rent' | 'Salary' | 'Maintenance' | 'Tea & Food' | 'Packaging' | 'Other';
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  selectedUnit: string;
  baseQuantity: number;
  unitPrice: number;
  totalRefund: number;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string; // e.g. RET-000001
  type: 'SALE_RETURN' | 'PURCHASE_RETURN';
  referenceInvoiceNumber: string;
  partyId?: string;
  partyName: string;
  items: ReturnItem[];
  totalRefund: number;
  reason: string;
  createdAt: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string; // e.g. RCP-000001
  type: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT';
  partyId: string;
  partyName: string;
  partyPhone?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  previousBalance: number;
  newBalance: number;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface DailyClosing {
  id: string;
  date: string;
  openingCash: number;
  cashSales: number;
  creditSales: number;
  customerPayments: number;
  cashPurchases: number;
  supplierPayments: number;
  expenses: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes?: string;
  closedAt: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  logoBase64?: string;
  phone: string;
  whatsapp: string;
  address: string;
  email: string;
  currency: string; // e.g. "PKR" or "Rs."
  currencySymbol: string; // "Rs."
  invoicePrefix: string; // "SALE-"
  purchasePrefix: string; // "PUR-"
  invoiceFooterNote: string;
  taxEnabled: boolean;
  taxRatePercent: number;
  allowNegativeStock: boolean;
  defaultLowStockThreshold: number;
  autoLockMinutes: number;
  pinCode: string; // 4 or 6 digit PIN
  isPinAuthEnabled: boolean;
  isSetupCompleted: boolean;
  lastBackupDate?: string;
  weekendAlertDay: string; // e.g. 'Saturday', 'Sunday', 'Friday'
  weekendAlertEnabled: boolean;
  language: 'en' | 'ur';
  theme: 'light' | 'dark';
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'PRODUCT' | 'SALE' | 'PURCHASE' | 'CUSTOMER' | 'SUPPLIER' | 'EXPENSE' | 'STOCK' | 'SETTINGS' | 'CLOSING';
  entityId?: string;
  details: string;
  timestamp: string;
}
