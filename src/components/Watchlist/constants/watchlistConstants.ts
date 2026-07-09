/**
 * Watchlist Constants
 * Symbol full names and other constants
 */

// Re-export market status from centralized module
import { isMarketOpen } from '../../../constants/marketConstants';
export { isMarketOpen };

// Symbol full names (can be extended or fetched from API)
export const SYMBOL_FULL_NAMES: Record<string, string> = {
    'NIFTY': 'Nifty 50 Index',
    'BANKNIFTY': 'Bank Nifty Index',
    'NIFTY50': 'Nifty 50 Index',
    'SENSEX': 'BSE Sensex',
    'RELIANCE': 'Reliance Industries Limited',
    'TCS': 'Tata Consultancy Services',
    'INFY': 'Infosys Limited',
    'HDFCBANK': 'HDFC Bank Limited',
    'ICICIBANK': 'ICICI Bank Limited',
    'SBIN': 'State Bank of India',
    'BHARTIARTL': 'Bharti Airtel Limited',
    'ITC': 'ITC Limited',
    'HINDUNILVR': 'Hindustan Unilever Limited',
    'KOTAKBANK': 'Kotak Mahindra Bank',
    'LT': 'Larsen & Toubro Limited',
    'AXISBANK': 'Axis Bank Limited',
    'BAJFINANCE': 'Bajaj Finance Limited',
    'MARUTI': 'Maruti Suzuki India Limited',
    'ASIANPAINT': 'Asian Paints Limited',
    'TITAN': 'Titan Company Limited',
    'SUNPHARMA': 'Sun Pharmaceutical Industries',
    'WIPRO': 'Wipro Limited',
    'ULTRACEMCO': 'UltraTech Cement Limited',
    'NESTLEIND': 'Nestle India Limited',
    'POWERGRID': 'Power Grid Corporation',
    'NTPC': 'NTPC Limited',
    'ONGC': 'Oil and Natural Gas Corporation',
    'JSWSTEEL': 'JSW Steel Limited',
    'TATASTEEL': 'Tata Steel Limited',
    'M&M': 'Mahindra & Mahindra Limited',
    'HCLTECH': 'HCL Technologies Limited',
    'ADANIENT': 'Adani Enterprises Limited',
    'ADANIPORTS': 'Adani Ports and SEZ Limited',
    'COALINDIA': 'Coal India Limited',
    'BPCL': 'Bharat Petroleum Corporation',
    'GRASIM': 'Grasim Industries Limited',
    'TECHM': 'Tech Mahindra Limited',
    'INDUSINDBK': 'IndusInd Bank Limited',
    'EICHERMOT': 'Eicher Motors Limited',
    'DIVISLAB': 'Divi\'s Laboratories Limited',
    'DRREDDY': 'Dr. Reddy\'s Laboratories',
    'CIPLA': 'Cipla Limited',
    'APOLLOHOSP': 'Apollo Hospitals Enterprise',
    'BRITANNIA': 'Britannia Industries Limited',
    'HEROMOTOCO': 'Hero MotoCorp Limited',
    'BAJAJ-AUTO': 'Bajaj Auto Limited',
    'TATACONSUM': 'Tata Consumer Products Limited',
    'SBILIFE': 'SBI Life Insurance Company',
    'HDFCLIFE': 'HDFC Life Insurance Company',
};

/**
 * Check if market is open (simplified)
 * @deprecated Use isMarketOpen from constants/marketConstants instead
 */
export function isMarketOpenNow(exchange?: string): boolean {
    // Delegate to centralized market utility
    return isMarketOpen(exchange);
}

export default {
    SYMBOL_FULL_NAMES,
    isMarketOpenNow,
};
