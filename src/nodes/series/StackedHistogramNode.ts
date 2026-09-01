// nodes/series/StackedHistogramNode.ts
// Version: 1.1.0 | Updated: 2026-08-18 | By: Agent
// 1.1.0 (AR-P8): getAutoScaleRange() fuer die AutoScaleEngine (0..Stapel-Max).
// ============================================================================
//  StackedHistogramNode — gestapelte Balken je Datenpunkt (AR-P6 / E6 / E18)
//
//  Zeichnet je Datenpunkt einen Balken, der sich aus mehreren Segmenten
//  zusammensetzt: `keys[i]` liest das Feld `candle[keys[i]]`, `colors[i]` ist
//  die Farbe des zugehoerigen Segments. Gestapelt wird von der Nulllinie der
//  Skala aufwaerts in der Reihenfolge von `keys` (Index 0 unten).
//
//  Core-rein: keine App-Imports, keine App-Tokens — Farben kommen als
//  Konstruktor-Argument bzw. ueber `setColors()` von aussen (der Aufrufer
//  liest sie z.B. aus CSS-Variablen oder einem Modell-Manifest).
//
//  Einsatz (AR-P6 Rating-Statistik): Klassen-Verteilung je Lauf; `percent`
//  normiert jeden Balken auf 0..100 (%-Stack). Wiederverwendbar u.a. fuer den
//  Verteilungs-Charts.
//
//  Nulllinie: `priceScale.priceToY(0)` — die Pane sollte daher eine Skala
//  haben, die 0 enthaelt (z.B. `pane.priceScale.fixedRange = {min:0,max:N}`
//  bzw. Auto-Scale ueber Werte >= 0).
// ============================================================================

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

export interface StackedHistogramOptions {
  /** true = jeder Balken wird auf 0..100 normiert (%-Stack). Default false. */
  percent?: boolean;
  /** Balkenbreite als Anteil des Kerzen-Abstands (0..1). Default 0.8. */
  barWidthRatio?: number;
  /** Deckkraft der Balken (0..1). Default 1. */
  opacity?: number;
  /** Pixel-Luecke zwischen zwei gestapelten Segmenten. Default 0. */
  gap?: number;
}

/** Treffer eines `hitTest()` — Datenpunkt-Index, Segment-Key und Rohwert. */
export interface StackedHistogramHit {
  index: number;
  key: string;
  value: number;
}

/** Minimale DataStore-Schnittstelle, die dieser Node braucht. */
interface StackedDataSource {
  getAllData(): Array<Record<string, unknown>>;
  getVisibleData(start: number, end: number): Array<Record<string, unknown>>;
}

export class StackedHistogramNode extends SceneNode {
  public role = 'series';

  private dataStore: StackedDataSource;
  private keys: string[];
  private colors: string[];
  private percent: boolean;
  private barWidthRatio: number;
  private opacity: number;
  private gap: number;

  /**
   * Segment-Geometrie des letzten `draw()` — Grundlage fuer `hitTest()`.
   * Wird bei jedem Zeichnen neu befuellt (nur sichtbare Datenpunkte).
   */
  private lastRects: Array<{
    index: number;
    key: string;
    value: number;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  }> = [];

  constructor(
    dataStore: StackedDataSource,
    keys: string[],
    colors: string[],
    opts: StackedHistogramOptions = {},
  ) {
    super();
    this.dataStore = dataStore;
    this.keys = [...keys];
    this.colors = [...colors];
    this.percent = opts.percent ?? false;
    this.barWidthRatio = opts.barWidthRatio ?? 0.8;
    this.opacity = opts.opacity ?? 1;
    this.gap = opts.gap ?? 0;
  }

  /** Farben austauschen (Theme-Wechsel) — ohne Node-Neuaufbau. */
  public setColors(colors: string[]): void {
    this.colors = [...colors];
  }

  /** %-Stack ein-/ausschalten (Toggle) — ohne Node-Neuaufbau. */
  public setPercent(percent: boolean): void {
    this.percent = percent;
  }

  /** Segment-Keys austauschen (z.B. bei Modell-Wechsel). */
  public setKeys(keys: string[]): void {
    this.keys = [...keys];
  }

  /** Aktuell gezeichnete Segment-Keys (Kopie). */
  public getKeys(): string[] {
    return [...this.keys];
  }

