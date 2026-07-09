/**
 * Global Shortcuts Hook
 * Handles global keyboard shortcuts throughout the application
 */

import { useEffect, useCallback, useRef } from 'react';
import { SHORTCUTS, matchesShortcut, isInputField, ShortcutDefinition } from '../config/shortcuts';

/** Handler function types */
export type ShortcutHandler = (payload?: unknown) => void;
export type KeyHandler = (key: string) => void;

/** Handler map for shortcuts */
export interface ShortcutHandlers {
  [action: string]: ShortcutHandler | KeyHandler | undefined;
  openSymbolSearchWithKey?: KeyHandler | undefined;
}

/** Options for the hook */
export interface GlobalShortcutsOptions {
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean | undefined;
  /** Array of shortcut IDs to disable */
  disabledShortcuts?: string[] | undefined;
  /** If true, only allow Escape and modifier shortcuts */
  dialogOpen?: boolean | undefined;
}

// ==================== HOOK ====================

/**
 * Hook for handling global keyboard shortcuts
 *
 * @param handlers - Object mapping action names to handler functions
 * @param options - Configuration options
 */
export function useGlobalShortcuts(
  handlers: ShortcutHandlers = {},
  options: GlobalShortcutsOptions = {}
): void {
  const { enabled = true, disabledShortcuts = [], dialogOpen = false } = options;

  // Use ref to always have latest handlers without re-adding event listener
  const handlersRef = useRef(handlers);
  const optionsRef = useRef({ enabled, disabledShortcuts, dialogOpen });

  // Update refs when values change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    optionsRef.current = { enabled, disabledShortcuts, dialogOpen };
  }, [enabled, disabledShortcuts, dialogOpen]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { enabled, disabledShortcuts, dialogOpen } = optionsRef.current;
    const currentHandlers = handlersRef.current;

    if (!enabled) return;

    // Check if typing in an input field
    const isTyping = isInputField(event) as boolean;

    // Find matching shortcut
    let matchedShortcut: ShortcutDefinition | null = null;
    let matchedId: string | null = null;

    for (const [id, shortcutDef] of Object.entries(SHORTCUTS as Record<string, ShortcutDefinition>)) {
      if (matchesShortcut(event, shortcutDef)) {
        matchedShortcut = shortcutDef;
        matchedId = id;
        break;
      }
    }

    // If no defined shortcut matched, check for alphabetic keys to open search
    if (!matchedShortcut || !matchedId) {
      // Only handle alphabetic keys (a-z) when not typing and no dialog open
      if (/^[a-zA-Z]$/.test(event.key) && !isTyping && !dialogOpen) {
        const handler = currentHandlers.openSymbolSearchWithKey;
        if (handler) {
          event.preventDefault();
          event.stopPropagation();
          handler(event.key);
        }
      }
      return;
    }

    // Check if shortcut is disabled
    if (disabledShortcuts.includes(matchedId)) return;

    // Determine if this is a modifier shortcut (Cmd/Ctrl + key)
    const hasModifier = (matchedShortcut.modifiers?.length ?? 0) > 0;

    // When typing in input fields:
    // - Always allow Escape
    // - Allow modifier shortcuts (Cmd+K, Cmd+Z, etc.)
    // - Block single-key shortcuts (1-7, D, C, P, A, etc.)
    if (isTyping) {
      const isEscape = matchedShortcut.key === 'Escape';
      if (!isEscape && !hasModifier) {
        return; // Don't handle single-key shortcuts when typing
      }
    }

    // When a dialog is open:
    // - Always allow Escape (to close dialog)
    // - Allow modifier shortcuts
    // - Block single-key shortcuts that might interfere
    if (dialogOpen) {
      const isEscape = matchedShortcut.key === 'Escape';
      const isCloseAction = matchedShortcut.action === 'closeDialog';
      if (!isEscape && !isCloseAction && !hasModifier) {
        return; // Don't handle single-key shortcuts when dialog is open
      }
    }

    // Get the handler for this shortcut's action
    const handler = currentHandlers[matchedShortcut.action];

    if (handler) {
      event.preventDefault();
      event.stopPropagation();

      // Call handler with payload if defined
      if (matchedShortcut.payload !== undefined) {
        (handler as ShortcutHandler)(matchedShortcut.payload);
      } else {
        (handler as ShortcutHandler)();
      }
    }
  }, []); // Empty deps - we use refs to access latest values

  useEffect(() => {
    // Add listener to document for global shortcuts
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);
}

export default useGlobalShortcuts;
