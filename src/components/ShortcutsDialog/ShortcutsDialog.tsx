import React, { useMemo } from 'react';
import type { FC } from 'react';
import { BaseModal } from '../shared';
import {
    X,
    Keyboard,
    Navigation,
    BarChart2,
    PenTool,
    ZoomIn,
    Zap,
    LucideIcon,
} from 'lucide-react';
import { useFocusTrap, useKeyboardNav } from '../../hooks';
import {
    SHORTCUT_CATEGORIES,
    CATEGORY_LABELS,
    getGroupedShortcuts,
} from '../../config/shortcuts';
import styles from './ShortcutsDialog.module.css';

interface Shortcut {
    id: string;
    label: string;
    formatted: string;
}

type CategoryType = keyof typeof SHORTCUT_CATEGORIES;
type GroupedShortcuts = Record<string, Shortcut[]>;

/**
 * Get icon for a category
 */
const getCategoryIcon = (category: string): LucideIcon => {
    const icons: Record<string, LucideIcon> = {
        [SHORTCUT_CATEGORIES.NAVIGATION]: Navigation,
        [SHORTCUT_CATEGORIES.CHART]: BarChart2,
        [SHORTCUT_CATEGORIES.DRAWING]: PenTool,
        [SHORTCUT_CATEGORIES.ZOOM]: ZoomIn,
        [SHORTCUT_CATEGORIES.ACTIONS]: Zap,
    };
    return icons[category] || Keyboard;
};

interface ShortcutKeyBadgeProps {
    formatted: string;
}

/**
 * Render a shortcut key badge
 */
const ShortcutKeyBadge: FC<ShortcutKeyBadgeProps> = ({ formatted }) => {
    // For Mac-style shortcuts like "⌘K", render as single badge
    // For Windows-style like "Ctrl+K", split and render with + between

    if (!formatted) return null;

    if (formatted.includes('+')) {
        const parts = formatted.split('+');
        return (
            <div className={styles.shortcutKeys}>
                {parts.map((part, index) => (
                    <span key={index}>
                        <span className={styles.shortcutKey}>{part}</span>
                        {index < parts.length - 1 && (
                            <span className={styles.keyPlus}>+</span>
                        )}
                    </span>
                ))}
            </div>
        );
    }

    return <span className={styles.shortcutKey}>{formatted}</span>;
};

interface CategorySectionProps {
    category: string;
    shortcuts: Shortcut[];
}

/**
 * Category section component
 */
const CategorySection: FC<CategorySectionProps> = ({ category, shortcuts }) => {
    const Icon = getCategoryIcon(category);
    const label = CATEGORY_LABELS[category as CategoryType] || category;

    if (!shortcuts || shortcuts.length === 0) return null;

    return (
        <div className={styles.category}>
            <div className={styles.categoryHeader}>
                <Icon size={14} className={styles.categoryIcon} />
                {label}
            </div>
            {shortcuts.map((shortcut) => (
                <div key={shortcut.id} className={styles.shortcutRow}>
                    <span className={styles.shortcutLabel}>{shortcut.label}</span>
                    <ShortcutKeyBadge formatted={shortcut.formatted} />
                </div>
            ))}
        </div>
    );
};

export interface ShortcutsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Keyboard Shortcuts Help Dialog
 */
const ShortcutsDialog: FC<ShortcutsDialogProps> = ({ isOpen, onClose }) => {
    const focusTrapRef = useFocusTrap(isOpen, { autoFocus: false });

    // Keyboard navigation
    useKeyboardNav({
        enabled: isOpen,
        onEscape: onClose,
    });

    // Get grouped shortcuts
    const groupedShortcuts = useMemo(() => getGroupedShortcuts() as GroupedShortcuts, []);

    if (!isOpen) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            showHeader={false}
            noPadding={true}
            size="medium"
            className={styles.modalBase}
        >
            {/* Header */}
            <div className={styles.header}>
                <h2 id="shortcuts-dialog-title" className={styles.title}>
                    <Keyboard size={20} />
                    Keyboard Shortcuts
                </h2>
                <button
                    onClick={onClose}
                    className={styles.closeBtn}
                    aria-label="Close"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                    <CategorySection
                        key={category}
                        category={category}
                        shortcuts={shortcuts}
                    />
                ))}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <span className={styles.footerText}>
                    Press <kbd>?</kbd> to toggle this dialog
                </span>
            </div>
        </BaseModal>
    );
};

export default ShortcutsDialog;
