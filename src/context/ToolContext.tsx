/**
 * ToolContext - Drawing tool state management
 * Manages drawing tools, magnet mode, and toolbar visibility
 */

import {
  createContext,
  useState,
  useContext,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ==================== TYPES ====================

/** Drawing tool names */
export type DrawingTool =
  | 'TrendLine'
  | 'HorizontalLine'
  | 'VerticalLine'
  | 'Rectangle'
  | 'Circle'
  | 'Path'
  | 'Text'
  | 'Callout'
  | 'PriceRange'
  | 'Arrow'
  | 'Ray'
  | 'ExtendedLine'
  | 'ParallelChannel'
  | 'FibonacciRetracement';

/** Tool context value */
export interface ToolContextValue {
  // Active tool
  activeTool: string | null;
  setActiveTool: Dispatch<SetStateAction<string | null>>;
  clearActiveTool: () => void;
  selectTool: (tool: string) => void;

  // Magnet mode
  isMagnetMode: boolean;
  setIsMagnetMode: Dispatch<SetStateAction<boolean>>;
  toggleMagnetMode: () => void;

  // Toolbar visibility
  showDrawingToolbar: boolean;
  setShowDrawingToolbar: Dispatch<SetStateAction<boolean>>;
  toggleDrawingToolbar: () => void;

  // Drawings state
  isDrawingsHidden: boolean;
  setIsDrawingsHidden: Dispatch<SetStateAction<boolean>>;
  toggleDrawingsHidden: () => void;
  isDrawingsLocked: boolean;
  setIsDrawingsLocked: Dispatch<SetStateAction<boolean>>;
  toggleDrawingsLocked: () => void;

  // Timer
  isTimerVisible: boolean;
  setIsTimerVisible: Dispatch<SetStateAction<boolean>>;
  toggleTimerVisible: () => void;

  // Replay mode
  isReplayMode: boolean;
  setIsReplayMode: Dispatch<SetStateAction<boolean>>;

  // Derived
  isDrawingPanelVisible: boolean;

  // Utilities
  resetToolState: () => void;
  DRAWING_TOOLS: readonly string[];
}

// ==================== CONSTANTS ====================

/**
 * Drawing tools that show the properties panel
 */
export const DRAWING_TOOLS: readonly string[] = [
  'TrendLine',
  'HorizontalLine',
  'VerticalLine',
  'Rectangle',
  'Circle',
  'Path',
  'Text',
  'Callout',
  'PriceRange',
  'Arrow',
  'Ray',
  'ExtendedLine',
  'ParallelChannel',
  'FibonacciRetracement',
] as const;

// ==================== CONTEXT ====================

const ToolContext = createContext<ToolContextValue | null>(null);

export interface ToolProviderProps {
  children: ReactNode;
}

/**
 * ToolProvider - Manages drawing tool states
 * Centralizes tool-related state management
 */
export function ToolProvider({ children }: ToolProviderProps) {
  // Active drawing tool
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Magnet mode for snapping to prices
  const [isMagnetMode, setIsMagnetMode] = useState(false);

  // Drawing toolbar visibility
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(true);

  // Drawings visibility and lock state
  const [isDrawingsHidden, setIsDrawingsHidden] = useState(false);
  const [isDrawingsLocked, setIsDrawingsLocked] = useState(false);

  // Timer visibility (persisted)
  const [isTimerVisible, setIsTimerVisible] = useLocalStorage('oa_timer_visible', false);

  // Replay mode
  const [isReplayMode, setIsReplayMode] = useState(false);

  // Derived: Is drawing properties panel visible
  const isDrawingPanelVisible = activeTool !== null && DRAWING_TOOLS.includes(activeTool);

  // Toggle drawing toolbar
  const toggleDrawingToolbar = useCallback(() => {
    setShowDrawingToolbar((prev) => !prev);
  }, []);

  // Toggle magnet mode
  const toggleMagnetMode = useCallback(() => {
    setIsMagnetMode((prev) => !prev);
  }, []);

  // Toggle drawings visibility
  const toggleDrawingsHidden = useCallback(() => {
    setIsDrawingsHidden((prev) => !prev);
  }, []);

  // Toggle drawings lock
  const toggleDrawingsLocked = useCallback(() => {
    setIsDrawingsLocked((prev) => !prev);
  }, []);

  // Toggle timer visibility
  const toggleTimerVisible = useCallback(() => {
    setIsTimerVisible((prev: boolean) => !prev);
  }, [setIsTimerVisible]);

  // Clear tool selection
  const clearActiveTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  // Select a tool
  const selectTool = useCallback(
    (tool: string) => {
      if (tool === 'magnet') {
        toggleMagnetMode();
      } else if (tool === 'hide_drawings') {
        toggleDrawingsHidden();
        setActiveTool(tool);
      } else if (tool === 'lock_all') {
        toggleDrawingsLocked();
        setActiveTool(tool);
      } else if (tool === 'show_timer') {
        toggleTimerVisible();
        setActiveTool(tool);
      } else {
        setActiveTool(tool);
      }
    },
    [toggleMagnetMode, toggleDrawingsHidden, toggleDrawingsLocked, toggleTimerVisible]
  );

  // Reset all tool states
  const resetToolState = useCallback(() => {
    setActiveTool(null);
    setIsDrawingsHidden(false);
    setIsDrawingsLocked(false);
  }, []);

  const value: ToolContextValue = {
    // Active tool
    activeTool,
    setActiveTool,
    clearActiveTool,
    selectTool,

    // Magnet mode
    isMagnetMode,
    setIsMagnetMode,
    toggleMagnetMode,

    // Toolbar visibility
    showDrawingToolbar,
    setShowDrawingToolbar,
    toggleDrawingToolbar,

    // Drawings state
    isDrawingsHidden,
    setIsDrawingsHidden,
    toggleDrawingsHidden,
    isDrawingsLocked,
    setIsDrawingsLocked,
    toggleDrawingsLocked,

    // Timer
    isTimerVisible,
    setIsTimerVisible,
    toggleTimerVisible,

    // Replay mode
    isReplayMode,
    setIsReplayMode,

    // Derived
    isDrawingPanelVisible,

    // Utilities
    resetToolState,
    DRAWING_TOOLS,
  };

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>;
}

/**
 * Hook to access tool context
 */
export function useTool(): ToolContextValue {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useTool must be used within a ToolProvider');
  }
  return context;
}

export default ToolContext;
