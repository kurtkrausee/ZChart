# ZChart - Systemarchitektur & Kernkonzepte

ZChart ist eine hochperformante, Canvas-basierte Charting-Bibliothek. Die Architektur folgt dem Prinzip der strikten Trennung von Daten (State), Mathematik (Scales/Coordinates) und visueller Repräsentation (Rendering).

## 1. Core Engine & Layout
* **ChartManager:** Der Haupteinstiegspunkt. Verwaltet den ResizeObserver (für responsive Layouts), das High-DPI-Canvas und den globalen `requestAnimationFrame`-Loop.
* **PaneManager:** Verwaltet das Layout. Ein Chart besteht aus einer Haupt-Pane (Kerzen) und optionalen Indikator-Panes (RSI, MACD). Er berechnet die Höhenverhältnisse und leitet Maus-Events an die richtige Pane weiter.

## 2. Das Koordinatensystem (Scales)
Das Herzstück der Mathematik. Es trennt absolute Pixelwerte von logischen Werten.
* **TimeScale (X-Achse):** Wird von allen Panes geteilt. Wandelt Unix-Timestamps in X-Pixel um. Berechnet den sichtbaren Zeitbereich (`visibleRange`) basierend auf dem aktuellen Zoom-Faktor.
* **PriceScale (Y-Achse):** Jede Pane hat ihre eigene PriceScale. Wandelt Werte (Preise oder Indikator-Werte) in Y-Pixel um. Beinhaltet die Logik für "Auto-Fit" (Sichtbare Kerzen bestimmen das Y-Minimum und Maximum).

## 3. Datenmanagement (DataStore)
* **DataStore:** Ein zentraler Speicher, der die rohen OHLCV-Daten (Open, High, Low, Close, Volume) hält.
* **DataAggregator:** Optionales Modul, um aus kleinen Timeframes (z.B. 1-Minute-Ticks) dynamisch größere Timeframes (z.B. 1-Stunde-Kerzen) zu generieren.

## 4. Szenengraph & Rendering (Nodes)
Alles, was gezeichnet wird, erbt von einer abstrakten Basisklasse. Nodes kennen keine Pixel, sie rufen nur `timeToX()` und `priceToY()` auf.
* **SeriesNodes:** Zeichnen die Hauptdaten (z.B. `CandlestickNode`, `LineNode`, `HistogramNode`).
* **AxisNodes:** Zeichnen das Hintergrundraster, die Preis-Labels rechts und die Zeit-Labels unten.
* **ToolNodes:** Interaktive Zeichnungen des Nutzers (Trendlinien, Fibonacci).
* **CrosshairNode:** Das dynamische Fadenkreuz, das der Maus folgt und die aktuellen Werte an den Achsen hervorhebt.

## 5. Interaktion (Event Handling)
* **InputManager:** Fängt native Browser-Events (Mousedown, Wheel, Touch) ab und normalisiert sie. Unterscheidet zwischen "Panning" (Ziehen auf dem Chart), "Zooming" (Scrollen oder Ziehen an den Achsen) und "Crosshair-Movement" (Bewegen der Maus ohne Klicken).
* 
## 6. Die State-Brücke (Integration externer Stores)
ZChart ist ein reiner Renderer ("Dumb View") und hält selbst keinen komplexen Zustand von User-Zeichnungen.
* **Adapter-Pattern:** ZChart kommuniziert über einen definierten Adapter mit externen State-Managern (wie dem bestehenden `DrawingStore`).
* **Datenfluss:** Der externe Store sendet logische Koordinaten (`{timestamp, price, zIndex}`). ZChart übersetzt diese durch das interne `CoordinateSystem` in Pixel und rendert sie in der korrekten Z-Reihenfolge auf den `SceneNodes`.
## 7. Projektstruktur (Ordner-Layout)
Der Code im `src/`-Verzeichnis ist nach Domänen gegliedert, um das Single Responsibility Principle zu wahren:

* `/core/` - Die Hauptmotoren: `ChartManager`, `PaneManager`, Render-Loop und das Canvas-Setup.
* `/math/` - Die Berechnungslogik: `CoordinateSystem`, `TimeScale`, `PriceScale` (Umrechnung von Werten in Pixel).
* `/nodes/` - Die sichtbaren Elemente: Alle Klassen, die auf dem Canvas zeichnen (z.B. `SceneNode`, `CandlestickNode`, `AxisNode`, `CrosshairNode`).
* `/data/` - Das Datenmanagement: `DataStore` (hält die OHLCV-Arrays) und der Dummy-Daten-Feed.
* `/input/` - Die Interaktion: `InputManager` für Maus-, Touch- und Scroll-Events (Panning/Zooming).
* `/bridge/` - Die Schnittstellen: Adapter, um ZChart an bestehende externe Systeme (wie den KLineChart DrawingStore) anzudocken.