// src/zchart/api/controllers/TemplatesController.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// P1: localStorage-Template-Logik aus ZChartAPI.ts extrahiert (ehemals Z.271–390).
import { defaultVisualSettings, deepMerge, isVisualSettings, type VisualSettings } from '../../core/VisualSettings';
import type { ZChartSettingsTemplate } from '../types';

const STORAGE_KEY = 'zchart.templates';

export class TemplatesController {

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private readFromStorage(): ZChartSettingsTemplate[] {
        if (typeof window === 'undefined') return [];
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            const templates: ZChartSettingsTemplate[] = [];
            for (const item of parsed) {
                if (!item || typeof item !== 'object') continue;
                const name = typeof (item as { name?: unknown }).name === 'string'
                    ? (item as { name: string }).name.trim()
                    : '';
                if (!name) continue;
                const rawSettings = (item as { settings?: unknown }).settings;
                const settings = this.normalizeSettings(rawSettings);
                if (!settings) continue;
                templates.push({ name, settings });
            }
            return templates;
        } catch {
            return [];
        }
    }

    private writeToStorage(templates: ZChartSettingsTemplate[]): void {
        if (typeof window === 'undefined') return;
        const payload = templates.map(t => ({
            name: t.name,
            settings: structuredClone(t.settings),
        }));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    private normalizeSettings(raw: unknown): VisualSettings | null {
        if (isVisualSettings(raw) || (raw && typeof raw === 'object')) {
            const merged = deepMerge(defaultVisualSettings, raw as Partial<VisualSettings>);
            // Migration: old templates had no solidColor field.
            const rawBg = (raw as { canvas?: { background?: { solidColor?: unknown; color?: string; colorTo?: string } } })
                ?.canvas?.background;
            if (rawBg && rawBg.solidColor === undefined) {
                if (rawBg.colorTo && rawBg.colorTo !== rawBg.color) {
                    merged.canvas.background.mode = 'gradient';
                } else {
                    merged.canvas.background.solidColor = rawBg.color ?? merged.canvas.background.color;
                }
            }
            return merged;
        }
        return null;
    }

    // -----------------------------------------------------------------------
    // Public API (delegated from ZChartAPI facade)
    // -----------------------------------------------------------------------

    public list(): ZChartSettingsTemplate[] {
        return this.readFromStorage();
    }

    public save(name: string, settings: VisualSettings): void {
        const normalizedName = name.trim();
        if (!normalizedName) return;

        const templates = this.readFromStorage();
        const next: ZChartSettingsTemplate = { name: normalizedName, settings: structuredClone(settings) };
        const idx = templates.findIndex(t => t.name.toLowerCase() === normalizedName.toLowerCase());
        if (idx >= 0) {
            templates[idx] = next;
        } else {
            templates.push(next);
        }
        this.writeToStorage(templates);
    }

    public load(name: string): VisualSettings | null {
        const key = name.trim().toLowerCase();
        if (!key) return null;
        const match = this.readFromStorage().find(t => t.name.toLowerCase() === key);
        return match ? structuredClone(match.settings) : null;
    }

    public delete(name: string): void {
        const key = name.trim().toLowerCase();
        if (!key) return;
        this.writeToStorage(this.readFromStorage().filter(t => t.name.toLowerCase() !== key));
    }

    public rename(oldName: string, newName: string): void {
        const oldKey = oldName.trim().toLowerCase();
        const nextName = newName.trim();
        if (!oldKey || !nextName) return;

        const templates = this.readFromStorage();
        const idx = templates.findIndex(t => t.name.toLowerCase() === oldKey);
        if (idx < 0) return;

        const nextKey = nextName.toLowerCase();
        const renamedSettings = structuredClone(templates[idx].settings);
        const deduped = templates.filter((t, i) => i !== idx && t.name.toLowerCase() !== nextKey);
        deduped.push({ name: nextName, settings: renamedSettings });
        this.writeToStorage(deduped);
    }
}
