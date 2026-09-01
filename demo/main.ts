// demo/main.ts — ZChart Core Demo (statische, deterministische OHLCV-Daten, kein Backend)
// Version: 2.0.0 | Updated: 2026-08-18 | By: Agent
import { ChartManager, ZChartAPI, Pane, CandlestickNode, VolumeNode, LineSeriesNode, StaticLineNode, type CandleData } from '../src/index';

// Deterministischer Random-Walk (LCG-Seed statt Math.random — reproduzierbare Demo)
function generateCandles(n: number): CandleData[] {
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const out: CandleData[] = [];
  let price = 100;
  const start = Date.UTC(2025, 0, 1) / 1000;
  for (let i = 0; i < n; i++) {
    const drift = (rnd() - 0.48) * 2.2;
    const open = price;
    const close = Math.max(5, open + drift);
    const high = Math.max(open, close) + rnd() * 1.2;
    const low = Math.min(open, close) - rnd() * 1.2;
    out.push({ timestamp: (start + i * 86400) * 1000, open, high, low, close, volume: Math.round(500 + rnd() * 2000) });
    price = close;
  }
  return out;
}

const manager = new ChartManager(document.getElementById('chart')!);

const mainPane = new Pane('main', 0.7);
const candles = new CandlestickNode(manager.dataStore);
candles.zIndex = 10; candles.role = 'series';
mainPane.addNode(candles);
manager.addPane(mainPane);

const volumePane = new Pane('volume', 0.12);
const volume = new VolumeNode(manager.dataStore);
volume.zIndex = 1;
volumePane.addNode(volume);
manager.addPane(volumePane);

const rsiPane = new Pane('rsi', 0.18);
rsiPane.priceScale.fixedRange = { min: -5, max: 105 };
rsiPane.priceScale.tickProvider = () => [0, 20, 50, 80, 100];
rsiPane.addNode(new StaticLineNode(70, '#ff444466'));
rsiPane.addNode(new StaticLineNode(30, '#44ff4466'));
const rsiLine = new LineSeriesNode(manager.dataStore, 'rsi', '#f39c12', 2);
rsiLine.zIndex = 5;
rsiPane.addNode(rsiLine);
manager.addPane(rsiPane);

const api = new ZChartAPI(manager);

manager.setData(generateCandles(500));
manager.dataStore.calculateRSI(14);

// Toolbar
let dark = true;
document.querySelectorAll<HTMLButtonElement>('button[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('button[data-tool]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    api.setTool(btn.dataset.tool as any);
    if (btn.dataset.tool === 'emoji') api.setEmojiChar('🚀');
  });
});
api.subscribe('toolReset', () => {
  document.querySelectorAll('button[data-tool]').forEach(b => b.classList.remove('active'));
  document.querySelector('button[data-tool="pan"]')!.classList.add('active');
});
document.getElementById('theme')!.addEventListener('click', () => {
  dark = !dark;
  api.setTheme(dark ? 'dark' : 'light');
  document.body.style.background = dark ? '#131722' : '#ffffff';
  document.body.style.color = dark ? '#d1d4dc' : '#131722';
});
// Live-Tick-Simulation (ZG-C1: upsertCandle) — letzte Kerze wandert, alle 3s neue Kerze
let tickSeed = 7;
const tickRnd = () => (tickSeed = (tickSeed * 1664525 + 1013904223) % 4294967296) / 4294967296;
setInterval(() => {
  const all = manager.dataStore.getAllData();
  if (all.length === 0) return;
  const last = all[all.length - 1];
  const drift = (tickRnd() - 0.5) * 0.6;
  const close = Math.max(5, last.close + drift);
  api.upsertCandle({ ...last, close, high: Math.max(last.high, close), low: Math.min(last.low, close) });
}, 400);
setInterval(() => {
  const all = manager.dataStore.getAllData();
  const last = all[all.length - 1];
  api.upsertCandle({ timestamp: last.timestamp + 86400000, open: last.close, high: last.close, low: last.close, close: last.close, volume: 500 });
}, 3000);

document.getElementById('snapshot')!.addEventListener('click', () => {
  const w = window.open(); if (w) w.document.write(`<img src="${api.snapshot()}" style="max-width:100%">`);
});
