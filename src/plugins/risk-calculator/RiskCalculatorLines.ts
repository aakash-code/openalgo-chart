import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  ISeriesApi,
  IChartApi,
  SeriesType,
  Coordinate,
  MouseEventParams,
} from 'lightweight-charts';
import { RiskCalculatorOptions, RendererData } from './types';
import { RiskCalculatorPaneView } from './pane-view';

export class RiskCalculatorLines implements ISeriesPrimitive<Time> {
  private _chart: IChartApi | undefined;
  private _series: ISeriesApi<SeriesType> | undefined;

  // Prices
  private _entryPrice: number;
  private _stopLossPrice: number;
  private _targetPrice: number | null;

  // Interaction state
  private _hoveredLine: 'entry' | 'stopLoss' | 'target' | null = null;
  private _draggingLine: 'entry' | 'stopLoss' | 'target' | null = null;
  private _dragPrices: Map<string, number> = new Map();

  // Configuration
  private _options: RiskCalculatorOptions;

  // Rendering
  private _paneViews: RiskCalculatorPaneView[];

  // Event handlers (bound to this)
  private _mouseDownHandler: (event: MouseEvent) => void;
  private _mouseMoveHandler: (event: MouseEvent) => void;
  private _mouseUpHandler: (event: MouseEvent) => void;
  private _crosshairMoveHandler: (param: MouseEventParams<Time>) => void;

  constructor(options: RiskCalculatorOptions) {
    console.log('[RiskCalculator] Constructor called with options:', options);
    this._options = options;
    this._entryPrice = options.entryPrice;
    this._stopLossPrice = options.stopLossPrice;
    this._targetPrice = options.targetPrice;

    this._paneViews = [new RiskCalculatorPaneView()];

    // Bind event handlers
    this._mouseDownHandler = this._onMouseDown.bind(this);
    this._mouseMoveHandler = this._onMouseMove.bind(this);
    this._mouseUpHandler = this._onMouseUp.bind(this);
    this._crosshairMoveHandler = this._onCrosshairMove.bind(this);
    console.log('[RiskCalculator] Constructor complete, handlers bound');
  }

  /**
   * Get chart element - must be called inline when needed, not stored
   * This matches the pattern used by Visual Trading plugin
   */
  private _getChartElement(): HTMLElement | null {
    if (!this._chart) {
      console.warn('[RiskCalculator] _getChartElement: No chart reference');
      return null;
    }

    const chartApi = this._chart as any;
    const element = chartApi.chartElement?.();

    if (!element) {
      console.warn('[RiskCalculator] _getChartElement: chartElement() returned null');
    }

    return element || null;
  }

  updateAllViews(): void {
    const data = this._createRendererData();
    this._paneViews.forEach(view => view.update(data));
  }

  paneViews() {
    return this._paneViews;
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    console.log('[RiskCalculator] attached() called');
    this._chart = param.chart;
    this._series = param.series;
    console.log('[RiskCalculator] Chart and series references stored');

    // Get chart element for mouse events
    const chartElement = this._getChartElement();
    console.log('[RiskCalculator] chartElement:', chartElement);
    console.log('[RiskCalculator] chartElement is HTMLElement:', chartElement instanceof HTMLElement);

    if (chartElement) {
      console.log('[RiskCalculator] Attaching mouse event listeners...');
      chartElement.addEventListener('mousedown', this._mouseDownHandler);
      window.addEventListener('mousemove', this._mouseMoveHandler);
      window.addEventListener('mouseup', this._mouseUpHandler);
      console.log('[RiskCalculator] Mouse event listeners attached successfully');
    } else {
      console.error('[RiskCalculator] chartElement is null! Cannot attach mouse listeners');
      console.log('[RiskCalculator] Attempting fallback: query chart container from DOM');

      // Fallback: try to find chart container in DOM
      const fallbackElement = document.querySelector('.tv-lightweight-charts') as HTMLElement;
      if (fallbackElement) {
        console.log('[RiskCalculator] Found fallback chart element via DOM query');
        fallbackElement.addEventListener('mousedown', this._mouseDownHandler);
        window.addEventListener('mousemove', this._mouseMoveHandler);
        window.addEventListener('mouseup', this._mouseUpHandler);
        console.log('[RiskCalculator] Fallback mouse event listeners attached');
      } else {
        console.error('[RiskCalculator] Fallback failed - no chart element found in DOM');
      }
    }

    // Subscribe to crosshair move for hover detection
    console.log('[RiskCalculator] Subscribing to crosshairMove...');
    this._chart.subscribeCrosshairMove(this._crosshairMoveHandler);
    console.log('[RiskCalculator] crosshairMove subscription complete');

    this.updateAllViews();
    console.log('[RiskCalculator] attached() complete');
  }

