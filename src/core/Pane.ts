// core/Pane.ts
import { PriceScale } from '../math/PriceScale';
import { SceneNode } from '../nodes/SceneNode';
import { TimeScale } from '../math/TimeScale';
import type { ChartConfig } from './ChartOptions';

export class Pane {
  public priceScale: PriceScale = new PriceScale();
  public nodes: SceneNode[] = [];
  
  public id: string;
  public heightWeight: number;

  constructor(id: string, heightWeight: number) {
    this.id = id;
    this.heightWeight = heightWeight;
  }

  public addNode(node: SceneNode) {
    this.nodes.push(node);
  }

  /**
   * Zeichnet alle Nodes dieser Pane in der korrekten Z-Reihenfolge
   */
  public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, options: ChartConfig) {
    // Wir kopieren das Array und sortieren nach zIndex
    const sortedNodes = [...this.nodes].sort((a, b) => a.zIndex - b.zIndex);
    
    sortedNodes.forEach(node => {
      node.draw(ctx, timeScale, this.priceScale, options);
    });
  }
}