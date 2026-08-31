// nodes/YAxisNode.ts
// Version: 2.1.0 | Updated: 2026-08-18 | By: Agent
// 2.1.0 (AR-Polish 12): scale.labelFormatter hat Vorrang in formatTick.
// 2.0.0 (ZV10-P7b): Multi-Y-Achse — draw() nimmt die Pane + Zusatz-Spalten
//   (axisLayout.AxisColumn) statt einer einzelnen PriceScale. Die Default-Scale
//   behält die left/right/both/hidden-Logik; Zusatz-Scales rendern als rechts
//   gestapelte Spalten (nur Ticks/Labels, KEIN Grid — Grid folgt allein der
//   Default-Scale). Grid-Horizontalen enden an der innersten Spalte.
// ZV10-P4: formatAxisPrice — Tausendertrenner + Zero-Trimming aus layout-Settings
// P7.3: labelsVisible — skip price labels when false (axis background still drawn)
// Bug-Fix: priceDecimals — use formatWithPrecision(price, options.layout.priceDecimals)

import type { ChartConfig } from '../../core/ChartOptions';
import { Pane } from '../../core/Pane';
import { PriceScale } from '../../math/PriceScale';
import type { AxisColumn } from '../../core/axisLayout';
import { computeNiceTicks } from '../../math/TickEngine';
import { formatKiloMega, autoFormatPrice, formatAxisPrice } from '../../utils/Formatters';

export class YAxisNode {
  public draw(
    ctx: CanvasRenderingContext2D,
    paneHeight: number,
    pane: Pane,
    width: number,
    yOffset: number,
    options: ChartConfig,
    extraColumns: AxisColumn[] = []
  ) {
    ctx.save();

    const priceScale = pane.priceScale;
    const paneId = pane.id;

    // P7.2: scales placement='hidden' — Default-Achse nicht zeichnen,
    // Zusatz-Spalten (falls vorhanden) aber schon.
    const defaultHidden = (priceScale as any).hideAxis === true;

    const axisWidth = options.layout.axisWidth;
    const pos = priceScale.axisPosition ?? 'right';
    const drawRight = !defaultHidden && (pos === 'right' || pos === 'both');
    const drawLeft = !defaultHidden && (pos === 'left' || pos === 'both');
    const rightAxisX = drawLeft && !drawRight ? 0 : width - axisWidth;
    const leftAxisX = 0;

    // Right axis background
    if (drawRight) {
      ctx.fillStyle = options.colors.background;
      ctx.fillRect(rightAxisX, yOffset, axisWidth, paneHeight);
      ctx.strokeStyle = options.colors.axisLine;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rightAxisX, yOffset); ctx.lineTo(rightAxisX, yOffset + paneHeight); ctx.stroke();
    }
    // Left axis background
    if (drawLeft) {
      ctx.fillStyle = options.colors.background;
      ctx.fillRect(leftAxisX, yOffset, axisWidth, paneHeight);
      ctx.strokeStyle = options.colors.axisLine;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(leftAxisX + axisWidth, yOffset); ctx.lineTo(leftAxisX + axisWidth, yOffset + paneHeight); ctx.stroke();
    }

    const labelsVisible = options.priceLabels?.labelsVisible !== false;
    ctx.fillStyle = options.colors.text;
    ctx.font = `${options.layout.fontSize}px ${options.layout.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = options.colors.gridHorz; // P4.7: eigene Farbe für horizontale Grid-Linien
    ctx.lineWidth = options.grid.horizontalLines.lineWidth;

    // ZV10-P7b: Grid endet an der innersten Achsen-Spalte (Content-Kante).
    const innerRight = extraColumns.length > 0
      ? Math.min(...extraColumns.map(c => c.x))
      : rightAxisX;

    if (!defaultHidden) {
      // ZV10-P1: Nice Ticks statt fixer Pixel-Teilung; Grid + Labels bleiben
      // deckungsgleich, weil beide dieselben Tick-Positionen nutzen.
      const ticks = computeNiceTicks(priceScale, paneHeight);
      for (const tick of ticks) {
        const y = tick.y;
        const formattedText = this.formatTick(tick.price, priceScale, paneId, options);

        // Grid lines
        if (options.grid.horizontalLines.visible) {
          const gridLeft = drawLeft ? axisWidth : 0;
          const gridRight = drawRight ? innerRight : width;
          ctx.beginPath(); ctx.moveTo(gridLeft, yOffset + y); ctx.lineTo(gridRight, yOffset + y); ctx.stroke();
        }

        // Labels (P7.3: respect labelsVisible flag)
        if (labelsVisible) {
          if (drawRight) {
            ctx.textAlign = 'right';
            ctx.fillText(formattedText, width - 5, yOffset + y);
          }
          if (drawLeft) {
            ctx.textAlign = 'left';
            ctx.fillText(formattedText, 5, yOffset + y);
          }
        }
      }
    }

    // ZV10-P7b: Zusatz-Spalten — Hintergrund + Separator + Ticks/Labels je
    // Scale, die DIESE Pane führt (fremde Spalten: nur Hintergrund, damit die
    // Spalte über alle Panes durchgehend wirkt). Kein Grid, keine paneId-
    // Sonderformate (generisches Preisformat inkl. Prozent-Modus der Scale).
    for (const col of extraColumns) {
      ctx.fillStyle = options.colors.background;
      ctx.fillRect(col.x, yOffset, col.width, paneHeight);
      ctx.strokeStyle = options.colors.axisLine;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(col.x, yOffset); ctx.lineTo(col.x, yOffset + paneHeight); ctx.stroke();

      const scale = pane.priceScales.get(col.scaleId);
      if (!scale || (scale as any).hideAxis) continue;
      if (!labelsVisible) continue;

      ctx.fillStyle = options.colors.text;
      ctx.font = `${options.layout.fontSize}px ${options.layout.fontFamily}`;
      ctx.textAlign = 'right';
      const ticks = computeNiceTicks(scale, paneHeight);
      for (const tick of ticks) {
        ctx.fillText(
          this.formatTick(tick.price, scale, null, options),
          col.x + col.width - 5,
          yOffset + tick.y
        );
      }
    }

    ctx.restore();
  }

  /**
   * Tick-Formatierung: paneId-Sonderformate (volume/rsi/atr) nur für die
   * Default-Scale (paneId != null); Prozent-Modus und Zahlenformat (P4)
   * gelten für jede Scale.
   */
  private formatTick(price: number, scale: PriceScale, paneId: string | null, options: ChartConfig): string {
    // AR-Polish 12: deklarativer Formatter der Scale hat Vorrang (Statistik „50 %").
    if (scale.labelFormatter) return scale.labelFormatter(price);
    if (paneId === 'volume') return formatKiloMega(price);
    if (paneId === 'rsi' || paneId === 'stochastic') return price.toFixed(0);
    if (paneId === 'atr') return autoFormatPrice(price);
    if (scale.isPercent && scale.basePrice > 0) {
      const pct = ((price - scale.basePrice) / scale.basePrice) * 100;
      return pct.toFixed(2) + '%';
    }
    // ZV10-P4: Tausendertrenner + optionales Zero-Trimming aus den Settings
    return formatAxisPrice(price, options.layout.priceDecimals, {
      thousandSep: options.layout.thousandSeparator,
      trimZeros: options.layout.trimTrailingZeros,
    });
  }
}
