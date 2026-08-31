// input/handlers/panHandler.ts
// Version: 2.1.0 | Updated: 2026-07-29 | By: Agent

import type { IChartManager } from '../InputManager';
import type { TimeScale } from '../../math/TimeScale';

export interface PanState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startScrollOffset: number;
  draggingPaneId: string | null;
}

/** Start panning. Called on mousedown when no tool/drawing is active. */
export function startPan(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
  timeScale: TimeScale,
  manager: IChartManager,
  state: PanState
): void {
  state.isDragging = true;
  state.startX = e.clientX;
  state.startY = e.clientY;
  state.startScrollOffset = timeScale.scrollOffset;

  // Record which pane the drag originated in (for Y-axis panning).
  const rect2 = canvas.getBoundingClientRect();
  const localY = e.clientY - rect2.top;
  const paneHit = manager.getPaneAt?.(localY);
  state.draggingPaneId = paneHit?.getId() ?? null;

  canvas.style.cursor = 'grabbing';
}

/** Handle mousemove while panning. Returns true if handled. */
export function handlePanMove(
  e: PointerEvent,
  timeScale: TimeScale,
  manager: IChartManager,
  state: PanState
): boolean {
  if (!state.isDragging) return false;

  const deltaX = e.clientX - state.startX;
  timeScale.scrollOffset = state.startScrollOffset + deltaX;

  // Vertical panning (Y-axis).
  const deltaY = e.clientY - state.startY;
  if (Math.abs(deltaY) > 1) {
    manager.panPrice(deltaY, state.draggingPaneId ?? undefined);
    state.startY = e.clientY;
  }

  manager.markDirty();
  return true;
}

/** Handle mouseup — reset pan state. */
export function handlePanUp(state: PanState): void {
  state.isDragging = false;
  state.draggingPaneId = null;
}
