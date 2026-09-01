// src/api/serialization/__tests__/linesShapes.roundtrip.test.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// P10a (ZChartAPI-Refactor): Round-Trip-Tests — import(export(node)) muss pro Tool
// verlustfrei sein (für alle Felder, die die Serialisierung heute trägt).
import { describe, it, expect } from 'vitest';
import {
    exportShape,
    importShape,
    hasDrawingSerializer,
    listDrawingSerializerTypes,
    EXPORT_EXCLUDED_TYPES,
    type SerializerContext,
} from '../DrawingSerializer';
import '../families';
import { TrendLineNode } from '../../../nodes/tools/TrendLineNode';
import { HorizontalLineNode } from '../../../nodes/tools/HorizontalLineNode';
import { VerticalLineNode } from '../../../nodes/tools/VerticalLineNode';
import { RayNode } from '../../../nodes/tools/RayNode';
import { ExtendedLineNode } from '../../../nodes/tools/ExtendedLineNode';
import { RectangleNode } from '../../../nodes/tools/RectangleNode';
import { TextLabelNode } from '../../../nodes/tools/TextLabelNode';
import { ArrowNode } from '../../../nodes/tools/ArrowNode';
import { EmojiNode } from '../../../nodes/tools/EmojiNode';
import { EllipseNode } from '../../../nodes/tools/EllipseNode';
import { TriangleNode } from '../../../nodes/tools/TriangleNode';
import type { DrawableShape } from '../../../types/DrawableShape';

// Deterministische Index↔Zeit-Abbildung: Index i ↔ T0 + i·60s (exakt invertierbar).
const T0 = 1700000000000;
const STEP = 60000;
const ctx: SerializerContext = {
    dataStore: { getAllData: () => [] } as never,
    timeToIndex: (ts) => Math.round((ts - T0) / STEP),
    indexToTime: (idx) => T0 + idx * STEP,
};

/** export → import → Felder vergleichen. */
function roundtrip<T extends DrawableShape>(node: T): T {
    const exported = exportShape(node, ctx, 0);
    const reimported = importShape(exported, ctx);
    expect(reimported, `import lieferte null für '${node.shapeType}'`).not.toBeNull();
    return reimported as T;
}

function expectFields<T extends object>(actual: T, expected: T, fields: (keyof T)[], label: string): void {
    for (const f of fields) {
        expect(actual[f], `${label}.${String(f)}`).toEqual(expected[f]);
    }
}

describe('yAxisId Round-Trip (ZV10-P7d, Multi-Y-Achse)', () => {
    it('gesetztes yAxisId überlebt export → import', () => {
        const n = new TrendLineNode();
        n.id = 'y1';
        n.point1 = { index: 1, price: 100 };
        n.point2 = { index: 2, price: 110 };
        // Tool-Nodes deklarieren das optionale Interface-Feld nicht als Property —
        // Zugriff über den DrawableShape-Typ (wie im Serializer selbst).
        (n as DrawableShape).yAxisId = 'compare';
        const exported = exportShape(n, ctx, 0);
        expect(exported.yAxisId).toBe('compare');
        const r = roundtrip(n) as DrawableShape;
        expect(r.yAxisId).toBe('compare');
    });

    it('fehlendes yAxisId bleibt undefined (Default-Scale, Bestands-Drawings)', () => {
        const n = new TrendLineNode();
        n.id = 'y2';
        n.point1 = { index: 1, price: 100 };
        n.point2 = { index: 2, price: 110 };
        const exported = exportShape(n, ctx, 0);
        expect('yAxisId' in exported).toBe(false);
        const r = roundtrip(n) as DrawableShape;
        expect(r.yAxisId).toBeUndefined();
    });
});

