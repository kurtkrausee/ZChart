// nodes/core/SceneNode.ts

import { TimeScale } from '../../math/TimeScale';
import { PriceScale } from '../../math/PriceScale';
import type { ChartConfig } from '../../core/ChartOptions';

export type NodeRole = 'series' | 'tool' | 'axis' | 'background';

export abstract class SceneNode {
  // Eindeutige ID für den Object Tree
  public id: string = crypto.randomUUID(); 

  // Toggle für das Ausblenden im Object Tree
  public isVisible: boolean = true;

  // Standard-Ebene ist 0. Höhere Zahlen liegen weiter "vorne".
  public zIndex: number = 0;

  // Default ist 'tool', da Nutzer 90% der Zeit Zeichnungen erstellen.
  public role: NodeRole | string = 'tool'; 

  // Globale Interaktions-Status
  public isHovered: boolean = false;
  public isSelected: boolean = false;

  // Rotation-Logic (für Emojis und Texte)
  public rotation: number = 0; // Wert in Radiant (0 = ungedreht)

  // Die abstrakte Methode, die JEDE Node implementieren MUSS
  abstract draw(
    ctx: CanvasRenderingContext2D,
    timeScale: TimeScale,
    priceScale: PriceScale,
    options: ChartConfig
  ): void;

  // ==========================================
  // NEU: Globale Hit-Test-Methoden
  // ==========================================

  /**
   * Prüft, ob der Nutzer genau auf dieses Objekt geklickt hat.
   * Standardmäßig false. Wird von Tools (Trendlinie, Text) überschrieben.
   */
  public hitTest(
    pixelX: number, 
    pixelY: number, 
    timeScale: TimeScale, 
    priceScale: PriceScale
  ): boolean {
      return false;
  }

  /**
   * Prüft, ob ein spezifischer Ankerpunkt gezogen wird.
   * Standardmäßig null, da die meisten Objekte keine "Anker" zum Ziehen haben.
   */
  public hitTestAnchor(
    pixelX: number, 
    pixelY: number, 
    timeScale: TimeScale, 
    priceScale: PriceScale
  ): 1 | 2 | null {
      return null;
  }
}