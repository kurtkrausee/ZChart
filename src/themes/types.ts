// src/themes/types.ts
// Version: 2.0.0 | Updated: 2026-05-05 | By: Agent
// P2: Theme-Registry Types — ThemeDescriptor Interface

import type { DeepPartial } from '../core/VisualSettings';
import type { VisualSettings } from '../core/VisualSettings';

/** Preview swatch colors for theme picker */
export interface ThemePreview {
  background: string;
  text: string;
  candleUp: string;
  candleDown: string;
}

/** A theme descriptor registered via registerTheme() */
export interface ThemeDescriptor {
  /** Unique registry key (e.g. 'darkPro') */
  id: string;
  /** Human-readable label shown in the theme picker */
  label: string;
  /** Category for filtering in the theme picker */
  category: 'dark' | 'light' | 'accent' | 'custom';
  /** Mini-preview swatch colors */
  preview: ThemePreview;
  /** Partial VisualSettings that define this theme */
  settings: DeepPartial<VisualSettings>;
}
