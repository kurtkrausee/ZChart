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
- [] NEU: Format-Utility für Achsenbeschriftungen (Modular & Global einsetzbar).
- [ ] NEU: Explizites Z-Layering (Vorbereitung für Zeichentools).

## Phase 8: Zeichentools & KLineChart-Brücke (Ausblick)
- [ ] Hit-Testing-System für Linien und Formen (Klickt der User auf eine Linie?).
- [ ] Integration deiner bestehenden KLineChart-UI (Linke Leiste) für Trendlinien und Fibo-Retracements.
- [ ] Persistenz der User-Zeichnungen.