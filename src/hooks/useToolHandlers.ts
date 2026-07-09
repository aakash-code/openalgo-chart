/**
 * Tool Handlers Hook
 * Manages drawing tools, image capture, fullscreen, and replay operations
 */

import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
// html2canvas is lazy loaded when screenshot is taken to reduce initial bundle size
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Chart reference methods */
export interface ChartRef {
  undo: () => void;
  redo: () => void;
  clearTools: () => void;
  toggleReplay: () => void;
  getChartContainer: () => HTMLElement | null;
}

/** Chart refs object */
export type ChartRefs = MutableRefObject<Record<number, ChartRef | null>>;

/** Confirmation dialog options */
export interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string | undefined;
  danger?: boolean | undefined;
}

/** Toast function type */
export type ShowToastFn = (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

/** Snapshot toast function type */
export type ShowSnapshotToastFn = (message: string) => void;

/** Request confirm function type */
export type RequestConfirmFn = (options: ConfirmOptions) => void;

/** Tool names */
export type ToolName =
  | 'magnet'
  | 'sequential_mode'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'clear_all'
  | 'lock_all'
  | 'hide_drawings'
  | 'show_timer'
  | string;

/** Hook parameters */
export interface UseToolHandlersParams {
  chartRefs: ChartRefs;
  activeChartId: number;
  setActiveTool: Dispatch<SetStateAction<string | null>>;
  setIsMagnetMode: Dispatch<SetStateAction<boolean>>;
  setIsDrawingsHidden: Dispatch<SetStateAction<boolean>>;
  setIsDrawingsLocked: Dispatch<SetStateAction<boolean>>;
  setIsTimerVisible: Dispatch<SetStateAction<boolean>>;
  setShowDrawingToolbar: Dispatch<SetStateAction<boolean>>;
  setIsReplayMode: Dispatch<SetStateAction<boolean>>;
  currentSymbol: string;
  showToast: ShowToastFn;
  showSnapshotToast: ShowSnapshotToastFn;
  requestConfirm?: RequestConfirmFn | undefined;
  isSequentialMode?: boolean | undefined;
  setIsSequentialMode?: Dispatch<SetStateAction<boolean>> | undefined;
}

/** Hook return type */
export interface UseToolHandlersReturn {
  toggleDrawingToolbar: () => void;
  handleToolChange: (tool: ToolName) => void;
  handleToolUsed: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleDownloadImage: () => Promise<void>;
  handleCopyImage: () => Promise<void>;
  handleFullScreen: () => void;
  handleReplayClick: () => void;
  handleReplayModeChange: (chartId: number, isActive: boolean) => void;
}

// ==================== HOOK ====================

/**
 * Custom hook for tool operations
 * @param params - Hook parameters
 * @returns Tool handler functions
 */
export const useToolHandlers = ({
  chartRefs,
  activeChartId,
  setActiveTool,
  setIsMagnetMode,
  setIsDrawingsHidden,
  setIsDrawingsLocked,
  setIsTimerVisible,
  setShowDrawingToolbar,
  setIsReplayMode,
  currentSymbol,
  showToast,
  showSnapshotToast,
  requestConfirm,
  isSequentialMode = false,
  setIsSequentialMode,
}: UseToolHandlersParams): UseToolHandlersReturn => {
  // Toggle drawing toolbar visibility
  const toggleDrawingToolbar = useCallback(() => {
    setShowDrawingToolbar((prev) => !prev);
  }, [setShowDrawingToolbar]);

  // Handle tool change - dispatch to appropriate handler
  const handleToolChange = useCallback(
    (tool: ToolName) => {
      if (tool === 'magnet') {
        setIsMagnetMode((prev) => !prev);
      } else if (tool === 'sequential_mode') {
        // Toggle sequential drawing mode
        if (setIsSequentialMode) {
          setIsSequentialMode((prev) => !prev);
        }
      } else if (tool === 'undo') {
        const activeRef = chartRefs.current[activeChartId];
        if (activeRef) {
          activeRef.undo();
        }
        setActiveTool(null);
      } else if (tool === 'redo') {
        const activeRef = chartRefs.current[activeChartId];
        if (activeRef) {
          activeRef.redo();
        }
        setActiveTool(null);
      } else if (tool === 'clear') {
        const activeRef = chartRefs.current[activeChartId];
        if (activeRef) {
          activeRef.clearTools();
        }
        setActiveTool(null);
      } else if (tool === 'clear_all') {
        // Confirm before clearing all drawings
        const clearDrawings = () => {
          const activeRef = chartRefs.current[activeChartId];
          if (activeRef) {
            activeRef.clearTools();
          }
          setIsDrawingsHidden(false);
          setIsDrawingsLocked(false);
          setActiveTool(null);
        };

        if (requestConfirm) {
          requestConfirm({
            title: 'Remove Objects',
            message: 'Clear all drawings? This action cannot be undone.',
            onConfirm: clearDrawings,
            confirmText: 'Remove',
            danger: true,
          });
        } else if (window.confirm('Clear all drawings? This action cannot be undone.')) {
          clearDrawings();
        }
      } else if (tool === 'lock_all') {
        setIsDrawingsLocked((prev) => !prev);
        setActiveTool(tool);
      } else if (tool === 'hide_drawings') {
        setIsDrawingsHidden((prev) => !prev);
        setActiveTool(tool);
      } else if (tool === 'show_timer') {
        setIsTimerVisible((prev) => !prev);
        setActiveTool(tool);
      } else {
        setActiveTool(tool);
      }
    },
    [
      chartRefs,
      activeChartId,
      setActiveTool,
      setIsMagnetMode,
      setIsDrawingsHidden,
      setIsDrawingsLocked,
      setIsTimerVisible,
      requestConfirm,
      setIsSequentialMode,
    ]
  );

  // Reset active tool after use (unless sequential mode is enabled)
  const handleToolUsed = useCallback(() => {
    if (!isSequentialMode) {
      setActiveTool(null);
    }
    // In sequential mode, keep the tool active so user can draw again
  }, [setActiveTool, isSequentialMode]);

  // Undo wrapper
  const handleUndo = useCallback(() => {
    handleToolChange('undo');
  }, [handleToolChange]);

  // Redo wrapper
  const handleRedo = useCallback(() => {
    handleToolChange('redo');
  }, [handleToolChange]);

  // Download chart as image
  const handleDownloadImage = useCallback(async () => {
    const activeRef = chartRefs.current[activeChartId];
    if (activeRef) {
      const chartContainer = activeRef.getChartContainer();
      if (chartContainer) {
        try {
          // Lazy load html2canvas only when needed (reduces initial bundle by ~200KB)
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(chartContainer, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#131722',
          });

          const image = canvas.toDataURL('image/png');
          const link = document.createElement('a');

          const now = new Date();
          const dateStr = now.toISOString().split('T')[0] ?? 'unknown';
          const timeStr = (now.toTimeString().split(' ')[0] ?? '00-00-00').replace(/:/g, '-');
          const filename = `${currentSymbol}_${dateStr}_${timeStr}.png`;

          link.href = image;
          link.download = filename;
          link.click();
        } catch (error) {
          logger.error('Screenshot failed:', error);
          showToast('Failed to download image', 'error');
        }
      }
    }
  }, [chartRefs, activeChartId, currentSymbol, showToast]);

  // Copy chart image to clipboard
  const handleCopyImage = useCallback(async () => {
    const activeRef = chartRefs.current[activeChartId];
    if (activeRef) {
      const chartContainer = activeRef.getChartContainer();
      if (chartContainer) {
        try {
          // Lazy load html2canvas only when needed (reduces initial bundle by ~200KB)
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(chartContainer, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#131722',
          });

          canvas.toBlob(async (blob) => {
            if (!blob) {
              showToast('Failed to create image blob', 'error');
              return;
            }
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob,
                }),
              ]);
              showSnapshotToast('Link to the chart image copied to clipboard');
            } catch (err) {
              logger.error('Failed to copy to clipboard:', err);
              showToast('Failed to copy to clipboard', 'error');
            }
          });
        } catch (error) {
          logger.error('Screenshot failed:', error);
          showToast('Failed to capture image', 'error');
        }
      }
    }
  }, [chartRefs, activeChartId, showToast, showSnapshotToast]);

  // Toggle fullscreen mode
  const handleFullScreen = useCallback(() => {
    const activeRef = chartRefs.current[activeChartId];
    if (activeRef) {
      const chartContainer = activeRef.getChartContainer();
      if (chartContainer) {
        const container = chartContainer as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
          msRequestFullscreen?: () => Promise<void>;
        };
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
          container.msRequestFullscreen();
        }
      }
    }
  }, [chartRefs, activeChartId]);

  // Toggle replay mode
  const handleReplayClick = useCallback(() => {
    const activeRef = chartRefs.current[activeChartId];
    if (activeRef) {
      activeRef.toggleReplay();
    }
  }, [chartRefs, activeChartId]);

  // Handle replay mode change from chart
  const handleReplayModeChange = useCallback(
    (chartId: number, isActive: boolean) => {
      if (chartId === activeChartId) {
        setIsReplayMode(isActive);
      }
    },
    [activeChartId, setIsReplayMode]
  );

  return {
    toggleDrawingToolbar,
    handleToolChange,
    handleToolUsed,
    handleUndo,
    handleRedo,
    handleDownloadImage,
    handleCopyImage,
    handleFullScreen,
    handleReplayClick,
    handleReplayModeChange,
  };
};

export default useToolHandlers;
