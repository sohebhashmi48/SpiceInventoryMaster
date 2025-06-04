import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '₹0.00';

  try {
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Check if amount is a valid number
    if (isNaN(numAmount)) {
      return '₹0.00';
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '₹0.00';
  }
}

// Utility function to format numbers with consistent decimal places
export function formatNumber(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0';

  try {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return '0';
    }

    return numValue.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  } catch (error) {
    console.error('Error formatting number:', error);
    return '0';
  }
}

// Utility function to format currency amounts with Indian locale
export function formatCurrencyAmount(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '₹0.00';

  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) {
      return '₹0.00';
    }

    return `₹${numAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  } catch (error) {
    console.error('Error formatting currency amount:', error);
    return '₹0.00';
  }
}

// Unit conversion constants and types
export type UnitType = 'kg' | 'g' | 'lb' | 'oz' | 'pcs' | 'box' | 'pack' | 'bag' | 'l' | 'ml';

export const UNIT_CONVERSIONS: Record<UnitType, { to: Record<UnitType, number> }> = {
  'kg': {
    to: {
      'kg': 1,
      'g': 1000,
      'lb': 2.20462,
      'oz': 35.274,
      'pcs': 1, // No standard conversion
      'box': 1, // No standard conversion
      'pack': 1, // No standard conversion
      'bag': 1, // No standard conversion
      'l': 1, // No direct conversion
      'ml': 1000 // No direct conversion
    }
  },
  'g': {
    to: {
      'kg': 0.001,
      'g': 1,
      'lb': 0.00220462,
      'oz': 0.035274,
      'pcs': 1, // No standard conversion
      'box': 1, // No standard conversion
      'pack': 1, // No standard conversion
      'bag': 1, // No standard conversion
      'l': 0.001, // No direct conversion
      'ml': 1 // No direct conversion
    }
  },
  'lb': {
    to: {
      'kg': 0.453592,
      'g': 453.592,
      'lb': 1,
      'oz': 16,
      'pcs': 1, // No standard conversion
      'box': 1, // No standard conversion
      'pack': 1, // No standard conversion
      'bag': 1, // No standard conversion
      'l': 0.453592, // No direct conversion
      'ml': 453.592 // No direct conversion
    }
  },
  'oz': {
    to: {
      'kg': 0.0283495,
      'g': 28.3495,
      'lb': 0.0625,
      'oz': 1,
      'pcs': 1, // No standard conversion
      'box': 1, // No standard conversion
      'pack': 1, // No standard conversion
      'bag': 1, // No standard conversion
      'l': 0.0283495, // No direct conversion
      'ml': 28.3495 // No direct conversion
    }
  },
  // For non-weight units, we don't provide conversions
  'pcs': { to: { 'kg': 1, 'g': 1, 'lb': 1, 'oz': 1, 'pcs': 1, 'box': 1, 'pack': 1, 'bag': 1, 'l': 1, 'ml': 1 } },
  'box': { to: { 'kg': 1, 'g': 1, 'lb': 1, 'oz': 1, 'pcs': 1, 'box': 1, 'pack': 1, 'bag': 1, 'l': 1, 'ml': 1 } },
  'pack': { to: { 'kg': 1, 'g': 1, 'lb': 1, 'oz': 1, 'pcs': 1, 'box': 1, 'pack': 1, 'bag': 1, 'l': 1, 'ml': 1 } },
  'bag': { to: { 'kg': 1, 'g': 1, 'lb': 1, 'oz': 1, 'pcs': 1, 'box': 1, 'pack': 1, 'bag': 1, 'l': 1, 'ml': 1 } },
  'l': {
    to: {
      'kg': 1, // Assuming 1L = 1kg for water
      'g': 1000, // Assuming 1L = 1000g for water
      'lb': 2.20462, // Assuming 1L = 1kg for water
      'oz': 35.274, // Assuming 1L = 1kg for water
      'pcs': 1, // No standard conversion
      'box': 1, // No standard conversion
      'pack': 1, // No standard conversion
      'bag': 1, // No standard conversion
      'l': 1,
      'ml': 1000
    }
  },
  'ml': {
    to: {
      'kg': 0.001, // Assuming 1ml = 0.001kg for water
      'g': 1, // Assuming 1ml = 1g for water
      'lb': 0.00220462, // Assuming 1ml = 0.001kg for water
      'oz': 0.035274, // Assuming 1ml = 0.001kg for water
      'pcs': 1, // No standard conversion
      'box': 1, // No standard conversion
      'pack': 1, // No standard conversion
      'bag': 1, // No standard conversion
      'l': 0.001,
      'ml': 1
    }
  }
};

// Available measurement units for dropdown
export const MEASUREMENT_UNITS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "lb", label: "Pound (lb)" },
  { value: "oz", label: "Ounce (oz)" },
  { value: "l", label: "Liter (l)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "bag", label: "Bag" },
];

// Function to convert quantity between units
export function convertUnit(
  quantity: number,
  fromUnit: UnitType,
  toUnit: UnitType
): number {
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) {
    return quantity;
  }

  // Check if both units are convertible (weight/volume units)
  const nonConvertibleUnits = ['pcs', 'box', 'pack', 'bag'];

  // If either unit is non-convertible, return the original quantity
  if (nonConvertibleUnits.includes(fromUnit) || nonConvertibleUnits.includes(toUnit)) {
    return quantity;
  }

  // Get the conversion factor
  const conversionFactor = UNIT_CONVERSIONS[fromUnit]?.to?.[toUnit];

  if (!conversionFactor) {
    console.warn(`No conversion factor found for ${fromUnit} to ${toUnit}`);
    return quantity;
  }

  // Calculate the converted value
  const convertedValue = quantity * conversionFactor;

  // For weight/volume units, maintain precision based on unit type
  if (['kg', 'g', 'lb', 'oz', 'l', 'ml'].includes(fromUnit) && ['kg', 'g', 'lb', 'oz', 'l', 'ml'].includes(toUnit)) {
    if (toUnit === 'g' || toUnit === 'ml') {
      // When converting to smaller units (g/ml), keep whole numbers
      return Math.round(convertedValue);
    } else if (toUnit === 'kg' || toUnit === 'l') {
      // When converting to larger units (kg/l), keep 3 decimal places
      return Number(convertedValue.toFixed(3));
    }
  }

  // For other cases, apply precision based on magnitude
  if (Math.abs(convertedValue) >= 1000) {
    return Math.round(convertedValue);
  } else if (Math.abs(convertedValue) >= 100) {
    return Number(convertedValue.toFixed(1));
  } else {
    return Number(convertedValue.toFixed(3));
  }
}

// Helper function to check if stock is sufficient when units change
export function checkStockSufficiency(
  requestedQuantity: number,
  requestedUnit: UnitType,
  availableStock: number,
  stockUnit: UnitType
): { isSufficient: boolean; availableInRequestedUnit: number; shortfall: number } {
  // Convert available stock to the requested unit
  const availableInRequestedUnit = convertUnit(availableStock, stockUnit, requestedUnit);

  const isSufficient = availableInRequestedUnit >= requestedQuantity;
  const shortfall = isSufficient ? 0 : requestedQuantity - availableInRequestedUnit;

  return {
    isSufficient,
    availableInRequestedUnit,
    shortfall
  };
}

// Function to get stock display with unit conversion
export function getStockDisplay(
  stockQuantity: number,
  stockUnit: UnitType,
  displayUnit?: UnitType
): { quantity: number; unit: UnitType; displayText: string } {
  const targetUnit = displayUnit || stockUnit;
  const convertedQuantity = convertUnit(stockQuantity, stockUnit, targetUnit);
  const displayText = formatQuantityWithUnit(convertedQuantity, targetUnit, true);

  return {
    quantity: convertedQuantity,
    unit: targetUnit,
    displayText
  };
}

// Function to format quantity with unit
export function formatQuantityWithUnit(
  quantity: number | string | null | undefined,
  unit: UnitType,
  showAlternateUnit: boolean = false
): string {
  // Convert quantity to number and handle invalid inputs
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity || 0);

  // Handle NaN case
  if (isNaN(numQuantity)) {
    return `0 ${unit}`;
  }

  // Format the primary unit with consistent 2 decimal places max
  let formattedQuantity: string;
  if (Math.abs(numQuantity) >= 1000) {
    // For large values, don't show decimal places
    formattedQuantity = Math.round(numQuantity).toString();
  } else {
    // For all other values, show max 2 decimal places and remove trailing zeros
    formattedQuantity = numQuantity.toFixed(2);
    // Remove trailing zeros after decimal point
    formattedQuantity = parseFloat(formattedQuantity).toString();
  }

  // If not showing alternate unit or unit is not weight-based, just return the primary format
  if (!showAlternateUnit || !['kg', 'g', 'lb', 'oz', 'l', 'ml'].includes(unit)) {
    return `${formattedQuantity} ${unit}`;
  }

  // For weight units, show alternate format (kg/g)
  if (unit === 'kg' && numQuantity < 1) {
    // Convert small kg values to g
    const grams = convertUnit(numQuantity, 'kg', 'g');
    return `${formattedQuantity} ${unit} (${grams} g)`;
  } else if (unit === 'kg') {
    // For kg values, show in kg only
    return `${formattedQuantity} ${unit}`;
  }
  return `${formattedQuantity} ${unit}`;
}


export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';

  try {
    // Convert to Date object if it's a string
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}