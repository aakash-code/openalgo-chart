
import { IPrimitivePaneRenderer, IPrimitivePaneView, PrimitivePaneViewZOrder, ISeriesApi, SeriesType } from 'lightweight-charts';
import { VisualTradingRenderer, OrderRendererData } from './renderer';

export class VisualTradingPaneView implements IPrimitivePaneView {
    private _renderer: VisualTradingRenderer;

    constructor() {
        this._renderer = new VisualTradingRenderer();
    }

    zOrder(): PrimitivePaneViewZOrder {
        return 'top';
    }

    renderer(): IPrimitivePaneRenderer {
        return this._renderer;
    }

    update(data: OrderRendererData) {
        this._renderer.update(data);
    }

    setSeries(series: ISeriesApi<SeriesType>) {
        this._renderer.setSeries(series);
    }
}
