// src/zchart/api/controllers/SettingsController.ts
// Version: 1.2.0 | Updated: 2026-07-06 | By: Agent
// 1.2.0: Crosshair-Dash je Stil (cross [4,4], dashed [8,5], dotted [2,3]) —
//        vorher sahen dashed und dotted identisch aus (hardcoded [4,4]).
// 1.1.0: P14 — echte Silent-Failures (kein mainPane bei aktiven Style-Setzern) → devWarn().
// P13: Theme, Farben, Watermark, Skalen, ChartStyle, Crosshair, Margins, Timezone,
//      apply*Settings (Canvas/Symbol/Scales/TimeScale/PriceLabels), Default-Styles,
//      MagnetMode, Grid, Log/Percent/Axis — 1:1 aus ZChartAPI.ts extrahiert.
import type { ChartManager } from '../../core/ChartManager';
import { CandlestickNode } from '../../nodes/series/CandlestickNode';
import { OhlcBarNode } from '../../nodes/series/OhlcBarNode';
import { LineSeriesNode } from '../../nodes/series/LineSeriesNode';
import { AreaNode } from '../../nodes/series/AreaNode';
import { BaselineNode } from '../../nodes/series/BaselineNode';
import { precisionToDecimals } from '../../utils/Formatters';
import type { CrosshairStyle } from '../../nodes/core/CrosshairNode';
import type { YAxisPosition } from '../../math/PriceScale';
import { type ChartStyle, devWarn } from '../types';
import type {
    CanvasSettings,
    SymbolSettings,
    PriceScaleSettings,
    TimeScaleSettings,
    PriceLabelSettings,
} from '../../core/VisualSettings';

export class SettingsController {
    constructor(private manager: ChartManager) {}

    public setTheme(theme: 'light' | 'dark'): void {
        const c = this.manager.options.colors;
        if (theme === 'light') {
            c.background = '#ffffff'; c.text = '#64748b';
            c.axisLine = '#e0e3eb'; c.grid = '#e0e3eb';
            c.crosshair = '#9194a3';
            c.crosshairLabelBg = '#e2e8f0'; c.crosshairLabelText = '#1e293b';
            c.candleUp = '#089981'; c.candleDown = '#f23645';
            c.areaLineColor = '#3b82f6';
            c.areaGradientStart = 'rgba(59, 130, 246, 0.35)';
            c.areaGradientEnd = 'rgba(59, 130, 246, 0.0)';
            c.separator = '#e2e8f0';
        } else {
            c.background = '#131722'; c.text = '#94a3b8';
            c.axisLine = '#1e222d'; c.grid = '#1e222d';
            c.crosshair = '#758696';
            c.crosshairLabelBg = '#334155'; c.crosshairLabelText = '#e2e8f0';
            c.candleUp = '#089981'; c.candleDown = '#f23645';
            c.areaLineColor = '#60a5fa';
            c.areaGradientStart = 'rgba(96, 165, 250, 0.35)';
            c.areaGradientEnd = 'rgba(96, 165, 250, 0.0)';
            c.separator = '#334155';
        }
        this.manager.render();
    }

    /** Set magnet snap mode for drawing tools */
    public setMagnetMode(mode: 'off' | 'close' | 'hl' | 'ohlc'): void {
        this.manager.inputManager.magnetMode = mode;
    }

    /**
     * Set background watermark (e.g. "MRK · XETRA"). Pass "" to hide.
     * Optional second line (e.g. interval "1d").
     */
    public setWatermark(
        text: string,
        subText: string = '',
        opts?: {
            size?: number;
            opacity?: number; // 0-1
            position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
            color?: string;
        },
    ): void {
        if (!this.manager.watermarkNode) return;
        const w = this.manager.watermarkNode;
        w.text = text;
        w.subText = subText;
        w.isVisible = text.length > 0;
        if (opts?.size !== undefined) w.fontSize = opts.size;
        if (opts?.opacity !== undefined) w.opacity = Math.max(0, Math.min(1, opts.opacity));
        if (opts?.position !== undefined) w.position = opts.position;
        if (opts?.color !== undefined) w.color = opts.color;
        this.manager.render();
    }

