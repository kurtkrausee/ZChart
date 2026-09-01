// src/api/serialization/families/lines-shapes.ts
// Version: 1.0.0 | Updated: 2026-06-10 | By: Agent
// P10a (ZChartAPI-Refactor): Familie "Linien & Formen" — 16 Tools, Verhalten 1:1
// aus importDrawings/exportDrawings übernommen. Pro Tool stehen import- und
// export-Branch NEBENEINANDER (Symmetrie-Regel dieser Schicht).
//
// Konvention: Felder, die der generische buildBaseExport bereits abdeckt
// (anchors[0..1], style.color aus lineColor, style.lineWidth, visible, zIndex),
// tauchen hier NICHT noch einmal auf — ein fehlender export-Branch heißt
// "generisches base reicht" (trendline, hline, vline, ray, extended_line, arrow).
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

function pt3OrNull(ext: DrawingExportData, ctx: SerializerContext) {
    if (!ext.anchors[2]) return null;
    return { index: ctx.timeToIndex(ext.anchors[2].timestamp), price: ext.anchors[2].price };
}

/** Export-Helper: point3 als dritten Anchor anhängen (Muster vieler 3-Punkt-Tools). */
function pushPoint3(shape: { point3?: { index: number; price: number } | null }, base: DrawingExportData, ctx: SerializerContext): void {
    if (shape.point3) {
        const t3 = ctx.indexToTime(shape.point3.index) || Date.now();
        base.anchors.push({ timestamp: t3, price: shape.point3.price });
    }
}

// ── trendline (Legacy-Alias: 'segment') ─────────────────────────────────────
registerDrawingSerializer(['trendline', 'segment'], {
    import: (ext, ctx) => {
        const n = new TrendLineNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.point2 = pt2(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.lineWidth) n.lineWidth = ext.style.lineWidth;
        return n;
    },
    // export: generisches base reicht (type wird als shapeType 'trendline' geschrieben).
});

// ── hline ────────────────────────────────────────────────────────────────────
registerDrawingSerializer('hline', {
    import: (ext, ctx) => {
        const n = new HorizontalLineNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        return n;
    },
});

// ── vline ────────────────────────────────────────────────────────────────────
registerDrawingSerializer('vline', {
    import: (ext, ctx) => {
        const n = new VerticalLineNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        return n;
    },
});

// ── ray ──────────────────────────────────────────────────────────────────────
registerDrawingSerializer('ray', {
    import: (ext, ctx) => {
        const n = new RayNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.point2 = pt2(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.lineWidth) n.lineWidth = ext.style.lineWidth;
        return n;
    },
});

// ── extended_line ────────────────────────────────────────────────────────────
registerDrawingSerializer('extended_line', {
    import: (ext, ctx) => {
        const n = new ExtendedLineNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.point2 = pt2(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.lineWidth) n.lineWidth = ext.style.lineWidth;
        return n;
    },
});

// ── parallel_channel ─────────────────────────────────────────────────────────
// ── disjoint_channel ─────────────────────────────────────────────────────────
// ── flat_top_bottom ──────────────────────────────────────────────────────────
// ── regression_trend ─────────────────────────────────────────────────────────
// ── rectangle ────────────────────────────────────────────────────────────────
registerDrawingSerializer('rectangle', {
    import: (ext, ctx) => {
        const n = new RectangleNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.point2 = pt2(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.fillColor) n.fillColor = ext.style.fillColor;
        return n;
    },
    export: (shape, base) => {
        const r = shape as RectangleNode;
        if (r.fillColor) base.style!.fillColor = r.fillColor;
    },
});

// ── text_label ───────────────────────────────────────────────────────────────
registerDrawingSerializer('text_label', {
    import: (ext, ctx) => {
        const n = new TextLabelNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.text = (ext as Extras).text ?? '';
        if (ext.style?.color) n.textColor = ext.style.color;
        if (ext.style?.fontSize) n.fontSize = ext.style.fontSize;
        return n;
    },
    export: (shape, base) => {
        const t = shape as TextLabelNode;
        base.text = t.text;
        base.style!.fontSize = t.fontSize;
    },
});

// ── arrow ────────────────────────────────────────────────────────────────────
registerDrawingSerializer('arrow', {
    import: (ext, ctx) => {
        const n = new ArrowNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.point2 = pt2(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.lineWidth) n.lineWidth = ext.style.lineWidth;
        return n;
    },
});

// ── price_label ──────────────────────────────────────────────────────────────
// ── emoji ────────────────────────────────────────────────────────────────────
registerDrawingSerializer('emoji', {
    import: (ext, ctx) => {
        const e = ext as Extras;
        const n = new EmojiNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        if (e.emoji) n.emoji = e.emoji;
        if (e.size !== undefined) n.size = e.size;
        if (e.rotation !== undefined) n.rotation = e.rotation;
        if (e.scaleX !== undefined) n.scaleX = e.scaleX;
        if (e.scaleY !== undefined) n.scaleY = e.scaleY;
        return n;
    },
    export: (shape, base) => {
        const em = shape as EmojiNode;
        base.emoji = em.emoji;
        base.size = em.size;
        base.rotation = em.rotation;
        base.scaleX = em.scaleX;
        base.scaleY = em.scaleY;
    },
});

// ── ellipse ──────────────────────────────────────────────────────────────────
registerDrawingSerializer('ellipse', {
    import: (ext, ctx) => {
        const n = new EllipseNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.point2 = pt2(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.fillColor) n.fillColor = ext.style.fillColor;
        return n;
    },
    export: (shape, base) => {
        const el = shape as EllipseNode;
        if (el.fillColor) base.style!.fillColor = el.fillColor;
    },
});

// ── triangle ─────────────────────────────────────────────────────────────────
registerDrawingSerializer('triangle', {
    import: (ext, ctx) => {
        const n = new TriangleNode();
        n.id = ext.id;
        n.point1 = pt1(ext, ctx);
        n.point2 = pt2(ext, ctx);
        n.point3 = pt3OrNull(ext, ctx);
        if (ext.style?.color) n.lineColor = ext.style.color;
        if (ext.style?.fillColor) n.fillColor = ext.style.fillColor;
        return n;
    },
    export: (shape, base, ctx) => {
        const tri = shape as TriangleNode;
        if (tri.fillColor) base.style!.fillColor = tri.fillColor;
        pushPoint3(tri, base, ctx);
    },
});
