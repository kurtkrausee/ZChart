// Version: 1.1.0 | Updated: 2026-07-29 | By: Agent

/** Unit tests für Tool Registry — Smoke (Stub seit R1 war leer und ließ die
 *  Suite mit "No test suite found" fehlschlagen; ZT-P1 füllt ihn minimal). */

import { describe, it, expect } from 'vitest';
import { dispatchClick, isToolRegistered, getToolConfig } from '../tools';
import type { InputManager, LogicalCoordinates } from '../InputManager';

const logical: LogicalCoordinates = {
  x: 0, y: 0, paneId: 'main', time: null, index: 0, price: 100,
};

describe('Tool Registry', () => {
  it('kennt registrierte Standard-Tools (Side-Effect-Imports via ./tools)', () => {
    expect(isToolRegistered('draw_trendline')).toBe(true);
    expect(getToolConfig('draw_trendline')?.steps).toBeGreaterThan(0);
  });

  it('unbekannter Modus: isToolRegistered false, dispatchClick false', () => {
    expect(isToolRegistered('draw_gibt_es_nicht')).toBe(false);
    const im = {} as InputManager; // wird vor dem Registry-Lookup nicht angefasst
    expect(dispatchClick('draw_gibt_es_nicht', logical, {} as PointerEvent, im)).toBe(false);
  });

  // Regression ZT-P6 (iPad-Abnahme): Brush war als steps:1 registriert — der
  // steps===1-Pfad finalisierte direkt nach Step 0 und resettete
  // drawStep/activeDrawingNode → Strich sammelte nie Punkte (Desktop + Touch).
  it('draw_brush: Step 0 parkt Multi-Point-State (kein sofortiger Reset)', () => {
    const shapes: unknown[] = [];
    const im = {
      mode: 'draw_brush',
      drawStep: 0,
      activeDrawingNode: null,
      keepDrawing: false,
      defaultLineColor: '#fff', defaultLineWidth: 2,
      brushColor: '#FFD700', brushWidth: 3,
      highlighterColor: '#FFFF00', highlighterWidth: 20,
      applyMagnet: (_i: number, p: number) => p,
      manager: { drawingManager: { shapes, addDrawing: (n: unknown) => { shapes.push(n); } } },
    } as unknown as InputManager;

    expect(dispatchClick('draw_brush', logical, {} as PointerEvent, im)).toBe(true);
    expect(im.drawStep).toBe(1);            // Multi-Point-Modus bleibt geparkt
    expect(im.activeDrawingNode).not.toBe(null); // Node bleibt aktiv für Move-Sammlung
    expect(shapes.length).toBe(1);          // genau einmal im DrawingManager
  });
});
