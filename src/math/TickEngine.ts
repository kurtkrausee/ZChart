// math/TickEngine.ts
// Version: 1.1.0 | Updated: 2026-08-11 | By: Agent
// v1.1.0 (ZV10-P2): scale.tickProvider hat Vorrang — deklarierte Tick-Werte
//   (z.B. RSI 0/20/50/80/100) werden auf die sichtbare Range gefiltert und
//   ersetzen die Nice-Tick-Berechnung komplett.
// ZV10-P1: "Nice Ticks" für die Y-Achse — runde Schrittweiten (1/2/2.5/5 × 10^n)
// aus sichtbarer Range + Ziel-Pixelabstand, statt fixer paneHeight/5-Teilung.
// Rein & testbar: keine Canvas-/DOM-/Dashboard-Abhängigkeiten.
//
// Modi:
// - Linear:  Ticks auf runden Preisen, gleichmäßiger Pixelabstand.
// - Prozent: Ticks auf runden Prozentwerten relativ zu basePrice
//            (PriceScale.isPercent) — die Achse labelt %, also müssen die
//            %-Werte rund sein, nicht die zugrundeliegenden Preise.
// - Log:     Ticks auf runden PREISEN (nicht runden Log-Werten); die
//            Schrittweite wird lokal pro Achsenabschnitt aus dem dortigen
//            Preisgefälle bestimmt, damit der Pixelabstand ~konstant bleibt.

import { PriceScale } from './PriceScale';

/** Ein Y-Achsen-Tick: Preis (echter Preiswert, auch im Prozent-Modus) + Pixel-Y. */
export interface AxisTick {
  price: number;
  y: number;
}

/** Default-Ziel-Pixelabstand zwischen zwei Ticks. */
export const DEFAULT_TICK_SPACING_PX = 50;

/**
 * Rundet eine rohe Schrittweite auf die nächste "schöne" Stufe
 * 1 / 2 / 2.5 / 5 × 10^n (aufgerundet, damit der Zielabstand nie
 * unterschritten wird).
 */
export function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exp = Math.floor(Math.log10(rawStep));
  const base = Math.pow(10, exp);
  const frac = rawStep / base;
  let nice: number;
  if (frac <= 1) nice = 1;
  else if (frac <= 2) nice = 2;
  else if (frac <= 2.5) nice = 2.5;
  else if (frac <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

/**
 * Entfernt Float-Rauschen aus step-Vielfachen (z.B. 1.0847500000000001 →
 * 1.08475), damit Labels wie "1.08475" statt "1.08480" entstehen.
 */
function snapToStep(value: number, step: number): number {
  const snapped = Math.round(value / step) * step;
  if (Math.abs(snapped) >= 1e20) return snapped; // toFixed-Grenze
  return Number(snapped.toFixed(12));
}

/**
 * Berechnet die Y-Achsen-Ticks für eine PriceScale.
 * Voraussetzung wie beim Rendering: `scale.height === paneHeight`
 * (setzt ChartManager vor jedem Draw). Degenerierte Ranges
 * (min >= max, nicht-finite Werte, height <= 0) → leeres Array.
 */
export function computeNiceTicks(
  scale: PriceScale,
  paneHeight: number,
  targetSpacingPx: number = DEFAULT_TICK_SPACING_PX
): AxisTick[] {
  if (!Number.isFinite(paneHeight) || paneHeight <= 0) return [];
  if (!Number.isFinite(scale.minPrice) || !Number.isFinite(scale.maxPrice)) return [];
  if (scale.maxPrice <= scale.minPrice) return [];

  // ZV10-P2: Deklarierte Ticks (Registry/Pane) ersetzen die Nice-Tick-Logik.
  if (scale.tickProvider) {
    return providerTicks(scale, paneHeight);
  }

  const spacing = Math.max(10, targetSpacingPx);

  if (scale.isPercent && scale.basePrice > 0) {
    return percentTicks(scale, paneHeight, spacing);
  }
  if (scale.isLog) {
    return logTicks(scale, paneHeight, spacing);
  }
  return linearTicks(scale, paneHeight, spacing);
}

function providerTicks(scale: PriceScale, paneHeight: number): AxisTick[] {
  const values = scale.tickProvider?.(scale) ?? [];
  return values
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b)
    .map((price) => ({ price, y: scale.priceToY(price) }))
    .filter((t) => t.y >= -0.5 && t.y <= paneHeight + 0.5);
}

function linearTicks(scale: PriceScale, paneHeight: number, spacing: number): AxisTick[] {
  const min = scale.minPrice;
  const max = scale.maxPrice;
  const intervals = Math.max(1, paneHeight / spacing);
  const step = niceStep((max - min) / intervals);
  const ticks: AxisTick[] = [];
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  for (let i = first; i <= last; i++) {
    const price = snapToStep(i * step, step);
    const y = scale.priceToY(price);
    if (y < -0.5 || y > paneHeight + 0.5) continue;
    ticks.push({ price, y });
  }
  return ticks;
}

function percentTicks(scale: PriceScale, paneHeight: number, spacing: number): AxisTick[] {
  // Runde Ticks im %-Raum: pct = (price - base) / base * 100.
  const base = scale.basePrice;
  const pctMin = ((scale.minPrice - base) / base) * 100;
  const pctMax = ((scale.maxPrice - base) / base) * 100;
  if (!Number.isFinite(pctMin) || !Number.isFinite(pctMax) || pctMax <= pctMin) return [];
  const intervals = Math.max(1, paneHeight / spacing);
  const step = niceStep((pctMax - pctMin) / intervals);
  const ticks: AxisTick[] = [];
  const first = Math.ceil(pctMin / step - 1e-9);
  const last = Math.floor(pctMax / step + 1e-9);
  for (let i = first; i <= last; i++) {
    const pct = snapToStep(i * step, step);
    const price = base * (1 + pct / 100);
    const y = scale.priceToY(price);
    if (y < -0.5 || y > paneHeight + 0.5) continue;
    ticks.push({ price, y });
  }
  return ticks;
}

function logTicks(scale: PriceScale, paneHeight: number, spacing: number): AxisTick[] {
  // Log-Modus: Ticks auf runden Preisen. Da der Preis-pro-Pixel-Gradient
  // über die Achse variiert, wird die Schrittweite LOKAL bestimmt: an jeder
  // Position entspricht sie dem Preisgefälle über ~einen Zielabstand.
  const ticks: AxisTick[] = [];
  const maxTicks = Math.ceil(paneHeight / spacing) + 2;
  let y = 0;
  let lastPrice = Infinity;
  while (y < paneHeight && ticks.length < maxTicks) {
    const pHere = scale.yToPrice(y);
    const pNext = scale.yToPrice(Math.min(y + spacing, paneHeight));
    const localDelta = pHere - pNext;
    if (!(localDelta > 0) || !Number.isFinite(localDelta)) break;
    const step = niceStep(localDelta);
    // Größter runder Preis <= pHere (Preis fällt mit wachsendem y).
    let price = snapToStep(Math.floor(pHere / step + 1e-9) * step, step);
    if (price >= lastPrice) price = snapToStep(price - step, step);
    if (price <= 0) break;
    const tickY = scale.priceToY(price);
    if (tickY > paneHeight + 0.5) break;
    if (tickY >= -0.5) {
      ticks.push({ price, y: tickY });
      lastPrice = price;
    }
    y = Math.max(tickY, y) + spacing;
  }
  return ticks;
}
