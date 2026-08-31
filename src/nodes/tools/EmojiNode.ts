// src/nodes/tools/EmojiNode.ts
// Version: 2.1.0 | Updated: 2026-04-12 | By: GitHub Copilot
import { DrawableSceneNode } from '../core/DrawableSceneNode';
import type { TimeScale } from '../../math/TimeScale';
import type { PriceScale } from '../../math/PriceScale';
import type { LogicalPoint } from '../../types/DrawableShape';

export type EmojiZone = { mode: 'rotate' | 'resize' | 'move'; cornerIdx: number } | null;

export class EmojiNode extends DrawableSceneNode {
    public readonly shapeType = 'emoji' as const;
    public id: string = crypto.randomUUID();
    public name: string = 'emoji';
    public isVisible: boolean = true;

    public point1: LogicalPoint | null = null;
    public point2: LogicalPoint | null = null;

    public emoji: string = '😊';
    public size: number = 40;
    public rotation: number = 0;
    public scaleX: number = 1;
    public scaleY: number = 1;

    public isHovered: boolean = false;
    public isSelected: boolean = false;
    public isLocked: boolean = false;

    // Handle geometry constants
    private static readonly HANDLE_HALF = 5;
    private static readonly ROTATION_ZONE = 22;
    private static readonly PADDING = 5;

    public hitTestAnchor(_px: number, _py: number, _ts: TimeScale, _ps: PriceScale): 1 | 2 | null {
        return null;
    }

    /** Convert pixel coords to emoji-local space (centered, rotation undone) */
    public pixelToLocal(px: number, py: number, timeScale: TimeScale, priceScale: PriceScale): { lx: number; ly: number } | null {
        if (!this.point1) return null;
        const cx = timeScale.indexToX(this.point1.index);
        const cy = priceScale.priceToY(this.point1.price);
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const dx = px - cx;
        const dy = py - cy;
        return { lx: dx * cos - dy * sin, ly: dx * sin + dy * cos };
    }

    /** 4 corner positions in local space: TL, TR, BR, BL */
    private getLocalCorners(): [number, number][] {
        const h = this.size / 2 + EmojiNode.PADDING;
        return [[-h, -h], [h, -h], [h, h], [-h, h]];
    }

    /**
     * TradingView-style zone detection (only meaningful when selected).
     * Directly on corner handle → resize. Near corner → rotate. Inside box → move.
     */
    public hitTestEmojiZone(px: number, py: number, ts: TimeScale, ps: PriceScale): EmojiZone {
        const local = this.pixelToLocal(px, py, ts, ps);
        if (!local) return null;

        const corners = this.getLocalCorners();
        let nearIdx = -1, nearDist = Infinity;
        for (let i = 0; i < 4; i++) {
            const d = Math.hypot(local.lx - corners[i][0], local.ly - corners[i][1]);
            if (d < nearDist) { nearDist = d; nearIdx = i; }
        }

        if (nearDist <= EmojiNode.HANDLE_HALF + 3) return { mode: 'resize', cornerIdx: nearIdx };
        if (nearDist <= EmojiNode.ROTATION_ZONE) return { mode: 'rotate', cornerIdx: nearIdx };

        const h = this.size / 2 + EmojiNode.PADDING;
        if (Math.abs(local.lx) <= h && Math.abs(local.ly) <= h) return { mode: 'move', cornerIdx: -1 };

        return null;
    }

    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale) {
        if (!this.point1 || !this.isVisible) return;
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);

        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);

        if (this.isSelected) this.drawSelectionUI(ctx);
        ctx.restore();
    }

    /** TV-style bounding box with 4 corner handles */
    private drawSelectionUI(ctx: CanvasRenderingContext2D) {
        const corners = this.getLocalCorners();
        const hs = EmojiNode.HANDLE_HALF;

        // Solid border
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(corners[0][0], corners[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
        ctx.closePath();
        ctx.stroke();

        // 4 corner handles (white filled squares with blue border)
        for (const [cx, cy] of corners) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - hs, cy - hs, hs * 2, hs * 2);
            ctx.strokeRect(cx - hs, cy - hs, hs * 2, hs * 2);
        }
    }

    /** When selected, hitTest includes the rotation zones outside the box */
    public hitTest(px: number, py: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1) return false;
        if (this.isSelected) return this.hitTestEmojiZone(px, py, timeScale, priceScale) !== null;

        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);
        const dx = px - x;
        const dy = py - y;
        return Math.sqrt(dx * dx + dy * dy) < this.size / 1.5;
    }
}