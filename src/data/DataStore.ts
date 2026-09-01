// data/DataStore.ts
// Version: 2.23.0 | Updated: 2026-04-25 | By: Gemini Agent
// Data storage + series mutation layer. Indicator math is delegated to
// src/indicators/calc/* modules so DataStore stays thin.

import { calculateRSI, calculateStochastic, calculateCCI, calculateWoodiesCCI, calculateROC, calculateWilliamsR, calculateBalanceOfPower, calculateMomentum, calculateAroon, calculateAroonOscillator, calculateAwesomeOscillator, calculateBullBearPower, calculateTRIX, calculateElderForceIndex, calculateEaseOfMovement, calculateChandeMomentumOscillator, calculateDetrendedPriceOscillator, calculateCoppockCurve, calculatePringSpecialK, calculateUltimateOscillator, calculateUlcerIndex, calculateFisherTransform, calculateStochasticRSI, calculatePPO, calculateStochasticMomentumIndex, calculateTrueStrengthIndex, calculatePriceMomentumOscillator, calculateKnowSureThing, calculateRelativeVigorIndex, calculateRelativeVolatilityIndex, calculateCorrelationCoefficient, calculateConnorsRSI, calculatePerformance, calculateRankCorrelationIndex, calculateRciRibbon, calculateSmiErgodicIndicator, calculateSmiErgodicOscillator, calculateTrendStrengthIndex } from '../indicators/calc/momentum';
import { calculateSMA, calculateEMA, calculateMA, calculateALMA, calculateDEMA, calculateTEMA, calculateKAMA, calculateMcGinleyDynamic, calculateVWMA, calculateLeastSquaresMovingAverage, calculateWilliamsAlligator, calculateMovingAverageRibbon, calculateMedian, type MAMethod, type MASource } from '../indicators/calc/movingAverages';
import { calculateATR, calculateAverageDailyRange, calculateBBTrend, calculateBollingerPercentB, calculateBollingerBandwidth, calculateDonchianChannels, calculateKeltnerChannels, calculateChoppinessIndex, calculateEnvelope, calculateHistoricalVolatility, calculatePivotPointsStandard, calculateSupertrend, calculateParabolicSAR, calculateLinearRegressionChannel, calculateVortexIndicator, calculateChandelierExit, calculateChandeKrollStop, calculateVolatilityStop, calculateMassIndex } from '../indicators/calc/volatility';
import { calculateADX, calculateIchimoku } from '../indicators/calc/trend';
import { calculateTWAP, calculateVWAP, calculateVolumeSMA, calculateVolumeROC, calculateVolume24h, calculateVolumeDelta, calculateCumulativeVolumeDelta, calculateCumulativeVolumeIndex, calculateRelativeVolumeAtTime, calculateVolumeSpike, calculateOBV, calculateAccumulationDistribution, calculateChaikinMoneyFlow, calculateChaikinOscillator, calculateMoneyFlowIndex, calculateNegativeVolumeIndex, calculatePositiveVolumeIndex, calculatePriceVolumeTrend, calculatePercentageVolumeOscillator, calculateNetVolume, calculateKlingerOscillator, calculateUpDownVolume } from '../indicators/calc/volume';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number;
  sma20?: number;
  sma50?: number;
  ema20?: number;
  ema50?: number;
  [key: string]: number | string | undefined;  // Allow dynamic indicator keys
}

export class DataStore {
  private data: CandleData[] = [];
  private _replayLimit: number | null = null;

  constructor() {}

  /** Set OHLCV data externally (from API fetches) */
  public setData(data: CandleData[]) {
    this.data = data;
  }

  /** Replay: limit visible candle count. null = show all. */
  public setReplayLimit(limit: number | null) {
    this._replayLimit = limit;
  }

  public getReplayLimit(): number | null {
    return this._replayLimit;
  }

  /** Total candle count (ignoring replay limit) */
  public getTotalCount(): number {
    return this.data.length;
  }

