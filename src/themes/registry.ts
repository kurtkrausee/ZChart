// src/themes/registry.ts
// Version: 2.0.0 | Updated: 2026-05-05 | By: Agent
// P2: Theme-Registry — Self-registering theme store

import type { ThemeDescriptor } from './types';
import type { DeepPartial, VisualSettings } from '../core/VisualSettings';

const REGISTRY = new Map<string, ThemeDescriptor>();

/**
 * Register a theme. Call once at module load time from a preset file.
 * Themes auto-discover via this registry.
 */
export function registerTheme(t: ThemeDescriptor): void {
  REGISTRY.set(t.id, t);
}

/**
 * Get a theme by its id. Returns undefined if not found.
 * Callers should fallback to 'darkPro' if undefined.
 */
export function getTheme(id: string): ThemeDescriptor | undefined {
  return REGISTRY.get(id);
}

/**
 * List all registered themes. Optionally filter by category.
 */
export function listThemes(category?: string): ThemeDescriptor[] {
  const all = Array.from(REGISTRY.values());
  if (!category) return all;
  return all.filter(t => t.category === category);
}

/**
 * Get the default theme id. Used when no theme is set.
 */
export function getDefaultThemeId(): string {
  return 'darkPro';
}

/**
 * Check if a theme exists in the registry.
 */
export function hasTheme(id: string): boolean {
  return REGISTRY.has(id);
}

/**
 * Resolve a theme id to a descriptor, with fallback chain:
 * exact match → 'darkPro' → first registered theme
 */
export function resolveTheme(id: string): ThemeDescriptor {
  const exact = REGISTRY.get(id);
  if (exact) return exact;
  const fallback = REGISTRY.get('darkPro');
  if (fallback) return fallback;
  const first = REGISTRY.values().next().value;
  return first!;
}

/**
 * Apply a theme's settings to a base VisualSettings object.
 * Returns a new DeepPartial<VisualSettings> ready for deepMerge.
 */
export function applyThemeSettings(
  _base: VisualSettings,
  themeId: string
): DeepPartial<VisualSettings> {
  const theme = resolveTheme(themeId);
  if (!theme) return {};
  return theme.settings;
}

// Re-export types for convenience
export type { ThemeDescriptor, ThemePreview } from './types';
