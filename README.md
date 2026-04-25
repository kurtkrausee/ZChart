# ZChart

<img align="right" width="500" src="https://github.com/user-attachments/assets/eaddfe90-3f2d-4b8b-9ed1-d6c7c095b8cd" alt="ZChart Pro Dashboard">

## Eine leistungsstarke, KI-generierte Charting-Engine für Finanzdaten

ZChart ist eine modulare TypeScript/Canvas Charting-Bibliothek, die entwickelt wurde, um die Pane-Architektur und das Koordinaten-Mapping bestehender Lösungen zu verbessern. Der Kern dieser Engine entstand in nur zwei Tagen durch gezielte KI-unterstützte Entwicklung.

### 🚀 Kernfunktionen

* **Native Performance:** HTML5 Canvas Rendering für flüssige 60fps, selbst bei vielen Datenpunkten.
* **Modulare Pane-Architektur:** Unbegrenzte, isolierte Chart-Ansichten (Main, Volume, RSI) mit jeweils eigenen Preisskalen.
* **Dumb-View Rendering:** Ideal für Live-Datenfeeds – der Chart rendert exakt das, was der DataStore ihm liefert (Pull & Push fähig).
* **Interaktive Tools:** Integriertes Fibonacci-Retracement, Trendlinien und frei dreh-/skalierbare Emojis auf dem Canvas.
* **Theming:** Volle Unterstützung für Dark/Light-Modes und anpassbare Grid-Designs.

### 📦 Installation & Nutzung

ZChart ist aktuell als lokales Modul konzipiert.

1.  Kopiere den `src` Ordner in dein Web-Projekt (z.B. nach `libs/zchart`).
2.  Importiere die API in dein Frontend:

```typescript
import { ChartManager, ZChartAPI } from './libs/zchart/index';

// Initialisierung
const container = document.getElementById('zchart-container');
const manager = new ChartManager(container);
const zChart = new ZChartAPI(manager);

// Daten laden
zChart.dataStore.setAllData(chartData);

// Tools nutzen
zChart.setTool('draw_fibo');
