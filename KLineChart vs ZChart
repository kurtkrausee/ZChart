Hier ist die vollständige Analyse des gespeicherten Formats und was `importDrawings()` verarbeiten muss:
---
## 1. Server-Response-Struktur
`GET /api/chart-state/{symbol}` liefert:

```json
{
  "ok": true,
  "symbol": "AAPL.US",
  "state": {
    "drawings": [ /* DrawingModel[] */ ],
    "settings": { /* ChartSettings */ },
    "magnetMode": "off",
    "activeIndicators": ["MA", "RSI"]
  },
  "limits": { "maxDrawings": 50, "allowObjectTree": false },
  "tier": "basis"
}
```

Gespeichert als JSON-BLOB in `user_prefs` (MariaDB), Namespace `chart_drawings`, Key = Symbol. Kein eigenes DB-Schema – reines JSON-Merge via `prefs_service.deep_merge()`.

---

## 2. DrawingModel – vollständiges JSON-Schema

```typescript
// Jedes drawing[] Element sieht so aus:
{
  // ── Identifiers ──────────────────────────────────────────
  "id":        "d_1712345678_abc123",   // intern generiert: d_{ms}_{rand6}
  "overlayId": "overlay_1712345678",    // KLineChart overlay id – ZChart ignoriert das

  // ── Type ─────────────────────────────────────────────────
  "type": "fibRetracement",             // DrawingType string (70+ Typen, s.u.)

  // ── ⚠️ KRITISCH: Anchor-Format ──────────────────────────
  "anchors": [
    { "timestamp": 1712345678000, "price": 185.25 },
    { "timestamp": 1712456789000, "price": 162.50 }
  ],

  // ── Style ────────────────────────────────────────────────
  "style": {
    "color": "#2962ff",
    "lineWidth": 2,
    "lineStyle": "solid" | "dashed" | "dotted",

    // Optional (nur wenn gesetzt):
    "fillColor": "#2962ff",
    "fillOpacity": 0.08,
    "extend": "none" | "left" | "right" | "both",
    "showBackground": true,
    "backgroundOpacity": 15,           // 0–100
    "enabledLevels": ["0.5", "1"],     // Pitchfork/Fib-Ebenen als Strings
    "levelColors": { "0.5": "#f00" },  // Per-Level-Farben
    "showPearsonR": true,
    "upperDeviation": 2,
    "lowerDeviation": -2,
    "upColor": "#22c55e",
    "downColor": "#ef4444",
    "useOneColor": false,
    "textContent": "Label Text",
    "textSize": 12,
    "textBold": false,
    "textItalic": false,
    "textColor": "#ffffff",
    "textFontFamily": "sans-serif",
    "visibilityTimeframes": { "1d": true, "1h": false }
    // ... weitere Tool-spezifische Props (s. DrawingStyle Interface)
  },

  // ── State ────────────────────────────────────────────────
  "locked": false,
  "visible": true,
  "zIndex": 3,                         // höher = weiter vorne

  // ── Optional ─────────────────────────────────────────────
  "label": "Support",
  "labelColor": "#ffffff",
  "meta": {
    // Emoji/Text/Image-Tools speichern hier:
    "text": "Meine Notiz",
    "imageDataUrl": "data:image/png;base64,...",
    "emojiChar": "😊",
    "fontSize": 24
  },
  "createdAt": 1712345678000,          // ms epoch
  "updatedAt": 1712345678000,
  "intervalVisibility": "all" | "current_and_above" | "current_and_below" | "current_only"
}
```

---

## 3. ⚠️ Das Timestamp-Problem (kritisch für den Import)

Das ist die wichtigste Stolperfalle. In adapterKline.ts sieht `extractAnchors()` so aus:

```typescript
// Zeile ~68 in adapterKline.ts
.map((p: any) => ({
  timestamp: p.timestamp ?? p.dataIndex ?? 0,  // ← Fallback auf dataIndex!
  price: p.value ?? 0,
}))
```

KLineCharts `Point`-Typ laut temp_kline.d.ts:
```typescript
interface Point {
  dataIndex: number;   // Zeilen-Index im OHLCV-Array (0-basiert)
  timestamp: number;   // ms epoch
  value: number;
}
```

**Was das bedeutet:**
- Neuere Drawings: `timestamp` ist korrekt als ms-Epoch gespeichert ✅
- Ältere/Edge-Case-Drawings: `timestamp` könnte ein `dataIndex`-Wert sein (kleine Zahl wie `4231`)
- Der Unterschied ist leicht erkennbar: ms-Epoch ≥ 1000000000000 (13 Stellen), dataIndex < 100000

**Empfehlung für `importDrawings()`:**
```typescript
function normalizeAnchor(raw: { timestamp: number; price: number }) {
  // Heuristik: dataIndex-Werte sind immer < 1_000_000
  const isDataIndex = raw.timestamp < 1_000_000;
  return {
    timestamp: isDataIndex ? null : raw.timestamp,  // null = muss per dataIndex aufgelöst werden
    dataIndex: isDataIndex ? raw.timestamp : null,
    price: raw.price,
  };
}
```

---

## 4. `overlayId` ist überflüssig für ZChart

`overlayId` ist KLineChart-intern und kann beim Import ignoriert werden. ZChart generiert eigene Node-IDs. Für die Kompatibilität im Adapter einfach:

```typescript
function importDrawings(data: DrawingModel[]): ZChartNode[] {
  return data.map(d => ({
    id: d.id,                     // Eigene ID beibehalten (für Server-Sync)
    type: d.type,                 // DrawingType string – kann 1:1 übernommen werden
    anchors: d.anchors,           // { timestamp, price }[] – dein Koordinatensystem
    style: d.style,               // komplett wiederverwendbar
    locked: d.locked,
    visible: d.visible,
    zIndex: d.zIndex,
    label: d.label,
    meta: d.meta,
    intervalVisibility: d.intervalVisibility,
  }));
}
```

---

## 5. Zusammenfassung: Was ZChartAPI.importDrawings() können muss

| Feld | Behandlung |
|---|---|
| `id` | Beibehalten (Server-Key) |
| `overlayId` | **Ignorieren** – KLineChart-intern |
| `type` | 1:1 übernehmen – alle 70+ Typen sind bereits TypeScript-Strings |
| `anchors[].timestamp` | **Validieren** (ms-Epoch vs. dataIndex-Fallback) |
| `anchors[].price` | Direkt als Y-Koordinate im Preisraum |
| `style` | Komplett wiederverwendbar – unabhängig von KLineChart |
| `meta` | Für Emoji/Text/Image-Nodes nötig |
| `zIndex` | Scene-Graph-Sortierung |
| `intervalVisibility` | Filter-Logik bei Timeframe-Wechsel |

Der State-Layer (model.ts, store.ts) ist vollständig engine-unabhängig – du musst nur `adapterKline.ts` durch einen ZChart-Adapter ersetzen. Das Format bleibt identisch.