  /** Prepend older data (for historical data loading). Returns the count of new candles added. */
  public prependData(olderData: CandleData[]): number {
    if (!olderData.length) return 0;
    // Filter duplicates (by timestamp)
    const existingTimestamps = new Set(this.data.map(d => d.timestamp));
    const newData = olderData.filter(d => !existingTimestamps.has(d.timestamp));
    if (!newData.length) return 0;
    this.data = [...newData, ...this.data];
    return newData.length;
  }

  /**
   * Merge indicator values (keyed by unix-seconds timestamp) into existing candles.
   * `keyPrefix` is prepended to each column name to avoid collisions between
   * multiple server indicators (e.g. `PY_ADX_adx`, `PY_ADX_di_plus`).
   * Returns the set of merged data keys.
   */
  public mergeIndicatorSeries(
    rows: Array<{ time: number; [col: string]: any }>,
    keyPrefix: string,
  ): string[] {
    const byTs = new Map<number, { [col: string]: any }>();
    for (const r of rows) byTs.set(r.time, r);

    const keys = new Set<string>();
    for (const candle of this.data) {
      // candle.timestamp is stored in ms — server indicator rows use unix seconds.
      const tsSec = Math.floor(candle.timestamp / 1000);
      const match = byTs.get(tsSec) || byTs.get(candle.timestamp);
      if (!match) continue;
      for (const [col, val] of Object.entries(match)) {
        if (col === 'time') continue;
        const k = `${keyPrefix}${col}`;
        if (typeof val === 'number') {
          (candle as any)[k] = val;
        } else if (typeof val === 'string') {
          const numeric = Number(val);
          (candle as any)[k] = Number.isFinite(numeric) ? numeric : val;
        } else {
          (candle as any)[k] = val == null ? undefined : String(val);
        }
        keys.add(k);
      }
    }
    return Array.from(keys);
  }

  /** Remove every data key starting with `keyPrefix` from every candle. */
  public removeIndicatorSeries(keyPrefix: string): void {
    for (const candle of this.data) {
      for (const k of Object.keys(candle)) {
        if (k.startsWith(keyPrefix)) delete (candle as any)[k];
      }
    }
  }

  /** Get the earliest timestamp in the data */
  public getEarliestTimestamp(): number | null {
    return this.data.length > 0 ? this.data[0].timestamp : null;
  }

  public getAllData(): CandleData[] {
    if (this._replayLimit !== null) {
      return this.data.slice(0, this._replayLimit);
    }
    return this.data;
  }

  public getVisibleData(startIndex: number, endIndex: number): CandleData[] {
    const dataLen = this._replayLimit !== null ? this._replayLimit : this.data.length;
    const start = Math.max(0, Math.floor(startIndex));
    const end = Math.min(dataLen - 1, Math.ceil(endIndex));
    return this.data.slice(start, end + 1);
  }

  public calculateRSI(period: number = 14) {
    calculateRSI(this.data, period);
  }

  /** Calculate Simple Moving Average and store as dynamic key */
  public calculateSMA(period: number, key: string = `sma${period}`) {
    calculateSMA(this.data, period, key);
  }

  /**
   * Generic Moving Average (MetaTrader-style).
   *   method : 'sma' | 'ema' | 'smma' (Smoothed / Wilder) | 'lwma' (Linear-Weighted)
   *   source : 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4'
   *   shift  : integer offset (positive = shift result forward into the future)
   *   key    : output dataKey stored on every candle
   */
  public calculateMA(
    period: number,
    method: MAMethod,
    source: MASource,
    shift: number,
    key: string,
  ): void {
    calculateMA(this.data, period, method, source, shift, key);
  }

  public calculateALMA(
    period: number = 9,
    key: string = 'alma',
    source: MASource = 'close',
    shift: number = 0,
    offset: number = 0.85,
    sigma: number = 6,
  ): void {
    calculateALMA(this.data, period, key, source, shift, offset, sigma);
  }

  public calculateDEMA(
    period: number = 20,
    key: string = 'dema',
    source: MASource = 'close',
    shift: number = 0,
  ): void {
    calculateDEMA(this.data, period, key, source, shift);
  }

  public calculateTEMA(
    period: number = 20,
    key: string = 'tema',
    source: MASource = 'close',
    shift: number = 0,
  ): void {
    calculateTEMA(this.data, period, key, source, shift);
  }

