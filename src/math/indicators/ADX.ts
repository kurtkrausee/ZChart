// src/math/indicators/ADX.ts

export function calculateADX(data: any[], period: number = 14, targetKey: string) {
    if (data.length <= period * 2) return;

    let tr = new Array(data.length).fill(0);
    let plusDM = new Array(data.length).fill(0);
    let minusDM = new Array(data.length).fill(0);

    // 1. True Range und Directional Movement berechnen
    for (let i = 1; i < data.length; i++) {
        const highDiff = data[i].high - data[i - 1].high;
        const lowDiff = data[i - 1].low - data[i].low;

        tr[i] = Math.max(
            data[i].high - data[i].low,
            Math.abs(data[i].high - data[i - 1].close),
            Math.abs(data[i].low - data[i - 1].close)
        );

        plusDM[i] = (highDiff > lowDiff && highDiff > 0) ? highDiff : 0;
        minusDM[i] = (lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0;
    }

    // Hilfsfunktion: Wilder's Smoothing
    const smooth = (arr: number[]) => {
        let res = new Array(data.length).fill(0);
        let sum = 0;
        for (let i = 1; i <= period; i++) sum += arr[i];
        res[period] = sum;
        for (let i = period + 1; i < data.length; i++) {
            res[i] = res[i - 1] - (res[i - 1] / period) + arr[i];
        }
        return res;
    };

    const smoothedTR = smooth(tr);
    const smoothedPlusDM = smooth(plusDM);
    const smoothedMinusDM = smooth(minusDM);

    let dx = new Array(data.length).fill(0);

    // 2. +DI, -DI und DX berechnen
    for (let i = period; i < data.length; i++) {
        const diPlus = smoothedTR[i] === 0 ? 0 : (smoothedPlusDM[i] / smoothedTR[i]) * 100;
        const diMinus = smoothedTR[i] === 0 ? 0 : (smoothedMinusDM[i] / smoothedTR[i]) * 100;

        data[i][`${targetKey}_plusDI`] = diPlus;
        data[i][`${targetKey}_minusDI`] = diMinus;

        const diSum = diPlus + diMinus;
        dx[i] = diSum === 0 ? 0 : (Math.abs(diPlus - diMinus) / diSum) * 100;
    }

    // 3. ADX berechnen (Geglätteter DX)
    let adxSum = 0;
    for (let i = period; i < period * 2; i++) adxSum += dx[i];
    data[period * 2 - 1][`${targetKey}_adx`] = adxSum / period;

    for (let i = period * 2; i < data.length; i++) {
        data[i][`${targetKey}_adx`] = ((data[i - 1][`${targetKey}_adx`] * (period - 1)) + dx[i]) / period;
    }
}