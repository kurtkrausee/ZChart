// nodes/tools/PolylineNode.ts
// Version: 2.0.0 | Updated: 2026-06-07 | By: Agent
// Polylinie/Pfad: Multi-Click-Linienzug (2..N Punkte). Dblclick beendet.
// - Polyline: offene Linie, keine Marker.
// - Path:    offene Linie + End-Marker (default 'arrow' am Ende).
// `closed` ist deprecated und wird ignoriert (vorherige Versionen füllten den Pfad).

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';
import type { DrawableShape, LogicalPoint } from '../../types/DrawableShape';

export type PathMarker = 'none' | 'arrow' | 'dot' | 'circle';

export class PolylineNode implements DrawableShape {
    public shapeType: 'polyline' | 'path' = 'polyline';
    public id: string = crypto.randomUUID();
    public name: string = 'Polylinie';
    public isVisible: boolean = true;
    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;
    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    public points: LogicalPoint[] = [];
    /** @deprecated path uses end markers, not closed fill. Kept for backward-compat. */
    public closed: boolean = false;
    public lineColor: string = '#3b82f6';
    public fillColor: string = 'rgba(59,130,246,0.12)';
    public lineWidth: number = 1.5;
    public lineDash: number[] = [];

    /** Marker am ersten Punkt (path only). */
    public startMarker: PathMarker = 'none';
    /** Marker am letzten Punkt (path only). Default 'arrow' bei Path. */
    public endMarker: PathMarker = 'none';

