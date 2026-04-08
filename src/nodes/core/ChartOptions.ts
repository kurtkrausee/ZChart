// src/core/ChartOptions.ts

export interface ChartColors {
    background: string;
    grid: string;
    text: string;
    axisLine: string;
    candleUp: string;
    candleDown: string;
    crosshair: string;
}

export interface ChartConfig {
    width: number;
    height: number;
    colors: ChartColors;
}

export const defaultOptions: ChartConfig = {
    width: 800,
    height: 600,
    colors: {
        background: '#131722',
        grid: '#2a2e39',
        text: '#d1d4dc',
        axisLine: '#363c4e',
        candleUp: '#26a69a',
        candleDown: '#ef5350',
        crosshair: '#758696'
    }
};