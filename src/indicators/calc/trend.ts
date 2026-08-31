// indicators/calc/trend.ts
// Version: 1.0.0 | Updated: 2026-04-21 | By: GitHub Copilot

import type { CandleData } from '../../data/DataStore';

export function calculateADX(
  data: CandleData[],
  period = 14,
  adxKey = 'adx',
  plusKey = 'di_plus',
  minusKey = 'di_minus',
): void {
  if (data.length < 3 || period < 2) return;

  const tr: number[] = new Array(data.length).fill(0);
  const plusDM: number[] = new Array(data.length).fill(0);
  const minusDM: number[] = new Array(data.length).fill(0);

  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;

    const hl = data[i].high - data[i].low;
    const hc = Math.abs(data[i].high - data[i - 1].close);
    const lc = Math.abs(data[i].low - data[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  let atrWilder = tr[1];
  let plusWilder = plusDM[1];
  let minusWilder = minusDM[1];
  let adxWilder: number | undefined;

  for (let i = 1; i < data.length; i++) {
    if (i > 1) {
      atrWilder = atrWilder + (tr[i] - atrWilder) / period;
      plusWilder = plusWilder + (plusDM[i] - plusWilder) / period;
      minusWilder = minusWilder + (minusDM[i] - minusWilder) / period;
    }

    const plusDi = atrWilder > 0 ? (100 * plusWilder) / atrWilder : undefined;
    const minusDi = atrWilder > 0 ? (100 * minusWilder) / atrWilder : undefined;

    data[i][plusKey] = i >= period ? plusDi : undefined;
    data[i][minusKey] = i >= period ? minusDi : undefined;

    if (plusDi === undefined || minusDi === undefined || (plusDi + minusDi) === 0 || i < period) {
      data[i][adxKey] = undefined;
      continue;
    }

    const dx = (100 * Math.abs(plusDi - minusDi)) / (plusDi + minusDi);
    adxWilder = adxWilder === undefined ? dx : adxWilder + (dx - adxWilder) / period;
    data[i][adxKey] = adxWilder;
  }
}

export function calculateIchimoku(
  data: CandleData[],
  tenkan = 9,
  kijun = 26,
  senkouB = 52,
  displacement = 26,
): void {
  const len = data.length;
  if (len < senkouB) return;

  const midHL = (start: number, end: number) => {
    let high = -Infinity;
    let low = Infinity;
    for (let i = start; i <= end; i++) {
      if (data[i].high > high) high = data[i].high;
      if (data[i].low < low) low = data[i].low;
    }
    return (high + low) / 2;
  };

  for (let i = 0; i < len; i++) {
    data[i].ichimoku_tenkan = i >= tenkan - 1 ? midHL(i - tenkan + 1, i) : undefined;
    data[i].ichimoku_kijun = i >= kijun - 1 ? midHL(i - kijun + 1, i) : undefined;
    if (i >= displacement) data[i - displacement].ichimoku_chikou = data[i].close;
  }

  for (let i = 0; i < len; i++) {
    const targetIdx = i + displacement;
    if (targetIdx >= len) break;
    if (data[i].ichimoku_tenkan !== undefined && data[i].ichimoku_kijun !== undefined) {
      data[targetIdx].ichimoku_senkou_a = ((data[i].ichimoku_tenkan as number) + (data[i].ichimoku_kijun as number)) / 2;
    }
    if (i >= senkouB - 1) {
      data[targetIdx].ichimoku_senkou_b = midHL(i - senkouB + 1, i);
    }
  }
}
