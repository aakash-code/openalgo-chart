/**
 * Simple Moving Average (SMA) Indicator
 * Calculates the average price over a specified period
 * 
 * @param {Array} data - Array of OHLC data points with {time, open, high, low, close}
 * @param {number} period - Number of periods to calculate the average
 * @returns {Array} Array of {time, value} objects representing SMA values
 */
export const calculateSMA = (data, period) => {
  if (!Array.isArray(data) || period <= 0) {
    return [];
  }

  const smaData = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      continue; // Not enough data
    }

    let sum = 0;
    let validCount = 0;
    for (let j = 0; j < period; j++) {
      const index = i - j;
      // Validate array bounds and data integrity
      if (index >= 0 && index < data.length && data[index] && typeof data[index].close === 'number' && Number.isFinite(data[index].close)) {
        sum += data[index].close;
        validCount++;
      }
    }

    // Only add SMA point if we have enough valid data
    if (validCount === period) {
      smaData.push({ time: data[i].time, value: sum / period });
    }
  }
  return smaData;
};