  public calculateKAMA(
    period: number = 10,
    key: string = 'kama',
    source: MASource = 'close',
    shift: number = 0,
    fastPeriod: number = 2,
    slowPeriod: number = 30,
  ): void {
    calculateKAMA(this.data, period, key, source, shift, fastPeriod, slowPeriod);
  }

  public calculateMcGinleyDynamic(
    period: number = 14,
    key: string = 'mcginley_dynamic',
    source: MASource = 'close',
    shift: number = 0,
  ): void {
    calculateMcGinleyDynamic(this.data, period, key, source, shift);
  }

  public calculateVWMA(
    period: number = 20,
    key: string = 'vwma',
    source: MASource = 'close',
    shift: number = 0,
  ): void {
    calculateVWMA(this.data, period, key, source, shift);
  }

  public calculateLeastSquaresMovingAverage(
    period: number = 25,
    key: string = 'least_squares_moving_average',
    source: MASource = 'close',
    shift: number = 0,
  ): void {
    calculateLeastSquaresMovingAverage(this.data, period, key, source, shift);
  }

  public calculateWilliamsAlligator(
    jawPeriod: number = 13,
    jawShift: number = 8,
    teethPeriod: number = 8,
    teethShift: number = 5,
    lipsPeriod: number = 5,
    lipsShift: number = 3,
    source: MASource = 'hl2',
    jawKey: string = 'alligator_jaw',
    teethKey: string = 'alligator_teeth',
    lipsKey: string = 'alligator_lips',
  ): void {
    calculateWilliamsAlligator(this.data, jawPeriod, jawShift, teethPeriod, teethShift, lipsPeriod, lipsShift, source, jawKey, teethKey, lipsKey);
  }

  public calculateMovingAverageRibbon(
    periods: number[] = [20, 30, 40, 50, 60, 70],
    method: MAMethod = 'sma',
    source: MASource = 'close',
    shift: number = 0,
    keyPrefix: string = 'ma_ribbon_',
  ): void {
    calculateMovingAverageRibbon(this.data, periods, method, source, shift, keyPrefix);
  }

  public calculateMedian(key: string = 'median'): void {
    calculateMedian(this.data, key);
  }

  /** Remove a single dynamic data key from every candle (MA removal, etc). */
  public removeSeriesKey(key: string): void {
    for (const c of this.data) {
      if (key in c) delete (c as any)[key];
    }
  }

  /** Calculate Exponential Moving Average and store as dynamic key */
  public calculateEMA(period: number, key: string = `ema${period}`) {
    calculateEMA(this.data, period, key);
  }

  /** Calculate Stochastic Oscillator (%K and %D) */
  public calculateStochastic(kPeriod: number = 14, smoothK: number = 3, dPeriod: number = 3) {
    calculateStochastic(this.data, kPeriod, smoothK, dPeriod);
  }

  /** Calculate Average True Range (ATR) */
  public calculateATR(period: number = 14) {
    calculateATR(this.data, period);
  }

  public calculateAverageDailyRange(period: number = 14, key: string = 'average_daily_range'): void {
    calculateAverageDailyRange(this.data, period, key);
  }

  /** Calculate Bollinger Bands %B. */
  public calculateBollingerPercentB(period: number = 20, stdDev: number = 2, key: string = 'bollinger_percent_b') {
    calculateBollingerPercentB(this.data, period, stdDev, key);
  }

  /** Calculate Bollinger BandWidth. */
  public calculateBollingerBandwidth(period: number = 20, stdDev: number = 2, key: string = 'bollinger_bandwidth') {
    calculateBollingerBandwidth(this.data, period, stdDev, key);
  }

  public calculateBBTrend(shortPeriod: number = 20, longPeriod: number = 50, stdDev: number = 2, key: string = 'bbtrend') {
    calculateBBTrend(this.data, shortPeriod, longPeriod, stdDev, key);
  }


  public calculatePivotPointsStandard(keyPrefix: string = 'pivot_standard_') {
    calculatePivotPointsStandard(this.data, keyPrefix);
  }

