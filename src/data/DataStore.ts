// data/DataStore.ts

// 1. Definition: Wie sieht EINE Kerze aus?
export interface CandleData {
  time: number; // Unix Timestamp (z.B. 1672531200000 für 01.01.2023)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class DataStore {
  private data: CandleData[] = [];

  constructor() {
    this.generateDummyData(); // Füllt den Store direkt beim Start
  }

  // Gibt die komplette Liste zurück
  public getAllData(): CandleData[] {
    return this.data;
  }

  // WICHTIG FÜR PERFORMANCE: Gibt nur die Kerzen zurück, die auf den Bildschirm passen
  public getVisibleData(startIndex: number, endIndex: number): CandleData[] {
    // Math.max/min schützt uns vor Abstürzen, falls wir über den Rand hinaus scrollen
    const start = Math.max(0, Math.floor(startIndex));
    const end = Math.min(this.data.length - 1, Math.ceil(endIndex));
    return this.data.slice(start, end + 1);
  }

  // Generiert 500 Dummy-Kerzen (ersetzt unsere alte Sinus-Wellen-Logik aus dem ChartManager)
  private generateDummyData() {
    let currentTime = Date.now() - (500 * 24 * 60 * 60 * 1000); // Startet 500 Tage in der Vergangenheit
    const dayInMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i <= 500; i++) {
      // Basis-Wert über Sinus-Kurve (damit es nach Chart aussieht)
      const basePrice = 50 + Math.sin(i * 0.1) * 30;
      
      // Kerzen-Eigenschaften mit etwas Zufall versehen
      const open = basePrice + (Math.random() * 4 - 2);
      const close = basePrice + (Math.random() * 6 - 3);
      
      // High ist immer höher als Open/Close, Low ist immer tiefer
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;

      this.data.push({
        time: currentTime,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000
      });
      
      currentTime += dayInMs; // Einen Tag weiter springen
    }
  }
}