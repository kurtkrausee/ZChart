# ZChartAPI — Architektur

> **Version:** 1.0.0 | **Aktualisiert:** 2026-06-10
> Ergebnis des ZChartAPI-Refactors (P0–P16). Siehe
> [docs/_archive/zchart-api-refactor/roadmap.md](../../../../docs/_archive/zchart-api-refactor/roadmap.md).

## Prinzip

`ZChartAPI` ist die **öffentliche Fassade** für die ZChart-Engine. Konsumenten
(`ZChartTab`, `useZChartKeyboard`, `ZChartSettingsModal`, Drag-Interceptors,
`CnnBboxOverlayCanvas`, `useCustomIndicators`) rufen **ausschließlich** Methoden
auf `api.*` auf. Die Signaturen sind **eingefroren** — interne Umbauten dürfen sie
nie verändern.

Intern hält die Fassade **keinen** Logik-Code mehr: jede Methode ist ein
1-Zeilen-Delegate an einen Domain-Controller oder eine Registry. Von ursprünglich
**5801 Zeilen / 294 Members** (God-Object) auf **~510 Zeilen reine Delegation**
(die ~144 benannten `add*Pane`/`remove*Pane`-Delegates wurden nach P17 entfernt —
seit dem ZChartTab-Umbau auf `addIndicatorPane(id, …)` hatte sie kein Aufrufer mehr).

```
api.addIndicatorPane('atr', { period: 14 })  →  paneRegistry ('atr'-Def)
api.setTheme('dark')                         →  SettingsController
```

## Struktur

```
api/
├── ZChartAPI.ts              # Fassade (~510 Z.) — nur Delegation, 10 betitelte Sektionen
├── types.ts                  # ChartStyle, IndicatorLineStyleOptions, DrawingExportData, devWarn()
├── controllers/
│   ├── TemplatesController.ts        # localStorage-Settings-Templates
│   ├── ViewportController.ts         # Koordinaten, Zoom, Scroll, VisibleRange, onViewChange
│   ├── DrawingsController.ts         # Layer-Order, Compare, Serialize, Undo/Redo, Properties
│   ├── SettingsController.ts         # Theme, Farben, Skalen, ChartStyle, Crosshair, Margins
│   ├── TradingOverlayController.ts   # Journal-/Broker-Overlay, Interceptors, Alert-Lines
│   ├── ProfileController.ts          # TPO/STPO/VRVP/AAVP/PVP/SVP/SVP_HD
│   ├── MovingAverageController.ts    # Multi-Instanz-MAs (MetaTrader-Style)
│   ├── IndicatorExtrasController.ts  # RSI/Volume-Sichtbarkeit, Levels, Pane-Toggle, VolumeSMA
│   └── ServerIndicatorController.ts  # Server-computed Python-Indikatoren (Marker/Line/Span)
├── indicators/
│   ├── paneRegistry.ts               # PaneIndicatorDef-Registry + add/removeIndicatorPane()
│   ├── panes/{momentum,volume,volatility,breadth-trend}.ts  # ~90 Pane-Indikatoren als Config
│   ├── overlayRegistry.ts            # OverlayIndicatorDef-Registry + add/remove
│   └── overlays/*.ts                 # ~120 Overlay-IDs als Config
└── serialization/
    ├── DrawingSerializer.ts          # import/export-Registry, buildBaseExport, SerializerContext
    └── families/{lines-shapes,fib-gann,patterns-cycles,special}.ts
                                      # Export- UND Import-Branch je Tool NEBENEINANDER
```

## Fassaden-Sektionen (Inhaltsverzeichnis in ZChartAPI.ts)

