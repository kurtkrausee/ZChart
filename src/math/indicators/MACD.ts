// src/math/indicators/MACD.ts

// Hilfsfunktion für den EMA (Exponential Moving Average)
function calculateEMA(data: any[], period: number, sourceKey: string, targetKey: string) {
    if (data.length < period) return;
    
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((sum, d) => sum + d[sourceKey], 0) / period;
    
    data[period - 1][targetKey] = ema;
    
    for (let i = period; i < data.length; i++) {
        ema = (data[i][sourceKey] - ema) * k + ema;
        data[i][targetKey] = ema;
    }
}

export function calculateMACD(
    data: any[], 
    fastPeriod: number = 12, 
    slowPeriod: number = 26, 
    signalPeriod: number = 9, 
    targetKey: string
) {
    if (data.length < slowPeriod + signalPeriod) return;

    // 1. Fast EMA und Slow EMA berechnen (temporär)
    calculateEMA(data, fastPeriod, 'close', '_temp_ema_fast');
    calculateEMA(data, slowPeriod, 'close', '_temp_ema_slow');

    // 2. MACD Linie berechnen (Fast - Slow)
    for (let i = slowPeriod - 1; i < data.length; i++) {
        const fast = data[i]['_temp_ema_fast'];
        const slow = data[i]['_temp_ema_slow'];
        data[i][`${targetKey}_macd`] = fast - slow;
    }

    // 3. Signal Linie berechnen (EMA der MACD Linie)
    // Wir nutzen hier unsere EMA Funktion, aber als Source unseren neu berechneten MACD-Wert
    calculateEMA(data.slice(slowPeriod - 1), signalPeriod, `${targetKey}_macd`, `${targetKey}_signal`);

    // 4. Histogramm berechnen (MACD - Signal)
    for (let i = slowPeriod + signalPeriod - 2; i < data.length; i++) {
        const macd = data[i][`${targetKey}_macd`];
        const signal = data[i][`${targetKey}_signal`];
        
        if (macd !== undefined && signal !== undefined) {
            data[i][`${targetKey}_hist`] = macd - signal;
        }
    }
}