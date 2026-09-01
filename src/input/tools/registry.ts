// input/tools/registry.ts
// Version: 4.1.0 | Updated: 2026-07-29 | By: Agent

import type { DrawableShape } from '../../types/DrawableShape';
import type { InputManager } from '../InputManager';
import type { LogicalCoordinates } from '../InputManager';

/**
 * ToolConfig — Metadata + hooks for a single drawing tool mode.
 * 
 * Each registered tool describes its click pattern (steps), node class, and
 * optional custom hooks. At least one of onPreInit/onStep0Custom/onFinalize
 * must be set; onLivePreview is always optional.
 * 
 * Hook return values:
 * - onStep0Custom: true = continue drawing, false = abort (e.g. prompt cancelled)
 * - onIntermediateClick: 'continue' = keep drawing, 'finalize' = end early
 * - onFinalize: void — side-effects only
 */
export interface ToolConfig {
  /** InputMode string, e.g. 'draw_hline', 'draw_trendline' */
  mode: string;

  /** Number of clicks until complete. 1=one-click, 2=two-click, -1=multi-click (dblclick ends) */
  steps: number;

  /** Node class to instantiate in Step 0. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeClass: any;

  /** Optional type string for 'drawingCreated' event payload. Defaults to mode without 'draw_' prefix. */
  eventType?: string;

  // --- Hooks (all optional, but at least one must be set) ---

  /** Pre-Init Hook: called BEFORE node construction. For dataStore setup etc. */
  onPreInit?: (im: InputManager) => void;

  /** Step-0 Logic: create & initialize the node. Returns true = continue drawing, false = abort. */
  onStep0Custom?: (node: DrawableShape, logical: LogicalCoordinates, im: InputManager) => boolean;

  /** Intermediate Clicks (multi-click tools like forecast/polyline/ghost_feed).
   * Returns 'continue' = keep drawing, 'finalize' = end early. */
  onIntermediateClick?: (
    node: DrawableShape, logical: LogicalCoordinates, drawStep: number, im: InputManager
  ) => 'continue' | 'finalize';

  /** Finalization Logic (last click). Sets point2+, isSelected=true, emits event. */
  onFinalize?: (node: DrawableShape, logical: LogicalCoordinates, im: InputManager) => void;

  /** Live-Preview per Tool (called from onMouseMove). Replaces the mega-switch in dispatchMouseMove.
   * Each tool registers its own preview logic here. */
  onLivePreview?: (node: DrawableShape, logical: LogicalCoordinates, drawStep: number, im: InputManager) => void;
}

/** Internal registry map — private, not exported. */
const toolRegistry = new Map<string, ToolConfig>();

/**
 * Register a tool in the registry. Called as side-effect of module imports.
 * Pattern: `import './singleClickTools'` registers all 1-click tools.
 */
export function registerTool(cfg: ToolConfig): void {
  if (toolRegistry.has(cfg.mode)) {
    console.warn(`[ToolRegistry] Duplicate registration for mode "${cfg.mode}". Overwriting.`);
  }
  toolRegistry.set(cfg.mode, cfg);
}

/** Get all registered tool modes as a readonly string array. Used in P10 to build InputMode type union. */
export const TOOL_MODES: ReadonlyArray<string> = Object.freeze(
  Array.from(toolRegistry.keys())
);

/** Check if a mode is registered. Useful for validation/debugging. */
export function isToolRegistered(mode: string): boolean {
  return toolRegistry.has(mode);
}

/** Get config for a specific mode. Returns undefined if not registered. */
export function getToolConfig(mode: string): ToolConfig | undefined {
  return toolRegistry.get(mode);
}

// ============================================================================
// DISPATCH — onMouseDown routing (called from InputManager)
// ============================================================================

/**
 * Dispatch a mouse click to the appropriate tool handler based on current mode.
 * Handles step progression (0 → 1 → … → finalize).
 * 
 * @returns true if handled, false if no matching tool registered
 */
