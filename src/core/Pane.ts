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
  
  // NEU: Die Start-Koordinate (Y-Achse) dieses Panes. 
  // Wird vom ChartManager beim Layouten berechnet.
  public top: number = 0; 

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
        const buttonX = 10; // 10 Pixel vom LINKEN Rand
        // WICHTIG: Da ChartManager 'translate' nutzt, ist 0 bereits ganz oben im Pane!
        const buttonY = 10; 

        // Quadrat-Hintergrund
        ctx.fillStyle = "rgba(255, 68, 68, 0.1)";
        ctx.fillRect(buttonX, buttonY, 20, 20); 
        
        // Das rote X
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("X", buttonX + 10, buttonY + 10);
        ctx.restore();
    }
  }
}