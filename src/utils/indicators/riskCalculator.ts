/**
 * Risk Calculator - Calculate position size based on risk
 *
 * @module riskCalculator
 */
import { formatCurrency } from '../shared/formatters';

export type TradeSide = 'BUY' | 'SELL';
export type TradeSegment = 'Equity Delivery' | 'Equity Intraday' | 'F&O Futures' | 'F&O Options';
export type Exchange = 'NSE' | 'BSE';

export interface RiskTarget {
    price: number;
    exitPercent: number; // 0 to 100
    quantity?: number;
    rewardAmount?: number;
    riskRewardRatio?: number;
    formattedPrice?: string;
    formattedReward?: string;
    
    // Indian specific
    netProfit?: number;
    charges?: number;
    formattedNetProfit?: string;
    formattedCharges?: string;
}

export interface RiskCalculationParams {
    capital: number;
    riskPercent: number;
    entryPrice: number;
    stopLossPrice: number;
    targetPrice?: number | null;
    riskRewardRatio?: number;
    targets?: RiskTarget[];
    side: TradeSide;
    
    leverage?: number;
    segment?: TradeSegment;
    exchange?: Exchange;
}

export interface FormattedRiskResult {
    capital: string;
    leverage?: string;
    riskPercent: string;
    riskAmount: string;
    riskPerShare: string;
    entryPrice: string;
    stopLossPrice: string;
    slPoints: string;
    quantity: string;
    positionValue: string;
    targetPrice: string;
    rewardPoints: string;
    rewardAmount: string;
    rrRatio: string;
    blendedRR?: string;
    
    // Indian specific
    initialMargin?: string;
    marginReqPct?: string;
    totalBrokerage?: string;
    totalSTT?: string;
    otherCharges?: string;
    totalCharges?: string;
    breakEvenPoints?: string;
    netProfit?: string;
    netLoss?: string;
    totalPartialGross?: string;
    totalPartialCharges?: string;
    totalNetPartial?: string;
    totalPartialROI?: string;
}

export interface IndianCharges {
    brokerageTotal: number;
    sttTotal: number;
    txnTotal: number;
    sebiTotal: number;
    stampDuty: number;
    gstTotal: number;
    totalCharges: number;
}

export interface RiskCalculationSuccess {
    success: true;
    riskAmount: number;
    riskPerShare: number;
    slPoints: number;
    quantity: number;
    positionValue: number;
    targetPrice: number;
    rewardPoints: number;
    rewardAmount: number;
    riskRewardRatio: number;
    formatted: FormattedRiskResult;
    side: TradeSide;
    targets?: RiskTarget[];
    blendedRR?: number;
    showTarget?: boolean;
    
    // Indian specific
    initialMargin?: number;
    exceedsBuyingPower?: boolean;
    charges?: IndianCharges;
    netProfit?: number;
    netLoss?: number;
    breakEvenPoints?: number;
    totalPartialGross?: number;
    totalPartialCharges?: number;
    totalNetPartial?: number;
    totalPartialROI?: number;
    isPartialValid?: boolean;
}

export interface RiskCalculationError {
    error: string;
    success?: false;
}

export type RiskCalculationResult = RiskCalculationSuccess | RiskCalculationError;

