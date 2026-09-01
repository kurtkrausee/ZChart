// src/api/controllers/DrawingsController.ts
// Version: 1.5.0 | Updated: 2026-08-16 | By: Agent
// 1.5.0 (MSO-P4): updateCompareCandle(symbol, point) — Live-Tail-Update eines Compare-Overlays.
// 1.4.0 (MSO-P3): Compare-Nodes bekommen hoverIndexProvider (Canvas-Label mit Wert am Cursor-Bar).
// 1.3.0 (ZV10-P8): eindeutige compare-<SYM>-Roles, Compare-Scale initial gefittet.
// 1.2.0 (ZV10-P7d): setCompareMode('percent'|'absolute') — absolute bindet alle
//   Compare-Nodes an die gemeinsame Zusatz-Scale 'compare' (eigene Achsen-Spalte);
//   Scale wird beim letzten Overlay-Remove bzw. Rückschalten abgebaut.
// 1.1.0: P14 — echtes Silent-Failure (kein main-Pane bei addCompareOverlay) → devWarn().
// P11: Drawing-Management aus ZChartAPI.ts extrahiert.
// Enthält: layer-order, delete/visibility, move/reorder, import/export,
// timestamp-remap, shape-queries, bulk-ops, duplicate, undo/redo, erase,
// input-flags (keepDrawing/lockAll), compare-overlays.
import { ChartManager } from '../../core/ChartManager';
import {
    createSerializerContext,
    importShape,
    exportShape,
    EXPORT_EXCLUDED_TYPES,
} from '../serialization/DrawingSerializer';
import '../serialization/families';
import { type DrawingExportData, devWarn } from '../types';

type TimestampMap = Map<string, { t1: number | null; t2: number | null; t3?: number | null; pts?: (number | null)[] }>;

export class DrawingsController {

    private manager: ChartManager;

    constructor(manager: ChartManager) {
        this.manager = manager;
    }

    // ── Layer order ────────────────────────────────────────────────────────────

    getMainLayerOrder(): string[] {
        return this.manager.getMainLayerOrder();
    }

    setMainLayerOrder(order: string[]): void {
        this.manager.setMainLayerOrder(order);
        this.emitLayerOrderChanged();
    }

    /**
     * ZIP-P5-Fix9: Z-Order-Änderungen müssen ein drawingChanged-Event feuern.
     * Der Auto-Save haengt am drawingCount — ein reines Umsortieren aendert die
     * ANZAHL der Shapes aber nicht, und bei einem Chart ganz OHNE Zeichnungen
     * (nur Indikatoren) gibt es gar keinen Zaehler-Impuls. Folge: die neue
     * Reihenfolge wurde nie gespeichert; gespeichert blieb der Stand, den das
     * Self-Healing beim Laden erzeugt hatte (Befund Abnahme 2026-08-13:
     * `series` stand vorne = hinten gezeichnet, obwohl der User den Kurschart
     * nach vorne gezogen hatte).
     * `type: 'layer_order'` — bestehende Listener filtern auf ihre Typen
     * (z.B. Alert-Drag auf 'alert_line'), reagieren also nicht darauf.
     */
    private emitLayerOrderChanged(): void {
        // ZIP-P5-Fix10: Nach einer User-Umsortierung ist der IST-Stand der neue
        // Wunsch — sonst würde die Engine später auftauchende Layer weiter nach
        // der alten (geladenen) Reihenfolge einsortieren.
        this.manager.setDesiredLayerOrder(this.manager.getMainLayerOrder());
        this.manager.emit('drawingChanged', { id: null, type: 'layer_order', data: null });
    }

    // ── Delete / visibility ────────────────────────────────────────────────────

    deleteDrawing(id: string): void {
        this.manager.drawingManager.removeDrawing(id);
        this.manager.removeFromMainLayerOrder(id);
        // ZIP-P5-Fix6: Löschen MUSS ein drawingChanged-Event feuern — sonst
        // erfährt im Splitscreen nur ZChartTab davon (dessen Handler ruft
        // deleteDrawing auf der Pane-API auf), während der Auto-Save-Effect der
        // ZChartSplitPane an ihrem EIGENEN drawingCount hängt und nie triggert.
        // Folge: gelöschte Zeichnungen wurden nie persistiert und kamen beim
        // nächsten Laden zurück (Befund Abnahme 2026-08-11, Emoji).
        // clearAllDrawings() feuert dieses Event bereits (siehe unten).
        this.manager.emit('drawingChanged', { id, type: 'delete', data: null });
    }

    setVisible(id: string, visible: boolean): void {
        const shape = this.manager.drawingManager.shapes.find(s => s.id === id);
        if (shape) { shape.isVisible = visible; this.manager.markDirty(); }
    }

    setAllVisible(visible: boolean): void {
        this.manager.drawingManager.shapes.forEach(s => { s.isVisible = visible; });
    }

    // ── Z-order movement ───────────────────────────────────────────────────────

