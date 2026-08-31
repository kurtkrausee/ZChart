// input/handlers/yScaleHandler.ts
// Version: 2.1.0 | Updated: 2026-07-29 | By: Agent

import type { IChartManager } from '../InputManager';

export interface YScaleState {
  isScalingY: boolean;
  startY: number;
  scalingYPaneId: string | null;
}

/** Start Y-axis scaling. Called on mousedown when cursor is over right price axis. */
export function startYScale(
  e: PointerEvent,
  manager: IChartManager,
  state: YScaleState
): void {
  state.isScalingY = true;
  state.startY = e.clientY;
  const paneHit = manager.getPaneAt?.(e.clientY);
  state.scalingYPaneId = paneHit?.getId() ?? null;
}

/** Handle mousemove while Y-scaling. Returns true if handled. */
export function handleYScaleMove(
  e: PointerEvent,
  manager: IChartManager,
  state: YScaleState
): boolean {
  if (!state.isScalingY) return false;

  const deltaY = e.clientY - state.startY;
  state.startY = e.clientY;
  manager.zoomPrice(deltaY, state.scalingYPaneId ?? undefined);
  return true;
}

/** Handle mouseup — reset Y-scale state. */
export function handleYScaleUp(state: YScaleState): void {
  state.isScalingY = false;
  state.scalingYPaneId = null;
}
