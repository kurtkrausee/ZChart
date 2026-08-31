# ZChart Core / Pro — Destillation aus dem Dashboard

**Version:** 2.2.0 | **Aktualisiert:** 2026-08-18 | **Status:** 🟡 ZC-P1–P7 fertig (Core released) — als Nächstes ZP-P1 (Pro)

> Ziel: Die Chart-Engine aus `react-app/src/zchart/` als eigenständiges Paket **ZChart Core** (frei, MIT, Repo [kurtkrausee/ZChart](https://github.com/kurtkrausee/ZChart)) und darauf aufbauend **ZChart Pro** (kommerziell, privates Repo `kurtkrausee/zchart-pro`) bereitstellen, so dass Dritte sie per npm einbinden können.
>
> **Arbeitsmodell (User-Entscheidung 2026-08-18):** Core und Pro sind **eigenständige, neue Projekte** mit eigener Struktur. Der Dashboard-Code dient als **Nur-Lese-Vorlage** (portieren + anpassen, nicht 1:1 spiegeln); am trading-dashboard wird für dieses Vorhaben NICHTS geändert (außer dieser Doku). Kein Subtree, kein Export-Script. Details: [workflow.md](workflow.md).
>
> Lokale Arbeitskopien: `J:\07 VPS Server\04 ZChart` (Core, Stand April 2026, 47 Dateien — veraltet) · `J:\07 VPS Server\05 ZChart-Pro` (Konzept-Skelett). Produktentscheidung + Ideen: `docs/ZChart-Pro-Ideen.md` im Dashboard (privat). **Sync-Workflow + Audit-Trail-Regeln:** [workflow.md](workflow.md).
>
> **Umzug 2026-08-18:** Diese Roadmap lag bis dahin im Dashboard-Repo (`docs/features/zchart-core-pro/`, letzter Stand dort Commit `399a8260`) und lebt jetzt hier im Core-Repo, damit das Dashboard-Repo von diesem Vorhaben unberührt bleibt.

---

## 1. Befund (2026-08-18)

- Engine `src/zchart/`: 342 Dateien, ~60k Zeilen, 27 Vitest-Suites, keine npm-Runtime-Abhängigkeit, kein React (außer `panels/`, `trading/`).
- **3 Leck-Stellen** nach außen (werden beim Portieren auf Core-Seite gelöst — Broker-UI wird nicht übernommen, Typen/timezone-Formatter werden in Core neu geschrieben): (1) `zchart/panels/*` + `zchart/trading/*` (7 React-Dateien, Broker-UI mit `apiClient`/`useBrokerData`); (2) `atoms/indicatorAtomCatalog.ts` Typ-Imports aus `components/charts/ZChartLevelList`, `services/chartsApi`, `components/charts/toolbar/IndicatorToolbar`; (3) `nodes/core/CrosshairNode.ts` + `XAxisNode.ts` → `utils/timezone`.
- Registries vorhanden (Pro kann sich einhängen): `registerTool` (77×), `registerPaneIndicator` (73×), `registerOverlayIndicator` (53×), `registerDrawingSerializer` (53×), `registerPointerInterceptor`, `registerTheme`, `registerCustomScript`/`registerCustomScriptSubPane` (ZChartAPI).
- React-Integration `pages/charts/zchart/` (90 Dateien, ~27k Zeilen) ist Rohstoff für Pro-UI, aber fest mit Dashboard-Services verdrahtet.
- 114 Dashboard-Dateien importieren aus `zchart/` (davon 37 in `lib/backtest/indicators`).

### 1b. Delta Core-Repo v1 (April 2026) ↔ Engine heute (Analyse 2026-08-18)

Core-Repo `kurtkrausee/ZChart` letzter Commit `7160209` (2026-04-12). Seitdem **394 Commits** an `src/zchart/` im Dashboard. Das v1-Repo ist damit eine **frühe, überholte Version — kein Cherry-Picking, sondern kompletter Ersatz in P2** (alter Stand als Tag `v1-legacy`).

Kern-Dateien (v1 → heute, Zeilen): `ChartManager` 572→1052 · `DataStore` 114→1064 · `InputManager` 1034→1927 (+ `input/handlers`, `tools`, `cursor` ausgelagert) · `ChartOptions` 72→246 · `AutoScaleEngine` 79→240 · `PriceScale` 75→156 · `YAxisNode` 84→153 · `CrosshairNode` 84→178 · `Formatters` 21→119. Weggefallen/verschoben: `core/IndicatorRegistry.ts` → `api/indicators/*Registry.ts`; `math/indicators/*` → `indicators/calc/*` + `nodes/indicators/*`; `PenNode`→`BrushNode`, `TextNode`→`TextLabelNode`, `ImageNode`→`ImageNoteNode`; `main.ts`/`counter.ts` (Vite-Demo) entfallen.

Wichtige seit v1 behobene Fehlerklassen (Kurz-SHAs im Dashboard):
- **Pane schließen → untere Panes fallen aus dem Bild:** v1 `removePane` verteilt nur das entfernte Gewicht anteilig; heute `rebalancePaneWeights()` (Main ≥ 40 %, Sub ≥ 8 %, Summe = 1, `_originalWeights`) — `a9552da3`, `036e8272`.
- **Achsen:** Nice Ticks statt `paneHeight/5` (`8a37acb4`), Custom Ranges/Tick-Provider je Pane (`cb0b4ccf`), Zukunfts-Labels X (`fe6bf7a3`), Zahlenformat/Tausendertrenner (`1213ee3b`), Smart-Dezimalen + Letztkurs-Label (`22c56ad4`, `6604afd6`), Label-Überlappung Crosshair/LastPrice (`1d212314`), Y-Zoom per Wheel/Anchored + Schrittweite (`311cee9a`, `34f10890`), Multi-Y-Achse (`968e2d29`, `6cfaee64`), X-Achsen-Drag-Zoom (`c00495cc`), Y-Autoscale mit Overlay-Bändern/Sub-Pane-Indikatoren (`7319fa6f`, `af510fb5`, `eda2e2b6`).
- **Sub-Panes:** Gewichts-Normalisierung, MetaTrader-Trenner, Y-Achse je Sub-Pane, Sub-Pane-Drag (`e76e56ee`, `411aa96c`).
- **Timeframe-Wechsel-Versatz** (Left-Edge-Restore), Zoom-Anker + Hotkeys (`5a432a7b`), Jump-to-Latest (`58021f44`).
- **Touch:** Pointer-Engine, Pinch/Long-Press, coarse Hit-Targets, iOS-Selektion (`65eb8e9d`, `aaca104f`, `0d7d5dce`).
- **Persistenz/Drawings:** F5-Persistenz, Anker-Verschub bei `prependData`, Z-Order, Duplikat-Guard (`4146b3b0`, `31aa6eee`, `79aa6989`, `d43dc5da`).
- **Perf:** inkrementelles Rendering, `setMousePos`-Filter, Engine-Lifecycle-Leak Splitscreen (`42e509ec`, `b5215b5a`).

Konsequenz für P2: Public-API (`ZChartAPI` 811→619 Zeilen, in Controller aufgeteilt) hat sich geändert — README/Getting-Started im Core-Repo komplett neu schreiben, nicht anpassen.

## 2. Abgrenzungs-Prinzip (User-Entscheidung 2026-08-18)

**Mechanik = Core, Inhalt = Pro.** Testfrage je Datei: „Braucht man das, um einen eigenen Indikator/ein eigenes Tool *bauen* zu können?" → Core. „Fertiges Ergebnis, das Zeit spart?" → Pro.

Konkrete Regeln:
1. **Standard-Indikatoren in Core**, erweiterte Varianten mit **eigener Node-Datei** in Pro. Ist die Erweiterung Teil **derselben** `*Node.ts` (Parameter/Modus), bleibt sie in Core (Node wird nicht zerschnitten).
2. **Themes:** Core nur `dark` + `light` (vereinfacht) + Theme-Registry; alle weiteren Presets (TD-Themes etc.) Pro.
3. **CustomScripts** (Pine-ähnliche Engine, `CustomScriptIndicatorNode`, `ScriptDrawingsNode`) in Pro; **Voraussetzungen** (Registrierungs-Hooks `registerCustomScript*`, Script-Sub-Pane-Mechanik, Drawing-Injection-API) in Core.
4. **Grauzonen-Regel:** Fehlt einem Pro-Node ein Core-Mechanismus (Hook, Achse, Layer), wandert der *Mechanismus* nach Core, der Node bleibt Pro.
5. Pro importiert ausschließlich aus der Core-Public-API (`zchart/index.ts`); Core kennt Pro nie (ESLint-Regel).

## 3. Zuordnung je Ordner (Vorlage → Zielpaket)

> Referenz-Ordner sind die des Dashboards (`react-app/src/zchart/`). Die Ziel-Struktur in Core/Pro darf davon abweichen.

| Ordner | Core | Pro |
|---|---|---|
| `core/`, `math/`, `data/`, `types/`, `utils/` | komplett | – |
| `input/` | InputManager, PointerInterceptor, Handler, Tool-Framework (Registry/Steps/Handles/Long-Press) | – (Pro-Tools registrieren sich) |
| `api/` | ZChartAPI, `ViewportController`, `SettingsController`, `DrawingsController`, `TemplatesController`, `ProfileController`, Serialization, leere Overlay-/Pane-Registry, CustomScript-Hooks | `ServerIndicatorController`, `TradingOverlayController`, `IndicatorExtrasController`, `MovingAverageController` (dashboard-nah → Pro bzw. Adapter) |
| `nodes/core` | komplett (SceneNode, DrawableSceneNode, Grid, X/Y-Achse, Crosshair, Watermark, StaticLine, LastPriceLine, StatusLine, RangeHighlight, DayHighLow) | – |
| `nodes/series` | Candlestick, OhlcBar, Line, Area, Baseline, Histogram, StackedHistogram, Volume, MarkerSeries | CompareOverlay, ExcursionBars, SplitLine |
| `nodes/tools` | TrendLine, Ray, ExtendedLine, HorizontalLine, HorizontalRay, VerticalLine, CrossLine, Rectangle, Ellipse, Triangle, Polyline, Brush, TextLabel, Note, Arrow, Emoji, Measure, PriceRange, DateRange, `fib/FiboNode` (Retracement) | alle übrigen (~40): Gann-Familie, Pitchfork/Pitchfan, Parallel-/Disjoint-/Regression-Channel, `fib/*` außer Retracement, Anchored VWAP/VP, FixedRange VP, Forecast, GhostFeed, Pattern/BarsPattern, Position/TradeSignal, Table, Callout/Signpost/Flag/Pin/PriceLabel/PriceNote/InfoLine, Cycles/TimeCycles/SineLine, Curve/DoubleCurve/Arc/Sector, RotatedRectangle, FlatTopBottom, TrendAngle, AlertLine, ImageNote, Comment, AnchoredText, ArrowMark, DatePriceRange |
| `nodes/indicators` | `BaseIndicatorNode`, `index.ts` (Registry-Anbindung) + Standard-Set: SMA, EMA, RSI, MACD, BollingerBands, ATR, Stochastic, VolumeSMA | Rest — u.a. gesamtes `market-structure/` (123, P2P3, Punkt3, Korrekturphase, AutoPattern, Trendstruktur, Sessions …), Ichimoku, Supertrend, ParabolicSAR, Alligator, alle Volume-Profile/TPO/VWAP-Varianten, Keltner/Donchian/Envelope/Chande/Chandelier/LinReg-Channel, StochRSI/SMI, CCI/KST/PPO/TSI/Vortex/RVI/PMO, TechnicalRatings, VolumeSpike/ROC/PVT/PVO, BollingerBars, `CustomScriptIndicatorNode`, `ScriptDrawingsNode` |
| `indicators/calc` | movingAverages, momentum, volatility, volume, trend (Basis-Mathe) | marketStructure, candlePatterns, `patterns/`, tradingViewExtras |
| `nodes/overlays` | – | Broker/Journal/TradeMarkers (mit Plugin-Interfaces) |
| `atoms/` | – | komplett |
| `themes/` | Registry + `dark`, `light` | übrige Presets |
| `panels/`, `trading/` | – (wird nicht portiert) | Broker-UI später in Pro hinter Plugin-Interface neu, ohne Dashboard-APIs |
| React `pages/charts/zchart/` | – | `<ZChartPro config>`: Toolbars, Modals, Sidebar, Replay, Settings, Hotkeys, Kontextmenü |

Zu prüfen bei P1 (Regel 1 „gleiche Node-Datei"): welche Standard-Nodes enthalten heute Erweiterungsmodi (z.B. RSI mit Divergenzen, MACD-Varianten) — bleiben dann inkl. Modus in Core.

## 4. Phasen

**ZChart Core** (Repo `04 ZChart`, Basis-Tag `v1-legacy` vor Start):

| Phase | Inhalt | Aufwand |
|---|---|---|
| **ZC-P1 Gerüst** | Alten Stand committen + Tag `v1-legacy` (inkl. 2 uncommitteter Dateien); neues Projektgerüst: Vite Library-Mode (ESM + `.d.ts`), Vitest, strict tsconfig, `package.json` (`@kurtkrausee/zchart`, Name prüfen), MIT, SYNC_LOG.md/CHANGELOG.md | 0,5 Tag |
| **ZC-P2 Fundament** | `core/` (ChartManager, Pane, Options, VisualSettings, axisLayout), `math/` (Scales, TickEngine, AutoScale), `data/DataStore`, `types/`, `utils/` (inkl. neuem timeFormat statt Dashboard-`utils/timezone`) portieren + Tests | 1–2 Tage |
| **ZC-P3 Input** | InputManager, PointerInterceptor, Handler, Tool-Framework (Registry/Steps/Handles/Long-Press, Touch-Patterns) | 1 Tag |
| **ZC-P4 Nodes** | `nodes/core` komplett; `nodes/series` Basis-Set; Basis-Tools (~20 gemäß §3); Basis-Indikatoren (SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic, VolumeSMA) + `indicators/calc`-Basismathe | 2 Tage |
| **ZC-P5 API + Themes** | ZChartAPI + Core-Controller, Serialization, leere Registries, CustomScript-Hooks (Regel §2.3); Theme-Registry + `dark`/`light` | 1 Tag |
| **ZC-P6 Demo + Docs** | Vanilla-Demo (statische OHLCV-Daten, index.html), README/Getting-Started NEU (alte API-Doku unbrauchbar, §1b), ARCHITECTURE aktualisieren | 1 Tag |
| **ZC-P7 Release** | PR `dev → main` (Body: Delta-Analyse §1b), Tag `v2.0.0`, `npm publish` | 0,5 Tag |

**ZChart Pro** (Repo `05 ZChart-Pro`, startet nach ZC-P7):

| Phase | Inhalt | Aufwand |
|---|---|---|
| **ZP-P1 Gerüst** | Projektgerüst analog Core; Core als Dependency (`file:../04 ZChart` lokal, später npm); kommerzieller Lizenztext | 0,5 Tag |
| **ZP-P2 Engine-Plugins** | Pro-Tools (~40), Pro-Indikatoren (inkl. `market-structure/`, Profile/VWAP, CustomScript-Engine), Pro-Serien, Pro-Themes — alles via Core-Registries (`registerProTools()` etc.), portiert aus §3-Pro-Spalte | 3–5 Tage |
| **ZP-P3 React-Wrapper** | `<ZChartPro config>` mit Plugin-Interfaces (`dataProvider`, `drawingsStore`, `journal?`, `watchlist?`, `broker?`, `alerts?`); Vorlage `pages/charts/zchart/` (Toolbars, Modals, Sidebar, Replay) — inkrementell, datenarme Teile zuerst | mehrere Wochen |
| **ZP-P4 Release** | Demo, Docs, Vertriebsweg (privates GitHub-Package / Lizenz-Token), Release | 1–2 Tage |

Nachportierungen Dashboard ↔ Core/Pro später manuell je Bedarf (workflow.md §5, SYNC_LOG).

## 5. Offene Entscheidungen
- npm-Paketname/Scope (`zchart` unscoped vermutlich belegt → `@kurtkrausee/zchart` / `@zchart/core`).
- Startzeitpunkt (nicht parallel zu analyse-redesign).
- Standard-Indikator-Set final (8 Nodes oben) — ggf. enger.
- Umgang mit den 2 uncommitteten Dateien in `04 ZChart` (Vorschlag: mit in `v1-legacy`).

## 6. Audit-Trail

| Datum | Phase | Commit | Beschreibung / Verify |
|---|---|---|---|
| 2026-08-18 | Plan | 46b07d09 | Roadmap angelegt, Abgrenzung mit User entschieden (Regeln §2), Master-Roadmap verlinkt |
| 2026-08-18 | Plan | 4f42394c | §1b Delta-Analyse Core-Repo v1 ↔ Engine (394 Commits, Fehlerklassen, Ersatz statt Cherry-Pick) |
| 2026-08-18 | Plan | 7ceefb9e | workflow.md v1 (Subtree-Modell — obsolet) |
| 2026-08-18 | Plan | 399a8260 (Dashboard) | **Modellwechsel** (User): eigenständige Projekte, Dashboard = Nur-Lese-Vorlage, NICHTS im Dashboard ändern (P0/P1 gestrichen); Phasen neu als ZC-P1–P7 + ZP-P1–P4; workflow.md v2 |
| 2026-08-18 | ZC-P1 | e07a468 + s.u. | v1 gesichert: 15 uncommittete Dateien committet, Tag `v1-legacy`, gepusht. Doku-Umzug Dashboard → Core-Repo `docs/`. Neues Gerüst: package.json (2.0.0-dev, MIT), strict tsconfig + tsconfig.build (Declarations), Vite Library-Mode, Vitest (node-env), CHANGELOG, SYNC_LOG; altes `src/` entfernt |
| 2026-08-18 | ZC-P2 | s. git log | Fundament portiert (Dashboard-Stand 399a8260): core/, math/, data/DataStore, types/, utils/, calc-Basis (momentum/movingAverages/trend/volatility/volume), 4 Basis-Nodes (SceneNode, StaticLineNode, BaseIndicatorNode, LineSeriesNode) — 35 Dateien, ~9.000 Zeilen. DataStore ohne die 20 Pro-Delegates (897 statt 1064 Z.). **Verify:** 101/101 Tests grün, tsc: 0 Fehler außer 7× TS2307 (Module aus ZC-P3/P4) |
| 2026-08-18 | ZC-P3 | s. git log | input/ portiert: InputManager 1927→1546 Z. (Pro-Branches raus), tools/-Registry auf 22 Core-Modi, handlers/cursor 1:1. Verify: gemeinsam mit P4 |
| 2026-08-18 | ZC-P4 | fd74136 | nodes/ portiert (core komplett, 8 Serien, 19 Tools + FiboNode, 8 Indikatoren), utils/timeFormat ersetzt Dashboard-timezone. **Verify: tsc 0 Fehler, 121/121 Tests** |
| 2026-08-18 | ZC-P5 | e445d2f | api/ (Fassade + 4 Controller + Serialization + Registries mit Basis-Defs), themes/ dark+light (Fallback tvDefault→darkPro), src/index.ts Public-Barrel, Lib-Build ES+d.ts. **Verify: tsc 0, 184/184 Tests, Build 359 kB** |
| 2026-08-18 | ZC-P6 | s. git log | index.html + demo/main.ts (deterministische Daten, Toolbar/Theme/Snapshot), README v2, v1-Doku → docs/legacy/. **Verify: tsc 0 inkl. demo, vite-dev-Smoke 200** |
