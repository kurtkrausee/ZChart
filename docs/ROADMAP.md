# ZChart Core — Roadmap

**Version:** 1.0.0 | **Updated:** 2026-09-27

Public, high-level roadmap. Order is not a commitment.

## Data sources (planned)

ZChart Core deliberately stays a "dumb view": it renders whatever candles you push in via `setData()`, `prependData()` and `upsertCandle()`. The transport is yours — REST, WebSocket, files.

Planned on top of that, as **optional, separate packages** (never bundled into the engine):

- **`DataSource` contract** — a tiny interface (`fetchOHLCV`, `fetchOlder`, `subscribe`) so adapters are interchangeable and the engine never learns about a backend.
- **Generic REST/JSON adapter** — for TimescaleDB, MariaDB/PostgreSQL, ClickHouse or any HTTP backend.
- **zDB adapter** — binary protocol/WebSocket client for [zDB](https://github.com/kurtkrausee) (Rust time-series engine: flat binary arrays, sub-millisecond resampling). Optional high-performance path; everything works without it.

```
                     ┌──> REST/JSON adapter  ──> TimescaleDB / MariaDB / ClickHouse
[ ZChart / Pro ] ────┤
                     └──> zDB binary adapter ──> zdb-server / zdb-py
```

The engine itself will not change for this — adapters are consumers of the existing public API.

## Rendering

- Additional chart types: Renko, Kagi, Point & Figure, Line Break, Range bars (series transforms + one node each).
- Legend overlay (OHLC + indicator values at the cursor) — data already available via `crosshairMove`.

## Interaction

- Tool-registry hooks are complete (`onLivePreview`, `onDoubleClickHit`, `amendTool`); further gaps are filled as plugin authors report them.

## Housekeeping

- Split `InputManager` and `ChartManager` into smaller modules (both > 1k lines).
- npm publish under a scoped package name.