  /**
   * Segment unter einem Canvas-Punkt (Pane-lokale Koordinaten, wie sie auch
   * `draw()` bekommt). Liefert `null`, wenn dort kein Segment liegt.
   * Grundlage ist die Geometrie des letzten `draw()`-Aufrufs.
   */
  public hitTest(x: number, y: number): StackedHistogramHit | null {
    for (const r of this.lastRects) {
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) {
        return { index: r.index, key: r.key, value: r.value };
      }
    }
    return null;
  }

  /**
   * Datenpunkt-Index unter einer X-Position (auch ausserhalb der Balken —
   * fuer einen Tooltip, der die ganze Spalte beschreibt). `null`, wenn die
   * X-Position keinen sichtbaren Datenpunkt trifft.
   */
  public indexAtX(x: number): number | null {
    let best: { index: number; dist: number } | null = null;
    for (const r of this.lastRects) {
      const cx = (r.x0 + r.x1) / 2;
      const dist = Math.abs(x - cx);
      if (!best || dist < best.dist) best = { index: r.index, dist };
    }
    if (!best) return null;
    return best.index;
  }

  /** Numerischer Feldwert eines Datenpunkts; `null` bei fehlend/NaN. */
  private valueOf(candle: Record<string, unknown>, key: string): number | null {
    const raw = candle[key];
    if (raw === undefined || raw === null) return null;
    const v = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(v) ? v : null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    _options: ChartConfig,
  ): void {
    this.lastRects = [];
    if (this.keys.length === 0) return;

    const totalData = this.dataStore.getAllData().length;
    if (totalData === 0) return;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);
    if (visibleData.length === 0) return;

    const candleSpacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    const barWidth = Math.max(1, candleSpacing * this.barWidthRatio);
    const yZero = priceScale.priceToY(0);

    ctx.save();
    ctx.globalAlpha = this.opacity;

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const dataIndex = start + i;

      // Werte des Punktes einsammeln; NULL/NaN werden uebersprungen.
      const values: Array<number | null> = this.keys.map((k) => this.valueOf(candle, k));

      // %-Stack: je Punkt auf die Summe normieren (Summe 0 -> nichts zeichnen).
      let scale = 1;
      if (this.percent) {
        let sum = 0;
        for (const v of values) if (v !== null && v > 0) sum += v;
        if (sum <= 0) continue;
        scale = 100 / sum;
      }

      const x = timeScale.indexToX(dataIndex);
      const x0 = x - barWidth / 2;

      // Von der Nulllinie aufwaerts stapeln.
      let acc = 0;
      for (let k = 0; k < this.keys.length; k++) {
        const raw = values[k];
        if (raw === null || raw <= 0) continue;

        const seg = raw * scale;
        const yBottom = priceScale.priceToY(acc);
        acc += seg;
        const yTop = priceScale.priceToY(acc);

        // Hoehe inkl. Luecke; Segmente unter 1px bleiben 1px sichtbar.
        const rawHeight = yBottom - yTop;
        const height = Math.max(1, rawHeight - this.gap);
        if (!Number.isFinite(height)) continue;

        ctx.fillStyle = this.colors[k % this.colors.length] ?? '#888888';
        ctx.fillRect(x0, yTop, barWidth, height);

        this.lastRects.push({
          index: dataIndex,
          key: this.keys[k],
          value: raw,
          x0,
          x1: x0 + barWidth,
          y0: yTop,
          y1: yTop + height,
        });
      }

      // Nulllinien-Referenz nicht verlieren (Debug/Lesbarkeit): yZero wird
      // implizit ueber priceToY(0) genutzt — hier bewusst keine Extra-Linie,
      // dafuer gibt es StaticLineNode.
      void yZero;
    }

    ctx.restore();
  }

  /**
   * Auto-Scale-Beitrag: Maximum der Stapel-Summen (bzw. 100 im %-Modus).
   * `null`, wenn keine Daten vorliegen. Der Aufrufer kann damit eine
   * `fixedRange` setzen; die AutoScaleEngine ruft diese Methode nicht selbst.
   */
  /**
   * AutoScaleEngine-Duck-Typing (scaleGeneric, v1.6.0): Y-Range 0..Stapel-Max
   * (+5 % Luft), damit absolute Zaehler NICHT auf der Default-Skala 0..100
   * geclippt werden (AR-P8-Fund: ohne %-Stack fuellte „Muell" die ganze Pane).
   */
  public getAutoScaleRange(): { min: number; max: number } | null {
    const max = this.getStackMax();
    if (max === null || max <= 0) return null;
    return { min: 0, max: this.percent ? 100 : max * 1.05 };
  }

  public getStackMax(): number | null {
    if (this.percent) return 100;
    const all = this.dataStore.getAllData();
    let max: number | null = null;
    for (const candle of all) {
      let sum = 0;
      for (const key of this.keys) {
        const v = this.valueOf(candle, key);
        if (v !== null && v > 0) sum += v;
      }
      if (max === null || sum > max) max = sum;
    }
    return max;
  }
}
