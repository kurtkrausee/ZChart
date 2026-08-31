// input/handlers/axisHitTest.ts
// Version: 1.0.0 | Updated: 2026-08-13 | By: Agent
// ZV10-P7c: Y-Achsen-Hit-Testing pro Spalte (Multi-Y-Achse). Eine Funktion für
// alle Eingabepfade (Pointer-Drag, Wheel, Touch mit Coarse-Bonus) — die
// Spaltengeometrie kommt aus ChartManager.getAxisColumns() (axisLayout.ts).

import type { AxisColumn } from '../../core/axisLayout';
import { Pane } from '../../core/Pane';

/**
 * Liefert die scaleId der Achsen-Spalte unter x — 'right' für die äußere
 * Default-Spalte, sonst die Zusatz-Spalten-ID; null wenn x im Chart-Content
 * liegt. `coarseBonusPx` vergrößert die Griffzone an der Content-Kante nach
 * links (Touch ≈ +12px, Muster ZT-P3).
 *
 * V1 (Design §6): nur rechte Spalten — die Left-Achse hatte auch bisher keine
 * Griffzone (Bestand).
 */
export function findAxisScaleAt(
  x: number,
  width: number,
  axisWidth: number,
  columns: AxisColumn[],
  coarseBonusPx: number = 0
): string | null {
  // Content-Kante = linke Kante der innersten Spalte (Default, wenn keine Zusätze).
  const contentEdge = columns.length > 0
    ? Math.min(...columns.map((c) => c.x))
    : width - axisWidth;

  if (x <= contentEdge - coarseBonusPx) return null;

  // Äußere Default-Spalte
  if (x > width - axisWidth) return Pane.DEFAULT_SCALE_ID;

  // Zusatz-Spalten (exakter Treffer)
  for (const col of columns) {
    if (x > col.x && x <= col.x + col.width) return col.scaleId;
  }

  // Coarse-Zone links der innersten Spalte → innerste Spalte
  // (columns sind von außen nach innen sortiert, innerste = letzte).
  return columns.length > 0 ? columns[columns.length - 1].scaleId : Pane.DEFAULT_SCALE_ID;
}
