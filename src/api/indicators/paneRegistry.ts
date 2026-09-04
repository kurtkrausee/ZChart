// src/api/indicators/paneRegistry.ts
// Version: 1.1.0 | Updated: 2026-08-11 | By: Agent
// 1.1.0 (ZV10-P2): PaneIndicatorDef.fixedRange + tickProvider — Indikatoren
//   deklarieren Y-Range/Ticks selbst (ersetzt paneId-Switch der AutoScaleEngine).
// P3 (ZChartAPI-Refactor): Pane-Indicator-Registry — der eine generische Ablauf,
// der alle add*Pane/remove*Pane-Methodenrümpfe der Fassade ersetzt.
//
// Ein Indikator ist nur noch eine Config (PaneIndicatorDef); der Lebenszyklus
// (existierende Pane entfernen → calculate → Pane bauen → Nodes einhängen →
// registrieren bzw. Sichtbarkeit togglen) lebt exakt einmal hier.
//
// WICHTIG (Verhaltens-Kontrakt, identisch zu den alten Methoden):
// - add: existiert die Pane (auch unsichtbar mit heightWeight 0) → removePane + Neuaufbau.
// - remove: löscht NICHT, sondern togglePaneVisibility (Pane bleibt mit Gewicht 0 bestehen).
// - SceneNode-Default-zIndex ist 0 — Defs setzen zIndex explizit via withZ/levelLine,
//   damit das Verhalten der alten Methoden 1:1 erhalten bleibt.
import { Pane } from '../../core/Pane';
import { StaticLineNode } from '../../nodes/core/StaticLineNode';
import type { ChartManager } from '../../core/ChartManager';
import type { DataStore } from '../../data/DataStore';
import type { SceneNode } from '../../nodes/core/SceneNode';
import { devWarn, type IndicatorLineStyleOptions } from '../types';

/** Freie Parameter eines Pane-Indikators (kPeriod, smoothK, source, …). */
export type PaneParams = Record<string, number | string | boolean | number[] | undefined>;

export interface PaneIndicatorDef {
    /** Optionale DataStore-Vorberechnung (z.B. ds.calculateATR(period)). */
    calculate?: (ds: DataStore, params: PaneParams) => void;
    /**
     * Nodes in Einfüge-Reihenfolge. zIndex explizit setzen (withZ/levelLine) —
     * die Registry verändert zIndex nicht.
     */
    buildNodes: (ds: DataStore, params: PaneParams, style: IndicatorLineStyleOptions) => SceneNode[];
    /** Pane-Höhengewicht, Default 0.2 (wie alle bisherigen Indikator-Panes). */
    paneWeight?: number;
    /**
     * ZV10-P2: Feste Y-Range der Pane (z.B. Oszillator -5..105). Gesetzt →
     * AutoScaleEngine setzt exakt diese Range statt eines Daten-Fits.
     */
    fixedRange?: { min: number; max: number };
    /**
     * ZV10-P2: Feste Tick-Werte der Y-Achse (echte Preise, z.B. [0,20,50,80,100]).
     * Gesetzt → TickEngine rendert exakt diese Werte statt Nice-Ticks.
     */
    ticks?: number[];
}

const registry = new Map<string, PaneIndicatorDef>();

export function registerPaneIndicator(id: string, def: PaneIndicatorDef): void {
    if (registry.has(id)) {
        devWarn('PaneRegistry', `duplicate registration for '${id}' — overwriting`);
    }
    registry.set(id, def);
}

export function getPaneIndicator(id: string): PaneIndicatorDef | undefined {
    return registry.get(id);
}

export function listPaneIndicatorIds(): string[] {
    return [...registry.keys()];
}

// ---------------------------------------------------------------------------
// Def-Helpers — halten buildNodes-Configs kompakt
// ---------------------------------------------------------------------------

/** Setzt zIndex und gibt die Node zurück. */
export function withZ<T extends SceneNode>(node: T, z: number): T {
    node.zIndex = z;
    return node;
}

/**
 * Horizontale Level-Linie (OB/OS, Nulllinie, …).
 * z-Default 0 = SceneNode-Default — alte Methoden setzten teils explizit 1, teils nichts.
 */
export function levelLine(value: number, color: string, z = 0): StaticLineNode {
    return withZ(new StaticLineNode(value, color), z);
}

/** Typsicherer Param-Zugriff mit Fallback (Registry-Defaults = Quelle der Wahrheit für generische Aufrufe). */
export function num(p: PaneParams, key: string, fallback: number): number {
    const v = p[key];
    return typeof v === 'number' ? v : fallback;
}

export function str<T extends string>(p: PaneParams, key: string, fallback: T): T {
    const v = p[key];
    return (typeof v === 'string' ? v : fallback) as T;
}

// ---------------------------------------------------------------------------
// Controller — wird von der ZChartAPI-Fassade gehalten (eine Instanz pro Chart,
// KEIN modul-globaler State → splitscreen-sicher)
// ---------------------------------------------------------------------------

export class PaneIndicatorController {
    /** Angehängte Panes (id → params) für Re-Calc nach setData (TF-/Symbolwechsel). */
    private attached = new Map<string, PaneParams>();

    constructor(private manager: ChartManager) {
        this.manager.on('dataReplaced', () => {
            let any = false;
            for (const [id, params] of this.attached) {
                registry.get(id)?.calculate?.(this.manager.dataStore, params);
                any = true;
            }
            if (any) this.manager.markDirty();
        });
    }

    public add(id: string, params: PaneParams = {}, style: IndicatorLineStyleOptions = {}): void {
        const def = registry.get(id);
        if (!def) {
            devWarn('PaneRegistry', `addIndicatorPane('${id}'): no registered definition`);
            return;
        }
        const existing = this.manager.getPanes().find(p => p.id === id);
        if (existing) {
            this.manager.removePane(id);
        }
        def.calculate?.(this.manager.dataStore, params);
        const pane = new Pane(id, def.paneWeight ?? 0.2);
        // ZV10-P2: deklarierte Range/Ticks auf die PriceScale übernehmen
        if (def.fixedRange) pane.priceScale.fixedRange = { ...def.fixedRange };
        if (def.ticks) {
            const ticks = [...def.ticks];
            pane.priceScale.tickProvider = () => ticks;
        }
        for (const node of def.buildNodes(this.manager.dataStore, params, style)) {
            pane.addNode(node);
        }
        this.manager.addPane(pane);
        this.attached.set(id, params);
        this.manager.markDirty(); // sofort sichtbar (ohne UI-Layer kein Folge-Render)
    }

    public remove(id: string): void {
        const pane = this.manager.getPanes().find(p => p.id === id);
        this.attached.delete(id);
        if (pane && pane.heightWeight > 0) { this.manager.togglePaneVisibility(id); this.manager.markDirty(); }
    }
}