describe('lines-shapes Round-Trip (import(export(node)) verlustfrei)', () => {
    it('trendline (inkl. Legacy-Alias segment)', () => {
        const n = new TrendLineNode();
        n.id = 'd1';
        n.point1 = { index: 10, price: 1.085 };
        n.point2 = { index: 20, price: 1.092 };
        n.lineColor = '#ff0000';
        n.lineWidth = 3;
        const r = roundtrip(n);
        expectFields(r, n, ['id', 'point1', 'point2', 'lineColor', 'lineWidth'], 'trendline');
        expect(hasDrawingSerializer('segment')).toBe(true);
    });

    it('hline / vline', () => {
        const h = new HorizontalLineNode();
        h.id = 'h1';
        h.point1 = { index: 5, price: 100.5 };
        h.lineColor = '#00ff00';
        expectFields(roundtrip(h), h, ['id', 'point1', 'lineColor'], 'hline');

        const v = new VerticalLineNode();
        v.id = 'v1';
        v.point1 = { index: 7, price: 0 };
        v.lineColor = '#0000ff';
        expectFields(roundtrip(v), v, ['id', 'point1', 'lineColor'], 'vline');
    });

    it('ray / extended_line / arrow', () => {
        for (const [label, node] of [
            ['ray', new RayNode()],
            ['extended_line', new ExtendedLineNode()],
            ['arrow', new ArrowNode()],
        ] as const) {
            node.id = `${label}-1`;
            node.point1 = { index: 3, price: 50 };
            node.point2 = { index: 9, price: 55 };
            (node as DrawableShape & { lineColor: string }).lineColor = '#abcdef';
            (node as DrawableShape & { lineWidth: number }).lineWidth = 4;
            const r = roundtrip(node);
            expectFields(r as never, node as never, ['id', 'point1', 'point2', 'lineColor', 'lineWidth'] as never[], label);
        }
    });





    it('rectangle / ellipse (fillColor in style)', () => {
        for (const [label, node] of [['rectangle', new RectangleNode()], ['ellipse', new EllipseNode()]] as const) {
            node.id = `${label}-1`;
            node.point1 = { index: 1, price: 5 };
            node.point2 = { index: 6, price: 9 };
            node.lineColor = '#222222';
            node.fillColor = 'rgba(34,197,94,0.15)';
            const r = roundtrip(node);
            expectFields(r as never, node as never, ['id', 'point1', 'point2', 'lineColor', 'fillColor'] as never[], label);
        }
    });

    it('triangle (point3 + fillColor)', () => {
        const n = new TriangleNode();
        n.id = 'tri1';
        n.point1 = { index: 0, price: 1 };
        n.point2 = { index: 5, price: 3 };
        n.point3 = { index: 10, price: 1 };
        n.fillColor = 'rgba(0,0,0,0.3)';
        const r = roundtrip(n);
        expectFields(r, n, ['id', 'point1', 'point2', 'point3', 'fillColor'], 'triangle');
    });

    it('text_label (text, textColor, fontSize)', () => {
        const n = new TextLabelNode();
        n.id = 'tl1';
        n.point1 = { index: 15, price: 42 };
        n.text = 'Hallo Markt';
        n.textColor = '#fafafa';
        n.fontSize = 18;
        const r = roundtrip(n);
        expectFields(r, n, ['id', 'point1', 'text', 'textColor', 'fontSize'], 'text_label');
    });


    it('emoji (emoji, size, rotation, scaleX/Y — Regressionstest für den Persistenz-Bug)', () => {
        const n = new EmojiNode();
        n.id = 'em1';
        n.point1 = { index: 8, price: 99 };
        n.emoji = '🚀';
        n.size = 48;
        n.rotation = 45;
        n.scaleX = -1;
        n.scaleY = 1;
        const r = roundtrip(n);
        expectFields(r, n, ['id', 'point1', 'emoji', 'size', 'rotation', 'scaleX', 'scaleY'], 'emoji');
    });
});

describe('Symmetrie & Ausnahmen', () => {
    it('alert_line: Import verwirft (dokumentierte Asymmetrie), Export ist ausgefiltert', () => {
        expect(importShape({ id: 'a1', type: 'alert_line', anchors: [{ timestamp: T0, price: 1 }] }, ctx)).toBeNull();
        expect(EXPORT_EXCLUDED_TYPES.has('alert_line')).toBe(true);
        expect(EXPORT_EXCLUDED_TYPES.has('measure')).toBe(true);
        expect(EXPORT_EXCLUDED_TYPES.has('trade_signal')).toBe(true);
    });

    it('alle registrierten Typen (außer Ausnahmen) liefern beim Import eine Node', () => {
        const minimal = {
            anchors: [
                { timestamp: T0 + 5 * STEP, price: 10 },
                { timestamp: T0 + 9 * STEP, price: 12 },
                { timestamp: T0 + 12 * STEP, price: 8 },
            ],
        };
        for (const type of listDrawingSerializerTypes()) {
            if (EXPORT_EXCLUDED_TYPES.has(type)) continue;
            const node = importShape({ id: `x-${type}`, type, ...minimal }, ctx);
            expect(node, `'${type}' importiert keine Node`).not.toBeNull();
            expect(node!.id).toBe(`x-${type}`);
        }
    });

    it('unbekannter Typ → undefined-Registry → null (Fassade fällt auf Alt-Kette zurück)', () => {
        expect(importShape({ id: 'u1', type: 'does_not_exist', anchors: [] }, ctx)).toBeNull();
        expect(hasDrawingSerializer('does_not_exist')).toBe(false);
    });
});
