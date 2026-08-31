# ZChart Pointer-Interceptor-Chain

Generisches System, mit dem externe Module sich für Maus-Events
(`down`/`move`/`up`/`leave`) am Chart registrieren können — **mit Priorität**
und **konsumierendem Rückgabewert**. Ersetzt das alte globale `externalDragActive`-
Flag (Roadmap [`zchart-input-priority`](../../../../docs/_archive/zchart-input-priority/roadmap.md), abgeschlossen).

## Idee

Bei jedem Maus-Event fragt der `InputManager` seine registrierten Interceptoren
der Reihe nach (höchste `priority` zuerst). Der erste, dessen `handle()` `true`
zurückgibt, **konsumiert** das Event — die Chain bricht ab und die interne
Chart-Logik (Pan/Zoom/Draw) wird übersprungen. Gibt keiner `true` zurück, läuft
der Chart normal weiter.

## API (`ZChartAPI`)

```ts
const dispose = api.registerPointerInterceptor(interceptor); // → Dispose-Funktion
api.unregisterPointerInterceptor(label);
api.getRegisteredInterceptors(); // DevTools: [{label, priority, paneId, phases}]
```

## Beispiel: eine Linie draggbar machen

```ts
const dispose = api.registerPointerInterceptor({
  label: 'my-line-drag',
  priority: 100,
  phases: ['down', 'move', 'up'], // 'leave' weglassen → Drag überlebt Canvas-Verlassen
  paneId: 'main',                 // optional: nur diese Sub-Pane
  handle: (phase, ev) => {
    if (phase === 'down') {
      const hit = hitTestMyLine(ev.x, ev.y);
      if (!hit) return false;        // kein Treffer → Chart pannt normal
      dragRef.current = hit;
      return true;                   // konsumiert → wird zum "active drag owner"
    }
    if (!dragRef.current) return false;
    if (phase === 'move') { setPreview(ev.price); return true; }
    if (phase === 'up')   { commit(dragRef.current, ev.price); dragRef.current = null; return true; }
    return false;
  },
});
// React: im useEffect-Cleanup → return () => dispose();
```

## Regeln (wichtig)

- **Active drag wins:** Konsumiert ein Interceptor ein `down`, bekommt er
  `move`/`up`/`leave` **exklusiv** (auch gegen höher-priorisierte), bis er ein
  `up`/`leave` konsumiert. Konsumenten müssen also keine Priorität "pumpen".
- **`leave` bewusst weglassen** für Drags, die bei Loslassen *außerhalb* des
  Canvas trotzdem committen sollen — der `up`-Listener hängt am `window` und deckt
  das ab. Würde `leave` den Drag abbrechen, ginge ein Außerhalb-Commit verloren.
- **`ev.price`/`ev.index`/`ev.paneId`** kommen aus `getLogicalCoordinates()` —
  fertig berechnet, kein eigenes Pixel→Preis-Mapping nötig. (`NaN`/`null` außerhalb.)
- **`paneId`-Filter** matcht die **Sub-Pane** (`'main'`/`'rsi'` …), NICHT die
  Splitscreen-Pane. Splitscreen-Isolation ergibt sich automatisch daraus, dass
  jede Pane-API ihren eigenen `InputManager` hat.

## Reservierte Prioritäts-Bänder

| Band    | Zweck                                   |
|---------|-----------------------------------------|
| `1000+` | System-Blocker (z.B. Modal-Lock)        |
| `500+`  | aktiv laufende Drags                     |
| `0`     | Default                                 |

## Bestehende Konsumenten

- `createJournalDragInterceptor` — Journal-Linien (Entry/SL/TP), Paper-Trading.
- `createBrokerDragInterceptor` — Broker-Linien (OANDA/IG SL/TP + Pending-Order)
  + Entry-Klick → ModifyDialog.

Beide in [`features/journal/zchart/`](../../features/journal/zchart/).

## Nicht abgedeckt

- **Touch-Events** (`onTouchStart` etc.) laufen über einen eigenen Pfad und sind
  bewusst **out of scope** dieser Chain (eigene Aufgabe).
