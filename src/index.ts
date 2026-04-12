// src/index.ts

// Kern-Exporte
export { ChartManager } from './core/ChartManager';
export { ZChartAPI } from './api/ZChartAPI';
export { DataStore } from './data/DataStore';
export { Pane } from './core/Pane'; // WICHTIG: Fehlt für neue Indikatoren!

// Basis-Klasse für eigene Erweiterungen
export { SceneNode } from './nodes/core/SceneNode'; 

// Nodes für Serien (Daten-Darstellung)
export { CandlestickNode } from './nodes/series/CandlestickNode';
export { AreaNode } from './nodes/series/AreaNode';
export { LineSeriesNode } from './nodes/series/LineSeriesNode';
export { HistogramNode } from './nodes/series/HistogramNode';
export { VolumeNode } from './nodes/series/VolumeNode';
export { StaticLineNode } from './nodes/core/StaticLineNode'; // Kann auch in Serien-Panes genutzt werden

// Nodes für Tools (Zeichnungen)
export { TrendLineNode } from './nodes/tools/TrendLineNode';
export { FiboNode } from './nodes/tools/FiboNode';
export { EmojiNode } from './nodes/tools/EmojiNode';
export { TextNode } from './nodes/tools/TextNode'; // NEU
export { PenNode } from './nodes/tools/PenNode';   // NEU
export { ImageNode } from './nodes/tools/ImageNode'; // NEU

// Nodes für Core-Elemente (Design/Achsen)
export { GridNode } from './nodes/core/GridNode';
export { XAxisNode } from './nodes/core/XAxisNode';
export { YAxisNode } from './nodes/core/YAxisNode';

// Typen (korrekte Pfade prüfen!)
export type { CandleData } from './data/DataStore';
export type { ChartConfig, DeepPartial } from './core/ChartOptions';
export type { InputMode } from './input/InputManager'; // WICHTIG für React UI Buttons
export { defaultOptions, mergeOptions } from './core/ChartOptions';

export interface IndicatorConfig {
    id: string;               // Eindeutige ID (z.B. "sma_20_close")
    type: string;             // Der Typ (z.B. "sma", "rsi", "macd")
    paneId: string;           // Wo soll er hin? ('main' oder neues Sub-Pane)
    
    // Mathematische Parameter
    inputs: {
        period?: number;      // z.B. 14, 20, 50
        source?: 'open' | 'high' | 'low' | 'close'; // Basis für die Berechnung
        multiplier?: number;  // Für Bollinger Bänder etc.
    };
    
    // Optische Parameter
    styles: {
        color: string;        // Linienfarbe
        lineWidth: number;    // Dicke
        lineStyle?: 'solid' | 'dashed'; // Art der Linie
    };
}