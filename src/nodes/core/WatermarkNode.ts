// nodes/core/WatermarkNode.ts
// Version: 1.2.0 | Updated: 2026-05-07 | By: Agent
// Background watermark – ported from upstream kurtkrausee/ZChart (Phase 14).
// Supports configurable position (center | top-left | top-right | bottom-left | bottom-right).
import { SceneNode } from './SceneNode';
import type { TimeScale } from '../../math/TimeScale';
import type { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export type WatermarkPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type WatermarkMode = 'off' | 'replayOnly' | 'always';

export class WatermarkNode extends SceneNode {
  public role = 'background';
  public text: string = '';
  public subText: string = '';
  public fontSize: number = 80;
  public opacity: number = 0.05;
  public position: WatermarkPosition = 'center';
  public isVisible: boolean = true;
  /** 'off' = never draw, 'always' = always draw, 'replayOnly' = draw only when replay active */
  public mode: WatermarkMode = 'always';
  /** Override color; falls back to options.colors.watermark if empty */
  public color: string = '';

  public draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig,
  ): void {
    if (!this.isVisible || !this.text) return;
    if (this.mode === 'off') return;

    const watermarkColor = this.color || options.colors.watermark || options.colors.text || '#888888';
    const width = timeScale.width;
    const height = priceScale.height;
    if (width <= 0 || height <= 0) return;

    ctx.save();
    ctx.fillStyle = watermarkColor;
    ctx.globalAlpha = this.opacity;

    const mainSize = Math.min(this.fontSize, Math.floor(width / 4));
    ctx.font = `bold ${mainSize}px ${options.layout.fontFamily}`;
    const subSize = Math.max(10, Math.floor(mainSize * 0.35));

    const margin = 16;
    let x: number;
    let y: number;
    let align: CanvasTextAlign;
    switch (this.position) {
      case 'top-left':
        x = margin; y = margin + mainSize * 0.5; align = 'left'; break;
      case 'top-right':
        x = width - margin; y = margin + mainSize * 0.5; align = 'right'; break;
      case 'bottom-left':
        x = margin; y = height - margin - (this.subText ? mainSize * 0.75 : 0); align = 'left'; break;
      case 'bottom-right':
        x = width - margin; y = height - margin - (this.subText ? mainSize * 0.75 : 0); align = 'right'; break;
      case 'center':
      default:
        x = width / 2; y = height / 2; align = 'center'; break;
    }

    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, x, y);

    if (this.subText) {
      ctx.font = `${subSize}px ${options.layout.fontFamily}`;
      ctx.fillText(this.subText, x, y + mainSize * 0.75);
    }
    ctx.restore();
  }

  /** Watermark is a pure background layer, not selectable. */
  public hitTest(): boolean {
    return false;
  }
}