  /** Calculate Donchian Channels. */
  public calculateDonchianChannels(
    period: number = 20,
    upperKey: string = 'donchian_upper',
    middleKey: string = 'donchian_middle',
    lowerKey: string = 'donchian_lower',
  ) {
    calculateDonchianChannels(this.data, period, upperKey, middleKey, lowerKey);
  }

  /** Calculate Keltner Channels. */
  public calculateKeltnerChannels(
    period: number = 20,
    atrPeriod: number = 10,
    multiplier: number = 2,
    source: MASource = 'close',
    upperKey: string = 'keltner_upper',
    middleKey: string = 'keltner_middle',
    lowerKey: string = 'keltner_lower',
  ) {
    calculateKeltnerChannels(this.data, period, atrPeriod, multiplier, source, upperKey, middleKey, lowerKey);
  }

  /** Calculate Envelope bands. */
  public calculateEnvelope(
    period: number = 20,
    percentage: number = 2.5,
    source: MASource = 'close',
    maType: 'sma' | 'ema' = 'sma',
    upperKey: string = 'envelope_upper',
    middleKey: string = 'envelope_middle',
    lowerKey: string = 'envelope_lower',
  ) {
    calculateEnvelope(this.data, period, percentage, source, maType, upperKey, middleKey, lowerKey);
  }

  /** Calculate Historical Volatility. */
  public calculateHistoricalVolatility(
    period: number = 20,
    key: string = 'historical_volatility',
    source: MASource = 'close',
    annualization: number = 252,
  ) {
    calculateHistoricalVolatility(this.data, period, key, source, annualization);
  }

  public calculateSupertrend(
    atrPeriod: number = 10,
    multiplier: number = 3,
    upKey: string = 'supertrend_up',
    downKey: string = 'supertrend_down',
    directionKey: string = 'supertrend_direction',
  ) {
    calculateSupertrend(this.data, atrPeriod, multiplier, upKey, downKey, directionKey);
  }

  public calculateParabolicSAR(
    step: number = 0.02,
    maxStep: number = 0.2,
    key: string = 'parabolic_sar',
  ) {
    calculateParabolicSAR(this.data, step, maxStep, key);
  }

  public calculateLinearRegressionChannel(
    period: number = 100,
    source: MASource = 'close',
    deviations: number = 2,
    upperKey: string = 'linear_regression_upper',
    middleKey: string = 'linear_regression_middle',
    lowerKey: string = 'linear_regression_lower',
  ) {
    calculateLinearRegressionChannel(this.data, period, source, deviations, upperKey, middleKey, lowerKey);
  }

  public calculateVortexIndicator(
    period: number = 14,
    positiveKey: string = 'vortex_positive',
    negativeKey: string = 'vortex_negative',
  ): void {
    calculateVortexIndicator(this.data, period, positiveKey, negativeKey);
  }

  public calculateChandelierExit(
    period: number = 22,
    atrPeriod: number = 22,
    multiplier: number = 3,
    longKey: string = 'chandelier_long',
    shortKey: string = 'chandelier_short',
  ): void {
    calculateChandelierExit(this.data, period, atrPeriod, multiplier, longKey, shortKey);
  }

  public calculateChandeKrollStop(
    atrPeriod: number = 10,
    stopPeriod: number = 9,
    multiplier: number = 1,
    longKey: string = 'chande_kroll_long',
    shortKey: string = 'chande_kroll_short',
  ): void {
    calculateChandeKrollStop(this.data, atrPeriod, stopPeriod, multiplier, longKey, shortKey);
  }

  public calculateVolatilityStop(
    atrPeriod: number = 20,
    multiplier: number = 2,
    upKey: string = 'volatility_stop_up',
    downKey: string = 'volatility_stop_down',
    directionKey: string = 'volatility_stop_direction',
  ): void {
    calculateVolatilityStop(this.data, atrPeriod, multiplier, upKey, downKey, directionKey);
  }

  public calculateMassIndex(
    emaPeriod: number = 9,
    sumPeriod: number = 25,
    key: string = 'mass_index',
  ): void {
    calculateMassIndex(this.data, emaPeriod, sumPeriod, key);
  }

  /** Calculate Choppiness Index. */
  public calculateChoppinessIndex(period: number = 14, key: string = 'choppiness_index') {
    calculateChoppinessIndex(this.data, period, key);
  }












