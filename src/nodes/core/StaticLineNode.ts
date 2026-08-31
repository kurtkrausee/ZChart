// nodes/StaticLineNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import { SceneNode } from './SceneNode';
import type { ChartConfig } from '../../core/ChartOptions';

export class StaticLineNode extends SceneNode {
  public value: number;
  public color: string;
  public lineDash: number[];
  public lineWidth: number;
  public label?: string;

  constructor(
    value: number,
    color: string = '#444',
    lineDash: number[] = [5, 5],
    lineWidth: number = 1,
    label?: string,
  ) {
    super();
    this.value = value;
    this.color = color;
    this.lineDash = lineDash;
    this.lineWidth = lineWidth;
    this.label = label;
  }

  draw(ctx: CanvasRenderingContext2D, _timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig): void {
    const y = priceScale.priceToY(this.value);
    const width = ctx.canvas.width;

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.setLineDash(this.lineDash);
    ctx.lineWidth = this.lineWidth;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    if (this.label) {
      ctx.setLineDash([]);
      ctx.fillStyle = this.color;
      ctx.font = '10px sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.label, 4, y - 2);
    }

    ctx.restore();
  }
}