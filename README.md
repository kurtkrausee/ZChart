# ZChart

**A modular TypeScript/Canvas charting engine for financial data — zero runtime dependencies.**

ZChart renders candlestick charts on a raw HTML5 canvas at 60 fps: unlimited panes with their own price scales (multi-Y-axis included), nice ticks, drawing tools, indicator registries, touch gestures (pinch-zoom, long-press) and a theme system. No framework required — plain TypeScript, one canvas element.

> **v2.0.0 is a complete rebuild.** The engine matured for months inside a private production application (several hundred commits since v1) and has now been extracted back into this repository. The v1 code is preserved under the tag [`v1-legacy`](../../tree/v1-legacy); the v1 API docs no longer apply.

## Features

- **Rendering:** candlesticks, OHLC bars, line/area/baseline, histograms, volume — high-DPI aware, incremental redraws
- **Panes:** unlimited sub-panes (RSI, MACD, …) with dividers, per-pane price scales, weight rebalancing, multi-Y-axis per pane (`yAxisId` binding)
- **Axes:** nice ticks (1/2/2.5/5×10ⁿ), log & percent scale, custom ranges/ticks per pane, future labels, locale-aware number formatting, timezone support
- **Interaction:** pan, anchored wheel zoom (X+Y), X-axis drag-zoom, crosshair with snapping, full touch support (pointer events, pinch, long-press, coarse hit targets)
- **Drawing tools (20):** trendline, ray, extended line, h/v-line, cross line, horizontal ray, rectangle, ellipse, triangle, polyline/path, brush/highlighter, text, note, arrow, emoji (rotate/scale), measure, price range, date range, Fibonacci retracement
- **Indicators (8 built-in):** SMA, EMA, RSI, MACD, Stochastic, ATR, Bollinger Bands, Volume SMA — plus registries to add your own
- **Extensible by design:** `registerTool()`, `registerPaneIndicator()`, `registerOverlayIndicator()`, `registerDrawingSerializer()`, `registerTheme()` — plug in custom tools, indicators and themes without touching engine code
- **Persistence:** drawing import/export with timestamp remapping (survives data reloads and history prepends)
- **Events:** `drawingCreated`, `drawingChanged`, `crosshairMove`, `toolReset`, … — clean bridge to React/Vue/Svelte or vanilla apps

## Quickstart

```bash
npm install
npm run dev      # opens the demo (demo/main.ts) with generated OHLCV data
```

```ts
import { ChartManager, ZChartAPI, Pane, CandlestickNode } from 'zchart';

const manager = new ChartManager(document.getElementById('chart')!);

const mainPane = new Pane('main', 1.0);
const candles = new CandlestickNode(manager.dataStore);
candles.role = 'series';
mainPane.addNode(candles);
manager.addPane(mainPane);

const api = new ZChartAPI(manager);

manager.setData([
  { timestamp: 1735689600000, open: 100, high: 102, low: 99, close: 101, volume: 1200 },
  // … timestamp in ms
]);

api.setTool('trendline');                       // drawing tools
api.subscribe('drawingCreated', console.log);    // events
api.setTheme('light');                           // themes
```

The full wiring (volume pane, RSI pane with fixed range, toolbar, theme toggle, snapshot) is in [`demo/main.ts`](demo/main.ts) — ~90 lines, no backend.

## Build

```bash
npm run build      # dist/zchart.js (ES module) + dist/**/*.d.ts
npm test           # vitest (180+ unit tests)
npm run typecheck
```

## Extending

```ts
import { registerTheme, registerOverlayIndicator, LineSeriesNode } from 'zchart';

registerTheme({ id: 'sunset', label: 'Sunset', category: 'accent', /* … */ });

registerOverlayIndicator('my_vwap', {
  calculate: ds => ds.calculateSMA(20, 'my_vwap'),
  buildNodes: ds => [new LineSeriesNode(ds, 'my_vwap', '#e91e63', 2)],
});
```

Tools, pane indicators and drawing serializers follow the same pattern — see `src/input/tools/` and `src/api/indicators/` for reference implementations.

## Project layout

```
src/
  core/        ChartManager, Pane, options, visual settings, axis layout
  math/        TimeScale, PriceScale, TickEngine, AutoScaleEngine
  data/        DataStore (OHLCV + indicator series)
  input/       InputManager, pointer interceptors, tool registry
  nodes/       SceneNode tree: core (axes/grid/crosshair), series, tools, indicators
  api/         ZChartAPI facade, controllers, registries, drawing serialization
  themes/      theme registry + dark/light presets
  utils/       formatters, geometry, time formatting
demo/          vanilla demo (npm run dev)
docs/legacy/   v1 documentation (historical)
```

## License

MIT — see [LICENSE](LICENSE).

## ZChart Pro

A commercial extension (advanced tools like Gann/pitchfork/channels, volume profiles, market-structure indicators, custom scripting, ready-made React UI) is in development in a separate repository and plugs into the registries above.