    // ZIP-P5-Fix9: Alle Mutationen markieren den Chart als dirty UND feuern
    // drawingChanged — vorher mutierten sie nur das Array (kein Re-Render, kein
    // Save-Trigger).
    moveLayer(id: string, toIndex: number): void {
        const order = this.manager.mainLayerOrder;
        const idx = order.indexOf(id);
        if (idx === -1) return;
        const [item] = order.splice(idx, 1);
        order.splice(toIndex, 0, item);
        this.manager.markDirty();
        this.emitLayerOrderChanged();
    }

    moveToFront(id: string): void {
        const order = this.manager.mainLayerOrder;
        const idx = order.indexOf(id);
        if (idx === -1) return;
        order.splice(idx, 1);
        order.push(id);
        this.manager.markDirty();
        this.emitLayerOrderChanged();
    }

    moveToBack(id: string): void {
        const order = this.manager.mainLayerOrder;
        const idx = order.indexOf(id);
        if (idx === -1) return;
        order.splice(idx, 1);
        order.unshift(id);
        this.manager.markDirty();
        this.emitLayerOrderChanged();
    }

    moveForward(id: string): void {
        const order = this.manager.mainLayerOrder;
        const idx = order.indexOf(id);
        if (idx === -1 || idx >= order.length - 1) return;
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
        this.manager.markDirty();
        this.emitLayerOrderChanged();
    }

