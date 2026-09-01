// src/api/controllers/ViewportController.ts
// Version: 1.1.0 | Updated: 2026-08-16 | By: Agent
// 1.1.0 (ZV10-P12): scrollToStart + scrollToEnd(rightMarginFraction).
// P2: Koordinaten, Zoom, Scroll, Range, Crosshair, Snapshot — aus ZChartAPI.ts extrahiert.
import type { ChartManager } from '../../core/ChartManager';
import type { CandleData } from '../../data/DataStore';

export class ViewportController {
    constructor(private manager: ChartManager) {}

    // -----------------------------------------------------------------------
    // Coordinate conversion
    // -----------------------------------------------------------------------

    public dateToPixel(timestamp: number): number {
        const data = this.manager.dataStore.getAllData();
        const idx = this.manager.timeScale.timeToIndex(timestamp, data);
        return this.manager.timeScale.indexToX(idx);
    }

    public pixelToDate(x: number): number | null {
        const data = this.manager.dataStore.getAllData();
        if (!data.length) return null;
        const idx = this.manager.timeScale.xToIndex(x);
        return this.manager.timeScale.indexToTime(idx, data);
    }

    public priceToPixel(price: number, paneId?: string): number {
        const pane = paneId
            ? this.manager.getPanes().find(p => p.id === paneId)
            : this.manager.getPanes().find(p => p.id === 'main');
        if (!pane) return 0;
        return pane.topOffset + pane.priceScale.priceToY(price);
    }

    public pixelToPrice(y: number, paneId?: string): number {
        const pane = paneId
            ? this.manager.getPanes().find(p => p.id === paneId)
            : this.manager.getPanes().find(p => p.id === 'main');
        if (!pane) return 0;
        return pane.priceScale.yToPrice(y - pane.topOffset);
    }

    public yToPrice(localY: number): number | null {
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) return null;
        const price = mainPane.priceScale.yToPrice(localY);
        return Number.isFinite(price) ? price : null;
    }

    // -----------------------------------------------------------------------
    // Visible range
    // -----------------------------------------------------------------------

    public getVisibleDateRange(): { from: number | null; to: number | null } {
        return this.manager.getVisibleDateRange();
    }

    public getMainPriceRange(): { min: number; max: number } | null {
        return this.manager.getMainPriceRange();
    }

    // -----------------------------------------------------------------------
    // View-change subscription
    // -----------------------------------------------------------------------

    public onViewChange(
        callback: (data: {
            indexRange: { start: number; end: number };
            dateRange: { from: number | null; to: number | null };
            priceRange: { min: number; max: number };
            candleWidth: number;
            width: number;
        }) => void,
    ): () => void {
        this.manager.on('viewChanged', callback as (d: unknown) => void);
        return () => this.manager.off('viewChanged', callback as (d: unknown) => void);
    }

    // -----------------------------------------------------------------------
    // Data loading
    // -----------------------------------------------------------------------

    public loadHistoryRange(olderData: CandleData[]): number {
        return this.manager.prependData(olderData);
    }

    // -----------------------------------------------------------------------
    // Zoom / scroll
    // -----------------------------------------------------------------------

    public zoomIn(): void {
        this.manager.zoomTime(1.15);
    }

    public zoomOut(): void {
        this.manager.zoomTime(0.87);
    }

    /** rightMarginFraction (ZV10-P12): Anteil der sichtbaren Breite, der rechts frei bleibt (z.B. 0.2). */
    public scrollToEnd(rightMarginFraction?: number, flushEdge: boolean = false): void {
        this.manager.scrollToEnd(rightMarginFraction, flushEdge);
    }

    /** ZV10-P12: zum ältesten geladenen Bar (MetaTrader „Anfang"), reaktiviert Y-AutoScale. */
    public scrollToStart(leftMarginFraction: number = 0): void {
        this.manager.scrollToStart(leftMarginFraction);
    }

    public scrollToTimestamp(ts: number): void {
        const allData = this.manager.dataStore.getAllData();
        if (allData.length === 0) return;
        let lo = 0, hi = allData.length - 1, idx = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (allData[mid].timestamp < ts) { lo = mid + 1; idx = mid; }
            else { hi = mid - 1; idx = mid; }
        }
        const tsc = this.manager.timeScale;
        tsc.scrollOffset = -(idx) * tsc.candleWidth;
        this.manager.render();
    }

    public resetYScale(): void {
        this.manager.resetYScale();
    }

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------

    public goToDate(timestamp: number): void {
        const dataArray = this.manager.dataStore.getAllData();
        const targetIdx = this.manager.timeScale.timeToIndex(timestamp, dataArray);
        if (targetIdx < 0) return;
        const tsc = this.manager.timeScale;
        const visibleCandles = Math.floor(tsc.width / tsc.candleWidth);
        const centerOffset = Math.floor(visibleCandles / 2);
        tsc.scrollOffset = -(targetIdx - centerOffset) * tsc.candleWidth;
        this.manager.render();
    }

    public setVisibleRange(fromTs: number, toTs: number, opts?: { margin?: number }): void {
        const dataArray = this.manager.dataStore.getAllData();
        if (!dataArray.length) return;
        const tsc = this.manager.timeScale;
        const fromIdx = tsc.timeToIndex(fromTs, dataArray);
        const toIdx   = tsc.timeToIndex(toTs,   dataArray);
        if (fromIdx < 0 || toIdx < 0 || toIdx <= fromIdx) return;
        const barCount = toIdx - fromIdx + 1;
        const marginPct = opts?.margin !== undefined ? opts.margin : 0.05;
        const margin = Math.max(0, Math.round(barCount * marginPct));
        const totalBars = barCount + margin * 2;
        tsc.candleWidth = Math.max(1, tsc.width / totalBars);
        tsc.scrollOffset = -(fromIdx - margin) * tsc.candleWidth;
        this.manager.render();
    }

    // -----------------------------------------------------------------------
    // Crosshair
    // -----------------------------------------------------------------------

    public setCrosshairIndex(index: number): void {
        const x = this.manager.timeScale.indexToX(index);
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) return;
        const data = this.manager.dataStore.getAllData();
        if (index >= 0 && index < data.length) {
            const price = data[index].close;
            const y = mainPane.priceScale.priceToY(price) + mainPane.topOffset;
            this.manager.setMousePos(x, y);
        }
    }

    // -----------------------------------------------------------------------
    // Snapshot
    // -----------------------------------------------------------------------

    public snapshot(): string {
        return this.manager.toDataURL();
    }
}