    /**
     * P7.3 — Apply PriceLabelSettings flags to the engine.
     * - labelsVisible / noOverlappingLabels / plusButton / countdownToBarClose → options.priceLabels
     * - symbolLabelColor → options.colors.lastPriceLabelBg (label background tint)
     * - highLowLines → options.priceLabels.highLowLines (read by DayHighLowNode)
     * - bidAskLines → stub (no live feed, flag stored only)
     */
    public applyPriceLabelsSettings(pl: PriceLabelSettings): void {
        const opts = this.manager.options;
        opts.priceLabels.labelsVisible       = pl.labelsVisible;
        opts.priceLabels.noOverlappingLabels = pl.noOverlappingLabels;
        opts.priceLabels.plusButton          = pl.plusButton;
        opts.priceLabels.countdownToBarClose = pl.countdownToBarClose;
        opts.priceLabels.symbolLabelColor    = pl.symbolLabel.color;
        opts.priceLabels.highLowLines        = pl.highLowLines;
        opts.priceLabels.bidAskLines         = pl.bidAskLines;
        // Sync symbol-label color to last-price label bg
        opts.colors.lastPriceLabelBg = pl.symbolLabel.color;
        this.manager.render();
    }

    /**
     * P7.4 — Apply TimeScaleSettings (dateFormat, timeFormat, dayOfWeekOnLabels, saveLeftEdge).
     * Writes to options.timeScale; XAxisNode + CrosshairNode read on next render.
     */
    public applyTimeScaleSettings(ts: TimeScaleSettings): void {
        const opts = this.manager.options;
        opts.timeScale.dayOfWeekOnLabels           = ts.dayOfWeekOnLabels;
        opts.timeScale.dateFormat                  = ts.dateFormat === 'auto' ? 'dd.MM.yyyy' : ts.dateFormat;
        opts.timeScale.timeFormat                  = ts.timeFormat;
        opts.timeScale.saveLeftEdgeOnIntervalChange = ts.saveLeftEdgeOnIntervalChange;
        // ZV10-P6: Wheel-Zoom-Anker (alte Saves ohne Feld → 'pointer')
        opts.timeScale.zoomAnchor                  = ts.zoomAnchor ?? 'pointer';
        this.manager.render();
    }

    /** Set default line style for new drawings */
    public setDefaultLineStyle(color: string, width: number): void {
        this.manager.inputManager.defaultLineColor = color;
        this.manager.inputManager.defaultLineWidth = width;
    }

    /** Set default style for next Brush stroke (does not affect line tools) */
    public setBrushDefaults(color: string, width: number): void {
        this.manager.inputManager.brushColor = color;
        this.manager.inputManager.brushWidth = width;
    }

    /** Set default style for next Highlighter stroke (does not affect line tools) */
    public setHighlighterDefaults(color: string, width: number): void {
        this.manager.inputManager.highlighterColor = color;
        this.manager.inputManager.highlighterWidth = width;
    }

    /** Toggle grid visibility (7.2) */
    public setGridVisible(visible: boolean): void {
        this.manager.options.grid.verticalLines.visible = visible;
        this.manager.options.grid.horizontalLines.visible = visible;
    }

    /**
     * P8.1-P8.3: Apply canvas visual settings (background, grid, crosshair, watermark, scales).
     * Derives ChartConfig.colors from VisualSettings and triggers a render.
     */
    public applyCanvasSettings(canvas: CanvasSettings): void {
        const opts = this.manager.options;
        // Background
        opts.colors.background = canvas.background.mode === 'solid'
            ? canvas.background.solidColor
            : canvas.background.color;
        opts.colors.backgroundGradientTo = canvas.background.mode === 'solid'
            ? canvas.background.solidColor
            : (canvas.background.colorTo ?? canvas.background.color);
        // Grid
        const gm = canvas.grid.mode;
        opts.grid.verticalLines.visible = gm === 'both' || gm === 'vert';
        opts.grid.horizontalLines.visible = gm === 'both' || gm === 'horz';
        opts.colors.gridVert = canvas.grid.vertColor;
        opts.colors.gridHorz = canvas.grid.horzColor;
        // Crosshair — map VisualSettings style to engine CrosshairStyle
        const csMap: Record<string, 'cross' | 'line' | 'hidden'> = {
            cross: 'cross', dashed: 'line', dotted: 'line',
        };
        this.manager.getCrosshairNode().style = csMap[canvas.crosshair.style] ?? 'cross';
        // Dash-Pattern je Stil — vorher hardcoded [4,4], wodurch dashed und
        // dotted identisch aussahen.
        const csDashMap: Record<string, number[]> = {
            cross: [4, 4], dashed: [8, 5], dotted: [2, 3],
        };
        this.manager.getCrosshairNode().dash = csDashMap[canvas.crosshair.style] ?? [4, 4];
        opts.colors.text = canvas.scales.textColor;
        opts.colors.axisLine = canvas.scales.linesColor;
        opts.colors.separator = canvas.scales.linesColor;
        // Watermark is fully controlled by admin settings (setWatermark).
        // User VisualSettings must NOT override it.
        this.manager.render();
    }

