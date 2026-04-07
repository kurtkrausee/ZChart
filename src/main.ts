// main.ts

import './style.css';
import { ChartManager } from './core/ChartManager';
import { Pane } from './core/Pane';

const chart = new ChartManager('app');
chart.addPane(new Pane('main', 0.8));
chart.addPane(new Pane('rsi', 0.2));
