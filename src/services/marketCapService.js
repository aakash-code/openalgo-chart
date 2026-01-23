/**
 * Market Cap Data Service
 * Provides real market capitalization data for Indian stocks
 * Data source: Dhan Futures Stock List
 */

import marketCapCSV from '../data/market-cap-data.csv?raw';

// Parse CSV and create market cap lookup
const parseMarketCapData = () => {
  const marketCapMap = new Map();

  try {
    const lines = marketCapCSV.split('\n');

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle quoted fields)
      const match = line.match(/^"([^"]+)","[^"]*","([^"]+)","([^"]+)","[^"]*","[^"]*","([^"]+)"/);
      if (!match) continue;

      const [, name, ltp, changePercent, marketCapStr] = match;

      // Extract symbol from name (usually last word or part before "Ltd")
      // Examples: "Reliance Industries" -> "RELIANCE", "HDFC Bank" -> "HDFCBANK"
      let symbol = name
        .toUpperCase()
        .replace(/\s+LTD\.?$/i, '') // Remove "Ltd" suffix
        .replace(/\s+LIMITED$/i, '') // Remove "Limited" suffix
        .replace(/[^A-Z0-9\s&]/g, '') // Remove special chars except &
        .replace(/\s+/g, ''); // Remove spaces

      // Handle special cases
      if (symbol.includes('HDFC') && symbol.includes('BANK')) symbol = 'HDFCBANK';
      if (symbol.includes('KOTAK') && symbol.includes('BANK')) symbol = 'KOTAKBANK';
      if (symbol.includes('AXIS') && symbol.includes('BANK')) symbol = 'AXISBANK';
      if (symbol.includes('ICICI') && symbol.includes('BANK')) symbol = 'ICICIBANK';
      if (symbol.includes('STATE') && symbol.includes('BANK')) symbol = 'SBIN';
      if (symbol.includes('MARUTI')) symbol = 'MARUTI';
      if (symbol.includes('MAHINDRA&MAHINDRA')) symbol = 'M&M';
      if (symbol.includes('TATA') && symbol.includes('CONSULTANCY')) symbol = 'TCS';
      if (symbol.includes('RELIANCE') && symbol.includes('INDUSTRIES')) symbol = 'RELIANCE';
      if (symbol.includes('BHARTI') && symbol.includes('AIRTEL')) symbol = 'BHARTIARTL';
      if (symbol.includes('LARSEN&TOUBRO')) symbol = 'LT';
      if (symbol.includes('HINDUSTAN') && symbol.includes('UNILEVER')) symbol = 'HINDUNILVR';
      if (symbol.includes('SUNPHARMACEUTICAL')) symbol = 'SUNPHARMA';
      if (symbol.includes('HCLTECHNOLOGIES')) symbol = 'HCLTECH';
      if (symbol.includes('LICOF') && symbol.includes('INDIA')) symbol = 'LICI';

      // Parse market cap (remove commas, convert to number)
      // Format: "18,78,036.55" (in Crores)
      const marketCapCrores = parseFloat(marketCapStr.replace(/,/g, ''));

      // Convert Crores to actual value (1 Crore = 10 Million = 10,000,000)
      const marketCap = marketCapCrores * 10000000;

      if (!isNaN(marketCap) && marketCap > 0) {
        marketCapMap.set(symbol, {
          name,
          symbol,
          marketCap,
          marketCapCrores,
          ltp: parseFloat(ltp.replace(/,/g, '')),
          change: parseFloat(changePercent.replace(/%/g, '')),
        });
      }
    }

    console.log(`[MarketCapService] Loaded ${marketCapMap.size} stocks with market cap data`);

  } catch (error) {
    console.error('[MarketCapService] Error parsing market cap data:', error);
  }

  return marketCapMap;
};

// Initialize market cap data
const marketCapData = parseMarketCapData();

/**
 * Get market cap for a symbol
 * @param {string} symbol - Stock symbol (e.g., "RELIANCE", "TCS")
 * @returns {number|null} Market cap in rupees, or null if not found
 */
export const getMarketCap = (symbol) => {
  if (!symbol) return null;

  const normalizedSymbol = symbol.toUpperCase().trim();
  const data = marketCapData.get(normalizedSymbol);

  return data ? data.marketCap : null;
};

/**
 * Get full market data for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {object|null} Full market data or null
 */
export const getMarketData = (symbol) => {
  if (!symbol) return null;

  const normalizedSymbol = symbol.toUpperCase().trim();
  return marketCapData.get(normalizedSymbol) || null;
};

/**
 * Get all stocks with market cap data
 * @returns {Array} Array of all stocks with market data
 */
export const getAllMarketData = () => {
  return Array.from(marketCapData.values());
};

/**
 * Check if market cap data is available for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {boolean}
 */
export const hasMarketCapData = (symbol) => {
  if (!symbol) return false;
  const normalizedSymbol = symbol.toUpperCase().trim();
  return marketCapData.has(normalizedSymbol);
};

export default {
  getMarketCap,
  getMarketData,
  getAllMarketData,
  hasMarketCapData,
};
