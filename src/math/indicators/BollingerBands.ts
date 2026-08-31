export function calculateBB(data: any[], period: number = 20, stdDev: number = 2, targetKey: string) {
    if (data.length < period) return;

    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const prices = slice.map(d => d.close);
        
        // Mittelwert (Basis)
        const sma = prices.reduce((a, b) => a + b, 0) / period;
        
        // Standardabweichung
        const squareDiffs = prices.map(p => Math.pow(p - sma, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / period;
        const sd = Math.sqrt(avgSquareDiff);

        // Wir speichern 3 Werte an die Kerze!
        data[i][`${targetKey}_mid`] = sma;
        data[i][`${targetKey}_upper`] = sma + (stdDev * sd);
        data[i][`${targetKey}_lower`] = sma - (stdDev * sd);
    }
}