1. **Lifecycle & Events** — `constructor` / `destroy` / `subscribe` / Templates
2. **Viewport** → `ViewportController` (+ Replay)
3. **Tools & Input** → `manager.inputManager` (setTool/Cursor/Defaults/CustomScript)
4. **Drawings** → `DrawingsController`
5. **Settings** → `SettingsController` (+ StatusLine)
6. **Pane-Indicators** → `PaneIndicatorController` (+ IndicatorExtras)
7. **Overlay-Indicators** → `OverlayIndicatorController`
8. **Profiles / Moving Average** → `ProfileController` / `MovingAverageController`
9. **Server-Indicators** → `ServerIndicatorController`
10. **Trading-Overlay** → `TradingOverlayController`

## Einen neuen Pane-Indikator in 5 Zeilen anlegen

**Keine Fassaden-Methode nötig** — nur ein Registry-Eintrag:

```ts
// indicators/panes/momentum.ts — Registry-Eintrag (Config statt Methode):
registerPaneIndicator('my_indicator', {
    calculate: (ds, p) => ds.calculateMyThing(num(p, 'period', 14)),
    buildNodes: (ds, p, style) => [
        withZ(new MyNode(ds, num(p, 'period', 14), style.color ?? '#e91e63'), 5),
    ],
});
```

Aufruf überall: `api.addIndicatorPane('my_indicator', { period: 14 })` /
`api.removeIndicatorPane('my_indicator')`. `ZChartTab.attachBuiltInIndicator`
reicht Params/Styles seit P17 generisch durch — neuer Indikator = Registry-Eintrag
+ Katalog-Eintrag (`indicatorAtomCatalog`), sonst nichts. Benannte
`addMyIndicatorPane`-Delegates gibt es seit 6.64.0 bewusst nicht mehr.

## Regeln für neue Funktionen (WICHTIG)

- **Niemals** neue Logik inline in die Fassade packen. Neue Methoden → in den
  passenden Controller (oder einen neuen Controller) legen, in der Fassade nur
  einen 1-Zeilen-Delegate in der richtigen Sektion ergänzen.
- **Signatur-Freeze:** öffentliche Methoden-Signaturen nicht verändern.
- **Splitscreen:** Controller halten **keinen** modul-globalen State — jede Pane
  hat ihre eigene API-Instanz (Lehre aus Input-Priority-Bug A/B). Registries
  (paneRegistry/overlayRegistry/DrawingSerializer) sind modul-global, aber
  **stateless** (nur Config-Maps) — das ist ok.
- **Lifecycle:** State, der NICHT im Manager/InputManager liegt (Controller-Maps),
  muss in `ServerIndicatorController.destroy()` / `MovingAverageController.destroy()`
  bzw. `removeAllCompareOverlays()` aufgeräumt und in `ZChartAPI.destroy()` verkettet
  werden. `manager.destroy()` räumt Panes/Nodes/Interceptors/Event-Listener.
- **Silent-Failures:** echte Fehlersituationen bei aktiven Operationen (fehlendes
  Pane) über `devWarn(scope, msg)` melden; idempotente remove/toggle-No-Ops bleiben
  still.

## Bekannte `any`-Last (Stand P16)

`any` in `api/` (ohne Tests): **~47**. Das Roadmap-Ziel „<10" wird **bewusst nicht**
erreicht, weil der Großteil in inhärent dynamischem Code steckt:

| Bereich | ~any | Grund |
|---|---|---|
| `DrawingsController` | 20 | Shape-Property-Zugriff (`(shape as any).lineColor`) — KLineChart-/DrawableShape-Interop ohne diskriminierte Union |
| `serialization/families/*` | 18 | Wire-Format ↔ Node-Konstruktoren (`ext as any`), persistierte User-Daten |
| `ZChartAPI.ts` | 5 | `getShapeById`/`getDrawingProperties`-Returns, `addServerIndicator` rows-Payload |
| Rest | 4 | Event-Callback-Payloads |

Diese sind **lokalisiert und dokumentiert**, nicht über die ganze Codebase verstreut
wie im ursprünglichen God-Object. Eine weitere Reduktion (diskriminierte Shape-Union)
wäre ein eigenes Vorhaben außerhalb dieses Refactors.
