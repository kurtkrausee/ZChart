# ZChart - Entwicklungs-Roadmap

## Phase 1: Fundament & Layout (Die "Base")
- [x] Vite & TypeScript Setup abschließen.
- [x] `ChartManager` erstellen (Canvas einbinden, ResizeObserver für responsive Breite/Höhe).
- [x] High-DPI Scaling implementieren (`window.devicePixelRatio`), um Unschärfe zu vermeiden.
- [x] Den `requestAnimationFrame` Render-Loop aufsetzen.
- [x] Einteilung des Canvas in `Pane`-Objekte (z.B. 80% Main, 20% Indicator).

## Phase 2: Die Mathematik (Scales & Coordinates)
- [x] `TimeScale` (X) entwickeln: Mapping von Index/Zeit auf Pixelbreite.
- [x] `PriceScale` (Y) entwickeln: Mapping von Min/Max-Werten auf Pixelhöhe.
- [x] Logik für `VisibleRange` schreiben (Welche Kerzen sind gerade im Bild?).
- [x] Auto-Scaling der Y-Achse basierend auf den aktuell sichtbaren Kerzen.

## Phase 3: Basis-Rendering & Hintergrund
- [x] `AxisNode` implementieren: Zeichnen der X- und Y-Achsen (Striche und Text).
- [x] Zeichnen des horizontalen und vertikalen Hintergrund-Rasters (Grid).
- [x] Zentrale Farb- und Style-Konfiguration (`ChartOptions`) anlegen.

## Phase 4: Datenintegration & Kerzen
- [x] `DataStore` implementieren und mit Dummy-JSON füttern.
- [x] Abstrakte `SceneNode` definieren (`draw()` und `hitTest()` Methoden).
- [x] `CandlestickNode` programmieren (Berechnung von Dochten und Körpern basierend auf den Scales).

## Phase 5: Interaktion (Navigation)
- [x] `InputManager` aufsetzen (Maus- und Touch-Events).
- [x] Panning: X-Achse verschieben (Klick & Drag auf dem Chart).
- [x] Zooming X: Mausrad auf dem Chart (Hinein-/Herauszoomen auf der Zeitachse).
- [x] Zooming Y: Klick & Drag auf der Preis-Achse rechts (Stauchen/Strecken).

## Phase 6: Das Fadenkreuz (Crosshair)
- [x] `CrosshairNode` implementieren (horizontale und vertikale Linien, die der Maus folgen).
- [x] Preis- und Zeit-Labels ("Tags") an den Achsen zeichnen, die den Maus-Positionen entsprechen.
- [x] Snapping-Logik (Fadenkreuz rastet auf der nächsten Kerze ein).

## Phase 7: Indikatoren & Multi-Pane
- [x] Architektur-Upgrade: Pane-Renderer-System (Nodes werden Panes zugewiesen, statt fest im Manager verbaut zu sein)
- [x] `LineSeriesNode` und `HistogramNode` (Allzweck-Nodes für Indikatoren).
- [x] RSI-Berechnung im DataStore oder IndicatorEngine.
- [x] Ersten Test-Indikator (z.B. Volumen oder RSI) in einer unteren Pane rendern.
- [x] Format-Utility für Achsenbeschriftungen (Modular & Global einsetzbar).
- [x] Explizites Z-Layering (Vorbereitung für Zeichentools).

## Phase 8: Zeichentools & KLineChart-Brücke (Ausblick)
- [x] Umrechnung von Canvas-Pixeln in logische Welt-Koordinaten (Zeit/Index/Preis).
- [x] Hit-Testing-System für Linien und Formen (Kollisionsabfrage via Geometrie).
- [x] Basis-Render-Knoten für Zeichnungen (z.B. `TrendLineNode`).
- [x] Interaktives Live-Zeichnen (Linie folgt der Maus vor dem zweiten Klick).
- [x] Modifikation (Anfasser greifen, Start-/Endpunkte einzeln verschieben).
  
