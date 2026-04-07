// nodes/StaticLineNode.ts

import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import { SceneNode } from './SceneNode';
import type { ChartConfig } from '../core/ChartOptions';

export class StaticLineNode extends SceneNode {
  private value: number;
  private color: string;
  private lineDash: number[];

  constructor(value: number, color: string = '#444', lineDash: number[] = [5, 5]) {
    super();
    this.value = value;
    this.color = color;
    this.lineDash = lineDash;
  }

  draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, options: ChartConfig): void {
    const y = priceScale.priceToY(this.value);
    const width = ctx.canvas.width; // Wir zeichnen über die volle Breite

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.setLineDash(this.lineDash);
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    ctx.restore();
  }
}