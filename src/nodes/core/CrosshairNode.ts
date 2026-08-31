// nodes/CrosshairNode.ts
// Version: 2.3.0 | Updated: 2026-08-13 | By: Agent
// 2.3.0 (ZV10-P7b): Preis-Label je Zusatz-Achsen-Spalte (Multi-Y-Achse);
//   Default-Label rückt auf die äußere Default-Spalte.
// ZV10-P4: formatAxisPrice — Tausendertrenner + Zero-Trimming für das Y-Preislabel
// 2.1.0: dash-Property (Stil-abhängiges Line-Dash statt hardcoded [4,4])

import { TimeScale } from '../../math/TimeScale';
import type { ChartConfig } from '../../core/ChartOptions';
import { crosshairLabel } from '../../utils/timeFormat';
import type { AxisFormatOptions } from '../../utils/timeFormat';
import { formatAxisPrice } from '../../utils/Formatters';

export type CrosshairStyle = 'cross' | 'line' | 'hidden';

export class CrosshairNode {
  public style: CrosshairStyle = 'cross';
  /** Dash-Pattern der Crosshair-Linien — wird von SettingsController je nach
   *  VisualSettings-Stil gesetzt (cross [4,4], dashed [8,5], dotted [2,3]). */
  public dash: number[] = [4, 4];
  /** Snap crosshair to closest OHLC price (2.10) */
  public snapToOHLC: boolean = false;