## Phase 9: Die Brücke (Status-Update)
- [x] Adapter-Pattern definieren: Die ZChartAPI.ts steht als zentrales Interface.
- [x] Event-System integrieren: Der ChartManager kann nun mittels emit und on mit der Außenwelt kommunizieren.
- [ ] Integration deiner bestehenden UI: (Hier machen wir gerade weiter).
- [ ] Externer DrawingStore: (Vorbereitet durch IDs und Event-Payloads).

### 9.1: Das API-Grundgerüst (Steuerung & Events)
- [x] ZChartAPI Facade: Implementierung der Klasse als zentrales Interface für die externe UI.
- [x] Tool-Switching: Methode setTool(type) implementieren, die den InputManager Modus schaltet.
- [x] Event-System: Ein einfaches EventEmitter-System (z.B. on('drawingCreated'), on('drawingDeleted')) integrieren, damit die UI auf Aktionen im Canvas reagieren kann.

### 9.2: Object Tree & Z-Layering (Die Kern-Anforderung)
- [x] Unique IDs: Jedes Drawing erhält eine uuid beim Erstellen (wichtig für die Zuordnung zum Object Tree).
- [x] Layer-Management: Methoden in der API zum Verschieben von Objekten im shapes-Array (moveToFront, moveToBack, swapLayers).
- [x] Visibility-Toggle: Property isVisible in SceneNode / TrendLineNode einbauen, um Elemente über den Baum auszublenden.

### 9.3: Externer State & Synchronisation (Data Flow)
- [x] Import/Export-Logik: Konverter schreiben, der ZChart-Nodes in dein Server-Format (JSON mit Timestamps) und zurück verwandelt.
- [x] Der "Dirty"-Check: Mechanismus, der nach dem Verschieben eines Ankerpunkts das Update-Event an die Web-App feuert (onDrawingChanged).
- [ ] UI-Integration (React/Vue): ZChart als Komponente in die bestehende App integrieren und die Toolbar-Icons mit der `ZChartAPI` verknüpfen.

### 9.4: Fortgeschrittene Tools (Phase 9 Erweiterung)
- [x] FiboNode: Implementierung des Fibonacci-Retracement-Tools (Geometrie & Auto-Labels).
- [x] Element-Löschen: Globaler Key-Listener (Entf-Taste) oder API-Call zum Entfernen selektierter Shapes.

# 🚀 Erweiterte Roadmap
# Phase 10: Architektur-Finish & Migration (Aktueller Fokus)
- [x] Node-Reorganisation: Unterordner /nodes/series, /nodes/indicators, /nodes/tools erstellen und Dateien verschieben.
- [x] Styles & Themes: Implementierung eines Theme-Managers (Hell/Dunkel Umschaltung).
- [ ] Parallel-Integration: ZChart in einem neuen Tab/Reiter deiner Web-App neben KLineChart einbetten.
- [x] FAQ & Dokumentation: Erstellung der FAQ.md und ARCHITECTURE.md für dein Server-Team.

# Phase 11: Advanced Visuals (The "Smiley" Phase)
- [x] Bounding Box System: Ein Rahmen für selektierte Objekte (Handles zum Skalieren an den Ecken).
- [x] Rotation-Logic: Mathematische Integration von Winkeln für Nodes (wie Emojis oder Text).
- [x] OhlcBarNode: Implementierung klassischer Balkencharts (OHLC Bars).
- [x] AreaNode Refactoring: Den bestehenden Area-Chart an die saubere `SceneNode`-Struktur anpassen.

# Phase 12: Die Externe API (ZChart Pro Vorbereitung)
- [x] Crosshair-Events: Den `InputManager` so erweitern, dass er Maus-Koordinaten (Preis/Zeit) ausgibt, damit externe HTML-Overlays diese anzeigen können.
- [x] Snapshot-Tool: Eine `zChart.snapshot()` Methode implementieren, die `canvas.toDataURL()` nutzt, um Bild-Exporte zu ermöglichen.
- [x] Node-Rollen: Ein `role`-Tag für `SceneNode` einführen (`tool`, `axis`, `series`), um API-Befehle wie `zChart.clearAllDrawings()` sauber umzusetzen.
- [x] Zoom-API: Bereitstellung von `zoomIn()`, `zoomOut()` und `resetChart()` direkt über die externe `ZChartAPI`.
- [x] ZChartAPI EventEmitter: Integration eines leichten Event-Systems (z.B. on, off, emit) in die API, als sauberes Fundament für die Crosshair-Events und zukünftige Callbacks.
 
