/**
 * useVirtualScroll Hook
 * Efficient rendering of large lists by only rendering visible items
 *
 * Usage:
 *   const { visibleItems, containerProps, totalHeight, startIndex } = useVirtualScroll({
 *     items: myLargeArray,
 *     itemHeight: 40,
 *     containerHeight: 400,
 *     overscan: 5
 *   });
 */

import React, { useState, useCallback, useRef, useEffect, useMemo, type CSSProperties, type RefObject } from 'react';

// ==================== TYPES ====================

/** Item with optional ID */
export interface VirtualItem {
  id?: string | number | undefined;
  [key: string]: unknown;
}

/** Get item height function type */
export type GetItemHeightFn<T> = (item: T, index: number) => number;

/** Virtual scroll options */
export interface UseVirtualScrollOptions<T = VirtualItem> {
  /** Array of items to render */
  items?: T[] | undefined;
  /** Height of each item in pixels */
  itemHeight?: number | undefined;
  /** Height of the container in pixels */
  containerHeight?: number | undefined;
  /** Number of items to render outside visible area */
  overscan?: number | undefined;
  /** Optional function to get dynamic item height */
  getItemHeight?: GetItemHeightFn<T> | null | undefined;
}

/** Container props for the scrollable container */
export interface ContainerProps {
  ref: RefObject<HTMLDivElement | null>;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  style: CSSProperties;
}

/** Inner container props */
export interface InnerProps {
  style: CSSProperties;
}

/** Item style */
export interface ItemStyle extends CSSProperties {
  position: 'absolute';
  top: number;
  left: number;
  right: number;
  height: number;
}

/** Virtual scroll return type */
export interface UseVirtualScrollReturn<T> {
  // Visible items to render
  visibleItems: T[];

  // Indices
  startIndex: number;
  endIndex: number;

  // Dimensions
  totalHeight: number;
  offsetY: number;
  containerHeight: number;

  // Scroll state
  scrollTop: number;
  isAtTop: boolean;
  isAtBottom: boolean;

  // Props to spread
  containerProps: ContainerProps;
  innerProps: InnerProps;
  getItemStyle: (index: number) => ItemStyle;

  // Refs
  containerRef: RefObject<HTMLDivElement | null>;