export function calculateCharges(
    buyValue: number,
    sellValue: number,
    segment: TradeSegment,
    exchange: Exchange
): IndianCharges {
    let txnChargeRate = 0.0;
    if (exchange === 'NSE') {
        if (segment === 'Equity Delivery' || segment === 'Equity Intraday') txnChargeRate = 0.0000297;
        else if (segment === 'F&O Futures') txnChargeRate = 0.0000173;
        else if (segment === 'F&O Options') txnChargeRate = 0.0003503;
    } else {
        if (segment === 'Equity Delivery' || segment === 'Equity Intraday') txnChargeRate = 0.0000375;
        else if (segment === 'F&O Futures') txnChargeRate = 0.0;
        else if (segment === 'F&O Options') txnChargeRate = 0.000325;
    }

    let sttBuyRate = 0.0;
    let sttSellRate = 0.0;
    if (segment === 'Equity Delivery') {
        sttBuyRate = 0.001; sttSellRate = 0.001;
    } else if (segment === 'Equity Intraday') {
        sttBuyRate = 0.0; sttSellRate = 0.00025;
    } else if (segment === 'F&O Futures') {
        sttBuyRate = 0.0; sttSellRate = 0.0005; // 0.05% Budget 2026
    } else if (segment === 'F&O Options') {
        sttBuyRate = 0.0; sttSellRate = 0.0015; // 0.15% Budget 2026
    }

    let stampDutyRate = 0.0;
    if (segment === 'Equity Delivery') stampDutyRate = 0.00015;
    else if (segment === 'Equity Intraday') stampDutyRate = 0.00003;
    else if (segment === 'F&O Futures') stampDutyRate = 0.00002;
    else if (segment === 'F&O Options') stampDutyRate = 0.00003;

    const sebiChargeRate = 0.000001;

    let brokerageBuy = 20;
    let brokerageSell = 20;
    if (segment === 'Equity Delivery' || segment === 'Equity Intraday') {
        brokerageBuy = Math.min(buyValue * 0.0003, 20);
        brokerageSell = Math.min(sellValue * 0.0003, 20);
    }

    const sttBuy = buyValue * sttBuyRate;
    const sttSell = sellValue * sttSellRate;
    const sttTotal = sttBuy + sttSell;

    const txnBuy = buyValue * txnChargeRate;
    const txnSell = sellValue * txnChargeRate;
    const txnTotal = txnBuy + txnSell;

    const sebiBuy = buyValue * sebiChargeRate;
    const sebiSell = sellValue * sebiChargeRate;
    const sebiTotal = sebiBuy + sebiSell;

    const stampDuty = buyValue * stampDutyRate;
    const brokerageTotal = brokerageBuy + brokerageSell;

    const gstBase = brokerageTotal + txnTotal + sebiTotal;
    const gstTotal = gstBase * 0.18;

    const totalCharges = sttTotal + txnTotal + sebiTotal + stampDuty + brokerageTotal + gstTotal;

    return {
        brokerageTotal,
        sttTotal,
        txnTotal,
        sebiTotal,
        stampDuty,
        gstTotal,
        totalCharges
    };
}

