// nodes/core/LastPriceLineNode.ts
// Version: 1.3.0 | Updated: 2026-08-11 | By: Agent
// ZV10-P4: formatAxisPrice — Tausendertrenner + Zero-Trimming für das Preislabel

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from './SceneNode';
import { DataStore } from '../../data/DataStore';
import type { ChartConfig } from '../../core/ChartOptions';
import { formatAxisPrice } from '../../utils/Formatters';

export class LastPriceLineNode extends SceneNode {
  private dataStore: DataStore;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
  }

  draw(ctx: CanvasRenderingContext2D, _timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    const allData = this.dataStore.getAllData();
    if (allData.length === 0) return;

    const lastCandle = allData[allData.length - 1];
    const price = lastCandle.close;
    const y = priceScale.priceToY(price);
    const chartWidth = (ctx.canvas.width / (window.devicePixelRatio || 1)) - options.layout.axisWidth;

    // Determine color based on open vs close
    const isUp = lastCandle.close >= lastCandle.open;
    const color = isUp ? options.colors.candleUp : options.colors.candleDown;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;

    // Dashed line across chart area
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartWidth, y);
    ctx.stroke();

    // Price label on the right edge (in Y-axis area) — eigene lastPriceLabelBg/Text Slots
    ctx.setLineDash([]);
    const priceText = formatAxisPrice(price, options.layout.priceDecimals, {
      thousandSep: options.layout.thousandSeparator,
      trimZeros: options.layout.trimTrailingZeros,
    });
    const font = `bold ${options.layout.fontSize - 1}px ${options.layout.fontFamily}`;
    ctx.font = font;
    const textW = ctx.measureText(priceText).width + 10;
    const labelH = 18;
    const labelX = chartWidth + 1;
    const labelY = y - labelH / 2;

    ctx.fillStyle = options.colors.lastPriceLabelBg;
    ctx.fillRect(labelX, labelY, textW, labelH);
    ctx.fillStyle = options.colors.lastPriceLabelText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, labelX + 5, y);

    ctx.restore();
  }
}
