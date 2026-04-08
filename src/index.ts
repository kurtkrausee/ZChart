// src/index.ts

// Kern-Exporte
export { ChartManager } from './core/ChartManager';
export { ZChartAPI } from './api/ZChartAPI';
export { DataStore } from './data/DataStore';

// Basis-Klasse für eigene Erweiterungen
export { SceneNode } from './nodes/core/SceneNode'; 

// Nodes für Serien (Daten-Darstellung)
export { CandlestickNode } from './nodes/series/CandlestickNode';
export { AreaNode } from './nodes/series/AreaNode';
export { LineSeriesNode } from './nodes/series/LineSeriesNode';
export { HistogramNode } from './nodes/series/HistogramNode';
export { VolumeNode } from './nodes/series/VolumeNode';

// Nodes für Tools (Zeichnungen)
export { TrendLineNode } from './nodes/tools/TrendLineNode';
export { FiboNode } from './nodes/tools/FiboNode';
export { EmojiNode } from './nodes/tools/EmojiNode';

// Nodes für Core-Elemente (Design/Achsen)
export { GridNode } from './nodes/core/GridNode';
export { XAxisNode } from './nodes/core/XAxisNode';
export { YAxisNode } from './nodes/core/YAxisNode';

// Typen (korrekte Pfade!)
export type { CandleData } from './data/DataStore';
export type { ChartConfig, ChartColors } from './core/ChartOptions'; // <--- Hier ist der korrigierte Pfad