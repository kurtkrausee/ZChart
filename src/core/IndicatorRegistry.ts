// src/core/IndicatorRegistry.ts

import { DataStore } from '../data/DataStore';
import { calculateSMA } from '../math/indicators/SMA';
import { calculateRSI } from '../math/indicators/RSI';
import { calculateBB } from '../math/indicators/BollingerBands';
import { calculateMACD } from '../math/indicators/MACD';
import { calculateADX } from '../math/indicators/ADX';

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
            
            case 'rsi':
                calculateRSI(data, config.inputs.period || 14, config.id);
                break;

            case 'bb':
                // HIER IST DER SCHLÜSSEL: Wir rufen die neue BB-Funktion auf und übergeben den Multiplier!
                calculateBB(data, config.inputs.period || 20, config.inputs.multiplier || 2, config.id);
                break;

            case 'macd':
                // Standardwerte: 12, 26, 9
                calculateMACD(
                    data, 
                    config.inputs.period || 12, // Nutzen wir als Fast
                    config.inputs.multiplier || 26, // Nutzen wir als Slow
                    9, // Signal hartcodiert für den Moment
                    config.id
                );
                break;

            case 'adx':
                calculateADX(data, config.inputs.period || 14, config.id);
                break;

            // Hier kommt später ganz easy case 'macd' etc. rein!
        }
    }
}