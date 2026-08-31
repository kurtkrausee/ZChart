// src/api/ZChartAPI.ts
import { ChartManager } from '../core/ChartManager';
import { TrendLineNode } from '../nodes/tools/TrendLineNode';
import { FiboNode } from '../nodes/tools/FiboNode';
import { ImageNode } from '../nodes/tools/ImageNode';
import { TextNode } from '../nodes/tools/TextNode';
import { PenNode } from '../nodes/tools/PenNode';
import { EmojiNode } from '../nodes/tools/EmojiNode';
import { LineSeriesNode } from '../nodes/series/LineSeriesNode';
import { CandlestickNode } from '../nodes/series/CandlestickNode';
import { AreaNode } from '../nodes/series/AreaNode';
import { OhlcBarNode } from '../nodes/series/OhlcBarNode';
import { calculateSMA } from '../math/indicators/SMA';
import { IndicatorRegistry, IndicatorConfig } from '../core/IndicatorRegistry';
import { Pane } from '../core/Pane';
import { HistogramNode } from '../nodes/series/HistogramNode';
import { HorizontalLineNode } from '../nodes/tools/HorizontalLineNode';

// --- Typ für das Event-System ---
export type ZChartEventCallback = (data: any) => void;

export class ZChartAPI {
    private manager: ChartManager;
    
    // --- Speicher für die Event-Listener ---
    private listeners: Record<string, ZChartEventCallback[]> = {};

    constructor(manager: ChartManager) {
        this.manager = manager;
    }

