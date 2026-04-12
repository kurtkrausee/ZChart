// src/math/indicators/SMA.ts

/**
 * Berechnet den Simple Moving Average (SMA) modular.
 * * @param data Das Array mit den Kerzendaten
 * @param period Die Periode (z.B. 20 für SMA20)
 * @param sourceKey Welcher Preis genutzt wird (Standard: 'close')
 * @param targetKey Unter welchem Namen das Ergebnis gespeichert wird (z.B. 'sma_20')
 */
export function calculateSMA(data: any[], period: number, sourceKey: string = 'close', targetKey: string) {
    if (!data || data.length < period) return;

    let sum = 0;

    for (let i = 0; i < data.length; i++) {
        // Wert zum aktuellen Summen-Fenster hinzufügen
        sum += data[i][sourceKey] || 0;

        // Wenn wir die Periode erreicht haben, berechnen wir den Durchschnitt
        if (i >= period) {
            sum -= data[i - period][sourceKey] || 0; // Den ältesten Wert aus dem Fenster werfen
            data[i][targetKey] = sum / period;
        } else if (i === period - 1) {
            // Der allererste berechnete Wert
            data[i][targetKey] = sum / period;
        }
    }
}