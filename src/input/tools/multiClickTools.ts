// input/tools/multiClickTools.ts
// Version: 5.0.0 | Updated: 2026-06-06 | By: Agent

/**
 * Multi-click drawing tools — unbegrenzte Klicks (dblclick als Finalisierung).
 * Tools: polyline, path, forecast, ghost_feed, bars_pattern
 */

import { PolylineNode } from '../../nodes/tools/PolylineNode';
import type { DrawableShape } from '../../types/DrawableShape';
import type { InputManager } from '../InputManager';
import type { LogicalCoordinates } from '../InputManager';
import { registerTool } from './registry';

// ============================================================================>
// POLYLINE — Multi-Klick (point1 → point2 → ... → dblclick finalisiert)
// ============================================================================>

function handlePolyline(node: DrawableShape, _logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as PolylineNode;
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(_logical.index, _logical.price);
  if (im.drawStep === 0) {
    (n as any).shapeType = 'polyline';
    (n as any).closed = false;
    n.name = 'Polylinie';
    n.points = [
      { index: _logical.index, price: snappedPrice },
      { index: _logical.index, price: snappedPrice },
    ];
    n.point1 = n.points[0];
    n.point2 = n.points[1];
    im.activeDrawingNode = n;
    return true;
  }
  // Letzten Preview-Punkt durch echten ersetzen, neuen Preview anhängen.
  n.points[n.points.length - 1] = { index: _logical.index, price: snappedPrice };
  n.points.push({ index: _logical.index, price: snappedPrice });
  im.drawStep++;
  n.point2 = n.points[n.points.length - 1];
  im.activeDrawingNode = n;
  return true;
}

function onPolylineIntermediate(_node: DrawableShape, _logical: LogicalCoordinates, _drawStep: number, _im: InputManager): 'continue' | 'finalize' {
  return 'continue'; // polyline hat kein Limit (oder >30)
}

registerTool({ mode: 'draw_polyline', steps: -1, nodeClass: PolylineNode, eventType: 'polyline', onStep0Custom: handlePolyline as any, onIntermediateClick: onPolylineIntermediate as any });

