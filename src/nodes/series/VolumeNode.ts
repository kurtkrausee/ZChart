// nodes/VolumeNode.ts
// Version: 1.1.0 | Updated: 2026-08-16 | By: Agent
// 1.1.0 (ZV10-f): Overlay-Modus — `overlayFraction` (z.B. 0.25) zeichnet das
//   Volumen als Band am unteren Rand des Main-Panes mit EIGENEM Mapping
//   (0..maxSichtbar → unteres Viertel), unabhängig von der übergebenen Scale.
//   Der Node wird dafür an eine versteckte Zusatz-Scale gebunden (Multi-Y),
//   damit er weder AutoScale noch Achse der Kerzen beeinflusst.

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import { DataStore } from '../../data/DataStore';
import type { ChartConfig } from '../../core/ChartOptions';

export class VolumeNode extends SceneNode {
  public role = 'series';
  private dataStore: DataStore;
  /** ZV10-f: > 0 → Overlay-Modus, Anteil der Pane-Höhe für das Volumen-Band. */
  public overlayFraction: number = 0;
  /** ZV10-f: Deckkraft (Overlay dezenter als Sub-Pane). */
  public alpha: number = 0.5;

  constructor(dataStore: DataStore, overlayFraction: number = 0) {
    super();
    this.dataStore = dataStore;
    this.overlayFraction = overlayFraction;
    if (overlayFraction > 0) this.alpha = 0.35;
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    const totalData = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalData);
    const visibleData = this.dataStore.getVisibleData(start, end);

    const candleSpacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    const barWidth = Math.max(1, candleSpacing * 0.8);

    // ZV10-f: Overlay-Mapping — Basis = Pane-Unterkante, Höhe = Anteil der Pane.
    const overlay = this.overlayFraction > 0;
    let maxVol = 0;
    if (overlay) {
      for (const c of visibleData) if ((c.volume || 0) > maxVol) maxVol = c.volume || 0;
    }
    const paneH = priceScale.height;
    const bandH = paneH * Math.min(0.9, this.overlayFraction);

    ctx.save();
    ctx.globalAlpha = this.alpha;

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const x = timeScale.indexToX(start + i);
      const vol = candle.volume || 0;

      let yVolume: number;
      let barHeight: number;
      if (overlay) {
        barHeight = maxVol > 0 ? (vol / maxVol) * bandH : 0;
        yVolume = paneH - barHeight;
      } else {
        // Sub-Pane: Volumen-Höhe über die Pane-Scale (0..max*1.1, AutoScaleEngine)
        yVolume = priceScale.priceToY(vol);
        const zeroY = paneH; // Unterkante der Pane
        barHeight = zeroY - yVolume;
      }

      // Farbe basierend auf Preisbewegung — eigene volumeUp/Down Slots
      const isUp = candle.close >= candle.open;
      ctx.fillStyle = isUp ? options.colors.volumeUp : options.colors.volumeDown;
      ctx.fillRect(x - barWidth / 2, yVolume, barWidth, barHeight);
    }

    ctx.restore();
  }
}