export function calculateRiskPosition(params: RiskCalculationParams): RiskCalculationResult {
    const {
        capital,
        riskPercent,
        entryPrice,
        stopLossPrice,
        targetPrice = null,
        riskRewardRatio = 2,
        side,
        leverage = 1,
        segment = 'Equity Intraday',
        exchange = 'NSE'
    } = params;

    if (!capital || capital <= 0) return { error: 'Capital must be greater than 0' };
    if (!riskPercent || riskPercent <= 0) return { error: 'Risk % must be greater than 0' };
    if (!entryPrice || entryPrice <= 0) return { error: 'Entry price must be greater than 0' };
    if (!stopLossPrice || stopLossPrice <= 0) return { error: 'Stop loss price must be greater than 0' };
    if (!targetPrice && (!riskRewardRatio || riskRewardRatio <= 0)) return { error: 'Risk:Reward ratio must be greater than 0' };

    const riskAmount = capital * (riskPercent / 100);
    const slPoints = Math.abs(entryPrice - stopLossPrice);

    if (slPoints <= 0) return { error: 'Invalid stop loss: must be different from entry' };

    const effectiveSide: TradeSide = stopLossPrice > entryPrice ? 'SELL' : 'BUY';

    const riskPerShare = slPoints;
    
    // Initial quantity based on risk amount
    let quantity = Math.floor(riskAmount / slPoints);

    // Physical Buying Power Check
    const maxBuyingPower = capital * leverage;
    const maxQtyByBuyingPower = Math.floor(maxBuyingPower / entryPrice);
    
    // Cap quantity by buying power
    const isCappedByBuyingPower = quantity > maxQtyByBuyingPower;
    if (isCappedByBuyingPower) {
        quantity = maxQtyByBuyingPower;
    }

    if (quantity <= 0) return { error: 'Calculated quantity is 0. Increase capital, risk %, or leverage' };

    const positionValue = quantity * entryPrice;

    // Margin validation
    const exceedsBuyingPower = positionValue > maxBuyingPower;
    const initialMargin = positionValue / leverage;

    let finalTargetPrice: number;
    let finalRiskRewardRatio: number;

    if (targetPrice && targetPrice > 0) {
        finalTargetPrice = targetPrice;
        if (effectiveSide === 'BUY' && targetPrice <= entryPrice) return { error: 'For BUY: Target must be above Entry' };
        if (effectiveSide === 'SELL' && targetPrice >= entryPrice) return { error: 'For SELL: Target must be below Entry' };
        const targetPoints = Math.abs(targetPrice - entryPrice);
        finalRiskRewardRatio = targetPoints / slPoints;
    } else {
        finalRiskRewardRatio = riskRewardRatio;
        if (effectiveSide === 'BUY') {
            finalTargetPrice = entryPrice + (slPoints * finalRiskRewardRatio);
        } else {
            finalTargetPrice = entryPrice - (slPoints * finalRiskRewardRatio);
        }
    }

    const rewardPoints = Math.abs(finalTargetPrice - entryPrice);
    const rewardAmount = rewardPoints * quantity;

    // Calculate Overall Charges for a standard T1 full exit
    const overallBuyValue = effectiveSide === 'BUY' ? positionValue : quantity * finalTargetPrice;
    const overallSellValue = effectiveSide === 'BUY' ? quantity * finalTargetPrice : positionValue;
    const overallCharges = calculateCharges(overallBuyValue, overallSellValue, segment, exchange);
    
    // Stop Loss charges
    const slBuyValue = effectiveSide === 'BUY' ? positionValue : quantity * stopLossPrice;
    const slSellValue = effectiveSide === 'BUY' ? quantity * stopLossPrice : positionValue;
    const slCharges = calculateCharges(slBuyValue, slSellValue, segment, exchange);
    
    const netProfit = rewardAmount - overallCharges.totalCharges;
    const netLoss = (slPoints * quantity) + slCharges.totalCharges;
    const breakEvenPoints = quantity > 0 ? overallCharges.totalCharges / quantity : 0;

    let processedTargets: RiskTarget[] | undefined;
    let blendedRR: number | undefined;
    
    let totalPartialGross = 0;
    let totalPartialCharges = 0;
    let totalNetPartial = 0;
    let isPartialValid = true;

    if (params.targets && params.targets.length > 0) {
        let totalReward = 0;
        let remainingQty = quantity;
        
        const totalPct = params.targets.reduce((acc, t) => acc + t.exitPercent, 0);
        isPartialValid = Math.abs(totalPct - 100) < 0.01;
        
        processedTargets = params.targets.map((t, idx) => {
            // Last target gets remaining quantity to avoid rounding issues
            const isLast = idx === params.targets!.length - 1;
            let targetQty = Math.floor((t.exitPercent / 100) * quantity);
            if (isLast) targetQty = remainingQty;
            const actualQty = Math.min(targetQty, remainingQty);
            remainingQty -= actualQty;
            
            const targetPoints = Math.abs(t.price - entryPrice);
            const targetReward = targetPoints * actualQty;
            const targetRR = targetPoints / slPoints;
            
            // Charges per tranche
            const trancheBuyValue = effectiveSide === 'BUY' ? actualQty * entryPrice : actualQty * t.price;
            const trancheSellValue = effectiveSide === 'BUY' ? actualQty * t.price : actualQty * entryPrice;
            const trancheCharges = calculateCharges(trancheBuyValue, trancheSellValue, segment, exchange);
            
            const targetNetProfit = targetReward - trancheCharges.totalCharges;
            
            totalReward += targetReward;
            totalPartialGross += targetReward;
            totalPartialCharges += trancheCharges.totalCharges;
            totalNetPartial += targetNetProfit;
            
            return {
                ...t,
                quantity: actualQty,
                rewardAmount: targetReward,
                riskRewardRatio: targetRR,
                netProfit: targetNetProfit,
                charges: trancheCharges.totalCharges,
                formattedPrice: formatCurrency(t.price, { showSymbol: true }),
                formattedReward: formatCurrency(targetReward, { showSymbol: true }),
                formattedNetProfit: formatCurrency(targetNetProfit, { showSymbol: true }),
                formattedCharges: formatCurrency(trancheCharges.totalCharges, { showSymbol: true })
            };
        });
        
        blendedRR = totalReward / riskAmount;
    }

    const marginReqPct = leverage > 0 ? 100 / leverage : 100;
    const totalPartialROI = initialMargin > 0 ? (totalNetPartial / initialMargin) * 100 : 0;

    return {
        success: true,
        riskAmount,
        riskPerShare,
        slPoints,
        quantity,
        positionValue,
        targetPrice: finalTargetPrice,
        rewardPoints,
        rewardAmount,
        riskRewardRatio: finalRiskRewardRatio,
        side: effectiveSide,
        targets: processedTargets,
        blendedRR,
        initialMargin,
        exceedsBuyingPower,
        charges: overallCharges,
        netProfit,
        netLoss,
        breakEvenPoints,
        totalPartialGross,
        totalPartialCharges,
        totalNetPartial,
        totalPartialROI,
        isPartialValid,

        formatted: {
            capital: formatCurrency(capital, { showSymbol: true, decimals: 0 }),
            leverage: `${leverage}x`,
            riskPercent: `${riskPercent}%`,
            riskAmount: formatCurrency(riskAmount, { showSymbol: true }),
            riskPerShare: formatCurrency(riskPerShare, { showSymbol: true }),
            entryPrice: formatCurrency(entryPrice, { showSymbol: true }),
            stopLossPrice: formatCurrency(stopLossPrice, { showSymbol: true }),
            slPoints: slPoints.toFixed(2),
            quantity: quantity.toLocaleString('en-IN'),
            positionValue: formatCurrency(positionValue, { showSymbol: true }),
            targetPrice: formatCurrency(finalTargetPrice, { showSymbol: true }),
            rewardPoints: rewardPoints.toFixed(2),
            rewardAmount: formatCurrency(rewardAmount, { showSymbol: true }),
            rrRatio: `1 : ${Number.isInteger(finalRiskRewardRatio) ? finalRiskRewardRatio : finalRiskRewardRatio.toFixed(2)}`,
            blendedRR: blendedRR ? `1 : ${blendedRR.toFixed(2)}` : undefined,
            
            // Indian specific formatting
            initialMargin: formatCurrency(initialMargin, { showSymbol: true }),
            marginReqPct: `${marginReqPct.toFixed(0)}%`,
            totalBrokerage: formatCurrency(overallCharges.brokerageTotal, { showSymbol: true }),
            totalSTT: formatCurrency(overallCharges.sttTotal, { showSymbol: true }),
            otherCharges: formatCurrency(overallCharges.txnTotal + overallCharges.sebiTotal + overallCharges.stampDuty + overallCharges.gstTotal, { showSymbol: true }),
            totalCharges: formatCurrency(overallCharges.totalCharges, { showSymbol: true }),
            breakEvenPoints: breakEvenPoints.toFixed(2),
            netProfit: formatCurrency(netProfit, { showSymbol: true }),
            netLoss: formatCurrency(netLoss, { showSymbol: true }),
            totalPartialGross: formatCurrency(totalPartialGross, { showSymbol: true }),
            totalPartialCharges: formatCurrency(totalPartialCharges, { showSymbol: true }),
            totalNetPartial: formatCurrency(totalNetPartial, { showSymbol: true }),
            totalPartialROI: `${totalPartialROI.toFixed(2)}%`
        }
    };
}