export function dispatchClick(
  mode: string,
  logical: LogicalCoordinates,
  _raw: PointerEvent,
  im: InputManager
): boolean {
  const cfg = toolRegistry.get(mode);
  if (!cfg) return false;

  // ── STEP 0: first click — create node, call handler, advance state ──
  if (im.drawStep === 0) {
    cfg.onPreInit?.(im);

    const node = new cfg.nodeClass();
    (node as any).lineColor = im.defaultLineColor;
    (node as any).lineWidth = im.defaultLineWidth;
    node.paneId = logical.paneId;

    const handled = cfg.onStep0Custom
      ? cfg.onStep0Custom(node, logical, im)
      : onDefaultStep0(cfg, node, logical, im);

    if (!handled) return true; // tool cancelled (e.g. prompt) — eat the click

    // Single-click tools (steps=1): finalize immediately in the same click.
    if (cfg.steps === 1) {
      cfg.onFinalize?.(node, logical, im);
      resetIfStuck(im);
      return true;
    }

    // Multi-step tools: park state so next clicks land in step-N branch.
    // Tool may already have set drawStep/activeDrawingNode itself; only fill in
    // what's missing.
    if (!im.activeDrawingNode) im.activeDrawingNode = node;
    if (im.drawStep === 0) im.drawStep = 1;

    // Safety net: ensure node is in drawingManager.shapes so live-preview renders.
    // Many tool handlers forgot to call addDrawing() in step 0 (only do it in finalize).
    const shapes = (im.manager as any).drawingManager?.shapes as DrawableShape[] | undefined;
    const activeNode = im.activeDrawingNode as DrawableShape;
    if (shapes && activeNode && !shapes.includes(activeNode)) {
      (im.manager as any).drawingManager.addDrawing(activeNode);
    }
    return true;
  }

  // ── STEP N (N >= 1): follow-up click on an in-progress drawing ──
  const node = im.activeDrawingNode;
  if (!node) {
    // State got desynced (e.g. tool was cancelled mid-flow). Re-run as step 0.
    im.drawStep = 0;
    return dispatchClick(mode, logical, _raw, im);
  }

  // Multi-click tools (forecast/polyline/ghost_feed): always run onStep0Custom
  // first (it adds the new point), THEN ask onIntermediateClick for continue/finalize.
  if (cfg.steps === -1) {
    if (cfg.onStep0Custom) {
      const stepBefore = im.drawStep;
      cfg.onStep0Custom(node, logical, im);
      // Auto-advance drawStep if tool didn't (keeps next click distinct).
      if (im.drawStep === stepBefore) im.drawStep++;
    }
    if (cfg.onIntermediateClick) {
      const decision = cfg.onIntermediateClick(node, logical, im.drawStep, im);
      if (decision === 'continue') return true;
      // 'finalize' → run onFinalize and reset
      if (cfg.onFinalize) {
        cfg.onFinalize(node, logical, im);
      }
      resetIfStuck(im);
    }
    return true;
  }

  // Multi-step tools with onStep0Custom doing all step dispatch (drawStep-aware).
  // Tool checks im.drawStep itself and runs the matching branch. The Tool may
  // or may not mutate drawStep — Registry handles progression.
  if (cfg.onStep0Custom) {
    const stepBefore = im.drawStep;
    cfg.onStep0Custom(node, logical, im);

    const wasFinalClick = cfg.steps > 0 && stepBefore >= cfg.steps - 1;
    const toolDidNotTouchStep = im.drawStep === stepBefore;

    if (wasFinalClick) {
      // Final click done — make sure state is reset for the next drawing.
      if (toolDidNotTouchStep && im.activeDrawingNode !== null) {
        im.drawStep = 0;
        im.activeDrawingNode = null;
      }
    } else if (toolDidNotTouchStep) {
      // Mid-flow click — tool didn't advance drawStep itself, do it for them
      // so the next click lands in the next branch.
      im.drawStep++;
    }
    return true;
  }

  // Fallback: tool has an onFinalize, run it and reset.
  if (cfg.onFinalize) {
    cfg.onFinalize(node, logical, im);
  } else {
    onDefaultFinalize(cfg, node, logical, im);
  }
  resetIfStuck(im);
  return true;
}

/**
 * Safety net: if a tool didn't reset im.drawStep/activeDrawingNode itself,
 * do it now. Prevents stuck-tool deadlocks where the chart becomes
 * unresponsive because every click hits an "in-progress drawing" branch.
 */
function resetIfStuck(im: InputManager): void {
  if (im.activeDrawingNode !== null) im.activeDrawingNode = null;
  if (im.drawStep !== 0) im.drawStep = 0;
}

