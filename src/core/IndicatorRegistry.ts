// src/core/IndicatorRegistry.ts

import { DataStore } from '../data/DataStore';
import { calculateSMA } from '../math/indicators/SMA';

// HIER IST DAS INTERFACE: Wir exportieren es, damit die API es nutzen kann!
export interface IndicatorConfig {
    id: string;
    type: string;
    paneId: string;
    inputs: {
        period?: number;
        source?: string; // 'open' | 'high' | 'low' | 'close'
        multiplier?: number;
    };
    styles: {
        color: string;
        lineWidth: number;
        lineStyle?: 'solid' | 'dashed';
    };
}

export class IndicatorRegistry {
    public static calculate(type: string, dataStore: DataStore, config: IndicatorConfig) {
        const data = dataStore.getAllData();
        
        switch(type) {
            case 'sma':
                // Wir rufen die dumme Mathe-Funktion auf
                calculateSMA(data, config.inputs.period || 20, config.inputs.source || 'close', config.id);
                break;
            
            // Hier kommt später ganz easy case 'rsi', case 'macd' etc. rein!
        }
    }
}