  /** Calculate ADX (+DI/-DI) with Wilder smoothing. */
  public calculateADX(period: number = 14) {
    calculateADX(this.data, period);
  }

  /** Calculate Commodity Channel Index (CCI). */
  public calculateCCI(period: number = 20, key: string = 'cci') {
    calculateCCI(this.data, period, key);
  }

  public calculateWoodiesCCI(
    trendPeriod: number = 14,
    turboPeriod: number = 6,
    trendKey: string = 'woodies_cci',
    turboKey: string = 'woodies_turbo_cci',
  ): void {
    calculateWoodiesCCI(this.data, trendPeriod, turboPeriod, trendKey, turboKey);
  }

  /** Calculate Rate of Change (ROC). */
  public calculateROC(period: number = 12, key: string = 'roc') {
    calculateROC(this.data, period, key);
  }

  /** Calculate Williams %R. */
  public calculateWilliamsR(period: number = 14, key: string = 'williams_r') {
    calculateWilliamsR(this.data, period, key);
  }

  /** Calculate Balance of Power. */
  public calculateBalanceOfPower(key: string = 'balance_of_power') {
    calculateBalanceOfPower(this.data, key);
  }

  /** Calculate Awesome Oscillator. */
  public calculateAwesomeOscillator(shortPeriod: number = 5, longPeriod: number = 34, key: string = 'awesome_oscillator') {
    calculateAwesomeOscillator(this.data, shortPeriod, longPeriod, key);
  }

  /** Calculate Bull Bear Power. */
  public calculateBullBearPower(period: number = 13, bullKey: string = 'bull_power', bearKey: string = 'bear_power') {
    calculateBullBearPower(this.data, period, bullKey, bearKey);
  }

  /** Calculate Momentum. */
  public calculateMomentum(period: number = 10, key: string = 'momentum') {
    calculateMomentum(this.data, period, key);
  }

  public calculateCorrelationCoefficient(
    period: number = 20,
    source: MASource = 'close',
    key: string = 'correlation_coefficient',
  ): void {
    calculateCorrelationCoefficient(this.data, period, source, key);
  }

  public calculateConnorsRSI(
    rsiPeriod: number = 3,
    streakPeriod: number = 2,
    rankPeriod: number = 100,
    source: MASource = 'close',
    key: string = 'connors_rsi',
  ): void {
    calculateConnorsRSI(this.data, rsiPeriod, streakPeriod, rankPeriod, source, key);
  }

  public calculateRankCorrelationIndex(
    period: number = 9,
    source: MASource = 'close',
    key: string = 'rank_correlation_index',
  ): void {
    calculateRankCorrelationIndex(this.data, period, source, key);
  }

  public calculatePerformance(
    source: MASource = 'close',
    key: string = 'performance',
  ): void {
    calculatePerformance(this.data, source, key);
  }

  /** Calculate TRIX. */
  public calculateTRIX(period: number = 15, key: string = 'trix', source: MASource = 'close', shift: number = 0) {
    calculateTRIX(this.data, period, key, source, shift);
  }

  /** Calculate Elder Force Index. */
  public calculateElderForceIndex(period: number = 13, key: string = 'elder_force_index') {
    calculateElderForceIndex(this.data, period, key);
  }

  /** Calculate Ease of Movement. */
  public calculateEaseOfMovement(period: number = 14, divisor: number = 100000000, key: string = 'ease_of_movement') {
    calculateEaseOfMovement(this.data, period, divisor, key);
  }

  /** Calculate Chande Momentum Oscillator. */
  public calculateChandeMomentumOscillator(period: number = 14, key: string = 'chande_momentum_oscillator', source: MASource = 'close') {
    calculateChandeMomentumOscillator(this.data, period, key, source);
  }

  /** Calculate Detrended Price Oscillator. */
  public calculateDetrendedPriceOscillator(period: number = 20, key: string = 'detrended_price_oscillator', source: MASource = 'close') {
    calculateDetrendedPriceOscillator(this.data, period, key, source);
  }

