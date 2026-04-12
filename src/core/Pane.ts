// core/Pane.ts
import { PriceScale } from '../math/PriceScale';
import { SceneNode } from '../nodes/core/SceneNode';
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

    // Wenn es NICHT das Hauptchart ist, zeichne ein [X] oben rechts
if (this.id !== 'main') {
            ctx.save();
            ctx.fillStyle = "rgba(255, 50, 50, 0.2)";
            // Ein rotes Quadrat oben rechts im Pane
            ctx.fillRect(ctx.canvas.width - 25, 5, 20, 20); 
            
            ctx.fillStyle = "#ff4444";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            // Das X genau in die Mitte des Quadrats zeichnen
            ctx.fillText("X", ctx.canvas.width - 15, 15);
            ctx.restore();
        }
  }
}