  public draw(
    ctx: CanvasRenderingContext2D,
    mousePos: { x: number; y: number },
    chartContentWidth: number,
    height: number,
    timeScale: TimeScale,
    getPaneAtY: (y: number) => { pane: any; localY: number } | null,
    options: ChartConfig,
    dataStore?: any,
    lastPriceGlobalY?: number,
    // ZV10-P7b: Zusatz-Achsen-Spalten — je Spalte ein Preis-Label der Scale
    axisColumns: Array<{ scaleId: string; x: number; width: number }> = []
  ) {
    const { x, y } = mousePos;
    const axisWidth = options.layout.axisWidth;

    if (this.style === 'hidden') return;

    // --- SNAPPING LOGIK ---
    const index = Math.floor(timeScale.xToIndex(x));
    const snappedX = timeScale.indexToX(index);

    // Snap Y to OHLC if enabled (2.10)
    let snappedY = y;
    if (this.snapToOHLC && dataStore) {
      const allData = dataStore.getAllData();
      const idx = Math.round(index);
      if (idx >= 0 && idx < allData.length) {
        const paneInfo = getPaneAtY(y);
        if (paneInfo && paneInfo.pane.id === 'main') {
          const c = allData[idx];
          const mousePrice = paneInfo.pane.priceScale.yToPrice(paneInfo.localY);
          const candidates = [c.open, c.high, c.low, c.close];
          let bestPrice = mousePrice;
          let bestDist = Infinity;
          for (const val of candidates) {
            const d = Math.abs(val - mousePrice);
            if (d < bestDist) { bestDist = d; bestPrice = val; }
          }
          snappedY = paneInfo.pane.priceScale.priceToY(bestPrice) + paneInfo.pane.topOffset;
        }
      }
    }

    ctx.save();
    
    ctx.setLineDash(this.dash);
    ctx.strokeStyle = options.colors.crosshair;
    ctx.lineWidth = 1;

    // 1. Vertikale Linie (Zeit)
    ctx.beginPath();
    ctx.moveTo(snappedX, 0);
    ctx.lineTo(snappedX, height);
    ctx.stroke();

    // 2. Horizontale Linie (Preis) - nur im Chart-Bereich, nur bei 'cross'-Stil
    if (x <= chartContentWidth && this.style === 'cross') {
      ctx.beginPath();
      ctx.moveTo(0, snappedY);
      ctx.lineTo(chartContentWidth, snappedY);
      ctx.stroke();
    }

    // --- LABELS (TAGS) ---
    ctx.setLineDash([]); 
    ctx.font = `${options.layout.fontSize}px ${options.layout.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Preis-Label rechts
    const paneInfo = getPaneAtY(snappedY);
    if (paneInfo) {
      const localSnappedY = snappedY - paneInfo.pane.topOffset;
      const price = paneInfo.pane.priceScale.yToPrice(localSnappedY);
      // Pane-spezifische Formatierung
      const paneId: string = paneInfo.pane.id ?? 'main';
      let priceText: string;
      if (paneId === 'volume') { priceText = price.toFixed(0); }
      else if (paneId === 'rsi' || paneId === 'stochastic') { priceText = price.toFixed(1); }
      else { priceText = (price >= 0 && price <= 100 && (paneId === 'rsi' || paneId === 'stochastic' || paneId === 'cci' || paneId === 'adx'))
        ? price.toFixed(1)
        : formatAxisPrice(price, options.layout.priceDecimals, {
            thousandSep: options.layout.thousandSeparator,
            trimZeros: options.layout.trimTrailingZeros,
          }); }
      
      // Offset crosshair label if it overlaps the LastPriceLine label (threshold = 19px)
      let labelY = snappedY;
      if (lastPriceGlobalY !== undefined) {
        const dist = snappedY - lastPriceGlobalY;
        if (Math.abs(dist) < 19) {
          labelY = lastPriceGlobalY + (dist <= 0 ? -19 : 19);
          // clamp inside chart
          labelY = Math.max(10, Math.min(height - 10, labelY));
        }
      }
      // ZV10-P7b: Default-Spalte sitzt außen — rechts der Zusatz-Spalten.
      const defaultLabelX = chartContentWidth + axisColumns.length * axisWidth + axisWidth / 2;
      this.drawLabel(ctx, priceText, defaultLabelX, labelY, axisWidth, 20, options);

      // ZV10-P7b: je Zusatz-Spalte ein Label mit dem Preis der jeweiligen Scale
      // (nur wenn die Pane unterm Cursor diese Scale führt).
      const scalesMap: Map<string, any> | undefined = paneInfo.pane.priceScales;
      if (scalesMap) {
        for (const col of axisColumns) {
          const scale = scalesMap.get(col.scaleId);
          if (!scale || scale.hideAxis) continue;
          const colPrice = scale.yToPrice(localSnappedY);
          let colText: string;
          if (scale.isPercent && scale.basePrice > 0) {
            colText = (((colPrice - scale.basePrice) / scale.basePrice) * 100).toFixed(2) + '%';
          } else {
            colText = formatAxisPrice(colPrice, options.layout.priceDecimals, {
              thousandSep: options.layout.thousandSeparator,
              trimZeros: options.layout.trimTrailingZeros,
            });
          }
          this.drawLabel(ctx, colText, col.x + col.width / 2, snappedY, col.width, 20, options);
        }
      }
    }

    // Zeit-Label unten — echtes Datum/Uhrzeit in User-Timezone
    const idx = Math.round(index);
    const allData = dataStore?.getAllData();
    let timeText = '';
    if (allData && allData.length > 0 && idx >= 0) {
      const tz = options.timezone || 'UTC';
      const ivMs = options.intervalMs || 300_000;
      let ts: number;
      if (idx < allData.length) {
        ts = allData[idx].timestamp;
      } else {
        // Extrapoliere Timestamp rechts vom letzten Candle
        const lastTs = allData[allData.length - 1].timestamp;
        ts = lastTs + (idx - (allData.length - 1)) * ivMs;
      }
      timeText = crosshairLabel(ts, tz, ivMs, {
        timeFormat: (options as any).timeScale?.timeFormat ?? '24h',
        dateFormat: (options as any).timeScale?.dateFormat ?? 'dd.MM.yyyy',
      } as AxisFormatOptions);
    }
    const textWidth = ctx.measureText(timeText).width + 12;
    this.drawLabel(ctx, timeText, snappedX, height - 10, textWidth, 20, options);

    ctx.restore();
  }

  private drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number, options: ChartConfig) {
    ctx.fillStyle = options.colors.crosshairLabelBg;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = options.colors.crosshairLabelText;
    ctx.fillText(text, x, y);
  }
}