  /** Calculate Coppock Curve. */
  public calculateCoppockCurve(
    longPeriod: number = 14,
    shortPeriod: number = 11,
    wmaPeriod: number = 10,
    key: string = 'coppock_curve',
    source: MASource = 'close',
  ) {
    calculateCoppockCurve(this.data, longPeriod, shortPeriod, wmaPeriod, key, source);
  }

  public calculatePringSpecialK(
    source: MASource = 'close',
    key: string = 'pring_special_k',
  ): void {
    calculatePringSpecialK(this.data, source, key);
  }

  /** Calculate Ultimate Oscillator. */
  public calculateUltimateOscillator(
    shortPeriod: number = 7,
    midPeriod: number = 14,
    longPeriod: number = 28,
    key: string = 'ultimate_oscillator',
  ) {
    calculateUltimateOscillator(this.data, shortPeriod, midPeriod, longPeriod, key);
  }

  /** Calculate Ulcer Index. */
  public calculateUlcerIndex(
    period: number = 14,
    key: string = 'ulcer_index',
    source: MASource = 'close',
  ) {
    calculateUlcerIndex(this.data, period, key, source);
  }

  /** Calculate Fisher Transform. */
  public calculateFisherTransform(
    period: number = 9,
    key: string = 'fisher_transform',
    source: MASource = 'hl2',
  ) {
    calculateFisherTransform(this.data, period, key, source);
  }

  public calculateStochasticRSI(
    rsiPeriod: number = 14,
    stochPeriod: number = 14,
    smoothK: number = 3,
    dPeriod: number = 3,
    source: MASource = 'close',
    kKey: string = 'stoch_rsi_k',
    dKey: string = 'stoch_rsi_d',
  ) {
    calculateStochasticRSI(this.data, rsiPeriod, stochPeriod, smoothK, dPeriod, source, kKey, dKey);
  }

  public calculatePPO(
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    source: MASource = 'close',
    lineKey: string = 'ppo_line',
    signalKey: string = 'ppo_signal',
    histKey: string = 'ppo_hist',
  ): void {
    calculatePPO(this.data, fastPeriod, slowPeriod, signalPeriod, source, lineKey, signalKey, histKey);
  }

  public calculateStochasticMomentumIndex(
    period: number = 14,
    smoothPeriod: number = 3,
    doubleSmoothPeriod: number = 3,
    signalPeriod: number = 3,
    smiKey: string = 'smi',
    signalKey: string = 'smi_signal',
  ): void {
    calculateStochasticMomentumIndex(this.data, period, smoothPeriod, doubleSmoothPeriod, signalPeriod, smiKey, signalKey);
  }

  public calculateTrueStrengthIndex(
    longPeriod: number = 25,
    shortPeriod: number = 13,
    signalPeriod: number = 13,
    source: MASource = 'close',
    tsiKey: string = 'tsi',
    signalKey: string = 'tsi_signal',
  ): void {
    calculateTrueStrengthIndex(this.data, longPeriod, shortPeriod, signalPeriod, source, tsiKey, signalKey);
  }

  public calculateRciRibbon(
    shortPeriod: number = 9,
    midPeriod: number = 26,
    longPeriod: number = 52,
    source: MASource = 'close',
    shortKey: string = 'rci_ribbon_short',
    midKey: string = 'rci_ribbon_mid',
    longKey: string = 'rci_ribbon_long',
  ): void {
    calculateRciRibbon(this.data, shortPeriod, midPeriod, longPeriod, source, shortKey, midKey, longKey);
  }

  public calculateSmiErgodicIndicator(
    longPeriod: number = 20,
    shortPeriod: number = 5,
    signalPeriod: number = 5,
    source: MASource = 'close',
    smiKey: string = 'smi_ergodic',
    signalKey: string = 'smi_ergodic_signal',
  ): void {
    calculateSmiErgodicIndicator(this.data, longPeriod, shortPeriod, signalPeriod, source, smiKey, signalKey);
  }

  public calculateSmiErgodicOscillator(
    longPeriod: number = 20,
    shortPeriod: number = 5,
    signalPeriod: number = 5,
    source: MASource = 'close',
    key: string = 'smi_ergodic_oscillator',
  ): void {
    calculateSmiErgodicOscillator(this.data, longPeriod, shortPeriod, signalPeriod, source, key);
  }

