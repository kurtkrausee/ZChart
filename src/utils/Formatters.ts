// utils/Formatters.ts

/**
 * Kürzt große Zahlen (z.B. 1.500.000 -> 1.5M)
 */
export const formatKiloMega = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (absValue >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (absValue >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(2);
};

/**
 * Standard Preis-Formatierung (z.B. für Crypto mit vielen Nachkommastellen)
 */
export const formatPrice = (value: number, precision: number = 2): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};