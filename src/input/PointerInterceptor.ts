// Version: 2.0.0 | Updated: 2026-07-29 | By: Agent
//
// Generische Pointer-Interceptor-Chain für den ZChart-InputManager.
// Diese Datei enthält NUR Typen & Interfaces — keine Laufzeit-Logik.
// Die Chain-Implementierung lebt im InputManager (siehe Roadmap §2.2, P2).
// ZT-P1: von Mouse- auf DOM-Pointer-Events umgestellt (Maus = pointerType 'mouse').

/**
 * Die vier Pointer-Phasen, an denen sich ein Interceptor einklinken kann.
 * - `down`  : pointerdown auf dem Canvas
 * - `move`  : pointermove (60Hz — Interceptor muss schnell sein)
 * - `up`    : pointerup (window-weit, deckt auch Loslassen außerhalb des Canvas ab)
 * - `leave` : Pointer verlässt das Canvas (pointerleave) oder Geste wird vom
 *             Browser abgebrochen (pointercancel — Drag-Lock wird danach immer gelöst)
 */
export type InterceptorPhase = 'down' | 'move' | 'up' | 'leave';

/**
 * Pointer-Event-Typ, der an Interceptoren übergeben wird.
 * Eine Untermenge der DOM-`PointerEvent`-Eigenschaften plus aus
 * `getLogicalCoordinates()` berechnete Felder (paneId/index/price/time).
 */
export interface ZChartPointerEvent {
  // --- raw (direkt aus dem DOM-PointerEvent übernommen) ---
  /** Canvas-relative X-Position in Pixeln. */
  x: number;
  /** Canvas-relative Y-Position in Pixeln. */
  y: number;
  /** Viewport-relative X-Position (DOM `clientX`). */
  clientX: number;
  /** Viewport-relative Y-Position (DOM `clientY`). */
  clientY: number;
  /** Gedrückte Maustaste (DOM `button`: 0 = links, 1 = mitte, 2 = rechts). */
  button: number;
  /** Bitmaske aller aktuell gedrückten Maustasten (DOM `buttons`). */
  buttons: number;
  /** Shift-Taste gedrückt? */
  shiftKey: boolean;
  /** Strg/Ctrl-Taste gedrückt? */
  ctrlKey: boolean;
  /** Alt-Taste gedrückt? */
  altKey: boolean;
  /** Meta-/Cmd-/Windows-Taste gedrückt? */
  metaKey: boolean;
  /** Eindeutige Pointer-ID (DOM `pointerId`) — für setPointerCapture/Multi-Touch. */
  pointerId: number;
  /** Eingabegerät: 'mouse' | 'pen' | 'touch' (DOM `pointerType`). */
  pointerType: string;

  // --- derived (berechnet via getLogicalCoordinates) ---
  /** ID der getroffenen Pane (z.B. 'pane-0') oder `null`, wenn außerhalb. */
  paneId: string | null;
  /** Logischer Daten-Index unter dem Cursor (`NaN`, wenn außerhalb). */
  index: number;
  /** Preis unter dem Cursor laut PriceScale der Pane (`NaN`, wenn außerhalb). */
  price: number;
  /** Zeitstempel unter dem Cursor (epoch) oder `null`, wenn außerhalb. */
  time: number | null;

  // --- control (Closures auf das zugrundeliegende DOM-Event) ---
  /** Unterdrückt das Standard-Browser-Verhalten des Roh-Events. */
  preventDefault(): void;
  /** Stoppt die DOM-Event-Propagation des Roh-Events. */
  stopPropagation(): void;
}

/**
 * Ein registrierbarer Interceptor, der sich in die Pointer-Chain einklinkt.
 * Höhere `priority` wird zuerst gefragt; der erste, dessen `handle` `true`
 * zurückgibt, konsumiert das Event und bricht die Chain ab.
 */
export interface PointerInterceptor {
  /**
   * Höher = wird zuerst gefragt. Default 0. Reservierte Bänder:
   *  - `1000+` System-Blocker (z.B. Modal-Lock)
   *  - `500+`  aktiv laufende Drags (gewinnen immer gegen neue mousedowns)
   */
  priority: number;
  /**
   * Welche Phasen dieser Interceptor sehen will.
   * Default (wenn weggelassen): `['down', 'move', 'up', 'leave']`.
   */
  phases?: InterceptorPhase[];
  /**
   * Optionaler Pane-Filter: Interceptor feuert nur, wenn `ev.paneId` matcht.
   * `null` oder weggelassen → alle Panes. Schützt im Splitscreen davor,
   * dass ein an Pane 0 registrierter Interceptor in Pane 1 feuert.
   */
  paneId?: string | null;
  /**
   * Verarbeitet eine Pointer-Phase.
   * @returns `true`, wenn das Event konsumiert wurde → Chain bricht hier ab
   *          und die interne InputManager-Logik wird übersprungen.
   */
  handle(phase: InterceptorPhase, ev: ZChartPointerEvent): boolean;
  /** Debug-Label, taucht in DevTools/Logs auf. Sollte eindeutig sein. */
  label: string;
}
