import { Time } from 'lightweight-charts';

export interface RiskCalculatorOptions {
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number | null;
  targets?: { price: number; exitPercent: number }[];
  side: 'BUY' | 'SELL';
  showTarget: boolean;
  colors: {
    entry: string;
    stopLoss: string;
    target: string;
  };
  lineWidth: number;
  onPriceChange: (lineType: string, newPrice: number) => void;
  onPriceDrag?: (lineType: string, newPrice: number) => void;
}

export interface RendererData {
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number | null;
  targets?: { price: number; exitPercent: number }[];
  entryY: number | null;
  stopLossY: number | null;
  targetY: number | null;
  targetYs: (number | null)[];
  hoveredLine: string | null;
  draggingLine: string | null;
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
