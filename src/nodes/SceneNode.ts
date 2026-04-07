// nodes/SceneNode.ts

import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import type { ChartConfig } from '../core/ChartOptions';

export abstract class SceneNode {
  /**
   * Jede Klasse, die von SceneNode erbt (z.B. CandlestickNode, LineNode),
   * MUSS zwingend diese draw-Methode implementieren.
   */
  abstract draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig
  ): void;

  // hitTest() für Phase 8 (Zeichentools) bereiten wir hier schon mal leer vor
  // Gibt true zurück, wenn die Maus über dem Element ist
  hitTest(x: number, y: number): boolean {
    return false; 
  }
}