// nodes/SceneNode.ts
// Version: 1.2.0 | Updated: 2026-08-13 | By: Agent
// 1.2.0 (ZV10-P7b): yAxisId — bindet den Node an eine Pane-Scale (Default 'right')
import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export abstract class SceneNode {
  // Standard-Ebene ist 0. Höhere Zahlen liegen weiter "vorne".
  public zIndex: number = 0;
  /** Optional role tag for identifying nodes (e.g. 'series', 'indicator') */
  public role: string = '';
  /** When false, Pane.draw() skips this node (used by Object Tree visibility toggle). */
  public isVisible: boolean = true;
  /** ZV10-P7b: Scale-Binding (Pane.priceScales-Key). undefined = Default-Scale 'right'. */
  public yAxisId?: string;

  abstract draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig
  ): void;
}