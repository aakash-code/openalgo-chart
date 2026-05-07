/**
 * OI Profile Primitive for lightweight-charts
 * Implements ISeriesPrimitive interface to render Open Interest Profile
 *
 * This primitive renders:
 * - Horizontal bars for Call OI and Put OI at each strike price
 * - ATM strike highlighting
 * - PCR (Put/Call Ratio) label
 * - Total OI summary
 */

import type {
  IChartApi,
  ISeriesApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  SeriesAttachedParameter,
  SeriesOptionsMap,
  Time,
} from 'lightweight-charts';

import {
  BitmapCoordinatesRenderingScope,
  CanvasRenderingTarget2D,
} from 'fancy-canvas';

import {
  DEFAULT_OI_PROFILE_OPTIONS,
  OI_COLORS,
  OI_SENSE_COLORS,
  getPCRColor,
  formatOIValue,
  getOISenseSignal,
  OIProfileOptionsType,
  OISenseSignalResult,
} from './OIProfileConstants';

// Interface for OI Sense data within OI Profile data
export interface OISenseData {
  priceChange: number;
  oiChange: number;
}

// Interface for Strike data
export interface StrikeData {
  strike: number;
  ce?: {
    oi?: number;
    oiChange?: number;
  };
  pe?: {
    oi?: number;
    oiChange?: number;
  };
  totalOI?: number;
}

// Interface for OI Profile data
export interface OIProfileData {
  chain: StrikeData[];
  atmStrike?: number;
  pcr?: number;
  totalCallOI?: number;
  totalPutOI?: number;
  oiSense?: OISenseData;
}

// Interface for OI Profile settings (partial options)
export interface OIProfileSettings extends Partial<OIProfileOptionsType> {}

// Type for series type
type SeriesType = keyof SeriesOptionsMap;

/**
 * OI Pane Renderer - handles actual Canvas2D drawing
 */
class OIPaneRenderer implements IPrimitivePaneRenderer {
  private _source: OIProfilePrimitive;

  constructor(source: OIProfilePrimitive) {
    this._source = source;
  }

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
      const { context: ctx, bitmapSize, horizontalPixelRatio, verticalPixelRatio } = scope;
      const oiData = this._source._oiData;
      const options = this._source._options;
      const series = this._source._series;

      if (!series || !oiData || !oiData.chain?.length) return;
      if (!options.visible) return;

      const chartWidth = bitmapSize.width;
      const chartHeight = bitmapSize.height;

      // Get strikes to render
      let strikesToRender = this._getStrikesToRender(oiData, options);
      if (strikesToRender.length === 0) return;

      // Calculate max OI for scaling
      const maxOI = Math.max(
        ...strikesToRender.flatMap(s => [s.ce?.oi || 0, s.pe?.oi || 0])
      );

      if (maxOI === 0) return;

      // Draw each strike's OI bars
      strikesToRender.forEach(strike => {
        this._drawStrikeOI(ctx, series, strike, oiData.atmStrike, maxOI, options, scope);
      });

      // Draw PCR label at top
      if (options.showPCR && oiData.pcr !== undefined) {
        this._drawPCRLabel(ctx, oiData, options, scope);
      }

      // Draw total OI summary
      if (options.showTotalOI) {
        this._drawTotalOI(ctx, oiData, options, scope);
      }

