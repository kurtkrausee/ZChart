// zchart/nodes/core/DrawableSceneNode.ts
// Version: 1.0.0 | Updated: 2026-04-09 | By: GitHub Copilot
// ============================================================================
//  Abstrakte Brücke zwischen SceneNode (Pane-System) und DrawableShape
//  (Drawing-System). Tool-Nodes die sowohl als Pane-Inhalt als auch als
//  interaktive Zeichnung funktionieren sollen, erben von dieser Klasse.
//
//  Aktuell nutzt nur EmojiNode diese Brücke. Die klassischen Tool-Nodes
//  (TrendLine, Fibo, HLine, VLine) implementieren DrawableShape direkt
//  und werden vom DrawingManager separat gerendert.
// ============================================================================

import { SceneNode } from './SceneNode';
import type { TimeScale } from '../../math/TimeScale';
import type { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, DrawableShapeType, LogicalPoint } from '../../types/DrawableShape';

/**
 * Abstrakte Basis für Nodes die BEIDE Systeme bedienen:
 * - SceneNode: kann in Pane.nodes[] leben und per zIndex sortiert werden
 * - DrawableShape: kann in DrawingManager.shapes[] leben und hitTest/select unterstützen
 */
export abstract class DrawableSceneNode extends SceneNode implements DrawableShape {
  public abstract readonly shapeType: DrawableShapeType;
  public id: string = crypto.randomUUID();
  public name: string = '';
  public isVisible: boolean = true;
  public isHovered: boolean = false;
  public isSelected: boolean = false;
  public isLocked: boolean = false;
  public point1: LogicalPoint | null = null;
  public point2: LogicalPoint | null = null;

  abstract draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig
  ): void;

  abstract hitTest(
    pixelX: number,
    pixelY: number,
    timeScale: TimeScale,
    priceScale: PriceScale
  ): boolean;

  abstract hitTestAnchor(
    pixelX: number,
    pixelY: number,
    timeScale: TimeScale,
    priceScale: PriceScale
  ): 1 | 2 | null;
}
