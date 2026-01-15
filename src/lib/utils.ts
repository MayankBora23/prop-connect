import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts shorthand price notation (K, L, Cr) to actual number values
 * @param priceText - Price text like "1.2Cr", "50L", "100K", or "5000000"
 * @returns Number value or null if invalid
 */
export function parsePriceToNumber(priceText: string | null | undefined): number | null {
  if (!priceText || priceText.trim() === '') return null;

  const text = priceText.trim();
  const numericMatch = text.match(/^(\d+(?:\.\d+)?)\s*(K|L|Cr)?$/i);

  if (!numericMatch) {
    // Try to parse as plain number
    const plainNumber = parseFloat(text);
    return isNaN(plainNumber) ? null : plainNumber;
  }

  const [, numStr, unit] = numericMatch;
  const num = parseFloat(numStr);

  if (isNaN(num)) return null;

  switch (unit?.toLowerCase()) {
    case 'k':
      return num * 1000;
    case 'l':
      return num * 100000;
    case 'cr':
      return num * 10000000;
    default:
      return num;
  }
}

/**
 * Converts number back to shorthand notation for display
 * @param price - Number value
 * @returns Shorthand string or null if invalid
 */
export function formatPriceToShorthand(price: number | null | undefined): string | null {
  if (price === null || price === undefined || isNaN(price)) return null;

  if (price >= 10000000) {
    return `${(price / 10000000).toFixed(1)}Cr`.replace('.0Cr', 'Cr');
  } else if (price >= 100000) {
    return `${(price / 100000).toFixed(1)}L`.replace('.0L', 'L');
  } else if (price >= 1000) {
    return `${(price / 1000).toFixed(1)}K`.replace('.0K', 'K');
  } else {
    return price.toLocaleString();
  }
}

/**
 * Formats commission amount for display (without unit suffixes for cleaner look)
 * @param amount - Commission amount
 * @returns Formatted string or null if invalid
 */
export function formatCommissionAmount(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined || isNaN(amount)) return null;

  if (amount >= 10000000) {
    return (amount / 10000000).toFixed(1).replace('.0', '');
  } else if (amount >= 100000) {
    return (amount / 100000).toFixed(1).replace('.0', '');
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(1).replace('.0', '');
  } else {
    return amount.toString();
  }
}

/**
 * Calculates commission amount based on deal price and commission percentage
 * @param dealPrice - Deal price as number
 * @param commissionPct - Commission percentage (e.g., 2.5 for 2.5%)
 * @returns Commission amount or null if invalid inputs
 */
export function calculateCommission(dealPrice: number | null, commissionPct: number | null): number | null {
  if (!dealPrice || !commissionPct || dealPrice <= 0 || commissionPct <= 0) return null;
  return (dealPrice * commissionPct) / 100;
}

/**
 * Checks if deal should be marked as completed based on payments
 * @param buyerCommission - Total buyer commission amount
 * @param buyerPaid - Amount paid by buyer
 * @param sellerCommission - Total seller commission amount
 * @param sellerPaid - Amount paid by seller
 * @returns True if both commissions are fully paid
 */
export function isDealCompleted(
  buyerCommission: number | null,
  buyerPaid: number | null,
  sellerCommission: number | null,
  sellerPaid: number | null
): boolean {
  const buyerPaidOff = buyerCommission === null || buyerCommission === 0 ||
                      (buyerPaid !== null && buyerPaid >= buyerCommission);
  const sellerPaidOff = sellerCommission === null || sellerCommission === 0 ||
                       (sellerPaid !== null && sellerPaid >= sellerCommission);
  return buyerPaidOff && sellerPaidOff;
}