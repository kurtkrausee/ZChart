// src/nodes/tools/EmojiNode.ts
import { SceneNode } from '../core/SceneNode';
import type { TimeScale } from '../../math/TimeScale';
import type { PriceScale } from '../../math/PriceScale';

export class EmojiNode extends SceneNode {
    public id: string = crypto.randomUUID();
    public name: string = 'emoji';
    public isVisible: boolean = true;
    
    // Logische Position (Index/Preis)
    public point1: { index: number, price: number } | null = null;
    
    // Visuelle Eigenschaften
    public emoji: string = '😊';
    public size: number = 40;
    public rotation: number = 0; // In Radiant
    public scaleX: number = 1;   // 1 für normal, -1 für horizontal gespiegelt

    // Status-Flags für Interaktion
    public isHovered: boolean = false;
    public isSelected: boolean = false;

    /**
     * Haupt-Zeichenmethode
     */
    public draw(ctx: CanvasRenderingContext2D, timeScale: TimeScale, priceScale: PriceScale) {
        if (!this.point1 || !this.isVisible) return;

        // Umrechnung der logischen Koordinaten in Pixel
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        ctx.save();
        
        // 1. Transformation: Wir schieben den Nullpunkt auf die Mitte des Emojis
        ctx.translate(x, y);
        
        // 2. Transformation: Rotation anwenden
        ctx.rotate(this.rotation);
        
        // 3. Transformation: Spiegeln (falls scaleX = -1)
        ctx.scale(this.scaleX, 1);
        
        // Emoji-Styling
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Zeichnen (Relativ zu 0,0 wegen translate)
        ctx.fillText(this.emoji, 0, 0);

        // UI für Selektion zeichnen (Rahmen und Handles)
        if (this.isSelected) {
            this.drawSelectionUI(ctx);
        }

        ctx.restore();
    }

    /**
     * Zeichnet den blauen Rahmen und die Kontrollpunkte
     */
    private drawSelectionUI(ctx: CanvasRenderingContext2D) {
        const half = this.size / 2 + 5; // Kleiner Puffer um das Emoji
        
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        
        // Gestrichelter Rahmen
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-half, -half, half * 2, half * 2);
        ctx.setLineDash([]); // Reset für andere Zeichnungen

        // Rotations-Handle (Ein kleiner Kreis über dem Emoji)
        const handleOffset = 20;
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(0, -half - handleOffset);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -half - handleOffset, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        // Skalierungs-Handle (Kleines Quadrat unten rechts)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(half - 4, half - 4, 8, 8);
        ctx.strokeRect(half - 4, half - 4, 8, 8);
    }
    
    /**
     * Prüft, ob die Maus über dem Objekt oder einem Handle ist.
     * Nutzt lokale Koordinaten, um die Rotation zu berücksichtigen.
     */
    public hitTest(px: number, py: number, timeScale: TimeScale, priceScale: PriceScale): boolean {
        if (!this.point1) return false;
        
        const x = timeScale.indexToX(this.point1.index);
        const y = priceScale.priceToY(this.point1.price);

        // Distanz-Check (Sehr einfach, aber effektiv für Emojis)
        const dx = px - x;
        const dy = py - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist < this.size / 1.5; // Großzügiger Radius für Touch/Maus
    }
}