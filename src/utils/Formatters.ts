// utils/Formatters.ts
// Version: 1.4.0 | Updated: 2026-08-11 | By: Agent
// ZV10-P4: formatAxisPrice — Tausendertrenner (none/apostrophe/dot/comma/space)
//   + optionales Zero-Trimming für Achsen-, Crosshair- und LastPrice-Labels.
//   'dot' (de-DE 1.234,56) wechselt das Dezimalzeichen auf Komma, alle anderen
//   Stile behalten den Dezimalpunkt.

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
 * Standard Preis-Formatierung mit expliziter Dezimalstellenzahl.
 */
export const formatPrice = (value: number, precision: number = 2): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

/**
 * Automatische Dezimalstellen nach Asset-Klasse:
 * Aktien/Index/Krypto/Rohstoffe (abs >= 10) → 2, Forex EUR-Paare (1-10) → 4, Sub-1 → 5.
 */
export const smartDecimals = (value: number): number => {
  const abs = Math.abs(value);
  if (abs >= 10) return 2;  // Aktien, DAX, BTC, Gold, Rohstoffe
  if (abs >= 1)  return 4;  // Forex EUR-Paare (1.0847)
  return 5;                  // Sub-1-Preise
};

/**
 * Formatiert einen Preis mit automatischer Dezimalstellenanzahl.
 */
export const autoFormatPrice = (value: number): string => {
  const dp = smartDecimals(value);
  return value.toFixed(dp);
};

/**
 * Formatiert einen Preis mit expliziter oder automatischer Dezimalstellenzahl.
 * priceDecimals=null → autoFormatPrice (smartDecimals)
 */
export const formatWithPrecision = (value: number, priceDecimals: number | null): string => {
  if (priceDecimals === null) return autoFormatPrice(value);
  return value.toFixed(priceDecimals);
};

/**
 * Konvertiert VisualSettings.symbol.precision → Dezimalstellen (null = auto).
 * 'default' → null, '0'–'15' → entsprechende Zahl.
 */
export const precisionToDecimals = (p: string): number | null => {
  if (!p || p === 'default') return null;
  const n = parseInt(p, 10);
  return isNaN(n) ? null : Math.max(0, Math.min(15, n));
};

// ==================== ZV10-P4: Achsen-Preisformatierung ====================

/**
 * Tausendertrenner-Stil. 'dot' impliziert Dezimal-KOMMA (de-DE "1.234,56"),
 * alle anderen Stile nutzen den Dezimalpunkt:
 * none "1234.56" · apostrophe "1'234.56" (de-CH) · comma "1,234.56" (en-US)
 * · space "1 234.56".
 */
export type ThousandSeparatorStyle = 'none' | 'apostrophe' | 'dot' | 'comma' | 'space';

export interface AxisPriceFormatOptions {
  /** Tausendertrenner-Stil (Default 'none' = bisheriges Verhalten) */
  thousandSep?: ThousandSeparatorStyle;
  /** Überflüssige Null-Dezimalen abschneiden: "1.5000" → "1.5", "42.00" → "42" */
  trimZeros?: boolean;
}

const SEP_CHARS: Record<ThousandSeparatorStyle, string> = {
  none: '',
  apostrophe: "'",
  dot: '.',
  comma: ',',
  space: ' ',
};

/**
 * Formatiert einen Achsen-/Label-Preis: feste oder automatische Dezimalstellen
 * (decimals=null → smartDecimals), konfigurierbarer Tausendertrenner und
 * optionales Trimmen von Null-Dezimalen. Nicht-finite Werte → leerer String.
 */
export const formatAxisPrice = (
  value: number,
  decimals: number | null,
  opts?: AxisPriceFormatOptions
): string => {
  if (!Number.isFinite(value)) return '';
  const dp = decimals === null ? smartDecimals(value) : decimals;
  const fixed = Math.abs(value).toFixed(dp);
  let [intPart, fracPart = ''] = fixed.split('.');

  if (opts?.trimZeros && fracPart) {
    fracPart = fracPart.replace(/0+$/, '');
  }

  const style = opts?.thousandSep ?? 'none';
  const sep = SEP_CHARS[style];
  if (sep && intPart.length > 3) {
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }

  const decimalChar = style === 'dot' ? ',' : '.';
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return sign + intPart + (fracPart ? decimalChar + fracPart : '');
};