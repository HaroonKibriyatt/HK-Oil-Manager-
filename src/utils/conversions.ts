import { Product, ProductUnit } from '../types';

/**
 * Monetary rounding helper to prevent floating point inaccuracies
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number, symbol = 'Rs.'): string {
  const formatted = roundToTwo(amount).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

/**
 * Calculates base unit rates from package rates (Cotton, Gallon, etc.)
 */
export function calculateProductDerivedRates(product: {
  baseUnit: ProductUnit;
  bottlesPerCotton: number;
  cottonPurchaseRate: number;
  cottonSaleRate: number;
  purchaseRate: number;
  saleRate: number;
  gallonSizeLiters: number;
}) {
  const bottlesCount = Math.max(1, product.bottlesPerCotton || 12);
  
  let purchaseRate = product.purchaseRate;
  let saleRate = product.saleRate;
  let cottonPurchaseRate = product.cottonPurchaseRate;
  let cottonSaleRate = product.cottonSaleRate;

  // If user entered cotton rates, sync bottle rates
  if (cottonSaleRate > 0 && (!saleRate || saleRate === 0)) {
    saleRate = roundToTwo(cottonSaleRate / bottlesCount);
  } else if (saleRate > 0 && (!cottonSaleRate || cottonSaleRate === 0)) {
    cottonSaleRate = roundToTwo(saleRate * bottlesCount);
  }

  if (cottonPurchaseRate > 0 && (!purchaseRate || purchaseRate === 0)) {
    purchaseRate = roundToTwo(cottonPurchaseRate / bottlesCount);
  } else if (purchaseRate > 0 && (!cottonPurchaseRate || cottonPurchaseRate === 0)) {
    cottonPurchaseRate = roundToTwo(purchaseRate * bottlesCount);
  }

  const profitAmount = roundToTwo(saleRate - purchaseRate);
  const profitMarginPercent = purchaseRate > 0 
    ? roundToTwo((profitAmount / purchaseRate) * 100)
    : 0;

  const cottonProfitAmount = roundToTwo(cottonSaleRate - cottonPurchaseRate);
  const cottonProfitMarginPercent = cottonPurchaseRate > 0
    ? roundToTwo((cottonProfitAmount / cottonPurchaseRate) * 100)
    : 0;

  return {
    purchaseRate,
    saleRate,
    cottonPurchaseRate,
    cottonSaleRate,
    profitAmount,
    profitMarginPercent,
    cottonProfitAmount,
    cottonProfitMarginPercent,
  };
}

export interface UnitOption {
  unitName: string;
  multiplier: number; // how many base units this represents
  purchaseRate: number;
  saleRate: number;
  description: string;
}

/**
 * Generates all available selling/buying units for a given product
 * (e.g. 1 Cotton = 12 Bottles, Half Cotton = 6 Bottles, 1 Bottle, 1 Gallon = 4 Liters)
 */
export function getProductUnitOptions(product: Product): UnitOption[] {
  const options: UnitOption[] = [];
  const bottlesInCotton = Math.max(1, product.bottlesPerCotton || 12);

  // Base unit (e.g. 1 Bottle or 1 Liter)
  options.push({
    unitName: product.baseUnit,
    multiplier: 1,
    purchaseRate: roundToTwo(product.purchaseRate),
    saleRate: roundToTwo(product.saleRate),
    description: `1 ${product.baseUnit}`,
  });

  // Cotton option
  if (bottlesInCotton > 1) {
    const cottonSalePrice = product.cottonSaleRate > 0 
      ? product.cottonSaleRate 
      : roundToTwo(product.saleRate * bottlesInCotton);
    
    const cottonPurchasePrice = product.cottonPurchaseRate > 0 
      ? product.cottonPurchaseRate 
      : roundToTwo(product.purchaseRate * bottlesInCotton);

    options.push({
      unitName: 'Cotton',
      multiplier: bottlesInCotton,
      purchaseRate: roundToTwo(cottonPurchasePrice),
      saleRate: roundToTwo(cottonSalePrice),
      description: `1 Cotton (${bottlesInCotton} ${product.baseUnit}s)`,
    });

    // Optional Half-Cotton if 6+ bottles
    if (bottlesInCotton >= 4) {
      const halfCount = Math.floor(bottlesInCotton / 2);
      options.push({
        unitName: 'Half-Cotton',
        multiplier: halfCount,
        purchaseRate: roundToTwo(product.purchaseRate * halfCount),
        saleRate: roundToTwo(product.saleRate * halfCount),
        description: `1/2 Cotton (${halfCount} ${product.baseUnit}s)`,
      });
    }
  }

  // Gallon option
  if (product.gallonSizeLiters && product.gallonSizeLiters > 1) {
    const gallonMult = product.gallonSizeLiters;
    options.push({
      unitName: 'Gallon',
      multiplier: gallonMult,
      purchaseRate: roundToTwo(product.purchaseRate * gallonMult),
      saleRate: roundToTwo(product.saleRate * gallonMult),
      description: `1 Gallon (${gallonMult} Liters)`,
    });
  }

  return options;
}

/**
 * Calculates human-readable stock representation
 * e.g., 26 bottles = "2 Cottons + 2 Bottles" (if 1 Cotton = 12 Bottles)
 */
export function formatStockInUnits(stockBaseQuantity: number, bottlesPerCotton: number, baseUnit: string): string {
  const cottonSize = Math.max(1, bottlesPerCotton || 12);
  if (cottonSize <= 1 || baseUnit === 'Gallon' || baseUnit === 'Liter') {
    return `${stockBaseQuantity} ${baseUnit}`;
  }

  const cottons = Math.floor(stockBaseQuantity / cottonSize);
  const remainderBottles = stockBaseQuantity % cottonSize;

  if (cottons > 0 && remainderBottles > 0) {
    return `${cottons} Ctn + ${remainderBottles} ${baseUnit}`;
  } else if (cottons > 0) {
    return `${cottons} Cotton${cottons > 1 ? 's' : ''}`;
  } else {
    return `${stockBaseQuantity} ${baseUnit}`;
  }
}
