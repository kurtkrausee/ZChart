// nodes/series/MarkerSeriesNode.ts
// Version: 1.0.0 | Updated: 2026-08-17 | By: Agent
// ============================================================================
//  MarkerSeriesNode — Marken je Datenpunkt OHNE Verbindungslinie (AR-P6 / E6)
//
//  Zeichnet je Datenpunkt eine Marke (Raute / Querstrich / Kreis) an der
//  Position `priceScale.priceToY(candle[dataKey])`. Bewusst OHNE Linie: eine
//  durchgehende Linie ueber diskrete Laeufe liest sich wie ein Artefakt
//  (README-Analyse §13). Das Chart.js-Pendant im Mockup ist `showLine:false`.
//
//  Core-rein: keine App-Imports; Farbe/Groesse kommen von aussen.
//
//  Einsatz (AR-P6 Rating-Statistik): Ø-Rating je Lauf (Raute, Akzentfarbe)
//  und rollierender Ø (grauer Querstrich) auf einer eigenen Pane mit fester
//  Skala ueber den Rang-Bereich des Modell-Manifests
//  (`pane.priceScale.fixedRange = { min, max }`, ZV10-P2).
// ============================================================================

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

/** Form der Marke. `dash` ist ein horizontaler Querstrich. */
export type MarkerShape = 'diamond' | 'dash' | 'circle';

export interface MarkerSeriesOptions {
  shape: MarkerShape;
  color: string;
  /** Kantenlaenge/Durchmesser in Pixeln. Default 7. */
  size?: number;
  /** Strichstaerke fuer `dash` (und Kontur). Default 2. */
  lineWidth?: number;
  /** Deckkraft (0..1). Default 1. */
  opacity?: number;
}

/** Minimale DataStore-Schnittstelle, die dieser Node braucht. */
interface MarkerDataSource {
  getAllData(): Array<Record<string, unknown>>;
  getVisibleData(start: number, end: number): Array<Record<string, unknown>>;
}

export class MarkerSeriesNode extends SceneNode {
  public role = 'series';

  private dataStore: MarkerDataSource;
  private dataKey: string;
  private shape: MarkerShape;
  private color: string;
  private size: number;
  private lineWidth: number;
  private opacity: number;

  constructor(
    dataStore: MarkerDataSource,
    dataKey: string,
    opts: MarkerSeriesOptions,
  ) {
    super();
    this.dataStore = dataStore;
    this.dataKey = dataKey;
    this.shape = opts.shape;
    this.color = opts.color;
    this.size = opts.size ?? 7;
    this.lineWidth = opts.lineWidth ?? 2;
    this.opacity = opts.opacity ?? 1;
  }

  /** Farbe austauschen (Theme-Wechsel) — ohne Node-Neuaufbau. */
  public setColor(color: string): void {
    this.color = color;
  }

  /** Form austauschen. */
  public setShape(shape: MarkerShape): void {
    this.shape = shape;
  }

  /** Numerischer Feldwert; `null` bei fehlend/NaN. */
  private valueOf(candle: Record<string, unknown>): number | null {
    const raw = candle[this.dataKey];
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
    const totalData = this.dataStore.getAllData().length;
    if (totalData === 0) return;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);
    if (visibleData.length === 0) return;

    const candleSpacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    // Marke nie breiter als der Kerzen-Abstand (sonst ueberlappen sie bei
    // vielen Punkten zu einem Band).
    const s = Math.max(2, Math.min(this.size, Math.max(2, candleSpacing)));
    const half = s / 2;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;

    for (let i = 0; i < visibleData.length; i++) {
      const value = this.valueOf(visibleData[i]);
      if (value === null) continue;

      const x = timeScale.indexToX(start + i);
      const y = priceScale.priceToY(value);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

      switch (this.shape) {
        case 'diamond': {
          ctx.beginPath();
          ctx.moveTo(x, y - half);
          ctx.lineTo(x + half, y);
          ctx.lineTo(x, y + half);
          ctx.lineTo(x - half, y);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'dash': {
          // Querstrich: etwas breiter als hoch — liest sich als Niveau-Marke.
          const w = Math.max(3, candleSpacing * 0.6);
          ctx.beginPath();
          ctx.moveTo(x - w / 2, y);
          ctx.lineTo(x + w / 2, y);
          ctx.stroke();
          break;
        }
        case 'circle': {
          ctx.beginPath();
          ctx.arc(x, y, half, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }

    ctx.restore();
  }

  /**
   * Min/Max der Serie (alle Punkte) — Hilfe fuer den Aufrufer, wenn er die
   * Pane-Skala selbst setzt. `null`, wenn kein finiter Wert vorliegt.
   */
  public getValueRange(): { min: number; max: number } | null {
    const all = this.dataStore.getAllData();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const candle of all) {
      const v = this.valueOf(candle);
      if (v === null) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
  }
}
