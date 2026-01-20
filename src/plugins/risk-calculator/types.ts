import { Time } from 'lightweight-charts';

export interface RiskCalculatorOptions {
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number | null;
  side: 'BUY' | 'SELL';
  showTarget: boolean;
  colors: {
    entry: string;
    stopLoss: string;
    target: string;
  };
  lineWidth: number;
  onPriceChange: (lineType: 'entry' | 'stopLoss' | 'target', newPrice: number) => void;
}

export interface RendererData {
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number | null;
  entryY: number | null;
  stopLossY: number | null;
  targetY: number | null;
  hoveredLine: 'entry' | 'stopLoss' | 'target' | null;
  draggingLine: 'entry' | 'stopLoss' | 'target' | null;
  dragPrices: Map<string, number>;
  colors: {
    entry: string;
    stopLoss: string;
    target: string;
  };
  lineWidth: number;
  side: 'BUY' | 'SELL';
  showTarget: boolean;
  width: number;
  height: number;
}

export type LineType = 'entry' | 'stopLoss' | 'target';
