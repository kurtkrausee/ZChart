# SYNC_LOG - Herkunft des portierten Codes

Quelle ist die private Dashboard-Engine (`trading-dashboard/react-app/src/zchart/`).
Jede Zeile dokumentiert einen Port: auf welchem Dashboard-Stand er basiert und was
bewusst von der Vorlage abweicht.

| Datum | Bereich | Dashboard-Commit | Umfang | Abweichungen von der Vorlage |
|---|---|---|---|---|
| 2026-08-18 | Fundament (ZC-P2) | 399a8260 | core/ (10), math/ (10), data/DataStore, types/, utils/, indicators/calc Basis (5), nodes: SceneNode, StaticLineNode, BaseIndicatorNode, LineSeriesNode — 34 Dateien, 101 Tests | DataStore: 20 Pro-Delegates entfernt (candlePatterns/marketStructure/tradingViewExtras, 1064→897 Z.); ChartManager 1 strict-Fix (implicit any) |
