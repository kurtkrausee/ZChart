// core/DrawingManager.ts
// Version: 1.10.0 | Updated: 2026-04-19 | By: GitHub Copilot

import type { DrawableShape } from '../types/DrawableShape';
import { TimeScale } from '../math/TimeScale';
import { PriceScale } from '../math/PriceScale';
import type { ChartConfig } from './ChartOptions';

export type { DrawableShape };

interface UndoEntry {
    type: 'add' | 'remove';
    shape: DrawableShape;
    index: number; // position in shapes array
}

export class DrawingManager {
    public shapes: DrawableShape[] = [];
    /** Chart-layer z-index: number of shapes drawn BELOW candles (0 = all above) */
    public chartLayerIndex: number = 0;
    private undoStack: UndoEntry[] = [];
    private redoStack: UndoEntry[] = [];
    private readonly MAX_UNDO = 50;

    public draw(
        ctx: CanvasRenderingContext2D, 
        timeScale: TimeScale, 
        priceScale: PriceScale, 
        options: ChartConfig
    ) {
        this.shapes.forEach(shape => {
            if (shape.isVisible) {
                shape.draw(ctx, timeScale, priceScale, options);
            }
        });
    }

    /**
     * Draw shapes that appear BELOW chart (background, drawn before candles).
     * Shapes at indices [0..chartLayerIndex-1] are below chart.
     * chartLayerIndex = 0 → nothing below → all shapes above candles.
     * Convention: higher array index = more foreground (drawn later).
     *
     * @param paneId  Optional pane filter (B2). When provided, only shapes
     *                whose `paneId` matches are drawn. When omitted, only
     *                shapes bound to 'main' (or with undefined paneId) are drawn.
     */
    public drawBelow(
        ctx: CanvasRenderingContext2D,
        timeScale: TimeScale,
        priceScale: PriceScale,
        options: ChartConfig,
        paneId?: string,
    ) {
        const filter = paneId ?? 'main';
        const end = Math.min(this.chartLayerIndex, this.shapes.length);
        for (let i = 0; i < end; i++) {
            const s = this.shapes[i];
            if (!s.isVisible) continue;
            if ((s.paneId ?? 'main') !== filter) continue;
            s.draw(ctx, timeScale, priceScale, options);
        }
    }

    /**
     * Draw shapes that appear ABOVE chart (foreground, drawn after candles).
     * See `drawBelow` for paneId semantics.
     */
    public drawAbove(
        ctx: CanvasRenderingContext2D,
        timeScale: TimeScale,
        priceScale: PriceScale,
        options: ChartConfig,
        paneId?: string,
    ) {
        const filter = paneId ?? 'main';
        for (let i = this.chartLayerIndex; i < this.shapes.length; i++) {
            const s = this.shapes[i];
            if (!s.isVisible) continue;
            if ((s.paneId ?? 'main') !== filter) continue;
            s.draw(ctx, timeScale, priceScale, options);
        }
    }

    /** Add a drawing and record it for undo. Silently skips duplicate ids. */
    public addDrawing(shape: DrawableShape) {
        if (this.shapes.some(s => s.id === shape.id)) return;
        this.shapes.push(shape);
        this.pushUndo({ type: 'add', shape, index: this.shapes.length - 1 });
    }

    public removeDrawing(id: string) {
        const idx = this.shapes.findIndex(s => s.id === id);
        if (idx === -1) return;
        const [removed] = this.shapes.splice(idx, 1);
        this.pushUndo({ type: 'remove', shape: removed, index: idx });
    }

    /** Remove all shapes belonging to a specific pane (used when removing sub-pane indicators). */
    public removeByPane(paneId: string): void {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if ((this.shapes[i].paneId ?? 'main') === paneId) {
                this.shapes.splice(i, 1);
                if (i < this.chartLayerIndex) this.chartLayerIndex--;
            }
        }
    }

    public deselectAll() {
        this.shapes.forEach(shape => shape.isSelected = false);
    }

    public reorder(id: string, newIndex: number) {
        const index = this.shapes.findIndex(s => s.id === id);
        if (index === -1) return;
        const [shape] = this.shapes.splice(index, 1);
        this.shapes.splice(newIndex, 0, shape);
    }

    public getSelectedShapeId(): string | null {
        const selected = this.shapes.find(s => s.isSelected);
        return selected ? selected.id : null;
    }

    // ── Undo / Redo (5.6) ──

    private pushUndo(entry: UndoEntry) {
        this.undoStack.push(entry);
        if (this.undoStack.length > this.MAX_UNDO) this.undoStack.shift();
        this.redoStack = []; // Clear redo on new action
    }

    /** Undo the last drawing action. Returns true if an action was undone. */
    public undo(): boolean {
        const entry = this.undoStack.pop();
        if (!entry) return false;

        if (entry.type === 'add') {
            // Undo add → remove the shape
            const idx = this.shapes.findIndex(s => s.id === entry.shape.id);
            if (idx !== -1) this.shapes.splice(idx, 1);
        } else {
            // Undo remove → re-insert at original position
            const insertIdx = Math.min(entry.index, this.shapes.length);
            this.shapes.splice(insertIdx, 0, entry.shape);
        }

        this.redoStack.push(entry);
        return true;
    }

    /** Redo the last undone action. Returns true if an action was redone. */
    public redo(): boolean {
        const entry = this.redoStack.pop();
        if (!entry) return false;

        if (entry.type === 'add') {
            // Redo add → re-insert
            const insertIdx = Math.min(entry.index, this.shapes.length);
            this.shapes.splice(insertIdx, 0, entry.shape);
        } else {
            // Redo remove → remove again
            const idx = this.shapes.findIndex(s => s.id === entry.shape.id);
            if (idx !== -1) this.shapes.splice(idx, 1);
        }

        this.undoStack.push(entry);
        return true;
    }
}