  public calculateTrendStrengthIndex(
    period: number = 20,
    source: MASource = 'close',
    key: string = 'trend_strength_index',
  ): void {
    calculateTrendStrengthIndex(this.data, period, source, key);
  }

  public calculatePriceMomentumOscillator(
    firstPeriod: number = 35,
    secondPeriod: number = 20,
    signalPeriod: number = 10,
    source: MASource = 'close',
    pmoKey: string = 'pmo',
    signalKey: string = 'pmo_signal',
  ): void {
    calculatePriceMomentumOscillator(this.data, firstPeriod, secondPeriod, signalPeriod, source, pmoKey, signalKey);
  }

  public calculateKnowSureThing(
    roc1: number = 10,
    roc2: number = 15,
    roc3: number = 20,
    roc4: number = 30,
    sma1: number = 10,
    sma2: number = 10,
    sma3: number = 10,
    sma4: number = 15,
    signalPeriod: number = 9,
    source: MASource = 'close',
    kstKey: string = 'kst',
    signalKey: string = 'kst_signal',
  ): void {
    calculateKnowSureThing(this.data, roc1, roc2, roc3, roc4, sma1, sma2, sma3, sma4, signalPeriod, source, kstKey, signalKey);
  }

  public calculateRelativeVigorIndex(
    period: number = 10,
    rviKey: string = 'rvi',
    signalKey: string = 'rvi_signal',
  ): void {
    calculateRelativeVigorIndex(this.data, period, rviKey, signalKey);
  }

  public calculateRelativeVolatilityIndex(
    period: number = 10,
    source: MASource = 'close',
    key: string = 'relative_volatility_index',
  ): void {
    calculateRelativeVolatilityIndex(this.data, period, source, key);
  }

  /** Calculate Aroon up/down lines. */
  public calculateAroon(period: number = 14, upKey: string = 'aroon_up', downKey: string = 'aroon_down') {
    calculateAroon(this.data, period, upKey, downKey);
  }

  /** Calculate Aroon Oscillator. */
  public calculateAroonOscillator(period: number = 14, key: string = 'aroon_oscillator') {
    calculateAroonOscillator(this.data, period, key);
  }

  /** Calculate VWAP – resets each trading day (3.9) */
  public calculateVWAP() {
    calculateVWAP(this.data);
  }

  public calculateTWAP() {
    calculateTWAP(this.data);
  }

  /** Calculate volume moving average on the volume series. */
  public calculateVolumeSMA(period: number = 20, key: string = 'volume_sma') {
    calculateVolumeSMA(this.data, period, key);
  }

  /** Calculate volume rate of change. */
  public calculateVolumeROC(period: number = 10, key: string = 'volume_roc') {
    calculateVolumeROC(this.data, period, key);
  }

  public calculatePercentageVolumeOscillator(
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    lineKey: string = 'pvo_line',
    signalKey: string = 'pvo_signal',
    histKey: string = 'pvo_hist',
  ): void {
    calculatePercentageVolumeOscillator(this.data, fastPeriod, slowPeriod, signalPeriod, lineKey, signalKey, histKey);
  }

  public calculateNetVolume(key: string = 'net_volume'): void {
    calculateNetVolume(this.data, key);
  }

  public calculateUpDownVolume(
    upKey: string = 'up_volume',
    downKey: string = 'down_volume',
  ): void {
    calculateUpDownVolume(this.data, upKey, downKey);
  }

  public calculateVolumeDelta(key: string = 'volume_delta'): void {
    calculateVolumeDelta(this.data, key);
  }

  public calculateCumulativeVolumeDelta(key: string = 'cumulative_volume_delta'): void {
    calculateCumulativeVolumeDelta(this.data, key);
  }

  public calculateCumulativeVolumeIndex(key: string = 'cumulative_volume_index'): void {
    calculateCumulativeVolumeIndex(this.data, key);
  }

  public calculateVolume24h(key: string = 'volume_24h'): void {
    calculateVolume24h(this.data, key);
  }

  public calculateRelativeVolumeAtTime(lookback: number = 20, key: string = 'relative_volume_at_time'): void {
    calculateRelativeVolumeAtTime(this.data, lookback, key);
  }

