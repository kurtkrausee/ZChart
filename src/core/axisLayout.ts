// core/axisLayout.ts
// Version: 1.0.0 | Updated: 2026-08-13 | By: Agent
// ZV10-P7b: Achsen-Spalten-Layout — eine Quelle für Rendering (YAxisNode),
// Crosshair-Labels und (P7c) Input-Hit-Testing. Rein & testbar.
//
// V1-Vereinfachung (siehe multi-y-axis-design.md §5.1): Zusatz-Scales stapeln
// IMMER rechts, von außen (Default-Spalte) nach innen. Links-Stapelung und
// dynamische Breiten sind bewusst vertagt. Die Default-Scale behält ihre
// left/right/both/hidden-Logik im YAxisNode (Bestand).

import { Pane } from './Pane';

/** Eine Zusatz-Achsen-Spalte rechts (Default-Spalte ist NICHT enthalten). */
export interface AxisColumn {
  scaleId: string;
  /** Linke Kante der Spalte in Canvas-Pixeln. */
  x: number;
  width: number;
}

/**
 * Sammelt die IDs aller Zusatz-Scales (≠ Default) über die sichtbaren Panes —
 * Einfüge-Reihenfolge, Duplikate dedupliziert, `hideAxis`-Scales ohne Spalte.
 */
export function collectExtraScaleIds(panes: Pane[]): string[] {
  const ids: string[] = [];
  for (const pane of panes) {
    if (pane.heightWeight <= 0) continue;
    for (const [id, scale] of pane.priceScales) {
      if (id === Pane.DEFAULT_SCALE_ID) continue;
      if (scale.hideAxis) continue;
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/**
 * Berechnet die Zusatz-Spalten und die Content-Breite.
 * Default-Spalte sitzt außen (x = width − axisWidth, wie Bestand);
 * Zusatz-Spalten stapeln nach innen: erste Zusatz-Scale direkt daneben.
 * contentWidth = width − (1 + n) × axisWidth.
 */
export function computeAxisColumns(
  extraScaleIds: string[],
  width: number,
  axisWidth: number
): { columns: AxisColumn[]; contentWidth: number } {
  const columns: AxisColumn[] = extraScaleIds.map((scaleId, i) => ({
    scaleId,
    x: width - axisWidth * (i + 2),
    width: axisWidth,
  }));
  return {
    columns,
    contentWidth: width - axisWidth * (1 + extraScaleIds.length),
  };
}
