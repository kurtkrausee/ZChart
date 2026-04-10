// src/api/ZChartAPI.ts
import { ChartManager } from '../core/ChartManager';
import { TrendLineNode } from '../nodes/tools/TrendLineNode';
import { FiboNode } from '../nodes/tools/FiboNode';
import { ImageNode } from '../nodes/tools/ImageNode';
import { TextNode } from '../nodes/tools/TextNode';
import { PenNode } from '../nodes/tools/PenNode';
import { EmojiNode } from '../nodes/tools/EmojiNode';


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
    public setTool(tool: 'pan' | 'trendline' | 'fibo'): void {
        const input = this.manager.inputManager;
        if (tool === 'pan') {
            input.mode = 'crosshair_and_pan';
        } else if (tool === 'trendline') {
            input.mode = 'draw_trendline';
        } else if (tool === 'fibo') {
            input.mode = 'draw_fibo'; // <--- NEU
        }
    }

    /**
     * Löscht ein Objekt anhand der ID
     */
    public deleteDrawing(id: string) {
        this.manager.drawingManager.removeDrawing(id);
    }

    /**
     * Schaltet Sichtbarkeit im Baum um
     */
    public setVisible(id: string, visible: boolean) {
        const shape = this.manager.drawingManager.shapes.find(s => s.id === id);
        if (shape) shape.isVisible = visible;
    }

    /**
     * Für den Drag & Drop im Object Tree
     */
    public moveLayer(id: string, toIndex: number) {
        this.manager.drawingManager.reorder(id, toIndex);
    }

    /**
     * Schiebt ein Element ganz nach oben (Vordergrund)
     */
    public moveToFront(id: string): void {
        const shapes = this.manager.drawingManager.shapes;
        const index = shapes.findIndex(s => s.id === id);
        if (index !== -1) {
            const [shape] = shapes.splice(index, 1);
            shapes.push(shape);
            // FORCE RENDER: Damit man es sofort sieht
            (this.manager as any).render(); 
        }
    }

    /**
     * Schiebt ein Element ganz nach unten (Hintergrund)
     */
    public moveToBack(id: string): void {
        const shapes = this.manager.drawingManager.shapes;
        const index = shapes.findIndex(s => s.id === id);
        if (index !== -1) {
            const [shape] = shapes.splice(index, 1);
            shapes.unshift(shape); // Ganz an den Anfang des Arrays
            (this.manager as any).render(); 
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

    public setTheme(theme: 'light' | 'dark'): void {
        if (theme === 'light') {
            this.manager.options.colors.background = '#ffffff';
            this.manager.options.colors.text = '#333333';
            this.manager.options.colors.axisLine = '#e0e0e0';
            this.manager.options.colors.grid = '#f0f0f0';
        } else {
            this.manager.options.colors.background = '#131722';
            this.manager.options.colors.text = '#d1d4dc';
            this.manager.options.colors.axisLine = '#363c4e';
            this.manager.options.colors.grid = '#2a2e39';
        }
        this.manager.render();
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
}