    /**
     * P5: Apply symbol visual settings (candle/wick/border/volume colors + hollow mode).
     * Maps VisualSettings.symbol → ChartConfig.colors and triggers a render.
     */
    public applySymbolSettings(symbol: SymbolSettings): void {
        const opts = this.manager.options;
        const { candle, volume } = symbol;
        // Wick: sync toggle mirrors body color
        const wickUp = candle.wickSync ? candle.bodyUp : candle.wickUp;
        const wickDown = candle.wickSync ? candle.bodyDown : candle.wickDown;
        opts.colors.candleUp        = candle.bodyUp;
        opts.colors.candleDown      = candle.bodyDown;
        opts.colors.wickUp          = wickUp;
        opts.colors.wickDown        = wickDown;
        opts.colors.candleBorderUp   = candle.borderUp;
        opts.colors.candleBorderDown  = candle.borderDown;
        opts.colors.candleHollow      = candle.hollow;
        opts.colors.bodyVisible       = candle.bodyVisible;
        opts.colors.borderVisible     = candle.borderVisible;
        opts.colors.wickVisible       = candle.wickVisible;
        opts.colors.colorBarsByPrevClose = candle.colorBarsByPrevClose;
        opts.colors.volumeUp        = volume.up;
        opts.colors.volumeDown      = volume.down;
        opts.colors.lastPriceLabelBg = candle.bodyUp;
        // Precision → priceDecimals
        opts.layout.priceDecimals = precisionToDecimals(symbol.precision);
        // ZV10-P4: Zahlenformat (alte Saves ohne Felder → Engine-Defaults behalten)
        opts.layout.thousandSeparator = symbol.thousandSeparator ?? opts.layout.thousandSeparator;
        opts.layout.trimTrailingZeros = symbol.trimTrailingZeros ?? opts.layout.trimTrailingZeros;
        this.manager.render();
    }

    /** Set the IANA timezone for x-axis and crosshair labels */
    public setTimezone(tz: string): void {
        this.manager.options.timezone = tz;
        this.manager.render();
    }

    /** Set crosshair style: 'cross', 'line', or 'hidden' (7.3) */
    public setCrosshairStyle(style: CrosshairStyle): void {
        this.manager.getCrosshairNode().style = style;
    }

    /** Set candle colors for bullish/bearish (7.4) */
    public setCandleColors(upColor: string, downColor: string): void {
        this.manager.options.colors.candleUp = upColor;
        this.manager.options.colors.candleDown = downColor;
    }

    /**
     * P8.5: Set layout margins (top/bottom as 0–100 integer %, rightBars as bar count).
     * Triggers a full re-scale + render.
     */
    public setMargins(top: number, bottom: number, rightBars: number): void {
        this.manager.options.layout.marginTop = Math.max(0, Math.min(50, top)) / 100;
        this.manager.options.layout.marginBottom = Math.max(0, Math.min(50, bottom)) / 100;
        this.manager.options.layout.rightBars = Math.max(0, rightBars);
        this.manager.render();
    }

    /** Toggle logarithmic price scale (2.4) */
    public setLogScale(enabled: boolean): void {
        const panes = this.manager.getPanes();
        const mainPane = panes.find(p => p.id === 'main');
        if (mainPane) mainPane.priceScale.isLog = enabled;
    }

    /** Get current log scale state */
    public isLogScale(): boolean {
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        return mainPane?.priceScale.isLog ?? false;
    }

    /** Set crosshair snap to OHLC mode (2.10) */
    public setCrosshairSnap(enabled: boolean): void {
        this.manager.getCrosshairNode().snapToOHLC = enabled;
    }

    /** Set cursor mode override (arrow, dot, laser, spray, eraser) */
    public setCursorMode(mode: string): void {
        this.manager.inputManager.cursorModeOverride = mode;
        // Arrow mode hides the grid crosshair entirely; others show it
        const crosshair = this.manager.getCrosshairNode();
        crosshair.style = (mode === 'arrow') ? 'hidden' : 'cross';
    }

