/**
 * Risk Calculator Chart Integration
 * Manages draggable price lines for risk calculator using primitives
 */

import logger from '../logger';
import { RiskCalculatorLines } from '../../plugins/risk-calculator/RiskCalculatorLines';
import { RiskCalculationSuccess, TradeSide } from './riskCalculator';
import { ISeriesApi, SeriesType } from 'lightweight-charts';

/**
 * Risk calculator colors configuration
 */
export interface RiskCalculatorColors {
    entry: string;
    stopLoss: string;
    target: string;
}

/**
 * Risk calculator settings
 */
export interface RiskCalculatorSettings {
    entryColor?: string;
    stopLossColor?: string;
    targetColor?: string;
    lineWidth?: number;
}

/**
 * Create primitive parameters
 */
export interface CreatePrimitiveParams {
    series: ISeriesApi<SeriesType>;
    results: RiskCalculationSuccess;
    settings: RiskCalculatorSettings;
    side: TradeSide;
    onPriceChange: (lineType: string, price: number) => void;
    onPriceDrag?: (lineType: string, price: number) => void;
}

/**
 * Remove primitive parameters
 */
export interface RemovePrimitiveParams {
    series: ISeriesApi<SeriesType>;
    primitiveRef: PrimitiveRef;
}

/**
 * Primitive reference object
 */
export interface PrimitiveRef {
    current: RiskCalculatorLines | null;
}

/**
 * Lines reference object (legacy)
 */
export interface LinesRef {
    current: {
        entry: unknown | null;
        stopLoss: unknown | null;
        target: unknown | null;
    } | null;
}

/**
 * Update lines parameters (legacy)
 */
export interface UpdateLinesParams {
    series: ISeriesApi<SeriesType> | null;
    linesRef: LinesRef;
    results: RiskCalculationSuccess | null;
    settings: RiskCalculatorSettings;
    isActive: boolean;
}

/**
 * Remove lines parameters (legacy)
 */
export interface RemoveLinesParams {
    series: ISeriesApi<SeriesType> | null;
    linesRef: LinesRef;
}

/**
 * Create draggable risk calculator primitive
 *
 * @param params - Create primitive parameters
 * @returns Primitive instance or null
 */
export function createRiskCalculatorPrimitive(params: CreatePrimitiveParams): RiskCalculatorLines | null {
    const { series, results, settings, side, onPriceChange, onPriceDrag } = params;

    if (!series || !results || !results.success) {
        return null;
    }

    // Use numeric values directly from results if available
    const entryPrice = (results as any).entryPrice ?? (results.formatted ? parseFloat(results.formatted.entryPrice.replace('₹', '').replace(/,/g, '')) : 0);
    const stopLossPrice = (results as any).stopLossPrice ?? (results.formatted ? parseFloat(results.formatted.stopLossPrice.replace('₹', '').replace(/,/g, '')) : 0);
    const targetPrice = results.targetPrice || null;
    const targets = (results as any).targets || [];

    const primitive = new RiskCalculatorLines({
        entryPrice,
        stopLossPrice,
        targetPrice,
        targets,
        side: side || 'BUY',
        showTarget: results.showTarget !== false,
        colors: {
            entry: settings.entryColor || '#26a69a',
            stopLoss: settings.stopLossColor || '#ef5350',
            target: settings.targetColor || '#42a5f5',
        },
        lineWidth: settings.lineWidth || 2,
        onPriceChange: onPriceChange || (() => { }),
        onPriceDrag: onPriceDrag,
    });

    series.attachPrimitive(primitive);
    return primitive;
}

/**
 * Update existing risk calculator primitive
 * 
 * @param params - Create primitive parameters
 * @returns Success boolean
 */
export function updateRiskCalculatorPrimitive(params: CreatePrimitiveParams, primitive: RiskCalculatorLines): boolean {
    const { results, settings, side } = params;

    if (!primitive || !results || !results.success) {
        return false;
    }

    const entryPrice = (results as any).entryPrice ?? (results.formatted ? parseFloat(results.formatted.entryPrice.replace('₹', '').replace(/,/g, '')) : 0);
    const stopLossPrice = (results as any).stopLossPrice ?? (results.formatted ? parseFloat(results.formatted.stopLossPrice.replace('₹', '').replace(/,/g, '')) : 0);
    const targetPrice = results.targetPrice || null;
    const targets = (results as any).targets || [];

    primitive.updatePrices(entryPrice, stopLossPrice, targetPrice, targets);
    
    // Update options (colors, callbacks, etc.)
    primitive.applyOptions({
        colors: settings.entryColor || settings.stopLossColor || settings.targetColor ? {
            entry: settings.entryColor || '#26a69a',
            stopLoss: settings.stopLossColor || '#ef5350',
            target: settings.targetColor || '#42a5f5',
        } : undefined,
        side: side || 'BUY',
        showTarget: results.showTarget !== false,
        onPriceChange: params.onPriceChange,
        onPriceDrag: params.onPriceDrag,
    });
    
    return true;
}

/**
 * Remove risk calculator primitive from chart
 *
 * @param params - Remove primitive parameters
 */
export function removeRiskCalculatorPrimitive(params: RemovePrimitiveParams): void {
    const { series, primitiveRef } = params;

    if (!primitiveRef.current || !series) return;

    try {
        series.detachPrimitive(primitiveRef.current);
    } catch (e) {
        logger.error('Failed to detach risk calculator primitive:', e);
    }

    primitiveRef.current = null;
}

/**
 * Initialize risk calculator primitive ref
 *
 * @returns Initialized ref object with null current
 */
export function initRiskCalculatorPrimitiveRef(): PrimitiveRef {
    return { current: null };
}

/**
 * Legacy function - kept for backward compatibility
 * Use createRiskCalculatorPrimitive instead
 */
export function updateRiskCalculatorLines(params: UpdateLinesParams): void {
    const { series, linesRef, results, settings, isActive } = params;

    logger.warn('updateRiskCalculatorLines is deprecated. Use createRiskCalculatorPrimitive instead.');

    if (!isActive || !results || !results.success || !series) {
        removeRiskCalculatorLines({ series, linesRef });
        return;
    }

    // This function is deprecated but kept for compatibility
}

/**
 * Legacy function - kept for backward compatibility
 * Use removeRiskCalculatorPrimitive instead
 */
export function removeRiskCalculatorLines(params: RemoveLinesParams): void {
    const { series, linesRef } = params;

    logger.warn('removeRiskCalculatorLines is deprecated. Use removeRiskCalculatorPrimitive instead.');

    if (!linesRef.current) return;

    const lineKeys: ('entry' | 'stopLoss' | 'target')[] = ['entry', 'stopLoss', 'target'];

    lineKeys.forEach((key) => {
        if (linesRef.current && linesRef.current[key]) {
            try {
                if (series) {
                    (series as any).removePriceLine(linesRef.current[key]);
                }
            } catch (e) {
                // Ignore errors
            }
            linesRef.current[key] = null;
        }
    });
}

/**
 * Legacy function - kept for backward compatibility
 * Use initRiskCalculatorPrimitiveRef instead
 */
export function initRiskCalculatorLinesRef(): LinesRef {
    return {
        current: {
            entry: null,
            stopLoss: null,
            target: null,
        }
    };
}
