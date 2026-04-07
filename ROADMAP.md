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
- [ ] `InputManager` aufsetzen (Maus- und Touch-Events).
- [ ] Panning: X-Achse verschieben (Klick & Drag auf dem Chart).
- [ ] Zooming X: Mausrad auf dem Chart (Hinein-/Herauszoomen auf der Zeitachse).
- [ ] Zooming Y: Klick & Drag auf der Preis-Achse rechts (Stauchen/Strecken).

## Phase 6: Das Fadenkreuz (Crosshair)
- [ ] `CrosshairNode` implementieren (horizontale und vertikale Linien, die der Maus folgen).
- [ ] Preis- und Zeit-Labels ("Tags") an den Achsen zeichnen, die den Maus-Positionen entsprechen.
- [ ] Snapping-Logik (Fadenkreuz rastet auf der nächsten Kerze ein).

## Phase 7: Indikatoren & Multi-Pane
- [ ] Synchronisierung der X-Achse über mehrere Panes hinweg.
- [ ] `LineSeriesNode` und `HistogramNode` für Indikatoren bauen.
- [ ] Ersten Test-Indikator (z.B. Volumen oder RSI) in einer unteren Pane rendern.

## Phase 8: Zeichentools & KLineChart-Brücke (Ausblick)
- [ ] Hit-Testing-System für Linien und Formen (Klickt der User auf eine Linie?).
- [ ] Integration deiner bestehenden KLineChart-UI (Linke Leiste) für Trendlinien und Fibo-Retracements.
- [ ] Persistenz der User-Zeichnungen.