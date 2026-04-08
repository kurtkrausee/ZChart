// main.ts
import './style.css';
import { ChartManager } from './core/ChartManager';
import { Pane } from './core/Pane';
import { CandlestickNode } from './nodes/CandlestickNode';
import { LineSeriesNode } from './nodes/LineSeriesNode';
import { StaticLineNode } from './nodes/StaticLineNode';
import { HistogramNode } from './nodes/HistogramNode';
import { ZChartAPI } from './api/ZChartAPI'; // NEU: Importieren

const chart = new ChartManager('app');

// --- DIE BRÜCKE ---
const zChartAPI = new ZChartAPI(chart);
// Wir machen die API global verfügbar, damit deine Toolbar-Buttons 
// von überall (auch aus anderen JS-Dateien) darauf zugreifen können.
(window as any).zChart = zChartAPI; 

// NEU: Wir machen auch den internen Chart-Manager für die Konsole greifbar!
(window as any).chart = chart;

// ---------------------------------------------------------
// AB HIER DEIN BESTEHENDER CODE (Panes & Nodes)
// ---------------------------------------------------------
chart.dataStore.calculateRSI(14);

// 1. MAIN PANE
const mainPane = new Pane('main', 0.6);
const candles = new CandlestickNode(chart.dataStore);
candles.zIndex = 10;
mainPane.addNode(candles);
chart.addPane(mainPane);

// 2. VOLUME PANE
const volumePane = new Pane('volume', 0.15);
const volume = new HistogramNode(chart.dataStore, 'volume', '#26a69a', '#ef5350', 0.3);
volume.zIndex = 1;
volumePane.addNode(volume);
chart.addPane(volumePane);

// 3. RSI PANE
const rsiPane = new Pane('rsi', 0.25);
const overbought = new StaticLineNode(70, '#ff444466');
overbought.zIndex = 1;
const oversold = new StaticLineNode(30, '#44ff4466');
oversold.zIndex = 1;
const rsiLine = new LineSeriesNode(chart.dataStore, 'rsi', '#f39c12', 2);
rsiLine.zIndex = 5;

rsiPane.addNode(overbought);
rsiPane.addNode(oversold);
rsiPane.addNode(rsiLine);
chart.addPane(rsiPane);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = chart.drawingManager.getSelectedShapeId();
        if (selectedId) {
            zChartAPI.deleteDrawing(selectedId);
            // Wir müssen ein Event feuern, damit dein Object Tree rechts weiß, 
            // dass das Element gelöscht wurde!
            chart.emit('drawingDeleted', selectedId);
        }
    }
});