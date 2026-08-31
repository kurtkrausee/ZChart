// nodes/CandlestickNode.ts
// Version: 2.2.0 | Updated: 2026-05-09 | By: Agent
// P4.2: separate wick/border/body colors from options.colors; candleHollow from options
// Bug-Fix: colorBarsByPrevClose — candle color based on prev close vs current close

import type { ChartConfig } from '../../core/ChartOptions';
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from '../core/SceneNode';
import { DataStore, computeHeikinAshi } from '../../data/DataStore';

export class CandlestickNode extends SceneNode {
  public role = 'series';
  private dataStore: DataStore;
  public heikinAshi: boolean = false;
  /** 1.6 Hollow mode: bullish candles are stroke-only (transparent body) */
  public hollow: boolean = false;
  private haCache: ReturnType<typeof computeHeikinAshi> | null = null;
  private haCacheLen: number = 0;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
  }

  private getHAData() {
    const all = this.dataStore.getAllData();
    if (!this.haCache || this.haCacheLen !== all.length) {
      this.haCache = computeHeikinAshi(all);
      this.haCacheLen = all.length;
    }
    return this.haCache;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig
  ): void {
    const totalCandles = this.dataStore.getAllData().length;
    const { start, end } = timeScale.getVisibleRange(totalCandles);

    const sourceData = this.heikinAshi ? this.getHAData() : this.dataStore.getAllData();
    const visibleData = sourceData.slice(Math.max(0, Math.floor(start)), Math.min(sourceData.length, Math.ceil(end) + 1));

    ctx.save();
    const { candleUp, candleDown, wickUp, wickDown,
            candleBorderUp, candleBorderDown, candleHollow,
            bodyVisible, borderVisible, wickVisible } = options.colors;
    
    const candleSpacing = timeScale.indexToX(1) - timeScale.indexToX(0);
    const bodyWidth = Math.max(1, candleSpacing * 0.8);
    const halfWidth = bodyWidth / 2;

    const startIdx = Math.max(0, Math.floor(start));

    for (let i = 0; i < visibleData.length; i++) {
      const candle = visibleData[i];
      const realIndex = startIdx + i;
      
      const x = timeScale.indexToX(realIndex);
      
      const yOpen = priceScale.priceToY(candle.open);
      const yClose = priceScale.priceToY(candle.close);
      const yHigh = priceScale.priceToY(candle.high);
      const yLow = priceScale.priceToY(candle.low);

      // colorBarsByPrevClose: compare close to previous candle's close instead of own open
      let isUp: boolean;
      if (options.colors.colorBarsByPrevClose) {
        const prevClose = realIndex > 0 ? sourceData[realIndex - 1]?.close ?? candle.open : candle.open;
        isUp = candle.close >= prevClose;
      } else {
        isUp = candle.close >= candle.open;
      }
      const wickColor   = isUp ? wickUp   : wickDown;
      const borderColor = isUp ? candleBorderUp : candleBorderDown;
      const bodyColor   = isUp ? candleUp : candleDown;

      // Körper-Dimensionen vorab berechnen
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
      const bodyBottom = bodyTop + bodyHeight;

      // 1. Docht (Wick) — zwei Segmente um den Körper herum
      if (wickVisible !== false) {
        ctx.strokeStyle = wickColor;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, bodyTop);
        ctx.moveTo(x, bodyBottom);
        ctx.lineTo(x, yLow);
        ctx.stroke();
      }

      // 2. Körper (Body)
      if (bodyVisible !== false) {
        const isHollow = candleHollow || this.hollow;
        if (isHollow && isUp) {
          ctx.strokeStyle = borderColor;
          ctx.strokeRect(x - halfWidth, bodyTop, bodyWidth, bodyHeight);
        } else {
          ctx.fillStyle = bodyColor;
          ctx.fillRect(x - halfWidth, bodyTop, bodyWidth, bodyHeight);
          if (borderVisible !== false) {
            ctx.strokeStyle = borderColor;
            ctx.strokeRect(x - halfWidth, bodyTop, bodyWidth, bodyHeight);
          }
        }
      } else if (borderVisible !== false) {
        // Body hidden but border still shown: draw only border outline
        ctx.strokeStyle = borderColor;
        ctx.strokeRect(x - halfWidth, bodyTop, bodyWidth, bodyHeight);
      }
    }
    
    ctx.restore();
  }
}