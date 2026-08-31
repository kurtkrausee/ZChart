// Version: 1.0.0 | Updated: 2026-06-07 | By: Agent
//
// Unit-Tests für die Pointer-Interceptor-Chain im InputManager (Roadmap R2-P8).
// Kein DOM: die Chain-Methoden (register/unregister/dispatchToInterceptors)
// hängen nur an `this.interceptors` + `this.activeDragOwner`, nicht an canvas/
// manager. Wir instanziieren daher via Object.create() OHNE Konstruktor und
// initialisieren nur die beiden Chain-Felder — so testen wir die echte Logik
// ohne den DOM-/Manager-Apparat zu mocken.

import { describe, it, expect, beforeEach } from 'vitest';
import { InputManager } from '../InputManager';
import type { InterceptorPhase, PointerInterceptor, ZChartPointerEvent } from '../PointerInterceptor';

// ── Test-Harness ──────────────────────────────────────────────────────────

/** Baut eine InputManager-Instanz ohne Konstruktor (kein DOM). */
function makeChain(): InputManager {
  const im = Object.create(InputManager.prototype) as InputManager;
  // private Felder initialisieren (TS-Cast, da privat)
  (im as unknown as { interceptors: PointerInterceptor[] }).interceptors = [];
  (im as unknown as { activeDragOwner: PointerInterceptor | null }).activeDragOwner = null;
  return im;
}

/** Minimaler ZChartPointerEvent für Tests (paneId steuerbar). */
function makeEvent(paneId: string | null = 'main'): ZChartPointerEvent {
  return {
    x: 0, y: 0, clientX: 0, clientY: 0,
    button: 0, buttons: 1,
    shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
    pointerId: 1, pointerType: 'mouse',
    paneId, index: 0, price: 100, time: null,
    preventDefault: () => {},
    stopPropagation: () => {},
  };
}

/** Interceptor-Builder, der konsumiert und jeden handle-Aufruf protokolliert. */
function makeInterceptor(
  label: string,
  priority: number,
  opts: {
    consume?: boolean | ((phase: InterceptorPhase) => boolean);
    phases?: InterceptorPhase[];
    paneId?: string | null;
    log?: string[];
  } = {},
): PointerInterceptor {
  const { consume = true, phases, paneId, log } = opts;
  return {
    label,
    priority,
    phases,
    paneId,
    handle: (phase) => {
      log?.push(`${label}:${phase}`);
      return typeof consume === 'function' ? consume(phase) : consume;
    },
  };
}

