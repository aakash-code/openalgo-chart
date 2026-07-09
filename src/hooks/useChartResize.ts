/**
 * Chart Resize Hook
 * Handles chart resizing based on container dimensions using ResizeObserver
 */

import { useEffect, type RefObject } from 'react';

// ==================== TYPES ====================

/** Chart instance with applyOptions method */
export interface ChartInstance {
  applyOptions: (options: { width: number; height: number }) => void;
}

// ==================== HOOK ====================

/**
 * Hook to handle chart resizing based on container dimensions.
 * @param chartContainerRef - Ref to the chart container element
 * @param chartInstance - Lightweight Charts instance
 */
export const useChartResize = (
  chartContainerRef: RefObject<HTMLDivElement | null>,
  chartInstance: ChartInstance | null
): void => {
  useEffect(() => {
    if (!chartContainerRef.current || !chartInstance) return;

    const container = chartContainerRef.current;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;

      if (width > 0 && height > 0) {
        chartInstance.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(container);

    // Force initial sizing
    const { clientWidth, clientHeight } = container;
    if (clientWidth > 0 && clientHeight > 0) {
      chartInstance.applyOptions({ width: clientWidth, height: clientHeight });
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [chartContainerRef, chartInstance]);
};

export default useChartResize;
