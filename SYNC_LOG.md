# SYNC_LOG - Herkunft des portierten Codes

Quelle ist die private Dashboard-Engine (`trading-dashboard/react-app/src/zchart/`).
Jede Zeile dokumentiert einen Port: auf welchem Dashboard-Stand er basiert und was
bewusst von der Vorlage abweicht.

| Datum | Bereich | Dashboard-Commit | Umfang | Abweichungen von der Vorlage |
|---|---|---|---|---|
| 2026-08-18 | Fundament (ZC-P2) | 399a8260 | core/ (10), math/ (10), data/DataStore, types/, utils/, indicators/calc Basis (5), nodes: SceneNode, StaticLineNode, BaseIndicatorNode, LineSeriesNode — 34 Dateien, 101 Tests | DataStore: 20 Pro-Delegates entfernt (candlePatterns/marketStructure/tradingViewExtras, 1064→897 Z.); ChartManager 1 strict-Fix (implicit any) |
| 2026-08-18 | Input (ZC-P3) | 399a8260 | input/ komplett (InputManager, PointerInterceptor, handlers/, cursor/, tools/-Registry, 4 Tests) | InputManager 1927→1546 Z.: Pro-Tool-Branches entfernt (Pattern/Forecast/GhostFeed/Position/Channels/Gann/Fib-Erweiterungen/Table/Callout u.a., inkl. finalizeForecast/GhostFeed, Table-Zellen-Dblclick, Compare-Crosshair-Block); tools/: positionTools+threeClickTools gestrichen, 22 Core-Modi bleiben (24 registerTool) |