  detached(): void {
    console.log('[RiskCalculator] detached() called');
    const chartElement = this._getChartElement();

    if (chartElement) {
      chartElement.removeEventListener('mousedown', this._mouseDownHandler);
      console.log('[RiskCalculator] Removed mousedown listener');
    }

    // Also try fallback element in case that was used
    const fallbackElement = document.querySelector('.tv-lightweight-charts') as HTMLElement;
    if (fallbackElement) {
      fallbackElement.removeEventListener('mousedown', this._mouseDownHandler);
    }

    window.removeEventListener('mousemove', this._mouseMoveHandler);
    window.removeEventListener('mouseup', this._mouseUpHandler);
    console.log('[RiskCalculator] Removed window listeners');

    if (this._chart) {
      this._chart.unsubscribeCrosshairMove(this._crosshairMoveHandler);
      console.log('[RiskCalculator] Unsubscribed from crosshairMove');
    }

    this._chart = undefined;
    this._series = undefined;
    console.log('[RiskCalculator] detached() complete');
  }

  updatePrices(entryPrice: number, stopLossPrice: number, targetPrice: number | null): void {
    this._entryPrice = entryPrice;
    this._stopLossPrice = stopLossPrice;
    this._targetPrice = targetPrice;
    this.updateAllViews();
  }

  private _createRendererData(): RendererData {
    if (!this._series || !this._chart) {
      return {
        entryPrice: this._entryPrice,
        stopLossPrice: this._stopLossPrice,
        targetPrice: this._targetPrice,
        entryY: null,
        stopLossY: null,
        targetY: null,
        hoveredLine: this._hoveredLine,
        draggingLine: this._draggingLine,
        dragPrices: this._dragPrices,
        colors: this._options.colors,
        lineWidth: this._options.lineWidth,
        side: this._options.side,
        showTarget: this._options.showTarget,
        width: 0,
        height: 0,
      };
    }

    const timeScale = this._chart.timeScale();
    const chartWidth = timeScale.width();
    const chartHeight = (this._chart as any).chartElement?.()?.clientHeight || 0;

    // Convert prices to Y coordinates
    const entryY = this._series.priceToCoordinate(this._entryPrice);
    const stopLossY = this._series.priceToCoordinate(this._stopLossPrice);
    const targetY = this._targetPrice !== null
      ? this._series.priceToCoordinate(this._targetPrice)
      : null;

    return {
      entryPrice: this._entryPrice,
      stopLossPrice: this._stopLossPrice,
      targetPrice: this._targetPrice,
      entryY,
      stopLossY,
      targetY,
      hoveredLine: this._hoveredLine,
      draggingLine: this._draggingLine,
      dragPrices: this._dragPrices,
      colors: this._options.colors,
      lineWidth: this._options.lineWidth,
      side: this._options.side,
      showTarget: this._options.showTarget,
      width: chartWidth,
      height: chartHeight,
    };
  }

  private _onCrosshairMove(param: MouseEventParams<Time>): void {
    const chartElement = this._getChartElement();

    if (this._draggingLine || !this._series || !chartElement) {
      if (!chartElement && param.point) {
        console.warn('[RiskCalculator] Crosshair move but no chart element');
      }
      return;
    }

    const y = param.point?.y;
    if (!y) {
      this._hoveredLine = null;
      chartElement.style.cursor = 'default';
      this.updateAllViews();
      return;
    }

    const entryY = this._series.priceToCoordinate(this._entryPrice);
    const stopLossY = this._series.priceToCoordinate(this._stopLossPrice);
    const targetY = this._targetPrice !== null ? this._series.priceToCoordinate(this._targetPrice) : null;

    const threshold = 8; // pixels

    let newHoveredLine: 'entry' | 'stopLoss' | 'target' | null = null;

    if (entryY !== null && Math.abs(y - entryY) < threshold) {
      newHoveredLine = 'entry';
      console.log('[RiskCalculator] Hovering over Entry line');
    } else if (stopLossY !== null && Math.abs(y - stopLossY) < threshold) {
      newHoveredLine = 'stopLoss';
      console.log('[RiskCalculator] Hovering over Stop Loss line');
    } else if (targetY !== null && Math.abs(y - targetY) < threshold) {
      newHoveredLine = 'target';
      console.log('[RiskCalculator] Hovering over Target line');
    }

    // Update cursor - all three lines are now draggable
    if (newHoveredLine) {
      chartElement.style.cursor = 'ns-resize';
      console.log('[RiskCalculator] Cursor changed to ns-resize');
    } else {
      chartElement.style.cursor = 'default';
    }

    // Update only if changed
    if (this._hoveredLine !== newHoveredLine) {
      this._hoveredLine = newHoveredLine;
      this.updateAllViews();
    }
  }

