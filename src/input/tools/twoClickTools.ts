// input/tools/twoClickTools.ts
// Version: 5.0.0 | Updated: 2026-06-06 | By: Agent

/**
 * Two-click drawing tools — alle 2-Klick-Tools registrieren sich selbst beim Import.
 * Tools: trendline, fibo, ray, extended_line, rectangle, measure, arrow, ellipse/circle, triangle,
 *        fib_fan, fib_arcs, fib_time_zones, fib_circles, fib_spiral, fib_wedge, pitchfan,
 *        gann_box, gann_square_fixed, gann_square, gann_fan, cyclic_lines, time_cycles, sine_line
 */

import { TrendLineNode } from '../../nodes/tools/TrendLineNode';
import { FiboNode } from '../../nodes/tools/fib/FiboNode';
import { RayNode } from '../../nodes/tools/RayNode';
import { ExtendedLineNode } from '../../nodes/tools/ExtendedLineNode';
import { RectangleNode } from '../../nodes/tools/RectangleNode';
import { MeasureNode } from '../../nodes/tools/MeasureNode';
import { ArrowNode } from '../../nodes/tools/ArrowNode';
import { EllipseNode } from '../../nodes/tools/EllipseNode';
// CircleNode exists as alias → use EllipseNode directly
import { TriangleNode } from '../../nodes/tools/TriangleNode';
// GannSquareFixedNode → GannSquareRectNode (actual name)
import type { DrawableShape } from '../../types/DrawableShape';
import type { InputManager } from '../InputManager';
import type { LogicalCoordinates } from '../InputManager';
import { registerTool } from './registry';

// ============================================================================>
// TRENDLINE — 2 Klicks (point1 → point2)
// ============================================================================>

function handleTrendline(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // TrendLineNode hat lineColor/lineWidth
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    n.point2 = { index: logical.index, price: snappedPrice };
    im.manager.drawingManager.addDrawing(n);
    im.activeDrawingNode = n;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.drawingManager.addDrawing(n);
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'trendline',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_trendline', steps: 2, nodeClass: TrendLineNode as any, eventType: 'trendline', onStep0Custom: handleTrendline });

// ============================================================================>
// FIBO RETRACEMENT — 2 Klicks (point1 → point2)
// ============================================================================>

function handleFibo(node: DrawableShape, _logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // FiboNode hat lineColor/lineWidth nicht in Type-Def
  const snappedPrice = im.applyMagnet(_logical.index, _logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: _logical.index, price: snappedPrice };
    n.point2 = { index: _logical.index, price: snappedPrice };
    im.manager.drawingManager.addDrawing(n);
    im.activeDrawingNode = n;
    return true;
  } else {
    n.point2 = { index: _logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'fibo',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_fibo', steps: 2, nodeClass: FiboNode as any, eventType: 'fibo', onStep0Custom: handleFibo });

// ============================================================================>
// RAY — 2 Klicks (point1 → point2, Strahl geht von point1 durch point2)
// ============================================================================>

function handleRay(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any;
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    n.point2 = { index: logical.index, price: snappedPrice };
    im.manager.drawingManager.addDrawing(n);
    im.activeDrawingNode = n;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'ray',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_ray', steps: 2, nodeClass: RayNode as any, eventType: 'ray', onStep0Custom: handleRay });

// ============================================================================>
// EXTENDED LINE — 2 Klicks (point1 → point2, Linie geht in beide Richtungen)
// ============================================================================>

function handleExtendedLine(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any;
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    n.point2 = { index: logical.index, price: snappedPrice };
    im.manager.drawingManager.addDrawing(n);
    im.activeDrawingNode = n;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'extended_line',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_extended_line', steps: 2, nodeClass: ExtendedLineNode as any, eventType: 'extended_line', onStep0Custom: handleExtendedLine });

// ============================================================================>
// RECTANGLE — 2 Klicks (point1 → point2 als diagonale Ecke)
// ============================================================================>

function handleRectangle(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any;
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    n.point2 = { index: logical.index, price: snappedPrice };
    im.manager.drawingManager.addDrawing(n);
    im.activeDrawingNode = n;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'rectangle',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_rectangle', steps: 2, nodeClass: RectangleNode as any, eventType: 'rectangle', onStep0Custom: handleRectangle });

// ============================================================================>
// MEASURE — 2 Klicks (point1 → point2, Distanz/Prozent-Anzeige)
// ============================================================================>

function handleMeasure(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // MeasureNode hat lineColor nicht in Type-Def
  n.lineColor = im.defaultLineColor;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    n.point2 = { index: logical.index, price: snappedPrice };
    im.manager.drawingManager.addDrawing(n);
    im.activeDrawingNode = n;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'measure',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_measure', steps: 2, nodeClass: MeasureNode as any, eventType: 'measure', onStep0Custom: handleMeasure });

// ============================================================================>
// ARROW — 2 Klicks (point1 → point2, Pfeil von p1 nach p2)
// ============================================================================>

function handleArrow(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any;
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    n.point2 = { index: logical.index, price: snappedPrice };
    im.manager.drawingManager.addDrawing(n);
    im.activeDrawingNode = n;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'arrow',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_arrow', steps: 2, nodeClass: ArrowNode as any, eventType: 'arrow', onStep0Custom: handleArrow });

// ============================================================================>
// ELLIPSE / CIRCLE — 2 Klicks (point1 → point2 als diagonale Ecke)
// ============================================================================>

function handleEllipse(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // EllipseNode hat lineColor/lineWidth
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    im.activeDrawingNode = n;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.drawingManager.addDrawing(n);
    const typeStr = (n as any).shapeType === 'circle' ? 'circle' : 'ellipse';
    im.manager.emit('drawingCreated', {
      id: n.id, type: typeStr,
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_ellipse', steps: 2, nodeClass: EllipseNode as any, eventType: 'ellipse', onStep0Custom: handleEllipse });
registerTool({ mode: 'draw_circle', steps: 2, nodeClass: EllipseNode as any, eventType: 'circle', onStep0Custom: handleEllipse });

// ============================================================================>
// TRIANGLE — 3 Klicks (point1 → point2 → point3)
// ============================================================================>

function handleTriangle(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any;
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    n.point2 = { index: logical.index, price: snappedPrice };
    n.point3 = { index: logical.index, price: snappedPrice };
    im.manager.drawingManager.addDrawing(n);
    im.activeDrawingNode = n;
    return true;
  } else if (im.drawStep === 1) {
    n.point2 = { index: logical.index, price: snappedPrice };
    return true;
  } else {
    n.point3 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.drawingManager.addDrawing(n);
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'triangle',
      data: { point1: n.point1, point2: n.point2, point3: n.point3 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_triangle', steps: 3, nodeClass: TriangleNode as any, eventType: 'triangle', onStep0Custom: handleTriangle });

