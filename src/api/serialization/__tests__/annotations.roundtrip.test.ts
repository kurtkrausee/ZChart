// src/zchart/api/serialization/__tests__/annotations.roundtrip.test.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// Round-Trip-Tests für die annotations-Familie: import(export(node)) muss pro Tool
// verlustfrei sein — schließt die F5-Persistenz-Lücke testseitig ab.
import { describe, it, expect } from 'vitest';
import { exportShape, importShape, hasDrawingSerializer, type SerializerContext } from '../DrawingSerializer';
import '../families';
import { NoteNode } from '../../../nodes/tools/NoteNode';
import { PolylineNode } from '../../../nodes/tools/PolylineNode';
import type { DrawableShape } from '../../../types/DrawableShape';

// Deterministische Index↔Zeit-Abbildung: Index i ↔ T0 + i·60s (exakt invertierbar).
const T0 = 1700000000000;
const STEP = 60000;
const ctx: SerializerContext = {
    dataStore: { getAllData: () => [] } as never,
    timeToIndex: (ts) => Math.round((ts - T0) / STEP),
    indexToTime: (idx) => T0 + idx * STEP,
};

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

describe('annotations Round-Trip (import(export(node)) verlustfrei)', () => {
    it('note (2-Punkt + Text)', () => {
        const n = new NoteNode();
        n.id = 'n1';
        n.point1 = { index: 10, price: 1.085 };
        n.point2 = { index: 20, price: 1.092 };
        n.text = 'Wichtige Marke';
        n.fontSize = 16;
        expectFields(roundtrip(n), n, ['id', 'point1', 'point2', 'text', 'fontSize'], 'note');
    });








    it('path (Multi-Point + endMarker arrow — der "Pfeil weg nach F5"-Fall)', () => {
        const n = new PolylineNode();
        n.id = 'p1';
        n.shapeType = 'path';
        n.points = [
            { index: 1, price: 10 },
            { index: 5, price: 14 },
            { index: 9, price: 11 },
            { index: 14, price: 18 },
        ];
        n.point1 = n.points[0];
        n.point2 = n.points[n.points.length - 1];
        n.closed = false;
        n.startMarker = 'none';
        n.endMarker = 'arrow';
        const r = roundtrip(n);
        expectFields(r, n, ['id', 'shapeType', 'points', 'closed', 'startMarker', 'endMarker'], 'path');
    });

    it('polyline (Multi-Point, geschlossen, ohne Marker)', () => {
        const n = new PolylineNode();
        n.id = 'pl1';
        n.shapeType = 'polyline';
        n.points = [
            { index: 0, price: 1 },
            { index: 3, price: 4 },
            { index: 6, price: 2 },
        ];
        n.point1 = n.points[0];
        n.point2 = n.points[n.points.length - 1];
        n.closed = true;
        n.endMarker = 'none';
        const r = roundtrip(n);
        expectFields(r, n, ['id', 'shapeType', 'points', 'closed', 'endMarker'], 'polyline');
    });

    it('alle neuen Typen sind registriert', () => {
        for (const t of ['note', 'path', 'polyline']) {
            expect(hasDrawingSerializer(t), `Serializer fehlt für '${t}'`).toBe(true);
        }
    });
});