    // ==========================================
    // ZChartAPI EventEmitter
    // ==========================================
    public on(event: string, callback: ZChartEventCallback): void {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    public off(event: string, callback: ZChartEventCallback): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    public emit(event: string, data?: any): void {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    /**
     * Ermöglicht der Web-App, auf Ereignisse zu hören.
     */
    public subscribe(event: string, callback: (data: any) => void) {
        this.on(event, callback);
    }

    // ==========================================
    // Smart Clear (Nutzt Node-Rollen)
    // ==========================================
    /**
     * Löscht alle Nutzer-Zeichnungen, ignoriert aber Achsen und Kerzen
     */
    public clearAllDrawings() {
        const shapes = this.manager.drawingManager.shapes;
        // Finde nur die Elemente mit der Rolle 'tool'
        const toolsToRemove = shapes.filter(s => s.role === 'tool');
        
        // Lösche sie gezielt
        toolsToRemove.forEach(tool => {
            this.manager.drawingManager.removeDrawing(tool.id);
        });
    }

    /**
     * Steuert das aktive Werkzeug (z.B. von der Toolbar aufgerufen)
     */
    public setTool(tool: 'pan' | 'trendline' | 'fibo' | 'horizontal'): void {
        const input = this.manager.inputManager;
        if (tool === 'pan') {
            input.mode = 'crosshair_and_pan';
        } else if (tool === 'trendline') {
            input.mode = 'draw_trendline';
        } else if (tool === 'fibo') {
            input.mode = 'draw_fibo'; // <--- NEU
        } else if (tool === 'horizontal') {
            input.mode = 'draw_horizontal_line'; // <--- NEU
        }
    }

    // ==========================================
    // UNIFIED TREE HELPER
    // ==========================================
    
    /**
     * Sucht ein Objekt anhand der ID. 
     * Schaut zuerst bei den Zeichnungen, dann bei den festen Nodes im Main-Pane.
     */
    private findTreeObject(id: string) {
        // 1. Ist es eine Zeichnung?
        const drawing = this.manager.drawingManager.shapes.find(s => s.id === id);
        if (drawing) return { obj: drawing, type: 'drawing' };

        // 2. Ist es ein Chart/Overlay im Main-Pane?
        const mainPane = (this.manager as any).panes.find((p: any) => p.id === 'main');
        if (mainPane) {
            const engineNode = mainPane.nodes.find((n: any) => n.id === id);
            if (engineNode) return { obj: engineNode, type: 'engineNode', pane: mainPane };
        }

        return null;
    }

    // ==========================================
    // API METHODEN UPDATEN
    // =========================================


   /**
     * Löscht ein Objekt (unterstützt jetzt Gruppen!)
     */
    public deleteDrawing(id: string) {
        if (id === 'main_candles') {
            alert("Der Haupt-Chart kann nicht gelöscht werden.");
            return;
        }

        // 1. Aus allen Panes löschen (Filtert exakte ID oder Gruppen-ID)
        (this.manager as any).panes.forEach((pane: any) => {
            pane.nodes = pane.nodes.filter((node: any) => {
                return !(node.id === id || (node.config && `indicator_${node.config.id}` === id));
            });
        });

        // 2. Aus Zeichnungen löschen
        this.manager.drawingManager.shapes = this.manager.drawingManager.shapes.filter(s => s.id !== id);

        this.manager.render();
        this.emit('treeUpdated');
    }

    /**
     * Schaltet Sichtbarkeit im Baum um (unterstützt jetzt Gruppen!)
     */
    public setVisible(id: string, visible: boolean) {
        let foundAny = false;
        const allNodes = [
            ...(this.manager as any).panes.flatMap((p: any) => p.nodes),
            ...this.manager.drawingManager.shapes
        ];

        allNodes.forEach((node: any) => {
            // Entweder exakte ID (Zeichnung) ODER es gehört zur angeklickten Indikator-Gruppe
            if (node.id === id || (node.config && `indicator_${node.config.id}` === id)) {
                node.isVisible = visible;
                foundAny = true;
            }
        });

        if (foundAny) {
            this.manager.render();
            this.emit('treeUpdated'); 
        }
    }

    /**
     * Verschiebt ein Objekt exakt eine Ebene nach oben oder unten (Z-Index Swap).
     */
    public moveLayerZIndex(id: string, direction: 'up' | 'down') {
        const mainPane = (this.manager as any).panes.find((p: any) => p.id === 'main');
        const engineNodes = mainPane ? mainPane.nodes : [];
        const drawings = this.manager.drawingManager.shapes;

        // 1. Alle Objekte flach zusammenlegen
        let allObjects = [...engineNodes, ...drawings];

        // 2. WICHTIG: Wir bereinigen die Z-Indizes, damit es keine doppelten Zahlen gibt (0, 1, 2, 3...)
        allObjects.sort((a, b) => a.zIndex - b.zIndex);
        allObjects.forEach((obj, idx) => obj.zIndex = idx);

        // 3. Wo steht unser Objekt?
        const currentIndex = allObjects.findIndex(obj => obj.id === id);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;

        if (targetIndex >= 0 && targetIndex < allObjects.length) {
            // 4. Jetzt tauschen! Da die Z-Indizes jetzt garantiert einzigartig sind, klappt das immer.
            const currentObj = allObjects[currentIndex];
            const targetObj = allObjects[targetIndex];

            const tempZ = currentObj.zIndex;
            currentObj.zIndex = targetObj.zIndex;
            targetObj.zIndex = tempZ;

            // 5. Dem Render-Manager die neue Sortierung aufzwingen
            if (mainPane) mainPane.nodes.sort((a: any, b: any) => a.zIndex - b.zIndex);
            this.manager.drawingManager.shapes.sort((a: any, b: any) => a.zIndex - b.zIndex);

            this.manager.render();
            this.emit('treeUpdated'); 
        }
    }


    /**
     * IMPORT: Wandelt das Server-JSON (Timestamps) in ZChart-Nodes (Indizes) um.
     */
    public importDrawings(serverDrawings: any[]) {
        const dataArray = this.manager.dataStore.getAllData();

        // Hilfsfunktion: Konvertiert einen Server-Timestamp sauber in einen Chart-Index
        const getLogicalPoint = (anchor: any) => {
            if (!anchor) return null;
            const idx = this.manager.timeScale.timeToIndex(anchor.timestamp, dataArray);
            return { index: idx, price: anchor.price };
        };

        serverDrawings.forEach(ext => {
            let newNode: any = null;

            switch (ext.type) {
                case 'segment': // Trendlinie
                    newNode = new TrendLineNode();
                    newNode.point1 = getLogicalPoint(ext.anchors?.[0]);
                    newNode.point2 = getLogicalPoint(ext.anchors?.[1]);
                    if (ext.style) {
                        newNode.color = ext.style.color || newNode.color;
                        newNode.lineWidth = ext.style.lineWidth || newNode.lineWidth;
                    }
                    break;

                case 'fibRetracement': // Fibonacci
                    newNode = new FiboNode();
                    newNode.point1 = getLogicalPoint(ext.anchors?.[0]);
                    newNode.point2 = getLogicalPoint(ext.anchors?.[1]);
                    break;

                case 'emoji': // Emojis
                    newNode = new EmojiNode();
                    newNode.point1 = getLogicalPoint(ext.anchors?.[0]);
                    if (ext.data) {
                        newNode.emoji = ext.data.emoji || '🔥';
                        newNode.size = ext.data.size || 40;
                        newNode.rotation = ext.data.rotation || 0;
                        newNode.scaleX = ext.data.scaleX || 1;
                    }
                    break;

                case 'text': // Texteingaben
                    newNode = new TextNode();
                    newNode.point1 = getLogicalPoint(ext.anchors?.[0]);
                    if (ext.data) newNode.text = ext.data.text || 'Text';
                    if (ext.style) {
                        newNode.color = ext.style.color || newNode.color;
                        newNode.fontSize = ext.style.fontSize || newNode.fontSize;
                    }
                    break;

                case 'pen': // Freihand-Stift
                    newNode = new PenNode();
                    if (ext.data && ext.data.points) {
                        // Der Stift hat ein Array von Punkten, keine klassischen 2 Anker
                        newNode.points = ext.data.points.map((p: any) => getLogicalPoint(p));
                    }
                    if (ext.style) {
                        newNode.color = ext.style.color || newNode.color;
                        newNode.lineWidth = ext.style.lineWidth || newNode.lineWidth;
                    }
                    break;
                    
                case 'image': // Bilder (Asynchroner Load)
                    if (ext.data && ext.data.src) {
                        const imgNode = new ImageNode();
                        imgNode.id = ext.id;
                        imgNode.point1 = getLogicalPoint(ext.anchors?.[0]);
                        imgNode.width = ext.data.width || 100;
                        imgNode.height = ext.data.height || 100;
                        imgNode.isVisible = ext.visible ?? true;
                        
                        // Das Bild muss aus der URL geladen werden
                        const htmlImg = new Image();
                        htmlImg.onload = () => {
                            imgNode.image = htmlImg;
                            this.manager.requestRedraw();
                        };
                        htmlImg.src = ext.data.src;
                        
                        this.manager.drawingManager.shapes.push(imgNode);
                    }
                    return; // Wir überspringen den Standard-Push unten für Bilder, da sie hier schon gepusht werden
            }

            // Wenn ein Node erkannt und gebaut wurde, weisen wir die Basis-Eigenschaften zu
            if (newNode) {
                newNode.id = ext.id;
                newNode.isVisible = ext.visible ?? true;
                this.manager.drawingManager.shapes.push(newNode);
            }
        });

        this.manager.render(); // Chart neu zeichnen
    }

    /**
     * EXPORT: Wandelt ZChart-Nodes (Indizes) in das Server-JSON (Timestamps) um.
     */
    public exportDrawings() {
        const dataArray = this.manager.dataStore.getAllData();

        return this.manager.drawingManager.shapes.map((shape, arrayIndex) => {
            // Hilfsfunktion: Wandelt den Index sicher in einen Timestamp um
            const getT = (idx: number | undefined) => {
                if (idx === undefined || idx === null) return Date.now();
                return this.manager.timeScale.indexToTime(idx, dataArray) || Date.now();
            };

            // Basis-Eigenschaften, die jedes Objekt hat
            const baseExport = {
                id: shape.id,
                visible: shape.isVisible,
                zIndex: arrayIndex
            };

            // Typsichere Prüfung mit 'instanceof'
            if (shape instanceof TrendLineNode) {
                return { ...baseExport, type: 'segment', anchors: [{ timestamp: getT(shape.point1?.index), price: shape.point1?.price }, { timestamp: getT(shape.point2?.index), price: shape.point2?.price }], style: { color: shape.color, lineWidth: shape.lineWidth } };
            }
            if (shape instanceof FiboNode) {
                return { ...baseExport, type: 'fibRetracement', anchors: [{ timestamp: getT(shape.point1?.index), price: shape.point1?.price }, { timestamp: getT(shape.point2?.index), price: shape.point2?.price }] };
            }
            if (shape instanceof EmojiNode) {
                return { ...baseExport, type: 'emoji', anchors: [{ timestamp: getT(shape.point1?.index), price: shape.point1?.price }], data: { emoji: shape.emoji, size: shape.size, rotation: shape.rotation, scaleX: shape.scaleX } };
            }
            if (shape instanceof TextNode) {
                return { ...baseExport, type: 'text', anchors: [{ timestamp: getT(shape.point1?.index), price: shape.point1?.price }], data: { text: shape.text }, style: { color: shape.color, fontSize: shape.fontSize } };
            }
            if (shape instanceof PenNode) {
                return { ...baseExport, type: 'pen', data: { points: shape.points?.map((p: any) => ({ timestamp: getT(p.index), price: p.price })) || [] }, style: { color: shape.color, lineWidth: shape.lineWidth } };
            }
            if (shape instanceof ImageNode) {
                return { ...baseExport, type: 'image', anchors: [{ timestamp: getT(shape.point1?.index), price: shape.point1?.price }], data: { src: shape.image?.src, width: shape.width, height: shape.height } };
            }

            return null; // Unbekannte Tools überspringen
        }).filter(item => item !== null); // Leere Einträge entfernen
    }
    
    /**
     * Setzt das Hintergrund-Wasserzeichen (z.B. "BTC/USDT 1H").
     * Leerer String ("") blendet das Wasserzeichen aus.
     */
    public setWatermark(text: string) {
        if (this.manager.watermarkNode) {
            this.manager.watermarkNode.text = text;
            this.manager.render(); // Chart sofort neu zeichnen
        }
     }

     // ==========================================
    // CORE CONTROLLER
    // ==========================================

    /**
     * Schaltet den Magnet-Modus ein oder aus (Snapping an Kerzen).
     */
    public setMagnetMode(isActive: boolean) {
        if (this.manager.inputManager) {
            this.manager.inputManager.isMagnetMode = isActive;
        }
    }

    /**
     * Verarbeitet einen einkommenden Live-Tick über WebSocket.
     */
    public updateTick(tick: any) { // Importiere hier gerne 'CandleData'
        // Leitet den Tick direkt an die Manager-Methode weiter, die wir vorhin gebaut haben
        if (typeof (this.manager as any).updateTick === 'function') {
             (this.manager as any).updateTick(tick);
        }
    }

    /**
     * Fügt historische Daten vorne an den Chart an (Pagination).
     * @param historicalCandles Array von alten Kerzen (z.B. aus der Datenbank)
     */
    public prependHistoricalData(historicalCandles: any[]) {
        if (typeof (this.manager as any).prependHistoricalData === 'function') {
            (this.manager as any).prependHistoricalData(historicalCandles);
        }
    }
    /**
     * Holt ALLE Objekte und gruppiert Multi-Linien Indikatoren (MACD, BB)
     */
    public getAllDrawings() {
        // Holt Nodes aus ALLEN Panes (Main + Sub-Panes)
        const allNodes = [
            ...(this.manager as any).panes.flatMap((p: any) => p.nodes),
            ...this.manager.drawingManager.shapes
        ].sort((a, b) => a.zIndex - b.zIndex);

        const treeItems: any[] = [];
        const processedConfigs = new Set();

        allNodes.forEach(shape => {
            if (shape.config) {
                // Es ist ein Indikator! Wir fügen ihn nur EINMAL in die Liste ein, 
                // selbst wenn er aus 3 Linien (wie MACD) besteht.
                if (!processedConfigs.has(shape.config.id)) {
                    processedConfigs.add(shape.config.id);
                    treeItems.push({
                        id: `indicator_${shape.config.id}`, // Das ist die "Gruppen-ID"
                        name: `${shape.config.type.toUpperCase()} (${shape.config.inputs.period || ''})`,
                        visible: shape.isVisible, // Nimmt den Status der ersten Linie
                        isTool: false
                    });
                }
            } else {
                // Normale Zeichnungen / Charts
                let displayName = shape.name || 'Objekt';
                if (shape.role === 'tool') {
                    if (shape.constructor.name === 'TrendLineNode') displayName = 'Trendlinie';
                    // ... andere Fallbacks
                }
                treeItems.push({
                    id: shape.id,
                    name: displayName,
                    visible: shape.isVisible,
                    isTool: shape.role === 'tool'
                });
            }
        });

        return treeItems.reverse();
    }

    /**
     * Holt alle zusätzlichen Panes (außer dem Haupt-Chart) für die UI
     */
    public getPanes() {
        // Wir nehmen an, ChartManager hat eine Eigenschaft 'panes'
        const panes = (this.manager as any).panes || [];
        return panes
            .filter((p: any) => p.id !== 'main') // Das Haupt-Chart (Kerzen) darf man nicht löschen!
            .map((p: any) => ({
                id: p.id,
                name: p.id.toUpperCase() // Aus 'volume' wird 'VOLUME'
            }));
    }

    /**
     * Löscht ein Pane komplett aus der Engine
     */
    public deletePane(id: string) {
        const panes = (this.manager as any).panes;
        if (!panes) return;

        const index = panes.findIndex((p: any) => p.id === id);
        if (index > -1) {
            // WICHTIG: Rette das Gewicht des gelöschten Panes!
            const deletedWeight = panes[index].heightWeight; 
            panes.splice(index, 1); 
            
            // Finde das Hauptchart und gib ihm das freigewordene Gewicht
            const mainPane = panes.find((p: any) => p.id === 'main');
            if (mainPane) {
                mainPane.heightWeight += deletedWeight;
            }
            
            if (typeof (this.manager as any).resize === 'function') {
                (this.manager as any).resize(); // Das zwingt den Canvas, die Höhen neu zu berechnen!
            } else {
                this.manager.render();
            }
            this.emit('paneDeleted', id); 
        }
    }

    /**
     * Umschalten zwischen Hell und Dunkel
     */
    public setTheme(theme: 'light' | 'dark'): void {
        const colors = this.manager.options.colors;
        if (theme === 'light') {
            colors.background = '#ffffff';
            colors.text = '#1e293b';
            colors.grid = '#f1f5f9';
            colors.axisLine = '#e2e8f0';
            colors.crosshair = '#94a3b8';
        } else {
            colors.background = '#131722';
            colors.text = '#d1d4dc';
            colors.grid = '#2a2e39';
            colors.axisLine = '#363c4e';
            colors.crosshair = '#787b86';
        }
        this.manager.render();
    }

    // --- State für die API ---
    private currentSymbol: string = 'BTCUSDT';
    private currentTimeframe: string = '1d';

    /**
     * Wird von der TickerSearch in React aufgerufen
     */
    public loadSymbol(symbol: string) {
        this.currentSymbol = symbol.toUpperCase();
        this.fetchBinanceData();
    }

    /**
     * Wird von den Timeframe-Buttons (1m, 1H, 1D etc.) in React aufgerufen
     */
    public setTimeframe(tf: string) {
        // Binance API braucht spezifische Kürzel (z.B. '1h' statt '1H')
        const intervalMap: Record<string, string> = {
            '1m': '1m', '5m': '5m', '1H': '1h', '4H': '4h', '1D': '1d'
        };
        
        this.currentTimeframe = intervalMap[tf] || '1d';
        this.fetchBinanceData();
    }

    /**
     * Zentrale Methode, die die Daten von Binance holt und die Engine updatet
     */
    private fetchBinanceData() {
        this.setWatermark(this.currentSymbol);

        const url = `https://api.binance.com/api/v3/klines?symbol=${this.currentSymbol}&interval=${this.currentTimeframe}&limit=500`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.code) {
                    alert(`Binance Fehler: ${data.msg}`);
                    return;
                }

                const newCandles = data.map((d: any) => ({
                    timestamp: d[0],
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                    volume: parseFloat(d[5])
                }));

                // Daten in die Engine pumpen
                if (this.manager.dataStore) {
                    this.manager.dataStore.setData(newCandles);

                    // Alle aktiven Indikatoren (auch in Sub-Panes!) für die neuen Kerzen neu berechnen!
                    const panes = (this.manager as any).panes || [];
                    panes.forEach((pane: any) => {
                        if (pane.nodes) {
                            pane.nodes.forEach((node: any) => {
                                if (node.config) {
                                    IndicatorRegistry.calculate(node.config.type, this.manager.dataStore, node.config);
                                }
                            });
                        }
                    });
                }

                // Scrollposition korrigieren (Wir bleiben am aktuellen, rechten Rand stehen!)
                this.resetView(); 

                // Layout neu berechnen lassen (wichtig für Auto-Scale!)
                if (typeof (this.manager as any).calculateLayout === 'function') {
                    (this.manager as any).calculateLayout();
                }
                
                this.manager.render();
            })
            .catch(err => {
                console.error("Netzwerkfehler beim Laden von Binance:", err);
            });
    }

    /**
     * Erstellt einen Screenshot vom Canvas und lädt ihn herunter
     */
    public takeScreenshot() {
        // Wir holen uns das echte Canvas-Element
        const canvas = this.manager.ctx.canvas;
        const dataUrl = canvas.toDataURL('image/png');
        
        // Einen unsichtbaren Download-Link erstellen und klicken
        const link = document.createElement('a');
        link.download = `ZChart_${this.currentSymbol}.png`;
        link.href = dataUrl;
        link.click();
    }

    /**
     * Springt ganz nach rechts zu den neuesten Kerzen und aktiviert Auto-Scale
     */
    public resetView() {
        if (this.manager.timeScale && this.manager.dataStore) {
            const dataCount = this.manager.dataStore.getAllData().length;
            const candleWidth = this.manager.timeScale.candleWidth;
            const chartWidth = this.manager.timeScale.width;

            // Berechnung: Wir schieben den Chart so weit nach links, 
            // dass das Ende des Daten-Arrays bündig mit der rechten Kante ist.
            // Wir lassen 50px Platz (Padding) nach rechts.
            this.manager.timeScale.scrollOffset = -(dataCount * candleWidth - chartWidth + 50);
        }
        
        // Auto-Scale wieder anmachen
        (this.manager as any).isAutoScaling = true; 
        this.manager.render();
    }

    /**
     * Wechselt den Haupt-Chart-Typ (Candles, Line, Area, OHLC)
     */
    public setChartType(type: 'candle' | 'line' | 'area' | 'ohlc') {
        console.log(`[ZChart Engine] Wechsle Chart-Typ zu: ${type}`);
        
        const mainPane = (this.manager as any).panes.find((p: any) => p.id === 'main');
        
        if (mainPane) {
            mainPane.nodes = mainPane.nodes.filter((n: any) => n.id !== 'main_candles');
            
            let newSeries: any;
            
            if (type === 'candle') {
                newSeries = new CandlestickNode(this.manager.dataStore);
                newSeries.name = 'Candlesticks';
            } 
            else if (type === 'line') {
                newSeries = new LineSeriesNode(this.manager.dataStore, 'close', '#2962FF', 2);
                newSeries.name = 'Line Chart';
            } 
            else if (type === 'area') {
                // Deine eigene AreaNode aufrufen!
                newSeries = new AreaNode(this.manager.dataStore);
                newSeries.name = 'Area Chart';
            }
            else if (type === 'ohlc') {
                // Deine eigene OhlcBarNode aufrufen!
                newSeries = new OhlcBarNode(this.manager.dataStore);
                newSeries.name = 'OHLC Bars';
            }
            
            if (newSeries) {
                newSeries.id = 'main_candles'; // ID bleibt zwingend gleich für das Layer Management
                newSeries.zIndex = 10;
                mainPane.addNode(newSeries);
            }
            
            this.manager.render();
            this.emit('treeUpdated');
        }
    
    }

    /**
     * UNIVERSAL-METHODE FÜR ALLE INDIKATOREN
     */
    public addIndicator(config: IndicatorConfig) {
        // 1. Mathe berechnen (über die Registry)
        IndicatorRegistry.calculate(config.type, this.manager.dataStore, config);

        // 2. Ziel-Pane finden ODER dynamisch erstellen (z.B. für RSI, MACD)
        let targetPane = this.manager.panes.find((p: any) => p.id === config.paneId);
        
        if (!targetPane && config.paneId !== 'main') {
            // Pane existiert noch nicht -> Wir erstellen ein neues!
            const newPane = new Pane(config.paneId, 0.2); // 20% der Bildschirmhöhe
            this.manager.addPane(newPane);

            targetPane = newPane;
            
            // Wenn ein neues Pane dazukommt, muss das Main-Pane Platz machen
            const mainPane = this.manager.panes.find((p: any) => p.id === 'main');
            if (mainPane) {
                mainPane.heightWeight = Math.max(0.1, mainPane.heightWeight - 0.2);
            }
            
            if (typeof (this.manager as any).resize === 'function') {
                (this.manager as any).resize();
            }
        }

        // 3. Linie(n) zeichnen
        if (targetPane) {
            
            // NEU: MACD (1 Histogramm, 2 Linien)
            if (config.type === 'macd') {
                // A) Das Histogramm (Balken)
                const histNode = new HistogramNode(this.manager.dataStore, `${config.id}_hist`, '#26a69a', '#ef5350');
                (histNode as any).config = config;
                histNode.id = `indicator_${config.id}_hist`;
                histNode.name = `MACD Hist`;
                histNode.zIndex = 4; // Unter den Linien
                targetPane.addNode(histNode);

                // B) MACD Linie (schnell, meistens blau)
                const macdNode = new LineSeriesNode(this.manager.dataStore, `${config.id}_macd`, '#2962FF', 2);
                (macdNode as any).config = config;
                macdNode.id = `indicator_${config.id}_macd`;
                macdNode.name = `MACD Line`;
                macdNode.zIndex = 5;
                targetPane.addNode(macdNode);

                // C) Signal Linie (langsam, meistens orange)
                const signalNode = new LineSeriesNode(this.manager.dataStore, `${config.id}_signal`, '#ff9800', 2);
                (signalNode as any).config = config;
                signalNode.id = `indicator_${config.id}_signal`;
                signalNode.name = `Signal Line`;
                signalNode.zIndex = 6;
                targetPane.addNode(signalNode);
            }


            // Sonderfall: Bollinger Bänder (3 Linien)
            if (config.type === 'bb') {
                const colors = ['#2962FF', config.styles.color, '#2962FF']; // Mid, Upper, Lower
                const keys = ['mid', 'upper', 'lower'];
                
                keys.forEach((suffix, idx) => {
                    const lineNode = new LineSeriesNode(
                        this.manager.dataStore, 
                        `${config.id}_${suffix}`, 
                        colors[idx], 
                        config.styles.lineWidth
                    );
                    (lineNode as any).config = config; // Nur dem Haupt-Objekt die Config geben
                    lineNode.id = `indicator_${config.id}_${suffix}`;
                    lineNode.name = `${config.type.toUpperCase()} ${suffix} (${config.inputs.period})`;
                    lineNode.zIndex = 5;
                    targetPane!.addNode(lineNode);
                });
            }
            
            // NEU: ADX (3 Linien: ADX, +DI, -DI)
            else if (config.type === 'adx') {
                const lines = [
                    { suffix: 'adx', color: '#ffeb3b', name: 'ADX' },
                    { suffix: 'plusDI', color: '#26a69a', name: '+DI' },
                    { suffix: 'minusDI', color: '#ef5350', name: '-DI' }
                ];
                
                lines.forEach(line => {
                    const lineNode = new LineSeriesNode(
                        this.manager.dataStore, 
                        `${config.id}_${line.suffix}`, 
                        line.color, 
                        line.suffix === 'adx' ? 2 : 1 // ADX etwas dicker
                    );
                    (lineNode as any).config = config;
                    lineNode.id = `indicator_${config.id}_${line.suffix}`;
                    lineNode.name = line.name;
                    lineNode.zIndex = 5;
                    targetPane!.addNode(lineNode);
                });
            }
            
            // Standardfall: Single Line (SMA, RSI)
            else {
                const lineNode = new LineSeriesNode(
                    this.manager.dataStore, 
                    config.id, 
                    config.styles.color, 
                    config.styles.lineWidth
                );
                (lineNode as any).config = config;
                lineNode.id = `indicator_${config.id}`;
                lineNode.name = `${config.type.toUpperCase()} (${config.inputs.period})`;
                lineNode.zIndex = 5;
                
                targetPane.addNode(lineNode);
            }
            
            this.manager.render();
            
            this.emit('indicatorAdded', config);
            this.emit('treeUpdated');
        }
    }

    /**
     * Holt die Konfiguration eines Indikators (für das Einstellungs-Menü)
     */
    public getIndicatorConfig(id: string): IndicatorConfig | null {
        const found = this.findTreeObject(id);
        if (found && (found.obj as any).config) {
            return (found.obj as any).config;
        }
        return null;
    }

    /**
     * Speichert neue Einstellungen und berechnet den Indikator neu
     */
    public updateIndicator(id: string, newConfig: IndicatorConfig) {
        // 1. Das alte Node komplett löschen
        this.deleteDrawing(id); 
        
        // 2. Die ID muss zwingend erhalten bleiben!
        newConfig.id = id;      
        
        // 3. Neu hinzufügen (berechnet automatisch alles frisch)
        this.addIndicator(newConfig); 
    }

    
}