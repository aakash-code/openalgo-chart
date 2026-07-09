/**
 * Market Constants
 * Centralized market timing constants and utilities
 * Used by: PositionTracker, Watchlist, and other components needing market status
 */

/** Time of day with hour and minute */
export interface TimeOfDay {
  hour: number;
  minute: number;
}

/** Market hours with open and close times */
export interface MarketHours {
  open: TimeOfDay;
  close: TimeOfDay;
}

/** Market status result */
export interface MarketStatus {
  isOpen: boolean;
  status: 'Market Open' | 'Market Closed' | 'Pre-Market' | 'Weekend';
}

/** Time until market open/close */
export interface TimeUntilMarket {
  untilOpen: number;
  untilClose: number;
}

/** Exchange codes */
export type ExchangeCode = 'NSE' | 'NSE_INDEX' | 'BSE' | 'NFO' | 'MCX' | 'CDS' | 'BFO';

// Indian market timing constants (IST)
export const MARKET_HOURS: Record<string, MarketHours> = {
  NSE: {
    open: { hour: 9, minute: 15 },
    close: { hour: 15, minute: 30 },
  },
  BSE: {
    open: { hour: 9, minute: 15 },
    close: { hour: 15, minute: 30 },
  },
  NFO: {
    open: { hour: 9, minute: 15 },
    close: { hour: 15, minute: 30 },
  },
  MCX: {
    open: { hour: 9, minute: 0 },
    close: { hour: 23, minute: 30 },
  },
  CDS: {
    open: { hour: 9, minute: 0 },
    close: { hour: 17, minute: 0 },
  },
};

// Default market hours (for unspecified exchanges)
export const DEFAULT_MARKET_HOURS: MarketHours = {
  open: { hour: 9, minute: 15 },
  close: { hour: 15, minute: 30 },
};

// Shorthand for common use
export const MARKET_OPEN: TimeOfDay = DEFAULT_MARKET_HOURS.open;
export const MARKET_CLOSE: TimeOfDay = DEFAULT_MARKET_HOURS.close;

// Indian exchanges list
export const INDIAN_EXCHANGES: readonly ExchangeCode[] = [
  'NSE',
  'NSE_INDEX',
  'BSE',
  'NFO',
  'MCX',
  'CDS',
  'BFO',
] as const;

// US exchanges list (for future use)
export const US_EXCHANGES: readonly string[] = ['NYSE', 'NASDAQ', 'AMEX'] as const;

/**
 * Get market hours for an exchange
 * @param exchange - Exchange code
 * @returns Market hours with open and close times
 */
export const getMarketHours = (exchange: string): MarketHours => {
  const normalizedExchange = (exchange || '').toUpperCase().replace('_INDEX', '');
  return MARKET_HOURS[normalizedExchange] ?? DEFAULT_MARKET_HOURS;
};

/**
 * Convert time to minutes from midnight
 * @param hours - Hour (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Minutes from midnight
 */
export const timeToMinutes = (hours: number, minutes: number): number =>
  hours * 60 + minutes;

/**
 * Check if market is currently open for an exchange
 * @param exchange - Exchange code (default: 'NSE')
 * @param date - Date to check (defaults to now)
 * @returns Whether market is open
 */
export const isMarketOpen = (
  exchange: string = 'NSE',
  date: Date = new Date()
): boolean => {
  const day = date.getDay();

  // Weekend check (Sunday = 0, Saturday = 6)
  if (day === 0 || day === 6) return false;

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = timeToMinutes(hours, minutes);

  const marketHours = getMarketHours(exchange);
  const openTime = timeToMinutes(marketHours.open.hour, marketHours.open.minute);
  const closeTime = timeToMinutes(marketHours.close.hour, marketHours.close.minute);

  return timeInMinutes >= openTime && timeInMinutes <= closeTime;
};

/**
 * Get current market status
 * @param exchange - Exchange code (default: 'NSE')
 * @param date - Date to check
 * @returns Market status with isOpen and status string
 */
export const getMarketStatus = (
  exchange: string = 'NSE',
  date: Date = new Date()
): MarketStatus => {
  const day = date.getDay();

  // Weekend check
  if (day === 0 || day === 6) {
    return { isOpen: false, status: 'Weekend' };
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = timeToMinutes(hours, minutes);

  const marketHours = getMarketHours(exchange);
  const openTime = timeToMinutes(marketHours.open.hour, marketHours.open.minute);
  const closeTime = timeToMinutes(marketHours.close.hour, marketHours.close.minute);

  if (timeInMinutes >= openTime && timeInMinutes <= closeTime) {
    return { isOpen: true, status: 'Market Open' };
  } else if (timeInMinutes < openTime) {
    return { isOpen: false, status: 'Pre-Market' };
  } else {
    return { isOpen: false, status: 'Market Closed' };
  }
};

/**
 * Get time until market opens/closes in minutes
 * @param exchange - Exchange code (default: 'NSE')
 * @param date - Date to check
 * @returns Object with untilOpen and untilClose in minutes
 */
export const getTimeUntilMarket = (
  exchange: string = 'NSE',
  date: Date = new Date()
): TimeUntilMarket => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = timeToMinutes(hours, minutes);

  const marketHours = getMarketHours(exchange);
  const openTime = timeToMinutes(marketHours.open.hour, marketHours.open.minute);
  const closeTime = timeToMinutes(marketHours.close.hour, marketHours.close.minute);

  return {
    untilOpen: openTime - timeInMinutes,
    untilClose: closeTime - timeInMinutes,
  };
};

/**
 * Format market hours as string
 * @param exchange - Exchange code (default: 'NSE')
 * @returns Formatted string e.g., "9:15 AM - 3:30 PM"
 */
export const formatMarketHours = (exchange: string = 'NSE'): string => {
  const marketHours = getMarketHours(exchange);
  const formatTime = ({ hour, minute }: TimeOfDay): string => {
    const h = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };
  return `${formatTime(marketHours.open)} - ${formatTime(marketHours.close)}`;
};

export default {
  MARKET_HOURS,
  DEFAULT_MARKET_HOURS,
  MARKET_OPEN,
  MARKET_CLOSE,
  INDIAN_EXCHANGES,
  US_EXCHANGES,
  getMarketHours,
  timeToMinutes,
  isMarketOpen,
  getMarketStatus,
  getTimeUntilMarket,
  formatMarketHours,
};
