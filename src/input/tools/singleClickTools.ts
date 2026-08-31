// input/tools/singleClickTools.ts
// Version: 5.1.0 | Updated: 2026-07-31 | By: Agent

/**
 * Single-click tools — alle 1-Klick-Tools registrieren sich selbst beim Import.
 * Tools: hline, vline, text_label, emoji, arrow_mark_up/down, pin, comment, signpost, flag, cross_line, hray, price_label, brush, highlighter
 */

import { HorizontalLineNode } from '../../nodes/tools/HorizontalLineNode';
import { VerticalLineNode } from '../../nodes/tools/VerticalLineNode';
import { TextLabelNode } from '../../nodes/tools/TextLabelNode';
import { EmojiNode } from '../../nodes/tools/EmojiNode';
import { CrossLineNode } from '../../nodes/tools/CrossLineNode';
import { HorizontalRayNode } from '../../nodes/tools/HorizontalRayNode';
import { BrushNode } from '../../nodes/tools/BrushNode';
import type { DrawableShape } from '../../types/DrawableShape';
import type { InputManager } from '../InputManager';
import type { LogicalCoordinates } from '../InputManager';
import { registerTool } from './registry';

// ============================================================================
// HLINE — 1 Klick (auch in sub-panes)
// ============================================================================

function handleHLine(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // HorizontalLineNode hat lineColor/lineWidth/paneId
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  n.paneId = logical.paneId; // B2 – Sub-Pane-HL
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  n.point1 = { index: logical.index, price: snappedPrice };
  n.isSelected = true;
  im.manager.drawingManager.addDrawing(n);
  im.manager.emit('drawingCreated', {
    id: n.id, type: 'hline',
    data: { point1: n.point1, paneId: logical.paneId }
  });
  if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
  return true;
}

registerTool({ mode: 'draw_hline', steps: 1, nodeClass: HorizontalLineNode as any, eventType: 'hline', onStep0Custom: handleHLine });

// ============================================================================
// VLINE — 1 Klick
// ============================================================================

function handleVLine(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any;
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  n.point1 = { index: logical.index, price: snappedPrice };
  n.isSelected = true;
  im.manager.drawingManager.addDrawing(n);
  im.manager.emit('drawingCreated', {
    id: n.id, type: 'vline',
    data: { point1: n.point1 }
  });
  if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
  return true;
}

registerTool({ mode: 'draw_vline', steps: 1, nodeClass: VerticalLineNode as any, eventType: 'vline', onStep0Custom: handleVLine });

// ============================================================================
// TEXT_LABEL — 1 Klick + prompt() (cancel → false)
// ============================================================================

function handleTextLabel(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // TextLabelNode hat textColor
  n.textColor = im.defaultLineColor;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  n.point1 = { index: logical.index, price: snappedPrice };
  const text = prompt('Text eingeben:', 'Text');
  if (!text) return false; // Cancel → kein Node erstellen
  n.text = text;
  n.name = text.substring(0, 20);
  n.isSelected = true;
  im.manager.drawingManager.addDrawing(n);
  im.manager.emit('drawingCreated', {
    id: n.id, type: 'text_label',
    data: { point1: n.point1, text: n.text }
  });
  if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
  return true;
}

registerTool({ mode: 'draw_text_label', steps: 1, nodeClass: TextLabelNode as any, eventType: 'text_label', onStep0Custom: handleTextLabel });

// ============================================================================
// EMOJI — 1 Klick
// ============================================================================

function handleEmoji(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // EmojiNode hat emoji-Property
  n.emoji = im.activeEmojiChar;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  n.point1 = { index: logical.index, price: snappedPrice };
  n.name = im.activeEmojiChar;
  n.isSelected = true;
  im.manager.drawingManager.addDrawing(n);
  im.manager.emit('drawingCreated', {
    id: n.id, type: 'emoji',
    data: { point1: n.point1, emoji: im.activeEmojiChar }
  });
  if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
  return true;
}

registerTool({ mode: 'draw_emoji', steps: 1, nodeClass: EmojiNode as any, eventType: 'emoji', onStep0Custom: handleEmoji });

// ============================================================================
// CROSS_LINE — 1 Klick (auch in sub-panes)
// ============================================================================

function handleCrossLine(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // CrossLineNode hat lineColor/lineWidth
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  n.point1 = { index: logical.index, price: snappedPrice };
  n.isSelected = true;
  im.manager.drawingManager.addDrawing(n);
  im.manager.emit('drawingCreated', {
    id: n.id, type: 'cross_line',
    data: { point1: n.point1 }
  });
  if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
  return true;
}

registerTool({ mode: 'draw_cross_line', steps: 1, nodeClass: CrossLineNode as any, eventType: 'cross_line', onStep0Custom: handleCrossLine });

// ============================================================================
// HRAY — 1 Klick (Horizontal Ray nach rechts)
// ============================================================================

function handleHRay(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // HorizontalRayNode hat lineColor/lineWidth
  n.lineColor = im.defaultLineColor;
  n.lineWidth = im.defaultLineWidth;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  n.point1 = { index: logical.index, price: snappedPrice };
  n.isSelected = true;
  im.manager.drawingManager.addDrawing(n);
  im.manager.emit('drawingCreated', {
    id: n.id, type: 'hray',
    data: { point1: n.point1 }
  });
  if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
  return true;
}

registerTool({ mode: 'draw_hray', steps: 1, nodeClass: HorizontalRayNode as any, eventType: 'hray', onStep0Custom: handleHRay });

// ============================================================================
// BRUSH / HIGHLIGHTER — 1 Klick (drawStep=1, multi-point, tool bleibt aktiv)
// ============================================================================

function handleBrush(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as any; // BrushNode hat isHighlighter/name/lineColor/etc
  const isHL = im.mode === 'draw_highlighter';
  n.isHighlighter = isHL;
  n.name = isHL ? 'Highlighter' : 'Freihand';
  n.lineColor = isHL ? im.highlighterColor : im.brushColor;
  n.lineWidth = isHL ? im.highlighterWidth : im.brushWidth;
  n.opacity = isHL ? 0.4 : 0.6;
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  n.points = [{ index: logical.index, price: snappedPrice }];
  n.point1 = { index: logical.index, price: snappedPrice };
  im.manager.drawingManager.addDrawing(n);
  im.activeDrawingNode = n;
  im.drawStep = 1; // Multi-point mode — kein emit, kein keepDrawing-check
  return true;
}

// steps: -1 (multi-point), NICHT 1: der steps===1-Pfad der Registry finalisiert
// direkt nach Step 0 und resettet drawStep/activeDrawingNode (resetIfStuck) —
// damit sammelte der Move keine Punkte mehr und der Strich war tot (Bug seit
// R1-Registry-Refactor, gefunden bei der iPad-Abnahme ZT-P6). Die echte
// Finalisierung macht der InputManager beim pointerup (Tool bleibt aktiv).
registerTool({ mode: 'draw_brush', steps: -1, nodeClass: BrushNode as any, eventType: 'brush', onStep0Custom: handleBrush });
registerTool({ mode: 'draw_highlighter', steps: -1, nodeClass: BrushNode as any, eventType: 'highlighter', onStep0Custom: handleBrush });
