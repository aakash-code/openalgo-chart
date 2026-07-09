import type { IChartApi, ISeriesApi, SeriesType, Logical, Time } from 'lightweight-charts';

/**
 * Point with logical time and price
 */
export interface LogicalPoint {
    logical: number;
    price: number;
}

/**
 * Point with time and price
 */
export interface TimePoint {
    time: number;
    price: number;
}

/**
 * Coordinate pair (x, y)
 */
export interface Coordinate {
    x: number | null;
    y: number | null;
}

/**
 * Rendering scope for canvas operations
 */
export interface RenderingScope {
    horizontalPixelRatio: number;
    verticalPixelRatio?: number;
}

/**
 * Anchor drawing options
 */
export interface AnchorOptions {
    radius?: number;
    fillColor?: string;
    strokeColor?: string;
    lineWidth?: number;
}

/**
 * Convert a logical point to canvas coordinates
 * @param point - The logical point with logical time index and price
 * @param chart - The chart API instance
 * @param series - The series API instance
 * @returns Coordinate pair (x, y)
 */
export function pointToCoordinate(
    point: LogicalPoint | null | undefined,
    chart: IChartApi,
    series: ISeriesApi<SeriesType>
): Coordinate {
    if (!point) return { x: null, y: null };
    const timeScale = chart.timeScale();
    return {
        x: timeScale.logicalToCoordinate(point.logical as Logical),
        y: series.priceToCoordinate(point.price),
    };
}

/**
 * Convert a time point to logical coordinates
 * @param point - The point with time and price
 * @param chart - The chart API instance
 * @returns Logical point with logical index and price
 */
export function timeToLogical(
    point: TimePoint,
    chart: IChartApi
): LogicalPoint {
    const timeScale = chart.timeScale();
    const logical = timeScale.timeToCoordinate(point.time as Time);
    return { logical: logical as number, price: point.price };
}

/**
 * Draw an anchor point on the canvas
 * @param ctx - Canvas 2D rendering context
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param scope - Rendering scope with pixel ratios
 * @param options - Optional anchor styling options
 */
export function drawAnchor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scope: RenderingScope,
    options: AnchorOptions = {}
): void {
    const radius = (options.radius || 6) * scope.horizontalPixelRatio;
    const fillColor = options.fillColor || '#FFFFFF';
    const strokeColor = options.strokeColor || '#2962FF';
    const lineWidth = options.lineWidth || 2;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
}
