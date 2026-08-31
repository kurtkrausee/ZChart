// input/handlers/dividerHandler.ts
// Version: 2.0.0 | Updated: 2026-06-06 | By: Agent

import type { IChartManager } from '../InputManager';

export interface DividerState {
  isResizingDivider: boolean;
  activeDividerIndex: number;
  dividerStartY: number;
}

/** Start pane divider resize. Called on mousedown when cursor is over a divider close button or divider line. */
export function startDividerResize(
  y: number,
  dividerIdx: number,
  _manager: IChartManager,
  state: DividerState
): void {
  state.isResizingDivider = true;
  state.activeDividerIndex = dividerIdx;
  state.dividerStartY = y;
}

/** Handle mousemove while resizing divider. Returns true if handled. */
export function handleDividerMove(
  y: number,
  manager: IChartManager,
  state: DividerState
): boolean {
  if (!state.isResizingDivider) return false;

  const deltaY = y - state.dividerStartY;
  manager.resizePanesByDivider(state.activeDividerIndex, deltaY);
  state.dividerStartY = y;
  return true;
}

/** Handle mouseup — reset divider resize state. */
export function handleDividerUp(state: DividerState): void {
  state.isResizingDivider = false;
  state.activeDividerIndex = -1;
}
