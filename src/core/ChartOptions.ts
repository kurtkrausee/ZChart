// ChartOptions.ts

// Type-Helper: Macht alle verschachtelten Eigenschaften optional für den Nutzer
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface ChartConfig {
  colors: {
    background: string;
    grid: string;
    text: string;
    axisLine: string;
    candleUp: string;
    candleDown: string;
    crosshair: string;
  };
  layout: {
    axisWidth: number;
    axisHeight: number;
    fontSize: number;
    fontFamily: string;
  };
  grid: {
    verticalLines: {
      lineWidth: number;
      visible: boolean;
    };
    horizontalLines: {
      lineWidth: number;
      visible: boolean;
    };
  };
}

export const defaultOptions: ChartConfig = {
  colors: {
    background: '#0f1115',
    grid: '#1e222d',
    text: '#929498',
    axisLine: '#2a2e39',
    candleUp: '#089981',
    candleDown: '#f23645',
    crosshair: '#758696'
  },
  layout: {
    axisWidth: 60,
    axisHeight: 30,
    fontSize: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
  },
  grid: {
    verticalLines: { lineWidth: 1, visible: true },
    horizontalLines: { lineWidth: 1, visible: true },
  },
};

// Fusioniert die Standardwerte sicher mit den Nutzer-Optionen
export function mergeOptions(
  base: ChartConfig,
  userOverrides?: DeepPartial<ChartConfig>
): ChartConfig {
  if (!userOverrides) return base;

  return {
    colors: { ...base.colors, ...userOverrides.colors },
    layout: { ...base.layout, ...userOverrides.layout },
    grid: {
      verticalLines: { ...base.grid.verticalLines, ...userOverrides.grid?.verticalLines },
      horizontalLines: { ...base.grid.horizontalLines, ...userOverrides.grid?.horizontalLines },
    }
  };
}