    /** 1.5 Heikin-Ashi — toggle on main pane series node */
    public setHeikinAshi(enabled: boolean): void {
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) { devWarn('SettingsController', 'setHeikinAshi: kein main-Pane'); return; }
        const series = mainPane.nodes.find(n => n.role === 'series');
        if (series && series instanceof CandlestickNode) {
            series.heikinAshi = enabled;
        }
    }

    /** 1.5 Switch style including heikin_ashi */
    public setChartStyle(style: ChartStyle): void {
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) { devWarn('SettingsController', `setChartStyle(${style}): kein main-Pane`); return; }

        // First reset HA and hollow on existing candle node
        const currentSeries = mainPane.nodes.find(n => n.role === 'series');
        if (currentSeries instanceof CandlestickNode) {
            currentSeries.heikinAshi = false;
            currentSeries.hollow = false;
        }

        if (style === 'heikin_ashi') {
            // Ensure we have a CandlestickNode, then enable HA
            if (!(currentSeries instanceof CandlestickNode)) {
                mainPane.removeNodeByRole('series');
                const node = new CandlestickNode(this.manager.dataStore);
                node.zIndex = 10;
                node.role = 'series';
                mainPane.addNode(node);
                node.heikinAshi = true;
            } else {
                currentSeries.heikinAshi = true;
            }
            return;
        }

        // 1.6 Hollow Candles
        if (style === 'hollow') {
            if (!(currentSeries instanceof CandlestickNode)) {
                mainPane.removeNodeByRole('series');
                const node = new CandlestickNode(this.manager.dataStore);
                node.zIndex = 10;
                node.role = 'series';
                mainPane.addNode(node);
                node.hollow = true;
            } else {
                currentSeries.hollow = true;
            }
            return;
        }

        mainPane.removeNodeByRole('series');
        let node;
        switch (style) {
            case 'ohlc':
                node = new OhlcBarNode(this.manager.dataStore);
                break;
            case 'line':
                node = new LineSeriesNode(this.manager.dataStore, 'close', '#2962ff', 2);
                break;
            case 'area':
                node = new AreaNode(this.manager.dataStore);
                break;
            case 'baseline':
                node = new BaselineNode(this.manager.dataStore);
                break;
            case 'candle_solid':
            default:
                node = new CandlestickNode(this.manager.dataStore);
                break;
        }
        node.zIndex = 10;
        node.role = 'series';
        mainPane.addNode(node);
    }

    /** 2.5 Percentage mode on main pane */
    public setPercentMode(enabled: boolean): void {
        const mainPane = this.manager.getPanes().find(p => p.id === 'main');
        if (!mainPane) { devWarn('SettingsController', 'setPercentMode: kein main-Pane'); return; }
        mainPane.priceScale.isPercent = enabled;
        if (enabled) {
            const data = this.manager.dataStore.getAllData();
            const total = data.length;
            const { start } = this.manager.timeScale.getVisibleRange(total);
            const baseCandle = data[Math.max(0, start)];
            mainPane.priceScale.basePrice = baseCandle ? baseCandle.close : 0;
        }
    }

    /** 2.6 Y-Axis position: left / right / both */
    public setAxisPosition(pos: YAxisPosition): void {
        for (const pane of this.manager.getPanes()) {
            pane.priceScale.axisPosition = pos;
        }
    }

    /** P7.2: Lock/unlock price-to-bar ratio on the main pane */
    public setLockPriceBarRatio(enabled: boolean): void {
        for (const pane of this.manager.getPanes()) {
            pane.priceScale.lockPriceBarRatio = enabled;
        }
    }

    /**
     * P7.2: Apply all PriceScaleSettings from the Scales-Tab in one shot.
     * Drives: scaleMode (log/%), axis placement, lock price-bar ratio.
     */
    public applyScalesSettings(ps: PriceScaleSettings): void {
        this.setLogScale(ps.scaleMode === 'logarithmic');
        this.setPercentMode(ps.scaleMode === 'percentage');
        const axisPos: YAxisPosition =
            ps.placement === 'left' ? 'left'
            : ps.placement === 'both' ? 'both'
            : 'right';
        this.setAxisPosition(axisPos);
        for (const pane of this.manager.getPanes()) {
            pane.priceScale.hideAxis = ps.placement === 'hidden';
            pane.priceScale.lockPriceBarRatio = ps.lockPriceToBarRatio;
        }
        this.manager.render();
    }
}