// dispatchToInterceptors ist public — direkt aufrufbar.
function dispatch(im: InputManager, phase: InterceptorPhase, ev: ZChartPointerEvent): boolean {
  return (im as unknown as {
    dispatchToInterceptors(p: InterceptorPhase, e: ZChartPointerEvent): boolean;
  }).dispatchToInterceptors(phase, ev);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('PointerInterceptorChain', () => {
  let im: InputManager;
  let log: string[];

  beforeEach(() => {
    im = makeChain();
    log = [];
  });

  it('1. fragt höher-priorisierte Interceptoren zuerst', () => {
    im.registerPointerInterceptor(makeInterceptor('low', 10, { consume: false, log }));
    im.registerPointerInterceptor(makeInterceptor('high', 100, { consume: false, log }));
    dispatch(im, 'down', makeEvent());
    // high (100) vor low (10), beide consume:false → beide gefragt, Reihenfolge zählt
    expect(log).toEqual(['high:down', 'low:down']);
  });

  it('2. konsumierender Interceptor stoppt die Chain (lower-prio wird übersprungen)', () => {
    im.registerPointerInterceptor(makeInterceptor('low', 10, { consume: true, log }));
    im.registerPointerInterceptor(makeInterceptor('high', 100, { consume: true, log }));
    const consumed = dispatch(im, 'down', makeEvent());
    expect(consumed).toBe(true);
    // high konsumiert → low nie gefragt
    expect(log).toEqual(['high:down']);
  });

  it('3. paneId-Filter: Interceptor feuert nicht für fremde Pane', () => {
    im.registerPointerInterceptor(makeInterceptor('pane1-only', 100, { consume: true, paneId: 'pane-1', log }));
    const consumed = dispatch(im, 'down', makeEvent('main')); // ev.paneId='main' ≠ 'pane-1'
    expect(consumed).toBe(false);
    expect(log).toEqual([]); // handle nie aufgerufen
  });

  it('3b. paneId-Filter: Interceptor feuert bei passender Pane', () => {
    im.registerPointerInterceptor(makeInterceptor('main-only', 100, { consume: true, paneId: 'main', log }));
    const consumed = dispatch(im, 'down', makeEvent('main'));
    expect(consumed).toBe(true);
    expect(log).toEqual(['main-only:down']);
  });

  it('4. aktiver Drag-Owner gewinnt move/up auch gegen neu-registrierten höher-prio Interceptor', () => {
    const owner = makeInterceptor('owner', 50, { consume: (p) => p !== 'up' ? true : true, log });
    im.registerPointerInterceptor(owner);
    // owner konsumiert down → wird activeDragOwner
    expect(dispatch(im, 'down', makeEvent())).toBe(true);

    // Jetzt ein höher-priorisierter Interceptor dazu
    im.registerPointerInterceptor(makeInterceptor('intruder', 999, { consume: true, log }));
    log.length = 0;

    // move: NUR owner darf feuern (intruder hat höhere prio, wird aber übersprungen)
    expect(dispatch(im, 'move', makeEvent())).toBe(true);
    expect(log).toEqual(['owner:move']);

    // up: owner konsumiert → Lock löst sich
    log.length = 0;
    expect(dispatch(im, 'up', makeEvent())).toBe(true);
    expect(log).toEqual(['owner:up']);

    // nach up: Lock weg → intruder (höhere prio) bekommt nächstes down
    log.length = 0;
    expect(dispatch(im, 'down', makeEvent())).toBe(true);
    expect(log[0]).toBe('intruder:down');
  });

  it('5. dispose-Funktion entfernt den Interceptor aus der Liste', () => {
    const dispose = im.registerPointerInterceptor(makeInterceptor('temp', 100, { consume: true, log }));
    expect(im.getRegisteredInterceptors().map(i => i.label)).toContain('temp');
    dispose();
    expect(im.getRegisteredInterceptors().map(i => i.label)).not.toContain('temp');
    // nach dispose feuert er nicht mehr
    expect(dispatch(im, 'down', makeEvent())).toBe(false);
    expect(log).toEqual([]);
  });

  it('5b. unregisterPointerInterceptor entfernt per Label', () => {
    im.registerPointerInterceptor(makeInterceptor('a', 10, { consume: false, log }));
    im.registerPointerInterceptor(makeInterceptor('b', 20, { consume: false, log }));
    im.unregisterPointerInterceptor('a');
    expect(im.getRegisteredInterceptors().map(i => i.label)).toEqual(['b']);
  });

  it('6. phases-Filter: Interceptor ohne "move" wird bei move nicht gefragt', () => {
    im.registerPointerInterceptor(makeInterceptor('down-only', 100, { consume: true, phases: ['down'], log }));
    expect(dispatch(im, 'move', makeEvent())).toBe(false);
    expect(log).toEqual([]);
  });

  it('7. doppeltes Label ersetzt den bestehenden Interceptor (kein Duplikat)', () => {
    im.registerPointerInterceptor(makeInterceptor('dup', 10, { consume: false, log }));
    im.registerPointerInterceptor(makeInterceptor('dup', 20, { consume: false, log }));
    const list = im.getRegisteredInterceptors().filter(i => i.label === 'dup');
    expect(list).toHaveLength(1);
    expect(list[0].priority).toBe(20); // der neue
  });
});