export function autoDetectSide(entryPrice: number, stopLossPrice: number): TradeSide | null {
    if (!entryPrice || !stopLossPrice || entryPrice <= 0 || stopLossPrice <= 0) return null;
    if (entryPrice === stopLossPrice) return null;
    return stopLossPrice > entryPrice ? 'SELL' : 'BUY';
}

export interface RiskValidationParams {
    capital?: number;
    riskPercent?: number;
    entryPrice?: number;
    stopLossPrice?: number;
    targetPrice?: number;
    side?: TradeSide;
    leverage?: number;
}

export interface RiskValidationResult {
    isValid: boolean;
    errors: string[];
}

export function validateRiskParams(params: RiskValidationParams): RiskValidationResult {
    const errors: string[] = [];
    if (!params.capital || params.capital <= 0) errors.push('Capital must be greater than 0');
    if (!params.riskPercent || params.riskPercent <= 0 || params.riskPercent > 100) errors.push('Risk % must be between 0 and 100');
    if (!params.entryPrice || params.entryPrice <= 0) errors.push('Entry price must be greater than 0');
    if (!params.stopLossPrice || params.stopLossPrice <= 0) errors.push('Stop loss price must be greater than 0');
    if (params.leverage && params.leverage <= 0) errors.push('Leverage must be greater than 0');
    if (params.entryPrice && params.stopLossPrice && params.entryPrice === params.stopLossPrice) {
        errors.push('Stop loss must be different from entry');
    }
    return { isValid: errors.length === 0, errors };
}

