/**
 * Delta Primitive for lightweight-charts
 * Renders delta histogram bars showing buy-sell volume difference per candle
 */

import type {
  IChartApi,
  ISeriesApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ITimeScaleApi,
  SeriesAttachedParameter,
  SeriesOptionsMap,
  Time,
} from 'lightweight-charts';

import {
  BitmapCoordinatesRenderingScope,
  CanvasRenderingTarget2D,
} from 'fancy-canvas';

import {
  COLORS,
  DEFAULT_DELTA_SETTINGS,
  getDeltaBarColor,
  formatDeltaValue,
  type DeltaSettings,
} from './DeltaConstants';

// ==================== TYPES ====================

export interface DeltaData {
  time: number;
  delta: number;
  buyVolume?: number;
  sellVolume?: number;
}

// ==================== RENDERER ====================

/**
 * Delta Pane Renderer - handles Canvas2D drawing
 */
class DeltaPaneRenderer implements IPrimitivePaneRenderer {
  private _source: DeltaPrimitive;

  constructor(source: DeltaPrimitive) {
    this._source = source;
  }

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, bitmapSize, horizontalPixelRatio, verticalPixelRatio } = scope;
      const deltaData = this._source._deltaData;
      const options = this._source._options;
      const series = this._source._series;
      const chart = this._source._chart;

      if (!series || !chart || !deltaData || deltaData.length === 0) return;

      const chartWidth = bitmapSize.width;
      const chartHeight = bitmapSize.height;
      const timeScale = chart.timeScale();

      const hRatio = horizontalPixelRatio;
      const vRatio = verticalPixelRatio;

      // Calculate delta range for scaling
      let maxAbsDelta = 0;
      deltaData.forEach((d) => {
        maxAbsDelta = Math.max(maxAbsDelta, Math.abs(d.delta));
      });

      if (maxAbsDelta === 0) return;

      // Pane height for delta bars
      const paneHeight = options.paneHeight * vRatio;
      const paneTop = chartHeight - paneHeight;
      const zeroY = paneTop + paneHeight / 2;

      // Draw zero line
      if (options.showZeroLine) {
        ctx.beginPath();
        ctx.strokeStyle = COLORS.ZERO_LINE;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.moveTo(0, zeroY);
        ctx.lineTo(chartWidth, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw delta bars
      deltaData.forEach((d) => {
        const barX = timeScale.timeToCoordinate(d.time as Time);
        if (barX === null) return;

        const barXPixel = barX * hRatio;

        // Calculate bar dimensions
        const barWidth = this._calculateBarWidth(timeScale, d.time, hRatio) * options.barWidth;
        const barHeight = (Math.abs(d.delta) / maxAbsDelta) * (paneHeight / 2 - 5 * vRatio);

        // Determine bar position (above or below zero line)
        const barTop = d.delta >= 0 ? zeroY - barHeight : zeroY;

        // Draw bar
        ctx.fillStyle = getDeltaBarColor(d.delta, options.neutralThreshold);
        ctx.fillRect(barXPixel - barWidth / 2, barTop, barWidth, barHeight);

        // Draw delta value label on hover or always if enabled
        if (options.showLabels && barHeight > 15 * vRatio) {
          ctx.fillStyle = COLORS.TEXT_PRIMARY;
          ctx.font = `${options.fontSize * vRatio}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = d.delta >= 0 ? 'bottom' : 'top';
          const labelY = d.delta >= 0 ? barTop - 2 * vRatio : barTop + barHeight + 2 * vRatio;
          ctx.fillText(formatDeltaValue(d.delta), barXPixel, labelY);
        }
      });

      // Draw pane border
      ctx.strokeStyle = COLORS.ZERO_LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(0, paneTop, chartWidth, paneHeight);

      // Draw "Delta" label
      ctx.fillStyle = COLORS.TEXT_SECONDARY;
      ctx.font = `${10 * vRatio}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText('Delta', 5 * hRatio, paneTop + 12 * vRatio);
    });
  }

  private _calculateBarWidth(timeScale: ITimeScaleApi<Time>, time: number, hRatio: number): number {
    const coord1 = timeScale.timeToCoordinate(time as Time);
    const coord2 = timeScale.timeToCoordinate((time + 60) as Time);

    if (coord1 !== null && coord2 !== null) {
      return Math.abs(coord2 - coord1) * hRatio * 0.8;
    }

    return 10 * hRatio;
  }
}

// ==================== PANE VIEW ====================

/**
 * Delta Pane View
 */
class DeltaPaneView implements IPrimitivePaneView {
  private _source: DeltaPrimitive;

  constructor(source: DeltaPrimitive) {
    this._source = source;
  }

  update(): void {}

  renderer(): IPrimitivePaneRenderer {
    return new DeltaPaneRenderer(this._source);
  }

  zOrder(): 'top' | 'bottom' | 'normal' {
    return 'bottom';
  }
}

// ==================== PRIMITIVE ====================

/**
 * Main Delta Primitive class
 */
export class DeltaPrimitive {
  _options: DeltaSettings;
  _deltaData: DeltaData[];
  _paneViews: DeltaPaneView[];
  _chart: IChartApi | null;
  _series: ISeriesApi<keyof SeriesOptionsMap> | null;
  _requestUpdate: (() => void) | null;

  constructor(options: Partial<DeltaSettings> = {}) {
    this._options = { ...DEFAULT_DELTA_SETTINGS, ...options };
    this._deltaData = [];
    this._paneViews = [new DeltaPaneView(this)];
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>): void {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached(): void {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this._paneViews;
  }

  updateAllViews(): void {
    this._paneViews.forEach((view) => view.update());
    this._requestUpdate?.();
  }

  /**
   * Set delta data
   */
  setData(data: DeltaData[] | null): void {
    this._deltaData = data || [];
    this.updateAllViews();
  }

  /**
   * Add a single delta value (for real-time updates)
   */
  addDelta(deltaPoint: DeltaData): void {
    const existingIndex = this._deltaData.findIndex((d) => d.time === deltaPoint.time);
    if (existingIndex >= 0) {
      this._deltaData[existingIndex] = deltaPoint;
    } else {
      this._deltaData.push(deltaPoint);
    }
    this.updateAllViews();
  }

  options(): DeltaSettings {
    return this._options;
  }

  applyOptions(options: Partial<DeltaSettings>): void {
    this._options = { ...this._options, ...options };
    this.updateAllViews();
  }

  clearData(): void {
    this._deltaData = [];
    this.updateAllViews();
  }

  autoscaleInfo(): null {
    return null;
  }
}

export default DeltaPrimitive;
