import { ISeriesPrimitivePaneView } from 'lightweight-charts';
import { RendererData } from './types';
import { RiskCalculatorRenderer } from './renderer';

export class RiskCalculatorPaneView implements ISeriesPrimitivePaneView {
  private _data: RendererData | null = null;

  update(data: RendererData): void {
    this._data = data;
  }

  renderer() {
    return new RiskCalculatorRenderer(this._data);
  }
}