# Phase 13: Core Extended Tools
- [x] TextNode: Implementierung eines Text-Werkzeugs (Text-Eingabe über ein unsichtbares HTML-Input-Feld, das nach dem Tippen als Node auf den Canvas gezeichnet wird).
- [x] Freehand/PenNode: Ein Stift-Werkzeug für freies Zeichnen (Speichert ein Array aus vielen $x/y$ Koordinaten und zieht einen durchgehenden ctx.lineTo Pfad).
- [x] Pointer-State: Den InputManager so anpassen, dass der Standard-Zeiger ein normaler Maus-Pfeil (default) ist und das Crosshair nur dann erscheint, wenn ein spezifisches Tool oder Modus gewählt ist.
- [x] ImageNode für Copy/Paste von Elementen aus der Zwischenablage jeglicher Art

# Phase 14: Core Polish (TradingView Standards)
- [x] Live-Data Injection: Implementierung einer Methode (`updateTick`), um einkommende WebSocket-Daten performant zu verarbeiten (letzte Kerze updaten oder neue anhängen), ohne das gesamte Array neu laden zu müssen.
- [ ] Magnet Mode (Snapping): Erweiterung des `InputManager`, sodass Ankerpunkte von Zeichenwerkzeugen (Trendlinien etc.) automatisch an das exakte High, Low, Open oder Close der nächstgelegenen Kerze springen.
- [ ] Watermark: Eine `WatermarkNode` (Rolle: `background`), die als Basis-Layer zentriert im Canvas gerendert wird (z.B. für den transparenten Text "BTC/USDT 1H" im Hintergrund).
- [ ] OHLCV Legend: Eine `LegendNode` (oder Erweiterung des Crosshair-Events), die oben links im Chart die exakten Open, High, Low, Close und Volume-Werte der Kerze anzeigt, über der das Fadenkreuz gerade schwebt.





----------------------------------------------------

 ROADMAP ZChart-Pro:

 # Phase 1: Multi-Pane & Layout Engine (Die wichtigste Phase!)

- [] Split-Screen-Manager: Die Fähigkeit, den Chart in Haupt-Chart (oben) und Indikator-Panes (unten) aufzuteilen.
- [] Resizing (Splitter): Interaktive Trennlinien zwischen den Panes, die der User mit der Maus greifen kann, um z.B. den RSI größer oder kleiner zu ziehen (Höhen-Redistribution).
- [] Pane-Controls: Kleine UI-Buttons (in Canvas oder HTML) zum Minimieren, Maximieren oder Schließen von Indikator-Fenstern.

# Phase 2: Interaktive Achsen & Scaling (Das Profi-Gefühl)

- [] Y-Axis Dragging: Wenn der User die Preisachse klickt und zieht, wird der Chart gestaucht oder gestreckt (autoScale wird temporär deaktiviert).
- [] Logarithmische Skala: Ein Schalter, um die Preisachse von linear auf logarithmisch umzustellen (extrem wichtig für Krypto-Charts).
- [] X-Axis Dragging: Feintuning für das Zusammenstauchen der Zeitachse durch Ziehen auf der Datum-Leiste.

# Phase 3: Advanced Technical Indicators

- [] Indikator-Bibliothek: Komplexe Berechnungen wie MACD, Bollinger Bänder oder Ichimoku-Wolken.
- [] Multi-Series Rendering: Mehrere Datenserien übereinander legen (z.B. Bitcoin-Kurs und Ethereum-Kurs im selben Chart vergleichen).

# Phase 4: Pro Drawing Tools

- [] Volume Profile (Sichtbarer Bereich): Ein Histogramm, das nicht unten auf der X-Achse liegt, sondern an der Y-Achse (Preis) klebt und berechnet, bei welchem Preis das meiste Volumen gehandelt wurde.
- [] Komplexe Geometrien: Pitchforks (Schiff), Gann Boxen und komplexe Fibonacci-Zeitzonen.