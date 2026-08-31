// zchart/core/applySettings.test.ts
// Version: 1.0.0 | Updated: 2026-05-15 | By: Agent
// P16.1: Tests für Render-Batching-Semantik von applySettings
//
// Design-Prinzip: jeder ZChartAPI.applySomethingSettings()-Aufruf triggert
// genau 1 render(). Das Fundament ist deepMerge():
//   - leerer partial → 0 effektive Änderung (conceptually 0 renders needed)
//   - mehrere Partials sequentiell gemergt = dasselbe wie ein kombinierter Merge
//   - nicht-mutierend → keine Seiteneffekte auf andere Settings-Felder

import { describe, it, expect } from 'vitest';
import { deepMerge, defaultVisualSettings } from './VisualSettings';
import type { VisualSettings, DeepPartial } from './VisualSettings';

// ─── Hilfsfunktion ──────────────────────────────────────────────────────────

/** Simuliert die ZChartTab-Logik: accumulated partial über mehrere Apply-Schritte */
function applyMultiple(
  base: VisualSettings,
  partials: DeepPartial<VisualSettings>[],
): VisualSettings {
  return partials.reduce((acc, p) => deepMerge(acc, p), base) as VisualSettings;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('applySettings — deepMerge Render-Batching-Semantik', () => {

  // ── Leerer Apply = keine Änderung ──────────────────────────────────────

  it('leerer partial lässt canvas unverändert', () => {
    const result = deepMerge(defaultVisualSettings, {});
    expect(result.canvas.background.color).toBe(defaultVisualSettings.canvas.background.color);
    expect(result.canvas.grid.mode).toBe(defaultVisualSettings.canvas.grid.mode);
    expect(result.canvas.crosshair.style).toBe(defaultVisualSettings.canvas.crosshair.style);
  });

  it('leerer partial lässt symbol unverändert', () => {
    const result = deepMerge(defaultVisualSettings, {});
    expect(result.symbol.candle.bodyUp).toBe(defaultVisualSettings.symbol.candle.bodyUp);
    expect(result.symbol.candle.bodyDown).toBe(defaultVisualSettings.symbol.candle.bodyDown);
    expect(result.symbol.candle.wickVisible).toBe(defaultVisualSettings.symbol.candle.wickVisible);
  });

  it('leerer partial enthält alle 7 Hauptsektionen + themeId + __v', () => {
    const result = deepMerge(defaultVisualSettings, {});
    const sections: (keyof VisualSettings)[] = [
      'canvas', 'symbol', 'statusLine', 'scales', 'trading', 'alerts', 'events',
    ];
    for (const section of sections) {
      expect(result).toHaveProperty(section);
    }
    expect(result).toHaveProperty('themeId');
    expect(result).toHaveProperty('__v');
  });

  // ── Non-Mutating ───────────────────────────────────────────────────────

  it('deepMerge mutiert das Base-Objekt NICHT (canvas)', () => {
    const base = deepMerge(defaultVisualSettings, {}); // frische Kopie
    const originalBg = base.canvas.background.color;

    deepMerge(base, { canvas: { background: { color: '#ff0000' } } });

    expect(base.canvas.background.color).toBe(originalBg);
  });

  it('deepMerge mutiert das Base-Objekt NICHT (symbol)', () => {
    const base = deepMerge(defaultVisualSettings, {});
    const originalUp = base.symbol.candle.bodyUp;

    deepMerge(base, { symbol: { candle: { bodyUp: '#abcdef' } } });

    expect(base.symbol.candle.bodyUp).toBe(originalUp);
  });

  // ── Cross-Field-Isolation ──────────────────────────────────────────────

  it('canvas-partial beeinflusst symbol-settings nicht', () => {
    const partial: DeepPartial<VisualSettings> = {
      canvas: { background: { color: '#1a1a2e' }, grid: { mode: 'horz' } },
    };
    const result = deepMerge(defaultVisualSettings, partial);

    expect(result.canvas.background.color).toBe('#1a1a2e');
    expect(result.canvas.grid.mode).toBe('horz');
    // symbol muss unberührt sein
    expect(result.symbol.candle.bodyUp).toBe(defaultVisualSettings.symbol.candle.bodyUp);
    expect(result.symbol.candle.bodyDown).toBe(defaultVisualSettings.symbol.candle.bodyDown);
    expect(result.symbol.volume.up).toBe(defaultVisualSettings.symbol.volume.up);
  });

  it('symbol-partial beeinflusst canvas-settings nicht', () => {
    const partial: DeepPartial<VisualSettings> = {
      symbol: { candle: { bodyUp: '#ff6b6b', bodyDown: '#51cf66' } },
    };
    const result = deepMerge(defaultVisualSettings, partial);

    expect(result.symbol.candle.bodyUp).toBe('#ff6b6b');
    expect(result.symbol.candle.bodyDown).toBe('#51cf66');
    // canvas muss unberührt sein
    expect(result.canvas.background.color).toBe(defaultVisualSettings.canvas.background.color);
    expect(result.canvas.grid.mode).toBe(defaultVisualSettings.canvas.grid.mode);
  });

  it('statusLine-partial beeinflusst scales nicht', () => {
    const partial: DeepPartial<VisualSettings> = {
      statusLine: { visible: false, logo: false },
    };
    const result = deepMerge(defaultVisualSettings, partial);

    expect(result.statusLine.visible).toBe(false);
    expect(result.statusLine.logo).toBe(false);
    // scales unberührt
    expect(result.scales.priceScale.placement).toBe(
      defaultVisualSettings.scales.priceScale.placement,
    );
    expect(result.scales.timeScale.dateFormat).toBe(
      defaultVisualSettings.scales.timeScale.dateFormat,
    );
  });

  // ── Nested Partial Preservation ────────────────────────────────────────

  it('nested partial bewahrt Geschwister-Felder im Candle-Objekt', () => {
    const partial: DeepPartial<VisualSettings> = {
      symbol: { candle: { bodyUp: '#00c9a7' } },
    };
    const result = deepMerge(defaultVisualSettings, partial);

    expect(result.symbol.candle.bodyUp).toBe('#00c9a7');
    // alle anderen Candle-Felder unverändert
    expect(result.symbol.candle.bodyDown).toBe(defaultVisualSettings.symbol.candle.bodyDown);
    expect(result.symbol.candle.bodyVisible).toBe(defaultVisualSettings.symbol.candle.bodyVisible);
    expect(result.symbol.candle.borderUp).toBe(defaultVisualSettings.symbol.candle.borderUp);
    expect(result.symbol.candle.wickVisible).toBe(defaultVisualSettings.symbol.candle.wickVisible);
    expect(result.symbol.candle.hollow).toBe(defaultVisualSettings.symbol.candle.hollow);
    // volume im symbol auch unberührt
    expect(result.symbol.volume.up).toBe(defaultVisualSettings.symbol.volume.up);
  });

  // ── Batching-Semantik ─────────────────────────────────────────────────
  //
  // "1× requestRender pro Apply" = sequentielle Einzel-Merges ergeben
  // dasselbe Endergebnis wie ein einziger kombinierter Merge.
  // Das entspricht dem Prinzip: 2 separate applySettings-Aufrufe könnten
  // zu einem einzigen zusammengefasst werden, ohne das Ergebnis zu ändern.

  it('zwei sequentielle Merges = ein kombinierter Merge (Assoziativität)', () => {
    const p1: DeepPartial<VisualSettings> = { canvas: { background: { color: '#16213e' } } };
    const p2: DeepPartial<VisualSettings> = { symbol: { candle: { bodyUp: '#e94560' } } };

    // Sequentiell (2 Apply-Aufrufe → 2 render)
    const sequential = applyMultiple(defaultVisualSettings, [p1, p2]);

    // Kombiniert (1 Apply-Aufruf → 1 render)
    const combined = deepMerge(defaultVisualSettings, deepMerge(p1, p2) as DeepPartial<VisualSettings>);

    expect(sequential.canvas.background.color).toBe(combined.canvas.background.color);
    expect(sequential.symbol.candle.bodyUp).toBe(combined.symbol.candle.bodyUp);
  });

  it('letzter Wert gewinnt bei mehrfachen canvas-Merges', () => {
    const result = applyMultiple(defaultVisualSettings, [
      { canvas: { background: { color: '#111' } } },
      { canvas: { background: { color: '#222' } } },
      { canvas: { background: { color: '#333' } } },
    ]);

    expect(result.canvas.background.color).toBe('#333');
    // Nicht betroffene Felder unverändert
    expect(result.canvas.grid.mode).toBe(defaultVisualSettings.canvas.grid.mode);
    expect(result.symbol.candle.bodyUp).toBe(defaultVisualSettings.symbol.candle.bodyUp);
  });

  it('drei unabhängige Partials aus verschiedenen Sektionen interferieren nicht', () => {
    const result = applyMultiple(defaultVisualSettings, [
      { canvas: { background: { color: '#0f3460' } } },
      { symbol: { candle: { bodyDown: '#c0392b' } } },
      { statusLine: { visible: false } },
    ]);

    expect(result.canvas.background.color).toBe('#0f3460');
    expect(result.symbol.candle.bodyDown).toBe('#c0392b');
    expect(result.statusLine.visible).toBe(false);
    // Nicht geänderte Felder unberührt
    expect(result.symbol.candle.bodyUp).toBe(defaultVisualSettings.symbol.candle.bodyUp);
    expect(result.canvas.grid.mode).toBe(defaultVisualSettings.canvas.grid.mode);
    expect(result.statusLine.logo).toBe(defaultVisualSettings.statusLine.logo);
  });

  // ── Full Round-Trip ───────────────────────────────────────────────────

  it('deepMerge(base, vollständige VisualSettings) = identical', () => {
    const full: VisualSettings = defaultVisualSettings;
    const result = deepMerge(defaultVisualSettings, full);
    expect(result.canvas.background.color).toBe(full.canvas.background.color);
    expect(result.symbol.candle.bodyUp).toBe(full.symbol.candle.bodyUp);
    expect(result.statusLine.visible).toBe(full.statusLine.visible);
    expect(result.scales.priceScale.scaleMode).toBe(full.scales.priceScale.scaleMode);
    expect(result.themeId).toBe(full.themeId);
    expect(result.__v).toBe(full.__v);
  });

  // ── ThemeId Propagation ───────────────────────────────────────────────

  it('themeId im partial wird korrekt übernommen', () => {
    const result = deepMerge(defaultVisualSettings, { themeId: 'darkPro' });
    expect(result.themeId).toBe('darkPro');
  });

  it('themeId-Überschreibung ersetzt vorherigen Wert', () => {
    const withFirst = deepMerge(defaultVisualSettings, { themeId: 'lightPro' });
    expect(withFirst.themeId).toBe('lightPro');

    const withSecond = deepMerge(withFirst, { themeId: 'tvDefault' });
    expect(withSecond.themeId).toBe('tvDefault');
    // canvas unberührt
    expect(withSecond.canvas.background.color).toBe(defaultVisualSettings.canvas.background.color);
  });

  it('themeId wird nach canvas-Merge nicht verloren', () => {
    const base = deepMerge(defaultVisualSettings, { themeId: 'solarized' });
    const result = deepMerge(base, { canvas: { background: { color: '#002b36' } } });
    expect(result.themeId).toBe('solarized');
    expect(result.canvas.background.color).toBe('#002b36');
  });
});
