// input/cursor/cursorManager.ts
// Version: 2.0.0 | Updated: 2026-06-06 | By: Agent

import type { IChartManager } from '../InputManager';
import type { TimeScale } from '../../math/TimeScale';

/** SVG cursor strings — duplicated here to avoid importing InputManager */
const DOT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='5' fill='%232962ff'/%3E%3Ccircle cx='8' cy='8' r='2' fill='white'/%3E%3C/svg%3E") 8 8, crosshair`;
const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 4 20, pointer`;
const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'%3E%3Cpath d='M7 3.5A9 9 0 0 1 20.5 7' stroke='%23333' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M18.2 3.2l2.5 3.8-4 1' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M17 20.5A9 9 0 0 1 3.5 17' stroke='%23333' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M5.8 20.8l-2.5-3.8 4-1' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, auto`;

/**
 * findDividerAt — Check if cursor is over a pane divider (within 4px tolerance).
 * Returns the divider index or null.
 */
export function findDividerAt(y: number, getDividerPositions: () => { y: number }[]): number | null {
  const dividers = getDividerPositions();
  for (let i = 0; i < dividers.length; i++) {
    if (Math.abs(y - dividers[i].y) <= 4) return i;
  }
  return null;
}

/**
 * updateCursor — Set canvas cursor based on hover state, mode, and drawing interactions.
 * Extracted from InputManager.ts updateCursor() method (~90 lines).
 * 
 * @param x - Mouse X in canvas coordinates (for hit testing)
 * @param y - Mouse Y in canvas coordinates (for pane lookup)
 */
export function updateCursor(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  mode: string,
  cursorModeOverride: string,
  isDragging: boolean,
  isScalingY: boolean,
  isDraggingPoint: boolean,
  isResizingDivider: boolean,
  isMovingBody: boolean,
  manager: IChartManager,
  timeScale: TimeScale
): void {
  // Don't change cursor while actively dragging/scaling (cursor already set to 'grabbing').
  if (isDragging || isScalingY || isDraggingPoint || isResizingDivider) return;
  if (isMovingBody) { canvas.style.cursor = 'grabbing'; return; }

  // Non-drawing modes always get crosshair.
  if (mode !== 'crosshair_and_pan') {
    canvas.style.cursor = 'crosshair';
    return;
  }

  // Laser/spray: hide cursor entirely.
  if (cursorModeOverride === 'laser' || cursorModeOverride === 'spray') {
    canvas.style.cursor = 'none';
    return;
  }

  const targetPane = manager.getPaneAt(y);
  const priceScale = targetPane?.getPriceScale();

  if (targetPane && targetPane.getId() === 'main' && priceScale) {
    for (let i = manager.drawingManager.shapes.length - 1; i >= 0; i--) {
      const shape = manager.drawingManager.shapes[i];

      // Emoji-specific cursor zones (selected only).
      // Duck-type check: EmojiNode has hitTestEmojiZone method.
      if (shape.isSelected && typeof (shape as any).hitTestEmojiZone === 'function') {
        const zone = (shape as any).hitTestEmojiZone(x, y, timeScale, priceScale);
        if (zone) {
          if (zone.mode === 'rotate') {
            canvas.style.cursor = ROTATE_CURSOR;
          } else if (zone.mode === 'resize') {
            const diag = zone.cornerIdx === 0 || zone.cornerIdx === 2 ? 'nwse-resize' : 'nesw-resize';
            canvas.style.cursor = diag;
          } else {
            canvas.style.cursor = 'grab';
          }
          shape.isHovered = true;
          return;
        }
        shape.isHovered = false;
        continue;
      }

      if (shape.isSelected && shape.hitTestAnchor(x, y, timeScale, priceScale as any)) {
        canvas.style.cursor = 'move';
        shape.isHovered = false;
        return;
      }
      if (shape.hitTest(x, y, timeScale, priceScale as any)) {
        canvas.style.cursor = (shape.isSelected && !shape.isLocked) ? 'grab' : 'pointer';
        shape.isHovered = true;
        return;
      }
      shape.isHovered = false;
    }
  }

  // Default cursor based on override.
  switch (cursorModeOverride) {
    case 'dot': canvas.style.cursor = DOT_CURSOR; break;
    case 'eraser': canvas.style.cursor = ERASER_CURSOR; break;
    case 'arrow': canvas.style.cursor = 'default'; break;
    default: canvas.style.cursor = 'crosshair'; break;
  }
}
