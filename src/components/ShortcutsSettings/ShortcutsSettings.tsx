import React, { useState, useEffect, useCallback } from 'react';
import type { MouseEvent } from 'react';
import styles from './ShortcutsSettings.module.css';
import {
    SHORTCUTS,
    CATEGORY_LABELS,
    formatShortcut,
    getEffectiveShortcuts,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    isShortcutCustomized,
    parseKeyboardEvent,
    ShortcutDefinition,
    Modifier,
} from '../../config/shortcuts';
import { RotateCcw, X, AlertCircle } from 'lucide-react';

interface ShortcutWithId extends ShortcutDefinition {
    id: string;
}

interface ConflictResult {
    conflict: boolean;
    conflictLabel?: string;
}

type GroupedShortcuts = Record<string, ShortcutWithId[]>;

export interface ShortcutsSettingsProps {
    onClose?: () => void;
    embedded?: boolean;
}

/**
 * ShortcutsSettings Component
 * Allows users to view and customize keyboard shortcuts
 */
const ShortcutsSettings: React.FC<ShortcutsSettingsProps> = ({ onClose, embedded = false }) => {
    const [shortcuts, setShortcuts] = useState<Record<string, ShortcutDefinition>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [conflict, setConflict] = useState<ConflictResult | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['navigation', 'chart', 'actions']));

    // Load shortcuts on mount
    useEffect(() => {
        setShortcuts(getEffectiveShortcuts());
    }, []);

    // Reload shortcuts after changes
    const reloadShortcuts = useCallback((): void => {
        setShortcuts(getEffectiveShortcuts());
    }, []);

    // Handle key capture for editing
    useEffect(() => {
        if (!editingId) return;

        const handleKeyDown = (e: KeyboardEvent): void => {
            e.preventDefault();
            e.stopPropagation();

            // ESC cancels editing
            if (e.key === 'Escape') {
                setEditingId(null);
                setConflict(null);
                return;
            }

            const parsed = parseKeyboardEvent(e);
            if (!parsed) return;

            // Try to update the shortcut
            const result = updateShortcut(editingId, parsed.key, parsed.modifiers);

            if (result?.conflict) {
                setConflict(result as ConflictResult);
            } else {
                setConflict(null);
                setEditingId(null);
                reloadShortcuts();
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [editingId, reloadShortcuts]);

    // Reset a single shortcut
    const handleReset = (e: MouseEvent<HTMLButtonElement>, id: string): void => {
        e.stopPropagation();
        resetShortcut(id);
        reloadShortcuts();
        setConflict(null);
    };

    // Reset all shortcuts
    const handleResetAll = (): void => {
        if (confirm('Reset all shortcuts to defaults?')) {
            resetAllShortcuts();
            reloadShortcuts();
            setConflict(null);
        }
    };

    // Toggle category expansion
    const toggleCategory = (category: string): void => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    // Group shortcuts by category
    const groupedShortcuts: GroupedShortcuts = {};
    Object.entries(shortcuts).forEach(([id, shortcut]) => {
        const category = shortcut.category || 'other';
        if (!groupedShortcuts[category]) {
            groupedShortcuts[category] = [];
        }
        groupedShortcuts[category].push({ id, ...shortcut, label: shortcut.label || id });
    });

    const containerClass = embedded ? styles.embedded : styles.container;

    return (
        <div className={containerClass}>

            <div className={styles.header}>
                <h2 className={styles.title}>Keyboard Shortcuts</h2>
                <div className={styles.headerActions}>
                    <button className={styles.resetAllBtn} onClick={handleResetAll}>
                        <RotateCcw size={14} />
                        Reset All
                    </button>
                    {onClose && (
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {conflict && (
                <div className={styles.conflictBanner}>
                    <AlertCircle size={16} />
                    <span>
                        Already used by "{conflict.conflictLabel}". Press a different key.
                    </span>
                </div>
            )}

            <div className={styles.hint}>
                Click on a shortcut to change it. Press Escape to cancel.
            </div>

            <div className={styles.scrollContainer}>
                {Object.entries(groupedShortcuts).map(([category, items]) => (
                    <div key={category} className={styles.category}>
                        <button
                            className={styles.categoryHeader}
                            onClick={() => toggleCategory(category)}
                        >
                            <span className={styles.categoryLabel}>
                                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
                            </span>
                            <span className={styles.categoryToggle}>
                                {expandedCategories.has(category) ? '−' : '+'}
                            </span>
                        </button>

                        {expandedCategories.has(category) && (
                            <div className={styles.categoryItems}>
                                {items.map((item) => {
                                    const { id, label } = item;
                                    const isEditing = editingId === id;
                                    const isCustomized = isShortcutCustomized(id);

                                    return (
                                        <div
                                            key={id}
                                            className={`${styles.shortcutRow} ${isEditing ? styles.editing : ''} ${isCustomized ? styles.customized : ''}`}
                                            onClick={() => {
                                                setEditingId(id);
                                                setConflict(null);
                                            }}
                                        >
                                            <span className={styles.shortcutLabel}>{label}</span>
                                            <div className={styles.shortcutValue}>
                                                {isEditing ? (
                                                    <span className={styles.recording}>
                                                        Press a key...
                                                    </span>
                                                ) : (
                                                    <kbd className={styles.kbd}>
                                                        {formatShortcut(item)}
                                                    </kbd>
                                                )}
                                                {isCustomized && !isEditing && (
                                                    <button
                                                        className={styles.resetBtn}
                                                        onClick={(e: MouseEvent<HTMLButtonElement>) => handleReset(e, id)}
                                                        title="Reset to default"
                                                    >
                                                        <RotateCcw size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShortcutsSettings;
