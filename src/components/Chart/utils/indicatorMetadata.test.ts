import { describe, expect, it } from 'vitest';
import { getIndicatorMetadata, INDICATOR_CLEANUP_TYPES } from './indicatorMetadata';

describe('indicator metadata registry', () => {
  it('registers newly added overlay indicators for cleanup', () => {
    expect(getIndicatorMetadata('redCandleZones')).toMatchObject({
      cleanupType: INDICATOR_CLEANUP_TYPES.SERIES_ARRAY,
      arrayRef: 'redCandleZonesSeriesRef',
    });

    expect(getIndicatorMetadata('marketBias')).toMatchObject({
      cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
      seriesKeys: ['candles', 'band'],
    });

    expect(getIndicatorMetadata('srVolumeBoxes')).toMatchObject({
      cleanupType: INDICATOR_CLEANUP_TYPES.SERIES_ARRAY,
      arrayRef: 'srVolumeBoxesSeriesRef',
    });

    expect(getIndicatorMetadata('vwapBands')).toMatchObject({
      cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
      seriesKeys: ['center', 'upper1', 'lower1', 'upper2', 'lower2'],
    });
  });
});