  private _onMouseDown(event: MouseEvent): void {
    console.log('[RiskCalculator] Mouse down, hoveredLine:', this._hoveredLine);
    if (!this._hoveredLine) return;

    this._draggingLine = this._hoveredLine;
    console.log('[RiskCalculator] Started dragging:', this._draggingLine);

    // Lock chart interactions during drag
    if (this._chart) {
      this._chart.applyOptions({
        handleScroll: false,
        handleScale: false,
      });
      console.log('[RiskCalculator] Chart scroll/scale locked');
    }

    event.preventDefault();
    event.stopPropagation();
  }

  private _onMouseMove(event: MouseEvent): void {
    const chartElement = this._getChartElement();

    if (!this._draggingLine || !this._series || !chartElement) return;

    const rect = chartElement.getBoundingClientRect();
    const y = event.clientY - rect.top;

    const price = this._series.coordinateToPrice(y as Coordinate);

    if (price && this._isValidPrice(this._draggingLine, price)) {
      this._dragPrices.set(this._draggingLine, price);
      chartElement.style.cursor = 'ns-resize';
      console.log('[RiskCalculator] Dragging to price:', price);
      this.updateAllViews();
    } else {
      chartElement.style.cursor = 'not-allowed';
      console.log('[RiskCalculator] Invalid price during drag:', price);
    }

    event.preventDefault();
    event.stopPropagation();
  }

  private _onMouseUp(event: MouseEvent): void {
    if (!this._draggingLine) return;

    const newPrice = this._dragPrices.get(this._draggingLine);
    console.log('[RiskCalculator] Mouse up, final price:', newPrice);

    if (newPrice !== undefined && this._isValidPrice(this._draggingLine, newPrice)) {
      // Trigger callback to update settings
      console.log('[RiskCalculator] Calling onPriceChange callback with:', this._draggingLine, newPrice);
      this._options.onPriceChange(this._draggingLine, newPrice);
    }

    // Clean up drag state
    const draggedLine = this._draggingLine;
    this._draggingLine = null;
    this._dragPrices.clear();
    console.log('[RiskCalculator] Drag state cleaned up');

    // Re-enable chart interactions
    if (this._chart) {
      this._chart.applyOptions({
        handleScroll: true,
        handleScale: true,
      });
      console.log('[RiskCalculator] Chart scroll/scale unlocked');
    }

    // Reset cursor
    const chartElement = this._getChartElement();
    if (chartElement) {
      chartElement.style.cursor = 'default';
    }

    this.updateAllViews();

    event.preventDefault();
    event.stopPropagation();
  }

  private _isValidPrice(lineType: 'entry' | 'stopLoss' | 'target', newPrice: number): boolean {
    const side = this._options.side;

    if (lineType === 'entry') {
      // Entry must be between SL and target
      if (side === 'BUY') {
        const maxPrice = this._targetPrice !== null ? this._targetPrice : Infinity;
        return newPrice > this._stopLossPrice && newPrice < maxPrice;
      } else {
        const minPrice = this._targetPrice !== null ? this._targetPrice : 0;
        return newPrice < this._stopLossPrice && newPrice > minPrice;
      }
    }

    if (lineType === 'stopLoss') {
      // SL must be opposite side from entry
      if (side === 'BUY') {
        return newPrice < this._entryPrice;
      } else {
        return newPrice > this._entryPrice;
      }
    }

    if (lineType === 'target') {
      // Target must be on profit side of entry
      if (side === 'BUY') {
        return newPrice > this._entryPrice;
      } else {
        return newPrice < this._entryPrice;
      }
    }

    return true;
  }
}
