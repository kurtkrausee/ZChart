// src/api/ZChartAPI.ts
import { ChartManager } from '../core/ChartManager';
import { TrendLineNode } from '../nodes/tools/TrendLineNode';

export class ZChartAPI {
    private manager: ChartManager;

    constructor(manager: ChartManager) {
        this.manager = manager;
    }

    /**
     * Ermöglicht der Web-App, auf Ereignisse zu hören.
     */
    public subscribe(event: string, callback: (data: any) => void) {
        this.manager.on(event, callback);
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
            // FORCE RENDER: Damit man es sofort sieht
            (this.manager as any).render(); 
        }
    }

    /**
     * IMPORT: Wandelt das Server-JSON (Timestamps) in ZChart-Nodes (Indizes) um.
     */
    public importDrawings(serverDrawings: any[]) {
        // Wir holen uns alle Kerzen, damit die TimeScale die Zeitstempel abgleichen kann
        const dataArray = this.manager.dataStore.getAllData();

        serverDrawings.forEach(ext => {
            // Aktuell unterstützen wir in ZChart 'segment' (Trendlinie)
            if (ext.type === 'segment') {
                const newNode = new TrendLineNode();
                newNode.id = ext.id;
                
                // Konvertierung: Timestamp -> ZChart Index
                const idx1 = this.manager.timeScale.timeToIndex(ext.anchors[0].timestamp, dataArray);
                const idx2 = this.manager.timeScale.timeToIndex(ext.anchors[1].timestamp, dataArray);

                newNode.point1 = { index: idx1, price: ext.anchors[0].price };
                newNode.point2 = { index: idx2, price: ext.anchors[1].price };
                
                newNode.isVisible = ext.visible ?? true;

                // Später können wir hier auch die Styles (Farbe/Dicke) aus ext.style übernehmen!

                this.manager.drawingManager.shapes.push(newNode);
            }
            // HIER kommen später 'fibRetracement' und 'emoji' rein!
        });

        this.manager.render(); // Chart neu zeichnen
    }

    /**
     * EXPORT: Wandelt ZChart-Nodes (Indizes) in das Server-JSON (Timestamps) um.
     */
    public exportDrawings() {
        const dataArray = this.manager.dataStore.getAllData();

        return this.manager.drawingManager.shapes.map((shape, arrayIndex) => {
            // Konvertierung: ZChart Index -> Timestamp
            // Fallback auf Date.now(), falls der Index ins Leere läuft
            const t1 = this.manager.timeScale.indexToTime(shape.point1!.index, dataArray) || Date.now();
            const t2 = this.manager.timeScale.indexToTime(shape.point2!.index, dataArray) || Date.now();

            return {
                id: shape.id,
                type: 'segment', // Weil wir aktuell nur TrendLineNode haben
                anchors: [
                    { timestamp: t1, price: shape.point1!.price },
                    { timestamp: t2, price: shape.point2!.price }
                ],
                style: {
                    color: '#2962ff', // Aktueller Standardwert der Linie
                    lineWidth: 2,
                    lineStyle: 'solid'
                },
                locked: false,
                visible: shape.isVisible,
                zIndex: arrayIndex // Die Array-Position ist unser Z-Index!
            };
        });
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

}