  public calculateKlingerOscillator(
    fastPeriod: number = 34,
    slowPeriod: number = 55,
    signalPeriod: number = 13,
    lineKey: string = 'klinger_oscillator',
    signalKey: string = 'klinger_signal',
  ): void {
    calculateKlingerOscillator(this.data, fastPeriod, slowPeriod, signalPeriod, lineKey, signalKey);
  }

  /** Mark candles with unusually high volume. */
  public calculateVolumeSpike(
    period: number = 20,
    multiplier: number = 1.5,
    valueKey = 'volume_spike_value',
    typeKey = 'volume_spike_type',
    labelKey = 'volume_spike_label',
    ratioKey = 'volume_spike_ratio',
  ) {
    calculateVolumeSpike(this.data, period, multiplier, valueKey, typeKey, labelKey, ratioKey);
  }

  /** Calculate On Balance Volume. */
  public calculateOBV(key: string = 'obv') {
    calculateOBV(this.data, key);
  }

  /** Calculate Accumulation/Distribution. */
  public calculateAccumulationDistribution(key: string = 'accumulation_distribution') {
    calculateAccumulationDistribution(this.data, key);
  }

  /** Calculate Chaikin Money Flow. */
  public calculateChaikinMoneyFlow(period: number = 20, key: string = 'chaikin_money_flow') {
    calculateChaikinMoneyFlow(this.data, period, key);
  }

  /** Calculate Chaikin Oscillator. */
  public calculateChaikinOscillator(fastPeriod: number = 3, slowPeriod: number = 10, key: string = 'chaikin_oscillator') {
    calculateChaikinOscillator(this.data, fastPeriod, slowPeriod, key);
  }

  /** Calculate Money Flow Index. */
  public calculateMoneyFlowIndex(period: number = 14, key: string = 'money_flow_index') {
    calculateMoneyFlowIndex(this.data, period, key);
  }

  /** Calculate Negative Volume Index. */
  public calculateNegativeVolumeIndex(key: string = 'negative_volume_index') {
    calculateNegativeVolumeIndex(this.data, key);
  }

  /** Calculate Positive Volume Index. */
  public calculatePositiveVolumeIndex(key: string = 'positive_volume_index') {
    calculatePositiveVolumeIndex(this.data, key);
  }

  /** Calculate Price Volume Trend. */
  public calculatePriceVolumeTrend(key: string = 'price_volume_trend') {
    calculatePriceVolumeTrend(this.data, key);
  }








  /** Calculate Ichimoku Cloud components (3.11) */
  public calculateIchimoku(tenkan = 9, kijun = 26, senkouB = 52, displacement = 26) {
    calculateIchimoku(this.data, tenkan, kijun, senkouB, displacement);
  }

} // <--- Das ist die finale Klammer der Klasse

/** Heikin-Ashi transformed copy of CandleData[] */
export interface HeikinAshiData {
  timestamp: number;
  open: number; high: number; low: number; close: number;
  volume: number;
}

export function computeHeikinAshi(data: CandleData[]): HeikinAshiData[] {
  if (!data.length) return [];
  const ha: HeikinAshiData[] = new Array(data.length);
  const c0 = data[0];
  ha[0] = {
    timestamp: c0.timestamp,
    open: (c0.open + c0.close) / 2,
    close: (c0.open + c0.high + c0.low + c0.close) / 4,
    high: c0.high,
    low: c0.low,
    volume: c0.volume,
  };
  ha[0].high = Math.max(c0.high, ha[0].open, ha[0].close);
  ha[0].low = Math.min(c0.low, ha[0].open, ha[0].close);
  for (let i = 1; i < data.length; i++) {
    const d = data[i];
    const haClose = (d.open + d.high + d.low + d.close) / 4;
    const haOpen = (ha[i - 1].open + ha[i - 1].close) / 2;
    ha[i] = {
      timestamp: d.timestamp,
      open: haOpen,
      close: haClose,
      high: Math.max(d.high, haOpen, haClose),
      low: Math.min(d.low, haOpen, haClose),
      volume: d.volume,
    };
  }
  return ha;
}