    moveBackward(id: string): void {
        const order = this.manager.mainLayerOrder;
        const idx = order.indexOf(id);
        if (idx <= 0) return;
        [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
        this.manager.markDirty();
        this.emitLayerOrderChanged();
    }

    // ── Import / export ────────────────────────────────────────────────────────

    importDrawings(serverDrawings: DrawingExportData[]): void {
        const sctx = createSerializerContext(this.manager);
        serverDrawings.forEach(drawing => {
            const node = importShape(drawing, sctx);
            if (node) {
                node.isVisible = drawing.visible ?? true;
                this.manager.drawingManager.shapes.push(node);
            }
        });
    }

    exportDrawings(): DrawingExportData[] {
        const sctx = createSerializerContext(this.manager);
        return this.manager.drawingManager.shapes
            .filter(shape => !EXPORT_EXCLUDED_TYPES.has(shape.shapeType))
            .map((shape, arrayIndex) => exportShape(shape, sctx, arrayIndex));
    }

    // ── Timestamp capture + remap (data interval change) ──────────────────────

    captureDrawingTimestamps(): TimestampMap | null {
        const shapes = this.manager.drawingManager.shapes;
        if (shapes.length === 0) return null;
        const oldData = this.manager.dataStore.getAllData();
        if (oldData.length === 0) return null;
        const ts = this.manager.timeScale;
        const map: TimestampMap = new Map();
        for (const shape of shapes) {
            const t1 = shape.point1 ? ts.indexToTime(shape.point1.index, oldData) : null;
            const t2 = shape.point2 ? ts.indexToTime(shape.point2.index, oldData) : null;
            const t3 = (shape as any).point3 ? ts.indexToTime((shape as any).point3.index, oldData) : null;
            let pts: (number | null)[] | undefined;
            const shapePts = (shape as any).points as { index: number; price: number }[] | undefined;
            if (Array.isArray(shapePts)) {
                pts = shapePts.map(p => ts.indexToTime(p.index, oldData));
            }
            map.set(shape.id, { t1, t2, t3, pts });
        }
        return map;
    }

    applyDrawingRemap(timestampMap: TimestampMap): void {
        const newData = this.manager.dataStore.getAllData();
        if (newData.length === 0) return;
        const ts = this.manager.timeScale;
        for (const shape of this.manager.drawingManager.shapes) {
            const captured = timestampMap.get(shape.id);
            if (!captured) continue;
            const anyPts = (shape as any).points as { index: number; price: number }[] | undefined;
            if (Array.isArray(anyPts) && captured.pts) {
                for (let i = 0; i < anyPts.length && i < captured.pts.length; i++) {
                    if (captured.pts[i] != null) anyPts[i].index = ts.timeToIndex(captured.pts[i]!, newData);
                }
                if (anyPts.length > 0) shape.point1 = anyPts[0];
                if (anyPts.length > 1) shape.point2 = anyPts[anyPts.length - 1];
                continue;
            }
            if (shape.point1 && captured.t1 != null) shape.point1.index = ts.timeToIndex(captured.t1, newData);
            if (shape.point2 && captured.t2 != null) shape.point2.index = ts.timeToIndex(captured.t2, newData);
            if ((shape as any).point3 && captured.t3 != null) (shape as any).point3.index = ts.timeToIndex(captured.t3, newData);
        }
    }

    // ── Shape queries ──────────────────────────────────────────────────────────

    getShapes() {
        return this.manager.drawingManager.shapes;
    }

    getShapeById(id: string): any | null {
        return this.manager.drawingManager.shapes.find(s => s.id === id) ?? null;
    }

    getDrawingProperties(id: string): any | null {
        const shape = this.manager.drawingManager.shapes.find(s => s.id === id);
        if (!shape) return null;
        const props: any = { id: shape.id, type: shape.shapeType, name: shape.name };
        if ('lineColor'  in shape) props.lineColor  = (shape as any).lineColor;
        if ('lineWidth'  in shape) props.lineWidth  = (shape as any).lineWidth;
        if ('lineDash'   in shape) props.lineDash   = (shape as any).lineDash;
        if ('fillColor'  in shape) props.fillColor  = (shape as any).fillColor;
        if ('text'       in shape) props.text       = (shape as any).text;
        if ('textColor'  in shape) props.textColor  = (shape as any).textColor;
        if ('fontSize'   in shape) props.fontSize   = (shape as any).fontSize;
        if ('bgColor'    in shape) props.bgColor    = (shape as any).bgColor;
        return props;
    }

    setDrawingProperties(id: string, props: Record<string, any>): void {
        const shape = this.manager.drawingManager.shapes.find(s => s.id === id) as any;
        if (!shape) return;
        for (const [key, value] of Object.entries(props)) {
            if (key in shape && key !== 'id' && key !== 'shapeType') shape[key] = value;
        }
        this.manager.emit('drawingChanged', { id, type: shape.shapeType, data: props });
    }

    // ── Bulk operations ────────────────────────────────────────────────────────

    clearAllDrawings(includeLocked: boolean = true): void {
        const shapes = this.manager.drawingManager.shapes;
        const removedIds: string[] = [];
        const toRemove = shapes
            .filter(s => s.shapeType !== 'alert_line' && (includeLocked || !(s as any).isLocked))
            .map(s => s.id);
        for (const id of toRemove) {
            removedIds.push(id);
            this.manager.drawingManager.removeDrawing(id);
        }
        (this.manager as any).markDirty?.();
        this.manager.emit('drawingChanged', { id: null, type: 'clear', data: { removedIds } });
    }

    removeShapesByPane(paneId: string): void {
        this.manager.drawingManager.removeByPane(paneId);
    }

    // ── Duplicate ──────────────────────────────────────────────────────────────

    duplicateDrawing(id: string): void {
        const original = this.manager.drawingManager.shapes.find(s => s.id === id);
        if (!original) return;
        const dataArray = this.manager.dataStore.getAllData();
        const t1 = original.point1 ? (this.manager.timeScale.indexToTime(original.point1.index, dataArray) || Date.now()) : Date.now();
        const t2 = original.point2 ? (this.manager.timeScale.indexToTime(original.point2.index, dataArray) || Date.now()) : t1;
        const ext: any = {
            id: crypto.randomUUID(),
            type: original.shapeType,
            anchors: [
                { timestamp: t1, price: (original.point1?.price ?? 0) + (original.point1 ? original.point1.price * 0.02 : 0) },
                { timestamp: t2, price: (original.point2?.price ?? 0) + (original.point2 ? original.point2.price * 0.02 : 0) },
            ],
            style: {
                color: (original as any).lineColor ?? (original as any).textColor ?? '#2962ff',
                lineWidth: (original as any).lineWidth ?? 2,
            },
            visible: true,
        };
        if (original.shapeType === 'parallel_channel') {
            const pc = original as any;
            ext.channelWidth   = pc.channelWidth;
            ext.levels         = pc.levels;
            ext.extend         = pc.extend;
            ext.showBackground = pc.showBackground;
            ext.fillColor      = pc.fillColor;
            ext.text           = pc.text;
            ext.textColor      = pc.textColor;
            ext.fontSize       = pc.fontSize;
            ext.fontBold       = pc.fontBold;
            ext.fontItalic     = pc.fontItalic;
            ext.textAlign      = pc.textAlign;
        }
        if (original.shapeType === 'text_label') ext.text = (original as any).text;
        this.importDrawings([ext]);
        this.manager.emit('drawingCreated', { id: ext.id, type: ext.type });
    }

    // ── Undo / redo ────────────────────────────────────────────────────────────

    undo(): boolean {
        return this.manager.drawingManager.undo();
    }

    redo(): boolean {
        return this.manager.drawingManager.redo();
    }

    // ── Erase & input flags ────────────────────────────────────────────────────

    eraseShapeAt(x: number, y: number): boolean {
        const pane = this.manager.getPaneAt(y);
        if (!pane || pane.getId() !== 'main') return false;
        const priceScale = pane.getPriceScale();
        const shapes = this.manager.drawingManager.shapes;
        for (let i = shapes.length - 1; i >= 0; i--) {
            if (shapes[i].hitTest(x, y, this.manager.inputManager['timeScale'], priceScale as any)) {
                this.manager.drawingManager.removeDrawing(shapes[i].id);
                return true;
            }
        }
        return false;
    }

    setKeepDrawing(keep: boolean): void {
        this.manager.inputManager.keepDrawing = keep;
    }

    setLockAll(locked: boolean): void {
        this.manager.inputManager.lockAll = locked;
    }

}
