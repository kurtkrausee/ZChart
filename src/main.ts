// main.ts

import './style.css';
import { ChartManager } from './core/ChartManager';
import { Pane } from './core/Pane';

const chart = new ChartManager('app');
chart.addPane(new Pane('main', 0.8));
chart.addPane(new Pane('rsi', 0.2));

// --- TEST-ANIMATION: SCROLLEN SIMULIEREN ---
let offset = 0;
function animate() {
  offset -= 1; // Wir schieben den Chart pro Frame 1 Pixel nach links
  
  // Wir nutzen einen kleinen Trick, um an die TimeScale zu kommen, 
  // da sie im Manager "private" ist:
  (chart as any).timeScale.scrollOffset = offset;
  
  requestAnimationFrame(animate);
}

animate();