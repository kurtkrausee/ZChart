# Changelog

## [2.0.0] - 2026-08-18
Kompletter Neuaufbau auf Basis der im privaten Trading-Dashboard weiterentwickelten Engine (394 Commits seit v1). v1 bleibt als Tag `v1-legacy` erhalten; die v1-API-Doku gilt nicht mehr.

### Added
- Multi-Pane-Engine mit Gewichts-Rebalancing, Multi-Y-Achse (`yAxisId`), Pane-Divider
- Nice Ticks, Log-/Prozent-Skala, Custom Ranges/Ticks je Pane, Zukunfts-Labels, Zahlenformate, Timezone-Support
- Touch-Support (Pointer-Events, Pinch-Zoom, Long-Press, coarse Hit-Targets)
- 20 Zeichentools inkl. Fibonacci-Retracement, Emoji-Transform, Brush/Highlighter
- 8 Basis-Indikatoren (SMA, EMA, RSI, MACD, Stochastic, ATR, Bollinger, Volume-SMA)
- Erweiterungs-Registries: Tools, Pane-/Overlay-Indikatoren, Drawing-Serializer, Themes
- Drawing-Import/Export mit Timestamp-Remap (überlebt Daten-Reload/History-Prepend)
- Theme-System mit dark/light-Presets
- Vanilla-Demo (`npm run dev`), ES-Bundle + TypeScript-Declarations

### Fixed (gegenüber v1, Auswahl)
- Pane schließen ließ untere Panes aus dem Canvas fallen (Gewichts-Rebalancing)
- Y-Achsen-Ticks, Label-Überlappungen, Y-Zoom-Schrittweite, Autoscale mit Sub-Panes
- Timeframe-Wechsel-Versatz, F5-/Z-Order-/Anker-Persistenz, Render-Loop-Leak

## [1.x] - Tag `v1-legacy`
Früher Prototyp (April 2026).