// ============================================================================
// LIVE-PREVIEW DISPATCH — onMouseMove routing (called from InputManager)
// ============================================================================

/**
 * Dispatch live-preview update to the appropriate tool handler.
 * Each tool registers its own onLivePreview — no mega-switch needed!
 * 
 * @returns true if a preview was applied, false if no matching tool/preview
 */
export function dispatchLivePreview(
  mode: string,
  logical: LogicalCoordinates,
  _raw: PointerEvent,
  im: InputManager
): boolean {
  const cfg = toolRegistry.get(mode);
  if (!cfg || !cfg.onLivePreview || !im.activeDrawingNode) return false;

  cfg.onLivePreview(im.activeDrawingNode, logical, im.drawStep, im);
  return true;
}

// ============================================================================
// DEFAULT STEP-0 — Standard node creation + magnet snap
// ============================================================================

/**
 * Default Step-0 handler for tools without custom onStep0Custom.
 * Creates node, applies lineColor/lineWidth, magnet snaps point1, adds to drawingManager.
 */
function onDefaultStep0(
  _cfg: ToolConfig,
  node: DrawableShape,
  logical: LogicalCoordinates,
  im: InputManager
): boolean {
  // Magnet snap for point1
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  node.point1 = { index: logical.index, price: snappedPrice };

  // Add to drawing manager so it appears on canvas
  im.manager.drawingManager.addDrawing(node);

  // Set as active drawing node for subsequent clicks
  im.activeDrawingNode = node;
  im.drawStep = 1;

  return true;
}

// ============================================================================
// DEFAULT FINALIZE — Standard completion logic
// ============================================================================

/**
 * Default Finalize handler for tools without custom onFinalize.
 * Sets point2, isSelected=true, emits 'drawingCreated', resets drawStep/activeDrawingNode, checks keepDrawing.
 */
function onDefaultFinalize(
  cfg: ToolConfig,
  node: DrawableShape,
  logical: LogicalCoordinates,
  im: InputManager
): void {
  // Set point2 to final position (same as last click)
  const snappedPrice = im.applyMagnet(logical.index, logical.price);
  node.point2 = { index: logical.index, price: snappedPrice };

  // Mark selected and emit event
  node.isSelected = true;
  const eventType = cfg.eventType || cfg.mode.replace('draw_', '');
  im.manager.emit('drawingCreated', {
    id: node.id,
    type: eventType,
    data: { point1: node.point1, point2: node.point2 }
  });

  // Reset drawing state
  im.drawStep = 0;
  im.activeDrawingNode = null;

  // KeepDrawing check — stay in tool mode or reset to crosshair
  if (!im.keepDrawing) {
    im.mode = 'crosshair_and_pan';
    im.manager.emit('toolReset', null);
  }
}



// ============================================================================
// AMEND — nachträgliches Ergänzen einer Registrierung (Plugin-Pakete)
// ============================================================================

/**
 * Ergänzt/überschreibt einzelne Hooks einer bereits registrierten Tool-Config
 * (z.B. onLivePreview aus einem Plugin-Paket), ohne die Registrierung zu
 * duplizieren. Gibt false zurück, wenn der Mode unbekannt ist.
 */
export function amendTool(mode: string, patch: Partial<ToolConfig>): boolean {
  const cfg = toolRegistry.get(mode);
  if (!cfg) return false;
  toolRegistry.set(mode, { ...cfg, ...patch, mode: cfg.mode });
  return true;
}

// ============================================================================
// DOUBLE-CLICK DISPATCH — Multi-Click-Tools (steps: -1) finalisieren
// ============================================================================

/**
 * Doppelklick/Double-Tap beendet ein laufendes Multi-Click-Tool über dessen
 * onFinalize-Hook. Gibt true zurück, wenn ein Tool finalisiert wurde.
 */
export function dispatchDoubleClick(mode: string, logical: LogicalCoordinates, im: InputManager): boolean {
  const cfg = toolRegistry.get(mode);
  if (!cfg || cfg.steps !== -1 || !im.activeDrawingNode || !cfg.onFinalize) return false;
  cfg.onFinalize(im.activeDrawingNode, logical, im);
  resetIfStuck(im);
  return true;
}