    private readonly ANCHOR_R = 5;
    private readonly MARKER_SIZE = 14; // Pfeil-Spitzen-Länge / Punkt-Radius (vergrößert)

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale, _options: ChartConfig) {
        if (this.points.length < 2) return;
        const pts = this.points.map(p => ({ x: timeScale.indexToX(p.index), y: priceScale.priceToY(p.price) }));
        const stroke = this.isSelected ? '#FFD700' : (this.isHovered ? '#FFF176' : this.lineColor);

        // Backward-compat: alte gespeicherte Paths haben kein endMarker-Property,
        // bekommen automatisch 'arrow' als Default.
        const effectiveStart: PathMarker = this.startMarker ?? 'none';
        const effectiveEnd: PathMarker = this.endMarker ?? (this.shapeType === 'path' ? 'arrow' : 'none');

        // Finde den ersten verschiedenen Nachbarn vom Start/Ende.
        // Bei Polyline/Path-Finalize kann der letzte Klick == vorletzter Klick sein
        // (Dblclick-Position). Dann wäre `back === tip` und Marker hätte keine
        // Richtung. Wir suchen also den nächsten Punkt, der echte Distanz hat.
        const startTip = pts[0];
        const startBack = this.findDirectionNeighbor(pts, 0, +1) ?? pts[1];
        const endTip = pts[pts.length - 1];
        const endBack = this.findDirectionNeighbor(pts, pts.length - 1, -1) ?? pts[pts.length - 2];

        // Berechne Stopp-Endpunkte der Hauptlinie. Für dot/circle: Linie endet AM Rand
        // des Kreises, nicht in der Mitte (sonst sieht man die Linie im Kreis).
        const startPoint = this.computeLineEndpoint(startTip, startBack, effectiveStart);
        const endPoint = this.computeLineEndpoint(endTip, endBack, effectiveEnd);

        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = this.lineWidth;
        if (this.lineDash.length) ctx.setLineDash(this.lineDash);
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        for (let i = 1; i < pts.length - 1; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Anker zuerst zeichnen, dann Marker — so überdeckt der Pfeil/Kreis den Anker.
        if (this.isSelected) {
            for (const p of pts) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.ANCHOR_R, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff'; ctx.fill();
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.stroke();
            }
        }

        if (effectiveStart !== 'none') {
            this.drawMarker(ctx, startTip, startBack, effectiveStart, stroke);
        }
        if (effectiveEnd !== 'none') {
            this.drawMarker(ctx, endTip, endBack, effectiveEnd, stroke);
        }
        ctx.restore();
    }

    /**
     * Findet den ersten Nachbarn ab `start` in Schrittweite `step`, der eine
     * messbare Distanz hat. Verhindert dass back===tip wenn der vorletzte Klick
     * exakt am Endpoint liegt (z.B. nach Polyline-Dblclick-Pop).
     */
    private findDirectionNeighbor(
        pts: { x: number; y: number }[],
        from: number,
        step: 1 | -1,
    ): { x: number; y: number } | null {
        const a = pts[from];
        let i = from + step;
        while (i >= 0 && i < pts.length) {
            const b = pts[i];
            if (Math.hypot(b.x - a.x, b.y - a.y) > 0.5) return b;
            i += step;
        }
        return null;
    }

    /**
     * Berechnet, wo die Hauptlinie aufhört wenn am Endpunkt ein Marker sitzt.
     * - 'dot'/'circle': Linie endet am Rand des Kreises (verhindert sichtbare Linie im Kreis).
     * - 'arrow'/'none': Linie geht durch bis tip.
     */
    private computeLineEndpoint(
        tip: { x: number; y: number },
        _back: { x: number; y: number },
        _kind: PathMarker,
    ): { x: number; y: number } {
        // Linie endet immer EXAKT am Tip. Kreis-Marker sitzen vor dem Tip
        // (siehe drawMarker → markerCenter). So berührt der Kreisrand die Linie.
        return tip;
    }

    /**
     * Marker an `tip` zeichnen, ausgerichtet entlang Vektor von `back` zu `tip`.
     * - arrow:  V-förmige Pfeilspitze offen
     * - dot:    gefüllter Kreis
     * - circle: hohler Kreis
     */
    private drawMarker(
        ctx: CanvasRenderingContext2D,
        tip: { x: number; y: number },
        back: { x: number; y: number },
        kind: PathMarker,
        color: string,
    ) {
        if (kind === 'none') return;
        const size = this.MARKER_SIZE;
        if (kind === 'dot' || kind === 'circle') {
            // Kreis sitzt VOR dem Tip in Flugrichtung, sodass sein hinterer Rand
            // die Linienspitze berührt (Tip = Berührungspunkt zwischen Kreis und Linie).
            const radius = size * 0.5;
            const dx = tip.x - back.x, dy = tip.y - back.y;
            const len = Math.hypot(dx, dy);
            const ux = len > 0.5 ? dx / len : 0;
            const uy = len > 0.5 ? dy / len : 0;
            const cx = tip.x + ux * radius;
            const cy = tip.y + uy * radius;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            if (kind === 'dot') {
                ctx.fillStyle = color;
                ctx.fill();
            } else {
                // Circle: nur Outline, transparent in der Mitte.
                ctx.strokeStyle = color;
                ctx.lineWidth = Math.max(1.5, this.lineWidth);
                ctx.stroke();
            }
            return;
        }
        // Arrow: V-förmige Spitze AM tip, mit Armen die nach hinten (zur back-Seite) zeigen.
        // back ist der vorletzte Punkt der Linie, tip ist der letzte. Vektor back→tip ist
        // die Flugrichtung. Die zwei Pfeil-Arme starten am tip und gehen schräg nach
        // hinten-links und hinten-rechts (gegen die Flugrichtung).
        const dx = tip.x - back.x, dy = tip.y - back.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;
        // Einheitsvektor "rückwärts" (vom tip zur back-Seite): -dx/len, -dy/len
        const bx = -dx / len, by = -dy / len;
        const angle = Math.PI / 6; // 30° Spreizung jedes Arms vom Rückwärts-Vektor
        const cos = Math.cos(angle), sin = Math.sin(angle);
        // Linker Arm: Rückwärts-Vektor um +30° gedreht
        const lx = bx * cos - by * sin;
        const ly = bx * sin + by * cos;
        // Rechter Arm: Rückwärts-Vektor um -30° gedreht
        const rx = bx * cos + by * sin;
        const ry = -bx * sin + by * cos;
        ctx.beginPath();
        ctx.moveTo(tip.x + lx * size, tip.y + ly * size);
        ctx.lineTo(tip.x, tip.y);
        ctx.lineTo(tip.x + rx * size, tip.y + ry * size);
        ctx.strokeStyle = color;
        // Pfeil etwas dicker als die Linie, damit er sichtbar bleibt auch wenn der Anker-Kreis dahintersteckt.
        ctx.lineWidth = Math.max(2, this.lineWidth);
        ctx.lineCap = this.lineDash.length > 0 ? 'butt' : 'round'; // round frisst kurze Dash-Luecken (Gepunktet [2,2])
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    public hitTest(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (this.points.length < 2) return false;
        const pts = this.points.map(p => ({ x: timeScale.indexToX(p.index), y: priceScale.priceToY(p.price) }));
        const n = pts.length;
        // Polyline und Path sind beide offene Linien — n-1 Segmente.
        const segs = n - 1;
        for (let i = 0; i < segs; i++) {
            const a = pts[i], b = pts[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const len2 = dx * dx + dy * dy;
            if (len2 < 1) continue;
            const t = Math.max(0, Math.min(1, ((pixelX - a.x) * dx + (pixelY - a.y) * dy) / len2));
            const px = a.x + t * dx, py = a.y + t * dy;
            if (Math.hypot(pixelX - px, pixelY - py) <= 4) return true;
        }
        return false;
    }

    public hitTestAnchor(pixelX: number, pixelY: number, timeScale: TimeScale, priceScale: PriceScale): number | null {
        if (this.points.length < 2) return null;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const px = timeScale.indexToX(p.index);
            const py = priceScale.priceToY(p.price);
            if (Math.hypot(pixelX - px, pixelY - py) <= this.ANCHOR_R + 4) return i + 1;
        }
        return null;
    }
}
