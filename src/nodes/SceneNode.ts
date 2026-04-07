// nodes/SceneNode.ts
import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import type { ChartConfig } from '../core/ChartOptions';

export abstract class SceneNode {
  // Standard-Ebene ist 0. Höhere Zahlen liegen weiter "vorne".
  public zIndex: number = 0;

  abstract draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig
  ): void;
}