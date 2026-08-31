// zchart/themes/presets/lightPro.ts
// Version: 2.0.0 | Updated: 2026-05-05 | By: Agent
// P2: Light Pro — Light theme for daytime trading

import { registerTheme } from '../registry';
import type { DeepPartial } from '../../core/VisualSettings';
import type { VisualSettings } from '../../core/VisualSettings';

const settings: DeepPartial<VisualSettings> = {
  canvas: {
    background: { mode: 'solid', solidColor: '#ffffff', color: '#ffffff', colorTo: '#e8edf5' },
    grid: { mode: 'both', vertColor: '#e8eaed', horzColor: '#e8eaed' },
    crosshair: { color: '#9ca3af', style: 'cross', visible: true },
    watermark: { mode: 'off', color: 'rgba(0,0,0,0)', text: '' },
    scales: { textColor: '#6b7280', fontSize: 12, linesColor: '#e8eaed' },
    buttons: { navigation: 'mouseover', pane: 'mouseover' },
    margins: { top: 0, bottom: 0, rightBars: 5 },
  },
  symbol: {
    candle: {
      bodyUp: '#089981', bodyDown: '#f23645', bodyVisible: true,
      borderUp: '#089981', borderDown: '#f23645', borderVisible: true,
      wickUp: '#089981', wickDown: '#f23645', wickVisible: true, wickSync: true,
      hollow: false, colorBarsByPrevClose: false,
    },
    volume: { up: 'rgba(8, 153, 129, 0.4)', down: 'rgba(242, 54, 69, 0.4)', visible: true },
    chartStyle: 'candle_solid', precision: 'default', timezone: 'UTC', adjustDataForDividends: false,
  },
  statusLine: {
    visible: true, logo: true, title: true, titleMode: 'symbol', marketStatus: true,
    chartValues: true, barChange: true, volume: true, lastDayChange: true, backgroundOpacity: 0.15,
  },
  scales: {
    priceScale: { currencyUnit: '', scaleMode: 'normal', lockPriceToBarRatio: false, placement: 'right' },
    priceLabels: {
      labelsVisible: true, noOverlappingLabels: true, plusButton: true, countdownToBarClose: false,
      symbolLabel: { mode: 'symbol', color: '#6b7280' }, prePostMarket: false, highLowLines: true, bidAskLines: false,
    },
    timeScale: { dayOfWeekOnLabels: false, dateFormat: 'dd.MM.yyyy', timeFormat: '24h', saveLeftEdgeOnIntervalChange: true },
  },
  trading: {
    buySellButtons: true, executionSound: false, showOnlyRejectionNotifications: false,
    positionsAndOrders: true, reversePositionButton: true, profitLossValue: 'both',
    executionMarks: true, executionLabels: true, extendedPriceLines: true, orderAlignment: 'right',
    oneClickTrading: false, projectOrder: false, brackets: false, ordersInSnapshots: false,
  },
  alerts: {
    alertLinesVisible: true, alertLinesColor: '#3b82f6', onlyActiveAlerts: false,
    alertVolume: 0.5, autoHideToasts: true,
  },
  events: {
    ideas: false, dividends: false, splits: false, earnings: false,
    earningsBreaks: false, latestNews: false, newsNotification: false,
  },
};

registerTheme({
  id: 'lightPro',
  label: 'Light Pro',
  category: 'light',
  preview: { background: '#ffffff', text: '#6b7280', candleUp: '#089981', candleDown: '#f23645' },
  settings,
});
