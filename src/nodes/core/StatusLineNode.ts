// nodes/core/StatusLineNode.ts
// Version: 1.0.0 | Updated: 2026-05-05 | By: Agent
// P6.1: TV-Style Status Line Overlay — Top-Left, Logo + Title + MarketStatus +
//       OHLCV + BarChange + Volume + LastDayChange + semi-transparent Background

import { SceneNode } from './SceneNode';
import type { TimeScale } from '../../math/TimeScale';
import type { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import { DataStore } from '../../data/DataStore';
import { autoFormatPrice, formatKiloMega } from '../../utils/Formatters';
import type { StatusLineSettings } from '../../core/VisualSettings';
import { defaultVisualSettings } from '../../core/VisualSettings';

// ─── Types ──────────────────────────────────────────────────────────────────

type Segment = {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PAD        = 8;   // outer margin from canvas edge
const INNER_PAD  = 5;   // padding inside background rect
const ROW_H      = 18;  // row height (single-line)
const LOGO_SIZE  = 16;  // logo square side length
const FONT_SIZE  = 11;  // base font size in px
const SEG_GAP    = 8;   // horizontal gap between segments

// ─── Node ────────────────────────────────────────────────────────────────────

export class StatusLineNode extends SceneNode {
  public role      = 'statusline';
  public isVisible = true;
  public zIndex    = 900; // above all series/overlay layers

  /** Full StatusLine settings — set by ZChartAPI.applySettings() */
  public settings: StatusLineSettings = { ...defaultVisualSettings.statusLine };

  /** Symbol name / description — updated by ZChartAPI.setStatusLineSymbol() */
  public symbolName        = '';
  public symbolDescription = '';

  /**
   * Hovered bar index (0-based). null means "show last candle".
   * Set by ChartManager.render() each frame when a mouse position is available.
   */
  public hoveredIndex: number | null = null;

  private readonly dataStore: DataStore;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
  }

  // ── Main draw ──────────────────────────────────────────────────────────────

  draw(
    ctx: CanvasRenderingContext2D,
    _timeScale: TimeScale,
    _priceScale: PriceScale,
    options: ChartConfig,
  ): void {
    if (!this.isVisible || !this.settings.visible) return;

    const allData = this.dataStore.getAllData();
    if (allData.length === 0) return;

    // Pick candle to display
    const idx =
      this.hoveredIndex !== null &&
      this.hoveredIndex >= 0 &&
      this.hoveredIndex < allData.length
        ? this.hoveredIndex
        : allData.length - 1;

    const candle    = allData[idx];
    const prevCandle = idx > 0 ? allData[idx - 1] : null;

    const labelFont = `${FONT_SIZE}px ${options.layout.fontFamily}`;
    const boldFont  = `bold ${FONT_SIZE}px ${options.layout.fontFamily}`;

    ctx.save();

    // ── Build segment list ──────────────────────────────────────────────────

    const segments: Segment[] = [];

    if (this.settings.chartValues) {
      const closeColor = candle.close >= candle.open
        ? options.colors.candleUp
        : options.colors.candleDown;
      segments.push(
        { label: 'O ', value: autoFormatPrice(candle.open),  color: options.colors.text   },
        { label: 'H ', value: autoFormatPrice(candle.high),  color: options.colors.wickUp   || options.colors.candleUp   },
        { label: 'L ', value: autoFormatPrice(candle.low),   color: options.colors.wickDown || options.colors.candleDown },
        { label: 'C ', value: autoFormatPrice(candle.close), color: closeColor },
      );
    }

    if (this.settings.barChange && prevCandle) {
      const diff    = candle.close - prevCandle.close;
      const diffPct = (diff / prevCandle.close) * 100;
      const sign    = diff >= 0 ? '+' : '';
      const color   = diff >= 0 ? options.colors.candleUp : options.colors.candleDown;
      segments.push({
        label: '',
        value: `${sign}${autoFormatPrice(diff)} (${sign}${diffPct.toFixed(2)}%)`,
        color,
        bold: true,
      });
    }

    if (this.settings.volume && candle.volume > 0) {
      segments.push({ label: 'Vol ', value: formatKiloMega(candle.volume), color: options.colors.text });
    }

    if (this.settings.lastDayChange && allData.length > 1) {
      const dayOpen  = allData[0].open;
      const pct      = ((candle.close - dayOpen) / dayOpen) * 100;
      const sign     = pct >= 0 ? '+' : '';
      const color    = pct >= 0 ? options.colors.candleUp : options.colors.candleDown;
      segments.push({ label: 'Δ ', value: `${sign}${pct.toFixed(2)}%`, color });
    }

    // ── Measure widths ─────────────────────────────────────────────────────

    const titleText = this._resolveTitle();

    ctx.font = boldFont;
    const titleW = titleText ? ctx.measureText(titleText).width + 6 : 0;

    let segW = 0;
    for (const seg of segments) {
      ctx.font = seg.bold ? boldFont : labelFont;
      segW += ctx.measureText(seg.label + seg.value).width + SEG_GAP;
    }

    let contentWidth =
      (this.settings.logo        ? LOGO_SIZE + 6 : 0) +
      titleW +
      (this.settings.marketStatus ? 14 : 0) +
      segW;

    // Clamp to reasonable max
    contentWidth = Math.max(contentWidth, 0);

    const bgW = contentWidth + INNER_PAD * 2;
    const bgH = ROW_H + INNER_PAD * 2;
    const bgX = PAD;
    const bgY = PAD;

    // ── Draw background ────────────────────────────────────────────────────

    if (this.settings.backgroundOpacity > 0) {
      ctx.globalAlpha = Math.min(1, this.settings.backgroundOpacity);
      ctx.fillStyle   = options.colors.background;
      this._roundRect(ctx, bgX, bgY, bgW, bgH, 4);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // ── Draw content (left → right) ────────────────────────────────────────

    let cx  = bgX + INNER_PAD;
    const midY = bgY + INNER_PAD + ROW_H / 2;

    if (this.settings.logo) {
      this._drawLogo(ctx, cx, midY - LOGO_SIZE / 2, LOGO_SIZE, options);
      cx += LOGO_SIZE + 6;
    }

    if (this.settings.title && titleText) {
      ctx.font         = boldFont;
      ctx.fillStyle    = options.colors.text;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha  = 1;
      ctx.fillText(titleText, cx, midY);
      cx += titleW;
    }

    if (this.settings.marketStatus) {
      // Stub: always show green dot (live market-status API is out-of-scope here)
      ctx.beginPath();
      ctx.arc(cx + 5, midY, 4, 0, Math.PI * 2);
      ctx.fillStyle   = options.colors.candleUp;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      cx += 14;
    }

    for (const seg of segments) {
      ctx.font         = seg.bold ? boldFont : labelFont;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';

      if (seg.label) {
        const lw = ctx.measureText(seg.label).width;
        ctx.fillStyle   = options.colors.text;
        ctx.globalAlpha = 0.6;
        ctx.fillText(seg.label, cx, midY);
        ctx.globalAlpha = 1;
        cx += lw;
      }

      ctx.fillStyle   = seg.color;
      ctx.globalAlpha = 1;
      ctx.fillText(seg.value, cx, midY);
      cx += ctx.measureText(seg.value).width + SEG_GAP;
    }

    ctx.restore();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _resolveTitle(): string {
    if (!this.settings.title) return '';
    if (this.settings.titleMode === 'description' && this.symbolDescription) {
      return this.symbolDescription;
    }
    return this.symbolName || '';
  }

  private _drawLogo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    options: ChartConfig,
  ): void {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle   = options.colors.candleUp;
    this._roundRect(ctx, x, y, size, size, 3);
    ctx.fill();

    ctx.fillStyle    = '#ffffff';
    ctx.font         = `bold ${Math.floor(size * 0.65)}px ${options.layout.fontFamily}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', x + size / 2, y + size / 2);
    ctx.restore();
  }

  /** Draws a rounded rectangle path (does NOT call fill/stroke — caller does that). */
  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** StatusLine is a pure overlay — not user-selectable via hit-test. */
  public hitTest(): boolean {
    return false;
  }
}
