// Pane.ts

import { PriceScale } from "../math/PriceScale";

export class Pane {
  public id: string;
  public heightWeight: number;
  public priceScale: PriceScale;

  constructor(id: string, heightWeight: number) {
    this.id = id;
    this.heightWeight = heightWeight;
    this.priceScale = new PriceScale();
  }
}