      // Draw OI Sense signal
      if (options.showOISense && oiData.oiSense) {
        this._drawOISenseLabel(ctx, oiData, options, scope);
      }
    });
  }

  /**
   * Get strikes to render based on options
   */
  private _getStrikesToRender(oiData: OIProfileData, options: OIProfileOptionsType): StrikeData[] {
    let strikes = [...oiData.chain];

    // Filter to top N by total OI if enabled
    if (options.showTop5Only) {
      strikes = strikes
        .map(s => ({
          ...s,
          totalOI: (s.ce?.oi || 0) + (s.pe?.oi || 0)
        }))
        .sort((a, b) => (b.totalOI || 0) - (a.totalOI || 0))
        .slice(0, 5);
    }

    // Limit maximum strikes
    if (strikes.length > options.maxStrikes) {
      strikes = strikes.slice(0, options.maxStrikes);
    }

    // Sort by strike price for consistent rendering
    return strikes.sort((a, b) => a.strike - b.strike);
  }

  /**
   * Draw OI bars for a single strike
   */
  private _drawStrikeOI(
    ctx: CanvasRenderingContext2D,
    series: ISeriesApi<SeriesType>,
    strike: StrikeData,
    atmStrike: number | undefined,
    maxOI: number,
    options: OIProfileOptionsType,
    scope: BitmapCoordinatesRenderingScope
  ): void {
    const { horizontalPixelRatio, verticalPixelRatio, bitmapSize } = scope;

    // Get Y coordinate for this strike price
    const y = series.priceToCoordinate(strike.strike);
    if (y === null || y === undefined) return;

    const yPixel = Math.round(y * verticalPixelRatio);
    const barHeight = (options.compactMode ? options.barHeightCompact : options.barHeight) * verticalPixelRatio;
    const maxBarWidth = options.maxBarWidth * horizontalPixelRatio;
    const spacing = options.barSpacing * horizontalPixelRatio;

    // Calculate bar widths proportional to OI
    const callOI = strike.ce?.oi || 0;
    const putOI = strike.pe?.oi || 0;
    const callWidth = (callOI / maxOI) * maxBarWidth;
    const putWidth = (putOI / maxOI) * maxBarWidth;

    // Position based on left/right preference
    let baseX: number;
    if (options.position === 'left') {
      baseX = 20 * horizontalPixelRatio + maxBarWidth;
    } else {
      // Right (default)
      baseX = bitmapSize.width - 20 * horizontalPixelRatio - maxBarWidth - spacing;
    }

    // Check if this is ATM strike
    const isATM = strike.strike === atmStrike;

    // Draw Call OI bar (extending left from center)
    if (callWidth > 0) {
      ctx.globalAlpha = options.barOpacity;
      ctx.fillStyle = options.callColor;
      ctx.fillRect(
        baseX - callWidth,
        yPixel - barHeight / 2,
        callWidth,
        barHeight
      );
      ctx.globalAlpha = 1;

      // Call OI value label
      if (options.showOIValues && callWidth > 30 * horizontalPixelRatio) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${options.fontSize * verticalPixelRatio}px ${options.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatOIValue(callOI), baseX - callWidth + callWidth - 4 * horizontalPixelRatio, yPixel);
      }
    }

    // Draw Put OI bar (extending right from center)
    if (putWidth > 0) {
      ctx.globalAlpha = options.barOpacity;
      ctx.fillStyle = options.putColor;
      ctx.fillRect(
        baseX + spacing,
        yPixel - barHeight / 2,
        putWidth,
        barHeight
      );
      ctx.globalAlpha = 1;

      // Put OI value label
      if (options.showOIValues && putWidth > 30 * horizontalPixelRatio) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${options.fontSize * verticalPixelRatio}px ${options.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatOIValue(putOI), baseX + spacing + 4 * horizontalPixelRatio, yPixel);
      }
    }

    // ATM highlight
    if (isATM) {
      ctx.strokeStyle = options.atmHighlightColor;
      ctx.lineWidth = 2 * horizontalPixelRatio;
      ctx.setLineDash([]);

      // Draw highlight box around ATM strike bars
      const totalWidth = callWidth + spacing + putWidth;
      ctx.strokeRect(
        baseX - callWidth - 2 * horizontalPixelRatio,
        yPixel - barHeight / 2 - 2 * verticalPixelRatio,
        totalWidth + 4 * horizontalPixelRatio,
        barHeight + 4 * verticalPixelRatio
      );

      // ATM label
      ctx.fillStyle = options.atmHighlightColor;
      ctx.font = `bold ${9 * verticalPixelRatio}px ${options.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText('ATM', baseX - callWidth - 6 * horizontalPixelRatio, yPixel);
    }

    // Strike label (optional)
    if (options.showStrikeLabels) {
      ctx.fillStyle = OI_COLORS.labelText;
      ctx.font = `${9 * verticalPixelRatio}px ${options.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(strike.strike.toString(), baseX + spacing / 2, yPixel + barHeight / 2 + 2 * verticalPixelRatio);
    }
  }

  /**
   * Draw PCR label at top of chart
   */
  private _drawPCRLabel(
    ctx: CanvasRenderingContext2D,
    oiData: OIProfileData,
    options: OIProfileOptionsType,
    scope: BitmapCoordinatesRenderingScope
  ): void {
    const { horizontalPixelRatio, verticalPixelRatio, bitmapSize } = scope;

    const pcr = oiData.pcr!;
    const pcrColor = getPCRColor(pcr);

    // Position at top right
    const x = options.position === 'left'
      ? 20 * horizontalPixelRatio
      : bitmapSize.width - 20 * horizontalPixelRatio;
    const y = 20 * verticalPixelRatio;

    // Background
    ctx.fillStyle = OI_COLORS.labelBg;
    const labelWidth = 80 * horizontalPixelRatio;
    const labelHeight = 24 * verticalPixelRatio;
    ctx.fillRect(
      options.position === 'left' ? x : x - labelWidth,
      y - labelHeight / 2,
      labelWidth,
      labelHeight
    );

    // PCR text
    ctx.fillStyle = pcrColor;
    ctx.font = `bold ${12 * verticalPixelRatio}px ${options.fontFamily}`;
    ctx.textAlign = options.position === 'left' ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PCR: ${pcr.toFixed(2)}`, x + (options.position === 'left' ? 5 : -5) * horizontalPixelRatio, y);
  }

  /**
   * Draw total OI summary
   */
  private _drawTotalOI(
    ctx: CanvasRenderingContext2D,
    oiData: OIProfileData,
    options: OIProfileOptionsType,
    scope: BitmapCoordinatesRenderingScope
  ): void {
    const { horizontalPixelRatio, verticalPixelRatio, bitmapSize } = scope;

    // Position below PCR
    const x = options.position === 'left'
      ? 20 * horizontalPixelRatio
      : bitmapSize.width - 20 * horizontalPixelRatio;
    const y = 50 * verticalPixelRatio;

    // Call OI total
    ctx.fillStyle = options.callColor;
    ctx.font = `${10 * verticalPixelRatio}px ${options.fontFamily}`;
    ctx.textAlign = options.position === 'left' ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`CE: ${formatOIValue(oiData.totalCallOI || 0)}`, x + (options.position === 'left' ? 5 : -5) * horizontalPixelRatio, y);

    // Put OI total
    ctx.fillStyle = options.putColor;
    ctx.fillText(`PE: ${formatOIValue(oiData.totalPutOI || 0)}`, x + (options.position === 'left' ? 5 : -5) * horizontalPixelRatio, y + 14 * verticalPixelRatio);
  }

  /**
   * Draw OI Sense signal label with color band
   */
  private _drawOISenseLabel(
    ctx: CanvasRenderingContext2D,
    oiData: OIProfileData,
    options: OIProfileOptionsType,
    scope: BitmapCoordinatesRenderingScope
  ): void {
    const { horizontalPixelRatio, verticalPixelRatio, bitmapSize } = scope;

    const oiSense = oiData.oiSense;
    if (!oiSense) return;

    // Get signal info
    const signalInfo: OISenseSignalResult = getOISenseSignal(oiSense.priceChange, oiSense.oiChange, options.oiSenseThreshold);

    // Position below total OI
    const x = options.position === 'left'
      ? 20 * horizontalPixelRatio
      : bitmapSize.width - 20 * horizontalPixelRatio;
    const y = 90 * verticalPixelRatio;

    // Draw color band background
    const labelWidth = 100 * horizontalPixelRatio;
    const labelHeight = 22 * verticalPixelRatio;
    const bandX = options.position === 'left' ? x : x - labelWidth;

    ctx.fillStyle = signalInfo.fill;
    ctx.fillRect(bandX, y - labelHeight / 2, labelWidth, labelHeight);

    // Draw border
    ctx.strokeStyle = signalInfo.color;
    ctx.lineWidth = 2 * horizontalPixelRatio;
    ctx.strokeRect(bandX, y - labelHeight / 2, labelWidth, labelHeight);

    // Draw signal label
    if (options.showOISenseLabel) {
      ctx.fillStyle = signalInfo.color;
      ctx.font = `bold ${10 * verticalPixelRatio}px ${options.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(signalInfo.label, bandX + labelWidth / 2, y);
    }

    // Draw sentiment indicator arrow
    const arrowX = options.position === 'left'
      ? bandX + labelWidth + 8 * horizontalPixelRatio
      : bandX - 8 * horizontalPixelRatio;

    ctx.fillStyle = signalInfo.color;
    ctx.font = `${14 * verticalPixelRatio}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (signalInfo.sentiment === 'bullish') {
      ctx.fillText('\u25B2', arrowX, y);
    } else if (signalInfo.sentiment === 'bearish') {
      ctx.fillText('\u25BC', arrowX, y);
    } else {
      ctx.fillText('\u25C6', arrowX, y);
    }

    // Draw price/OI change percentages
    ctx.fillStyle = OI_COLORS.labelText;
    ctx.font = `${8 * verticalPixelRatio}px ${options.fontFamily}`;
    ctx.textAlign = options.position === 'left' ? 'left' : 'right';
    const detailX = x + (options.position === 'left' ? 5 : -5) * horizontalPixelRatio;
    const detailY = y + labelHeight / 2 + 10 * verticalPixelRatio;

    const priceSign = oiSense.priceChange >= 0 ? '+' : '';
    const oiSign = oiSense.oiChange >= 0 ? '+' : '';
    ctx.fillText(
      `Price: ${priceSign}${oiSense.priceChange.toFixed(2)}% | OI: ${oiSign}${oiSense.oiChange.toFixed(2)}%`,
      detailX,
      detailY
    );
  }
}

/**
 * OI Pane View - creates renderer for drawing
 */
class OIPaneView implements IPrimitivePaneView {
  private _source: OIProfilePrimitive;

  constructor(source: OIProfilePrimitive) {
    this._source = source;
  }

  update(): void {
    // Called when chart needs to update
  }

  renderer(): IPrimitivePaneRenderer {
    return new OIPaneRenderer(this._source);
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'bottom'; // Draw behind candlesticks
  }
}

/**
 * Main OI Profile Primitive class
 * Implements ISeriesPrimitive interface for lightweight-charts
 */
export class OIProfilePrimitive {
  public _options: OIProfileOptionsType;
  public _oiData: OIProfileData | null;
  private _paneViews: OIPaneView[];
  private _chart: IChartApi | null;
  public _series: ISeriesApi<SeriesType> | null;
  private _requestUpdate: (() => void) | null;

  constructor(options: OIProfileSettings = {}) {
    this._options = { ...DEFAULT_OI_PROFILE_OPTIONS, ...options };
    this._oiData = null;
    this._paneViews = [new OIPaneView(this)];
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  /**
   * Called when primitive is attached to a series
   */
  attached(params: SeriesAttachedParameter<Time>): void {
    this._chart = params.chart;
    this._series = params.series as ISeriesApi<SeriesType>;
    this._requestUpdate = params.requestUpdate;
  }

  /**
   * Called when primitive is detached from series
   */
  detached(): void {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  /**
   * Returns pane views for rendering
   */
  paneViews(): readonly IPrimitivePaneView[] {
    return this._paneViews;
  }

  /**
   * Trigger re-render of all views
   */
  updateAllViews(): void {
    this._paneViews.forEach(view => view.update());
    this._requestUpdate?.();
  }

  /**
   * Set OI profile data
   * @param oiData - Processed OI data from oiProfileService
   */
  setData(oiData: OIProfileData): void {
    this._oiData = oiData;
    this.updateAllViews();
  }

  /**
   * Get current OI data
   */
  getData(): OIProfileData | null {
    return this._oiData;
  }

  /**
   * Get current options
   */
  options(): OIProfileOptionsType {
    return this._options;
  }

  /**
   * Update options and re-render
   */
  applyOptions(options: OIProfileSettings): void {
    this._options = { ...this._options, ...options };
    this.updateAllViews();
  }

  /**
   * Autoscale info - return null to not affect chart scaling
   */
  autoscaleInfo(): null {
    return null;
  }
}

export default OIProfilePrimitive;
