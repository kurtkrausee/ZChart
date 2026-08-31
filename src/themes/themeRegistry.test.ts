// zchart/themes/themeRegistry.test.ts
// Version: 1.0.0 | Updated: 2026-05-15 | By: Agent
// P16.2: Tests — alle Built-in-Themes haben die erforderlichen Descriptor-Slots

import { describe, it, expect, beforeAll } from 'vitest';

// Import themes/index.ts triggert die automatische Registrierung der Core-Presets (dark/light)
import './index';

import {
  listThemes,
  getTheme,
  hasTheme,
  resolveTheme,
  getDefaultThemeId,
} from './registry';
import type { ThemeDescriptor } from './types';

// ─── Konstanten ──────────────────────────────────────────────────────────────

const BUILT_IN_IDS = ['darkPro', 'lightPro'] as const;
const VALID_CATEGORIES = new Set(['dark', 'light', 'accent', 'custom']);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('themeRegistry — Built-in Themes', () => {

  let themes: ThemeDescriptor[];

  beforeAll(() => {
    themes = listThemes();
  });

  // ── Vollständigkeit ────────────────────────────────────────────────────

  it('listThemes() gibt mindestens 2 Themes zurück', () => {
    expect(themes.length).toBeGreaterThanOrEqual(2);
  });

  it('alle Built-in-IDs sind registriert', () => {
    for (const id of BUILT_IN_IDS) {
      expect(hasTheme(id)).toBe(true);
    }
  });

  it('getDefaultThemeId() gibt einen registrierten Theme zurück', () => {
    const defaultId = getDefaultThemeId();
    expect(hasTheme(defaultId)).toBe(true);
  });

  // ── Pflichtfelder auf allen Themes ────────────────────────────────────

  it('alle Themes haben eine nicht-leere id (string)', () => {
    for (const t of themes) {
      expect(typeof t.id).toBe('string');
      expect(t.id.trim().length).toBeGreaterThan(0);
    }
  });

  it('alle Themes haben ein nicht-leeres label (string)', () => {
    for (const t of themes) {
      expect(typeof t.label).toBe('string');
      expect(t.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('alle Themes haben eine gültige category (dark|light|accent|custom)', () => {
    for (const t of themes) {
      expect(VALID_CATEGORIES.has(t.category)).toBe(true);
    }
  });

  it('alle Themes haben ein preview-Objekt', () => {
    for (const t of themes) {
      expect(t.preview).toBeDefined();
      expect(typeof t.preview).toBe('object');
    }
  });

  it('alle Themes haben preview.background (nicht-leerer string)', () => {
    for (const t of themes) {
      expect(typeof t.preview.background).toBe('string');
      expect(t.preview.background.trim().length).toBeGreaterThan(0);
    }
  });

  it('alle Themes haben preview.text (nicht-leerer string)', () => {
    for (const t of themes) {
      expect(typeof t.preview.text).toBe('string');
      expect(t.preview.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('alle Themes haben preview.candleUp (nicht-leerer string)', () => {
    for (const t of themes) {
      expect(typeof t.preview.candleUp).toBe('string');
      expect(t.preview.candleUp.trim().length).toBeGreaterThan(0);
    }
  });

  it('alle Themes haben preview.candleDown (nicht-leerer string)', () => {
    for (const t of themes) {
      expect(typeof t.preview.candleDown).toBe('string');
      expect(t.preview.candleDown.trim().length).toBeGreaterThan(0);
    }
  });

  it('alle Themes haben ein settings-Objekt (nicht null/undefined)', () => {
    for (const t of themes) {
      expect(t.settings).toBeDefined();
      expect(typeof t.settings).toBe('object');
      expect(t.settings).not.toBeNull();
    }
  });

  it('alle Theme-IDs sind eindeutig (keine Duplikate)', () => {
    const ids = themes.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  // ── Individuelle Built-in-Themes ──────────────────────────────────────

  it('getTheme("darkPro") gibt Theme mit id="darkPro" zurück', () => {
    const t = getTheme('darkPro');
    expect(t).toBeDefined();
    expect(t!.id).toBe('darkPro');
  });

  it('darkPro ist category="dark"', () => {
    expect(getTheme('darkPro')!.category).toBe('dark');
  });

  it('lightPro ist category="light"', () => {
    expect(getTheme('lightPro')!.category).toBe('light');
  });




  // ── getTheme / hasTheme ───────────────────────────────────────────────

  it('hasTheme() für nicht-existentes Theme gibt false zurück', () => {
    expect(hasTheme('doesNotExist_xyz_abc')).toBe(false);
  });

  it('hasTheme() für existentes Theme gibt true zurück', () => {
    expect(hasTheme('darkPro')).toBe(true);
  });

  it('getTheme() für nicht-existentes Theme gibt undefined zurück', () => {
    expect(getTheme('doesNotExist_xyz_abc')).toBeUndefined();
  });

  // ── resolveTheme — Fallback-Kette ─────────────────────────────────────

  it('resolveTheme("darkPro") gibt das darkPro-Theme zurück', () => {
    const t = resolveTheme('darkPro');
    expect(t.id).toBe('darkPro');
  });

  it('resolveTheme("nonexistent") fällt auf darkPro zurück', () => {
    const t = resolveTheme('nonexistent_xyz_9999');
    // Fallback-Kette: tvDefault existiert → wird zurückgegeben
    expect(t.id).toBe('darkPro');
  });

  it('resolveTheme() wirft niemals eine Exception', () => {
    expect(() => resolveTheme('whatever_unknown')).not.toThrow();
    expect(() => resolveTheme('')).not.toThrow();
  });

  it('resolveTheme() gibt immer ein vollständiges ThemeDescriptor-Objekt zurück', () => {
    const t = resolveTheme('some_unknown_id');
    expect(t).toBeDefined();
    expect(typeof t.id).toBe('string');
    expect(typeof t.label).toBe('string');
    expect(typeof t.settings).toBe('object');
  });

  // ── listThemes() nach Category ────────────────────────────────────────

  it('listThemes("dark") gibt nur dark-Themes zurück', () => {
    const darkThemes = listThemes('dark');
    expect(darkThemes.length).toBeGreaterThan(0);
    for (const t of darkThemes) {
      expect(t.category).toBe('dark');
    }
  });

  it('listThemes("light") gibt nur light-Themes zurück', () => {
    const lightThemes = listThemes('light');
    expect(lightThemes.length).toBeGreaterThan(0);
    for (const t of lightThemes) {
      expect(t.category).toBe('light');
    }
  });

  it('listThemes("nonexistent_category") gibt leeres Array zurück', () => {
    const result = listThemes('definitely_not_a_category_12345');
    expect(result).toEqual([]);
  });
});
