// src/api/serialization/families/annotations.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// Familie "Annotationen & Pfade" — schließt die F5-Persistenz-Lücke für die
// Text-/Marker-Tools (note, price_note, callout, table, pin, anchored_text,
// comment, signpost, flag, image_note) und für path/polyline (Multi-Point).
// Diese Typen wurden bisher exportiert (generisches base), aber beim Import
// mangels Registry-Eintrag verworfen → Drawings verschwanden nach Reload.
// Konvention wie lines-shapes.ts: Export- und Import-Branch NEBENEINANDER.
import { NoteNode } from '../../../nodes/tools/NoteNode';
import { PolylineNode, type PathMarker } from '../../../nodes/tools/PolylineNode';
import { registerDrawingSerializer, type SerializerContext } from '../DrawingSerializer';
import type { DrawingExportData } from '../../types';

/** Tool-spezifische Extras laufen über die Index-Signatur — lokal dynamisch typisiert. */
type Extras = Record<string, any>;

function pt1(ext: DrawingExportData, ctx: SerializerContext) {
    const idx1 = ext.anchors[0] ? ctx.timeToIndex(ext.anchors[0].timestamp) : 0;
    return { index: idx1, price: ext.anchors[0].price };
}

function pt2(ext: DrawingExportData, ctx: SerializerContext) {
    const idx1 = ext.anchors[0] ? ctx.timeToIndex(ext.anchors[0].timestamp) : 0;
    const idx2 = ext.anchors[1] ? ctx.timeToIndex(ext.anchors[1].timestamp) : idx1;
    return { index: idx2, price: ext.anchors[1].price };
}

// ── note (2-Punkt: Anker + Textbox) ─────────────────────────────────────────
registerDrawingSerializer('note', {
    import: (ext, ctx) => {
        const n = new NoteNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.point2 = pt2(ext, ctx);
        n.text = (ext as Extras).text ?? '';
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.fontSize) n.fontSize = ext.style.fontSize;
        return n;
    },
    export: (shape, base) => {
        const n = shape as NoteNode;
        (base as Extras).text = n.text;
        base.style!.fontSize = n.fontSize;
    },
});

// ── price_note (2-Punkt: Anker-Bar + Badge) ──────────────────────────────────
// ── callout (2-Punkt: Anker + Bubble) ────────────────────────────────────────
// ── table (2-Punkt-BBox + rows/cols/cells) ───────────────────────────────────
// ── pin (1-Punkt + optionaler Text) ──────────────────────────────────────────
// ── anchored_text (1-Punkt + Text, wie text_label) ───────────────────────────
// ── comment (1-Punkt + Text) ─────────────────────────────────────────────────
// ── signpost (1-Punkt + Text) ────────────────────────────────────────────────
// ── flag (1-Punkt-Marker, generisches base reicht für den Export) ────────────
// ── image_note (2-Punkt-BBox + Bild-Quelle) ──────────────────────────────────
// ── path / polyline (Multi-Point + Marker) ───────────────────────────────────
// ALLE Punkte wandern als anchors ins Wire-Format (base trägt sonst nur 2);
// endMarker/startMarker/closed sind Extras. Der Typ (path vs polyline) steckt
// in base.type = shapeType. Schließt die Lücke "Pfad-Pfeil weg nach F5".
registerDrawingSerializer(['path', 'polyline'], {
    import: (ext, ctx) => {
        const n = new PolylineNode();
        n.id = ext.id;
        n.shapeType = ext.type === 'path' ? 'path' : 'polyline';
        n.name = n.shapeType === 'path' ? 'Pfad' : 'Polylinie';
        n.points = ext.anchors.map(a => ({ index: ctx.timeToIndex(a.timestamp), price: a.price }));
        n.point1 = n.points[0] ?? null;
        n.point2 = n.points[n.points.length - 1] ?? null;
        const e = ext as Extras;
        n.closed = e.closed ?? false;
        n.startMarker = (e.startMarker as PathMarker) ?? 'none';
        n.endMarker = (e.endMarker as PathMarker) ?? (n.shapeType === 'path' ? 'arrow' : 'none');
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.lineWidth) n.lineWidth = ext.style.lineWidth;
        return n;
    },
    export: (shape, base, ctx) => {
        const n = shape as PolylineNode;
        base.anchors = n.points.map(p => ({
            timestamp: ctx.indexToTime(p.index) || Date.now(),
            price: p.price,
        }));
        const b = base as Extras;
        b.closed = n.closed;
        b.startMarker = n.startMarker;
        b.endMarker = n.endMarker;
    },
});
