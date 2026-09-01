// input/tools/specialTools.ts
// Version: 5.0.0 | Updated: 2026-06-06 | By: Agent

/**
 * Special tools — Bereichs-Tools.
 * Tools: price_range, date_range
 */

import { PriceRangeNode } from '../../nodes/tools/PriceRangeNode';
import { DateRangeNode } from '../../nodes/tools/DateRangeNode';
import type { DrawableShape } from '../../types/DrawableShape';
import type { InputManager } from '../InputManager';
import type { LogicalCoordinates } from '../InputManager';
import { registerTool } from './registry';

// ============================================================================>
// PRICE RANGE — 2 Klicks (point1 → point2 als Y-Bereich)
// ============================================================================>

function handlePriceRange(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as PriceRangeNode;
  n.lineColor = im.defaultLineColor;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    im.activeDrawingNode = node;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.drawingManager.addDrawing(node);
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'price_range',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_price_range', steps: 2, nodeClass: PriceRangeNode as any, eventType: 'price_range', onStep0Custom: handlePriceRange });

// ============================================================================>
// DATE RANGE — 2 Klicks (point1 → point2 als X-Bereich)
// ============================================================================>

function handleDateRange(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as DateRangeNode;
  n.lineColor = im.defaultLineColor;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  if (im.drawStep === 0) {
    n.point1 = { index: logical.index, price: snappedPrice };
    im.activeDrawingNode = node;
    return true;
  } else {
    n.point2 = { index: logical.index, price: snappedPrice };
    n.isSelected = true;
    im.manager.drawingManager.addDrawing(node);
    im.manager.emit('drawingCreated', {
      id: n.id, type: 'date_range',
      data: { point1: n.point1, point2: n.point2 }
    });
    if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
    return true;
  }
}

registerTool({ mode: 'draw_date_range', steps: 2, nodeClass: DateRangeNode as any, eventType: 'date_range', onStep0Custom: handleDateRange });

