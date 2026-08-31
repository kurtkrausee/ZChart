// utils/geometry.ts

/**
 * Berechnet die kürzeste Distanz von einem Punkt (px, py) 
 * zu einem Liniensegment definiert durch (x1, y1) und (x2, y2).
 */
export function distanceToLineSegment(
  px: number, py: number, 
  x1: number, y1: number, 
  x2: number, y2: number
): number {
  // Quadrat der Länge des Liniensegments
  const lengthSquared = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  
  // Fallback: Wenn A und B exakt aufeinander liegen (Linie ist ein Punkt)
  if (lengthSquared === 0) {
    return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  }

  // Projektion des Punktes auf die unendliche Linie berechnen (gibt einen Faktor t zurück)
  // t = 0 bedeutet Projektion fällt exakt auf Startpunkt
  // t = 1 bedeutet Projektion fällt exakt auf Endpunkt
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lengthSquared;

  // Clamping: Wir limitieren t zwischen 0 und 1, damit wir auf dem Segment bleiben
  t = Math.max(0, Math.min(1, t));

  // Die exakten X/Y Koordinaten des projizierten Punktes auf dem Segment berechnen
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);

  // Distanz vom Klick-Punkt zum projizierten Punkt berechnen (Satz des Pythagoras)
  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}