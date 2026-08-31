# SYNC_LOG - Herkunft des portierten Codes

Quelle ist die private Dashboard-Engine (`trading-dashboard/react-app/src/zchart/`).
Jede Zeile dokumentiert einen Port: auf welchem Dashboard-Stand er basiert und was
bewusst von der Vorlage abweicht.

| Datum | Bereich | Dashboard-Commit | Umfang | Abweichungen von der Vorlage |
|---|---|---|---|---|
| 2026-08-18 | Fundament (ZC-P2) | 399a8260 | core/ (10), math/ (10), data/DataStore, types/, utils/, indicators/calc Basis (5), nodes: SceneNode, StaticLineNode, BaseIndicatorNode, LineSeriesNode — 34 Dateien, 101 Tests | DataStore: 20 Pro-Delegates entfernt (candlePatterns/marketStructure/tradingViewExtras, 1064→897 Z.); ChartManager 1 strict-Fix (implicit any) |
| 2026-08-18 | Input (ZC-P3) | 399a8260 | input/ komplett (InputManager, PointerInterceptor, handlers/, cursor/, tools/-Registry, 4 Tests) | InputManager 1927→1546 Z.: Pro-Tool-Branches entfernt (Pattern/Forecast/GhostFeed/Position/Channels/Gann/Fib-Erweiterungen/Table/Callout u.a., inkl. finalizeForecast/GhostFeed, Table-Zellen-Dblclick, Compare-Crosshair-Block); tools/: positionTools+threeClickTools gestrichen, 22 Core-Modi bleiben (24 registerTool) |
| 2026-08-18 | Nodes (ZC-P4) | 399a8260 | nodes/core komplett (11), series Basis (8), tools Basis (19 + fib/FiboNode), indicators Basis (8), utils/timeFormat (= Kopie utils/timezone.ts des Dashboards) | fib/index + indicators/index neu geschrieben (nur Core-Exporte); CompareOverlay/ExcursionBars/SplitLine + alle Pro-Tools/-Indikatoren nicht übernommen. Verify: tsc 0 Fehler, 121/121 Tests |
| 2026-08-18 | API+Themes (ZC-P5) | 399a8260 | api/ (ZChartAPI, 4 Core-Controller, Serialization lines-shapes+annotations, Pane-/Overlay-Registry mit Basis-Defs), themes/ (Registry + darkPro/lightPro), src/index.ts Public-Barrel | ZChartAPI ohne MA-/IndicatorExtras-/Profile-/TradingOverlay-/ServerIndicator-Controller (→ Pro); DrawingsController: Compare-Sektion raus, Pattern/Forecast/GhostFeed-Remap durch generisches points-Duck-Typing ersetzt (deckt jetzt auch Polyline ab); Theme-Fallback tvDefault→darkPro; Registrierungen auf Core-Sets beschnitten (panes: stochastic/macd/atr + rsi/volume built-in, overlays: sma/ema/bbands, Serializer: 10 lines-shapes + note/path/polyline); Tests auf Core-Umfang angepasst. Verify: tsc 0, 184/184 Tests, Lib-Build 359 kB + d.ts |