export interface DetailedValidationErrors {
    capital?: string;
    capitalLevel?: 'warning';
    riskPercent?: string;
    riskPercentLevel?: 'warning';
    entryPrice?: string;
    stopLossPrice?: string;
    stopLossSuggestion?: string;
    targetPrice?: string;
    targetSuggestion?: string;
    leverage?: string;
}

export interface DetailedValidationResult {
    isValid: boolean;
    errors: DetailedValidationErrors;
    warnings: string[];
}

export function validateRiskParamsDetailed(params: RiskValidationParams): DetailedValidationResult {
    const errors: DetailedValidationErrors = {};
    if (!params.capital || params.capital <= 0) errors.capital = 'Capital must be greater than 0';
    else if (params.capital < 1000) { errors.capital = 'Capital should be at least 1,000'; errors.capitalLevel = 'warning'; }

    if (!params.riskPercent || params.riskPercent <= 0) errors.riskPercent = 'Risk % must be greater than 0';
    else if (params.riskPercent > 5) { errors.riskPercent = 'Risk > 5% is very aggressive'; errors.riskPercentLevel = 'warning'; }
    else if (params.riskPercent > 100) errors.riskPercent = 'Risk % cannot exceed 100%';

    if (!params.entryPrice || params.entryPrice <= 0) errors.entryPrice = 'Entry must be greater than 0';
    if (!params.stopLossPrice || params.stopLossPrice <= 0) errors.stopLossPrice = 'Stop loss must be greater than 0';
    if (params.leverage && params.leverage <= 0) errors.leverage = 'Leverage must be > 0';

    if (params.entryPrice && params.stopLossPrice && params.entryPrice > 0 && params.stopLossPrice > 0) {
        if (params.entryPrice === params.stopLossPrice) {
            errors.stopLossPrice = 'Stop loss must differ from entry';
            errors.entryPrice = 'Entry must differ from stop loss';
        }
    }

    if (params.targetPrice && params.targetPrice > 0 && params.entryPrice && params.entryPrice > 0) {
        const side = params.side || (params.stopLossPrice! > params.entryPrice ? 'SELL' : 'BUY');
        if (side === 'BUY' && params.targetPrice <= params.entryPrice) {
            errors.targetPrice = `For BUY, target must be above entry (> ${params.entryPrice.toFixed(2)})`;
            errors.targetSuggestion = (params.entryPrice * 1.02).toFixed(2);
        }
        if (side === 'SELL' && params.targetPrice >= params.entryPrice) {
            errors.targetPrice = `For SELL, target must be below entry (< ${params.entryPrice.toFixed(2)})`;
            errors.targetSuggestion = Math.max(0.01, params.entryPrice * 0.98).toFixed(2);
        }
    }

    const errorKeys = Object.keys(errors).filter(k => !k.endsWith('Suggestion') && !k.endsWith('Level')) as (keyof DetailedValidationErrors)[];
    const warningKeys = errorKeys.filter(k => {
        const levelKey = `${k}Level` as keyof DetailedValidationErrors;
        return errors[levelKey] === 'warning';
    });
    const blockingErrors = errorKeys.filter(k => !warningKeys.includes(k as any));

    return { isValid: blockingErrors.length === 0, errors, warnings: warningKeys as string[] };
}
