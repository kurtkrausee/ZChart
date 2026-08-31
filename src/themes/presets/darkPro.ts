// zchart/themes/presets/darkPro.ts
// Version: 2.0.0 | Updated: 2026-05-05 | By: Agent
// P2: Dark Pro — Default dark theme (Dashboard Standard)

import { registerTheme } from '../registry';
import type { DeepPartial } from '../../core/VisualSettings';
import type { VisualSettings } from '../../core/VisualSettings';

const settings: DeepPartial<VisualSettings> = {
  canvas: {
    background: { mode: 'solid', solidColor: '#131722', color: '#131722', colorTo: '#0a0e1a' },
    grid: { mode: 'both', vertColor: '#1e222d', horzColor: '#1e222d' },
    crosshair: { color: '#758696', style: 'cross', visible: true },
    watermark: { mode: 'off', color: 'rgba(0,0,0,0)', text: '' },
    scales: { textColor: '#94a3b8', fontSize: 12, linesColor: '#1e222d' },
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
    volume: { up: 'rgba(8, 153, 129, 0.5)', down: 'rgba(242, 54, 69, 0.5)', visible: true },
    chartStyle: 'candle_solid', precision: 'default', timezone: 'UTC', adjustDataForDividends: false,
  },
  statusLine: {
    visible: true, logo: true, title: true, titleMode: 'symbol', marketStatus: true,
    chartValues: true, barChange: true, volume: true, lastDayChange: true, backgroundOpacity: 0.3,
  },
  scales: {
    priceScale: { currencyUnit: '', scaleMode: 'normal', lockPriceToBarRatio: false, placement: 'right' },
    priceLabels: {
      labelsVisible: true, noOverlappingLabels: true, plusButton: true, countdownToBarClose: false,
      symbolLabel: { mode: 'symbol', color: '#94a3b8' }, prePostMarket: false, highLowLines: true, bidAskLines: false,
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
    alertLinesVisible: true, alertLinesColor: '#60a5fa', onlyActiveAlerts: false,
    alertVolume: 0.5, autoHideToasts: true,
  },
  events: {
    ideas: false, dividends: false, splits: false, earnings: false,
    earningsBreaks: false, latestNews: false, newsNotification: false,
  },
};

registerTheme({
  id: 'darkPro',
  label: 'Dark Pro',
  category: 'dark',
  preview: { background: '#131722', text: '#94a3b8', candleUp: '#089981', candleDown: '#f23645' },
  settings,
});