  // Actions
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

/** Virtual list component props */
export interface VirtualListProps<T = VirtualItem> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ==================== HOOK ====================

/**
 * Virtual scroll hook for efficiently rendering large lists
 *
 * @param options - Configuration options
 * @returns Virtual scroll state and handlers
 */
export const useVirtualScroll = <T extends VirtualItem = VirtualItem>(
  options: UseVirtualScrollOptions<T> = {}
): UseVirtualScrollReturn<T> => {
  const {
    items = [] as T[],
    itemHeight = 40,
    containerHeight = 400,
    overscan = 3,
    getItemHeight = null,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (getItemHeight) {
      // Dynamic heights
      return items.reduce((sum, item, index) => sum + getItemHeight(item, index), 0);
    }
    // Fixed height
    return items.length * itemHeight;
  }, [items, itemHeight, getItemHeight]);

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0 };
    }

    if (getItemHeight) {
      // Dynamic heights - need to calculate cumulative heights
      let cumulativeHeight = 0;
      let start = 0;
      let end = 0;
      let foundStart = false;

      for (let i = 0; i < items.length; i++) {
        const height = getItemHeight(items[i] as T, i);

        if (!foundStart && cumulativeHeight + height > scrollTop) {
          start = Math.max(0, i - overscan);
          foundStart = true;
        }

        if (cumulativeHeight > scrollTop + containerHeight) {
          end = Math.min(items.length, i + overscan);
          break;
        }

        cumulativeHeight += height;
      }

      if (!foundStart) start = 0;
      if (end === 0) end = items.length;

      // Calculate offset for start index
      let offset = 0;
      for (let i = 0; i < start; i++) {
        offset += getItemHeight(items[i] as T, i);
      }

      return { startIndex: start, endIndex: end, offsetY: offset };
    }

    // Fixed height calculation
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return {
      startIndex: start,
      endIndex: end,
      offsetY: start * itemHeight,
    };
  }, [items, itemHeight, containerHeight, overscan, scrollTop, getItemHeight]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  // Scroll handler with RAF throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const target = event.target as HTMLDivElement;
      setScrollTop(target.scrollTop);
    });
  }, []);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      if (!containerRef.current || index < 0 || index >= items.length) {
        return;
      }

      let targetScrollTop: number;

      if (getItemHeight) {
        // Calculate position for dynamic heights
        let position = 0;
        for (let i = 0; i < index; i++) {
          position += getItemHeight(items[i] as T, i);
        }
        targetScrollTop = position;

        if (align === 'center') {
          const itemH = getItemHeight(items[index] as T, index);
          targetScrollTop = position - (containerHeight - itemH) / 2;
        } else if (align === 'end') {
          const itemH = getItemHeight(items[index] as T, index);
          targetScrollTop = position - containerHeight + itemH;
        }
      } else {
        // Fixed height
        targetScrollTop = index * itemHeight;

        if (align === 'center') {
          targetScrollTop = index * itemHeight - (containerHeight - itemHeight) / 2;
        } else if (align === 'end') {
          targetScrollTop = index * itemHeight - containerHeight + itemHeight;
        }
      }

      containerRef.current.scrollTop = Math.max(
        0,
        Math.min(targetScrollTop, totalHeight - containerHeight)
      );
    },
    [items, itemHeight, containerHeight, totalHeight, getItemHeight]
  );

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = totalHeight - containerHeight;
    }
  }, [totalHeight, containerHeight]);

  // Check if scrolled to top/bottom
  const isAtTop = scrollTop <= 0;
  const isAtBottom = scrollTop >= totalHeight - containerHeight - 1;

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Container props to spread on the scrollable container
  const containerProps: ContainerProps = {
    ref: containerRef,
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflow: 'auto',
      position: 'relative',
    },
  };

  // Inner container props for the full-height div
  const innerProps: InnerProps = {
    style: {
      height: totalHeight,
      position: 'relative',
    },
  };

  // Get item style based on index
  const getItemStyle = useCallback(
    (index: number): ItemStyle => {
      if (getItemHeight) {
        // Dynamic - need to calculate position
        let position = 0;
        for (let i = 0; i < startIndex + index; i++) {
          position += getItemHeight(items[i] as T, i);
        }
        return {
          position: 'absolute',
          top: position,
          left: 0,
          right: 0,
          height: getItemHeight(items[startIndex + index] as T, startIndex + index),
        };
      }

      // Fixed height
      return {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      };
    },
    [startIndex, itemHeight, items, getItemHeight]
  );

  return {
    // Visible items to render
    visibleItems,

    // Indices
    startIndex,
    endIndex,

    // Dimensions
    totalHeight,
    offsetY,
    containerHeight,

    // Scroll state
    scrollTop,
    isAtTop,
    isAtBottom,

    // Props to spread
    containerProps,
    innerProps,
    getItemStyle,

    // Refs
    containerRef,

    // Actions
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
  };
};

// ==================== COMPONENT ====================

/**
 * Simple virtual list component for common use cases
 */
export const VirtualList = <T extends VirtualItem = VirtualItem>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  style = {},
}: VirtualListProps<T>): React.ReactElement => {
  const { visibleItems, containerProps, innerProps, getItemStyle, startIndex } = useVirtualScroll<T>({
    items,
    itemHeight,
    containerHeight,
    overscan,
  });

  return (
    <div {...containerProps} className={className} style={{ ...containerProps.style, ...style }}>
      <div {...innerProps}>
        {visibleItems.map((item, index) => (
          <div key={item.id ?? startIndex + index} style={getItemStyle(index)}>
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default useVirtualScroll;
