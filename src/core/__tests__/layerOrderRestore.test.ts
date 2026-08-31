// zchart/core/__tests__/layerOrderRestore.test.ts
// Version: 1.0.0 | Updated: 2026-08-13 | By: Agent
// ZIP-P5-Fix10: Sichert die Einsortier-Logik für Layer ab, die NACH dem Restore
// auftauchen (Indikator-Nodes mounten asynchron nach den Drawings). Vorher
// landeten sie immer hinten — dadurch rutschte der Kurschart (`series`) nach
// dem Reload unter die Indikatoren, obwohl der User ihn nach vorne gezogen
// hatte. Die Logik ist hier 1:1 nachgebildet (insertByDesired aus
// ChartManager.drawMainPaneUnified), damit sie ohne Canvas testbar bleibt.

import { describe, it, expect } from "vitest";

/** Spiegelt ChartManager.drawMainPaneUnified: Self-Healing + insertByDesired. */
function heal(current: string[], existing: string[], desired: string[] | null): string[] {
  const out = current.filter(id => existing.includes(id));
  const insert = (id: string) => {
    const wantIdx = desired ? desired.indexOf(id) : -1;
    if (wantIdx === -1) { out.push(id); return; }
    let insertAt = out.length;
    for (let i = 0; i < out.length; i++) {
      const otherIdx = desired!.indexOf(out[i]);
      if (otherIdx !== -1 && otherIdx > wantIdx) { insertAt = i; break; }
    }
    out.splice(insertAt, 0, id);
  };
  for (const id of existing) if (!out.includes(id)) insert(id);
  return out;
}

describe("Layer-Order Self-Healing mit Wunsch-Reihenfolge", () => {
  it("setzt einen spaeter gemounteten Indikator an seine gespeicherte Position", () => {
    // User-Wunsch: beide Indikatoren HINTER dem Chart (series zuletzt = vorne).
    const desired = ["indicator-bbands", "indicator-dema", "series"];
    // Beim Restore existiert nur series; die Indikatoren mounten spaeter.
    let order = heal([], ["series"], desired);
    expect(order).toEqual(["series"]);
    // Jetzt kommen die Indikatoren dazu.
    order = heal(order, ["series", "indicator-bbands", "indicator-dema"], desired);
    expect(order).toEqual(["indicator-bbands", "indicator-dema", "series"]);
  });

  it("haelt den Chart zwischen zwei Indikatoren (User-Szenario)", () => {
    const desired = ["indicator-bbands", "series", "indicator-dema"];
    let order = heal([], ["series"], desired);
    order = heal(order, ["series", "indicator-dema"], desired);
    order = heal(order, ["series", "indicator-dema", "indicator-bbands"], desired);
    expect(order).toEqual(["indicator-bbands", "series", "indicator-dema"]);
  });

  it("haengt unbekannte Layer weiterhin hinten an", () => {
    const desired = ["series"];
    const order = heal(["series"], ["series", "emoji-1"], desired);
    expect(order).toEqual(["series", "emoji-1"]);
  });

  it("entfernt verschwundene Layer (Self-Healing bleibt erhalten)", () => {
    const desired = ["series", "indicator-dema"];
    const order = heal(["series", "indicator-dema"], ["series"], desired);
    expect(order).toEqual(["series"]);
  });

  it("ohne Wunsch-Reihenfolge landet Neues hinten (Alt-Verhalten)", () => {
    const order = heal(["series"], ["series", "indicator-dema"], null);
    expect(order).toEqual(["series", "indicator-dema"]);
  });

  it("ist stabil, wenn alles bereits in Wunsch-Reihenfolge vorliegt", () => {
    const desired = ["indicator-bbands", "series"];
    const order = heal(["indicator-bbands", "series"], ["indicator-bbands", "series"], desired);
    expect(order).toEqual(["indicator-bbands", "series"]);
  });
});
