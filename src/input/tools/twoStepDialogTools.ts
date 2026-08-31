// input/tools/twoStepDialogTools.ts
// Version: 6.0.0 | Updated: 2026-06-10 | By: Agent
// 6.0.0: 2-Klick-Verhalten wiederhergestellt — note/price_note/table/callout/image_note
//        sind 2-Punkt-Nodes (point1 = Anker, point2 = Box/Bubble/Badge); die 1-Klick-
//        Stubs aus dem Registry-Refactor setzten point2 nie → draw() zeichnete nichts.
//        Der InputManager hat für diese Modi bereits Live-Preview (point2 folgt Maus).
//        Dialoge laufen jetzt ENTKOPPELT vom mousedown (setTimeout 0): prompt()
//        blockierte sonst den Handler sekundenlang ([Violation] 'mousedown' took …ms)
//        und staute mouseup/click in bereits geänderten State. Cancel/leer → Node
//        wird wieder entfernt. image_note: setzt jetzt auch imageSrc (draw liest
//        imageSrc, nicht den Alias imageUrl).

/**
 * Two-step dialog tools — Klick 1 = Anker (point1), Klick 2 = Position (point2),
 * danach asynchroner Dialog → Finalisierung oder Abbruch.
 * Tools: note, price_note, table (ohne Dialog — Zellen via Dblclick editierbar),
 * callout, image_note, anchored_text (1-Klick + Dialog).
 */

import { NoteNode } from '../../nodes/tools/NoteNode';
import type { LogicalCoordinates } from '../InputManager';
import type { DrawableShape } from '../../types/DrawableShape';
import { InputManager } from '../InputManager';
import { registerTool } from './registry';

// ============================================================================>
// Gemeinsame Helfer
// ============================================================================>

/** Klick 1 der 2-Klick-Tools: Anker setzen, Node für die Live-Preview einhängen. */
function beginTwoClick(n: DrawableShape, logical: LogicalCoordinates, im: InputManager): void {
  const snapped = im.applyMagnet(logical.index, logical.price);
  n.point1 = { index: logical.index, price: snapped };
  n.point2 = { index: logical.index, price: snapped };
  im.manager.drawingManager.addDrawing(n);
  im.activeDrawingNode = n;
  im.drawStep = 1;
}

/** Tool-Modus ggf. zurücksetzen (keepDrawing beachten). */
function resetToolMode(im: InputManager): void {
  if (!im.keepDrawing) { im.mode = 'crosshair_and_pan'; im.manager.emit('toolReset', null); }
}

/**
 * Beendet den Zeichen-Flow SOFORT und öffnet den Text-Dialog erst NACH dem
 * laufenden Maus-Event-Burst (setTimeout 0) — prompt() im mousedown-Handler
 * blockiert sonst synchron und staut mouseup/click. Cancel/leerer Text →
 * Node wird wieder entfernt (kein Drawing).
 */
function finalizeWithDialog(
  n: DrawableShape,
  im: InputManager,
  eventType: string,
  promptLabel: string,
  apply: (text: string) => void,
  defaultText = '',
): void {
  im.drawStep = 0;
  im.activeDrawingNode = null;
  setTimeout(() => {
    const text = prompt(promptLabel, defaultText);
    if (!text) {
      im.manager.drawingManager.removeDrawing(n.id);
    } else {
      apply(text);
      n.isSelected = true;
      im.manager.emit('drawingCreated', {
        id: n.id, type: eventType,
        data: { point1: n.point1, point2: n.point2 },
      });
    }
    im.manager.markDirty();
    resetToolMode(im);
  }, 0);
}

// ============================================================================>
// NOTE — 2 Klicks (Anker → Textbox-Position) + Dialog
// ============================================================================>

function handleNote(node: DrawableShape, logical: LogicalCoordinates, im: InputManager): boolean {
  const n = node as NoteNode;
  if (im.drawStep === 0) { beginTwoClick(n, logical, im); return true; }
  const snapped = im.applyMagnet(logical.index, logical.price);
  n.point2 = { index: logical.index, price: snapped };
  finalizeWithDialog(n, im, 'note', 'Notiz:', (text) => { n.text = text; });
  return true;
}

registerTool({ mode: 'draw_note', steps: 2, nodeClass: NoteNode, eventType: 'note', onStep0Custom: handleNote });

