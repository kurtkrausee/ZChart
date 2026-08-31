// core/Pane.ts
// Version: 2.0.0 | Updated: 2026-08-13 | By: Agent
// 2.0.0 (ZV10-P7b): Multi-Y-Achse — `priceScales`-Map (Default-Scale 'right')
//   mit Kompat-Getter `priceScale`; Node→Scale-Binding wird zentral in `draw`
//   über `node.yAxisId` aufgelöst (Node-draw-Signaturen unverändert).
import { PriceScale } from '../math/PriceScale';
import { SceneNode } from '../nodes/core/SceneNode';
import { TimeScale } from '../math/TimeScale';
import type { ChartConfig } from './ChartOptions';

export class Pane {
  /** ZV10-P7b: ID der Default-Scale — Bestands-Verhalten (eine rechte Achse). */
  public static readonly DEFAULT_SCALE_ID = 'right';

  /** Alle Scales der Pane. Enthält immer mindestens die Default-Scale. */
  public priceScales: Map<string, PriceScale> = new Map([[Pane.DEFAULT_SCALE_ID, new PriceScale()]]);

  /** Kompat: bestehender Ein-Scale-Zugriff — liefert die Default-Scale. */
  public get priceScale(): PriceScale {
    return this.priceScales.get(Pane.DEFAULT_SCALE_ID)!;
  }

  public nodes: SceneNode[] = [];

  public id: string;
  public heightWeight: number;

  /** Pixel-Y-Offset from top (set by ChartManager during layout) */
  public topOffset: number = 0;
  /** Computed pixel height (set by ChartManager during layout) */
  public computedHeight: number = 0;

  constructor(id: string, heightWeight: number) {
    this.id = id;
    this.heightWeight = heightWeight;
  }

  /** ZV10-P7b: Scale anlegen bzw. bestehende holen (idempotent). */
  public ensurePriceScale(id: string): PriceScale {
    let scale = this.priceScales.get(id);
    if (!scale) {
      scale = new PriceScale();
      scale.height = this.priceScale.height;
      this.priceScales.set(id, scale);
    }
    return scale;
  }

  /**
   * ZV10-P7b: Scale entfernen. Default-Scale ist nicht entfernbar; gebundene
   * Nodes fallen auf die Default-Scale zurück (yAxisId wird gelöscht).
   */
  public removePriceScale(id: string): boolean {
    if (id === Pane.DEFAULT_SCALE_ID) return false;
    if (!this.priceScales.delete(id)) return false;
    for (const node of this.nodes) {
      if (node.yAxisId === id) node.yAxisId = undefined;
    }
    return true;
  }

  /** ZV10-P7b: Binding-Auflösung — unbekannte/fehlende ID → Default (defensiv). */
  public resolveScale(id?: string): PriceScale {
    return (id !== undefined && this.priceScales.get(id)) || this.priceScale;
  }

  public addNode(node: SceneNode) {
    this.nodes.push(node);
  }

  /** Remove the first node matching the given role tag */
  public removeNodeByRole(role: string): SceneNode | null {
    const idx = this.nodes.findIndex(n => n.role === role);
    if (idx === -1) return null;
    return this.nodes.splice(idx, 1)[0];
  }

  /**
   * Zeichnet alle Nodes dieser Pane in der korrekten Z-Reihenfolge
   */
  public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, options: ChartConfig) {
    // Wir kopieren das Array und sortieren nach zIndex
    const sortedNodes = [...this.nodes].sort((a, b) => a.zIndex - b.zIndex);

    sortedNodes.forEach(node => {
      if (node.isVisible === false) return;
      // ZV10-P7b: Scale je Node auflösen (yAxisId, Default 'right')
      node.draw(ctx, timeScale, this.resolveScale(node.yAxisId), options);
    });
  }
}
