// ZChart Core — Public API
// Version: 2.0.0 | Updated: 2026-08-18 | By: Agent

// Kern
export { ChartManager } from './core/ChartManager';
export { ZChartAPI } from './api/ZChartAPI';
export { DataStore } from './data/DataStore';
export { Pane } from './core/Pane';

// Typen
export type { CandleData } from './data/DataStore';
export type { ChartConfig, DeepPartial } from './core/ChartOptions';
export type { VisualSettings } from './core/VisualSettings';
export type { DrawableShape, DrawableShapeType, LogicalPoint, VisibilityTimeframes } from './types/DrawableShape';

// Basisklassen für eigene Erweiterungen (Plugin-Zielbild: Pro/Dritte leiten hiervon ab)
export { SceneNode } from './nodes/core/SceneNode';
export { DrawableSceneNode } from './nodes/core/DrawableSceneNode';
export { BaseIndicatorNode } from './nodes/indicators/BaseIndicatorNode';
export type { IndicatorConfig } from './nodes/indicators/BaseIndicatorNode';

// Registries — die Erweiterungspunkte (Tools/Indikatoren/Serializer/Themes)
export { registerTool, amendTool, getToolConfig, isToolRegistered, dispatchClick, dispatchLivePreview } from './input/tools';
export type { ToolConfig } from './input/tools';
export { registerPaneIndicator, getPaneIndicator, listPaneIndicatorIds } from './api/indicators/paneRegistry';
export { registerOverlayIndicator, getOverlayIndicator, listOverlayIndicatorIds } from './api/indicators/overlayRegistry';
export { registerDrawingSerializer, hasDrawingSerializer } from './api/serialization/DrawingSerializer';
export { registerTheme, listThemes, getTheme, hasTheme, resolveTheme, getDefaultThemeId } from './themes';
export type { ThemeDescriptor } from './themes';

// Serien-Nodes
export { CandlestickNode } from './nodes/series/CandlestickNode';
export { OhlcBarNode } from './nodes/series/OhlcBarNode';
export { AreaNode } from './nodes/series/AreaNode';
export { BaselineNode } from './nodes/series/BaselineNode';
export { LineSeriesNode } from './nodes/series/LineSeriesNode';
export { HistogramNode } from './nodes/series/HistogramNode';
export { StackedHistogramNode } from './nodes/series/StackedHistogramNode';
export { VolumeNode } from './nodes/series/VolumeNode';
export { MarkerSeriesNode } from './nodes/series/MarkerSeriesNode';

// Zeichentool-Nodes (Basis-Set)
export { TrendLineNode } from './nodes/tools/TrendLineNode';
export { RayNode } from './nodes/tools/RayNode';
export { ExtendedLineNode } from './nodes/tools/ExtendedLineNode';
export { HorizontalLineNode } from './nodes/tools/HorizontalLineNode';
export { HorizontalRayNode } from './nodes/tools/HorizontalRayNode';
export { VerticalLineNode } from './nodes/tools/VerticalLineNode';
export { CrossLineNode } from './nodes/tools/CrossLineNode';
export { RectangleNode } from './nodes/tools/RectangleNode';
export { EllipseNode } from './nodes/tools/EllipseNode';
export { TriangleNode } from './nodes/tools/TriangleNode';
export { PolylineNode } from './nodes/tools/PolylineNode';
export { BrushNode } from './nodes/tools/BrushNode';
export { TextLabelNode } from './nodes/tools/TextLabelNode';
export { NoteNode } from './nodes/tools/NoteNode';
export { ArrowNode } from './nodes/tools/ArrowNode';
export { EmojiNode } from './nodes/tools/EmojiNode';
export { MeasureNode } from './nodes/tools/MeasureNode';
export { PriceRangeNode } from './nodes/tools/PriceRangeNode';
export { DateRangeNode } from './nodes/tools/DateRangeNode';
export * from './nodes/tools/fib';

// Indikator-Nodes (Basis-Set)
export { SMANode, EMANode, RSINode, MACDNode, StochasticNode, ATRNode, BollingerBandsNode, VolumeSMANode } from './nodes/indicators';

// Core-Elemente (Achsen/Design)
export { GridNode } from './nodes/core/GridNode';
export { XAxisNode } from './nodes/core/XAxisNode';
export { YAxisNode } from './nodes/core/YAxisNode';
export { StaticLineNode } from './nodes/core/StaticLineNode';
export { WatermarkNode } from './nodes/core/WatermarkNode';

// Achsen-Mathematik
export { computeNiceTicks, niceStep, DEFAULT_TICK_SPACING_PX } from './math/TickEngine';
export type { AxisTick } from './math/TickEngine';

// ── Mechanik-Exporte für Plugin-Autoren (ZChart Pro, Dritt-Plugins) ──────────
export { TimeScale } from './math/TimeScale';
export { PriceScale } from './math/PriceScale';
export type { YAxisPosition } from './math/PriceScale';
export * from './math/TPOEngine';
export * from './utils/geometry';
export * from './utils/Formatters';
export * from './utils/timeFormat';
export type { InputManager, LogicalCoordinates, InputMode, ToolId } from './input/InputManager';
export type { InterceptorPhase, PointerInterceptor, ZChartPointerEvent } from './input/PointerInterceptor';
export { withZ, levelLine, num, str } from './api/indicators/paneRegistry';
export type { PaneParams, PaneIndicatorDef } from './api/indicators/paneRegistry';
export { parseOverlayParams, overlayLineStyleToDash } from './api/indicators/overlayRegistry';
export type { OverlayIndicatorDef, OverlayLineStyles, OverlayBuildContext, OverlayParsedParams } from './api/indicators/overlayRegistry';
export type { SerializerContext, DrawingSerializerEntry } from './api/serialization/DrawingSerializer';
export { EXPORT_EXCLUDED_TYPES } from './api/serialization/DrawingSerializer';
export type { DrawingExportData, DrawingAnchor, DrawingExportStyle, ZChartSettingsTemplate, IndicatorLineStyleOptions } from './api/types';
export { devWarn } from './api/types';
export { LastPriceLineNode } from './nodes/core/LastPriceLineNode';
export { DayHighLowNode } from './nodes/core/DayHighLowNode';
export { RangeHighlightNode } from './nodes/core/RangeHighlightNode';
export { CrosshairNode } from './nodes/core/CrosshairNode';
export * from './indicators/calc/movingAverages';
