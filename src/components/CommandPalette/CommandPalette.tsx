import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { ChangeEvent, MouseEvent, ComponentType } from 'react';
import { Search, Command, BarChart2, TrendingUp, Pencil, Settings, Zap, Clock } from 'lucide-react';
import { useFocusTrap, useKeyboardNav, useListNavigation } from '../../hooks';
import { getHighlightSegments } from '../../utils/fuzzySearch';
import styles from './CommandPalette.module.css';

type CommandCategory = 'chart' | 'indicator' | 'drawing' | 'tool' | 'action';

interface HighlightSegment {
    text: string;
    highlight: boolean;
}

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    category: CommandCategory;
    shortcut?: string;
    section?: string;
}

interface CommandGroup {
    category: string;
    label: string;
    commands: CommandItem[];
}

export interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: CommandItem[];
    recentCommands: CommandItem[];
    groupedCommands: CommandGroup[];
    searchCommands: (query: string) => CommandItem[];
    executeCommand: (command: CommandItem) => void;
}

/**
 * Get icon component for category
 */
const getCategoryIcon = (category: CommandCategory): ComponentType<{ size: number }> => {
    switch (category) {
        case 'chart':
            return BarChart2;
        case 'indicator':
            return TrendingUp;
        case 'drawing':
            return Pencil;
        case 'tool':
            return Settings;
        case 'action':
            return Zap;
        default:
            return Command;
    }
};

interface HighlightTextProps {
    text: string;
    query: string;
}

/**
 * Highlight matching text in command title
 */
const HighlightText: React.FC<HighlightTextProps> = ({ text, query }) => {
    if (!query) {
        return <span>{text}</span>;
    }

    const segments = getHighlightSegments(text, query) as HighlightSegment[];

    return (
        <span>
            {segments.map((segment, index) => (
                segment.highlight ? (
                    <span key={index} className={styles.highlight}>{segment.text}</span>
                ) : (
                    <span key={index}>{segment.text}</span>
                )
            ))}
        </span>
    );
};

/**
 * CommandPalette component - Global command search (Cmd+K)
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    commands,
    recentCommands,
    groupedCommands,
    searchCommands,
    executeCommand,
}) => {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const focusTrapRef = useFocusTrap(isOpen, { autoFocus: false });

    // Filter commands based on query
    const filteredCommands = useMemo((): CommandItem[] | null => {
        if (!query.trim()) {
            return null; // Show grouped view when no query
        }
        return searchCommands(query);
    }, [query, searchCommands]);

    // Build flat list for keyboard navigation
    const flatList = useMemo((): CommandItem[] => {
        if (filteredCommands) {
            return filteredCommands;
        }

        // When no query, build list: recent + grouped
        const list: CommandItem[] = [];

        // Add recent commands
        if (recentCommands.length > 0) {
            recentCommands.forEach(cmd => {
                list.push({ ...cmd, section: 'recent' });
            });
        }

        // Add grouped commands
        groupedCommands.forEach(group => {
            group.commands.forEach(cmd => {
                list.push({ ...cmd, section: group.category });
            });
        });

        return list;
    }, [filteredCommands, recentCommands, groupedCommands]);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Scroll active item into view
    useEffect(() => {
        if (listRef.current && activeIndex >= 0) {
            const items = listRef.current.querySelectorAll('[data-command-item]');
            const activeItem = items[activeIndex];
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [activeIndex]);

    // Handle keyboard navigation
    useKeyboardNav({
        enabled: isOpen,
        onEscape: onClose,
    });

    // Execute command and close palette
    const handleExecute = useCallback((command: CommandItem): void => {
        executeCommand(command);
        onClose();
    }, [executeCommand, onClose]);

    useListNavigation({
        enabled: isOpen && flatList.length > 0,
        itemCount: flatList.length,
        activeIndex,
        setActiveIndex,
        onSelect: (index: number) => {
            const command = flatList[index];
            if (command) {
                handleExecute(command);
            }
        },
    });

    // Handle input change
    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
        setQuery(e.target.value);
        setActiveIndex(0);
    }, []);

    // Handle overlay click
    const handleOverlayClick = useCallback((e: MouseEvent<HTMLDivElement>): void => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Detect OS for shortcut display
    const isMac = useMemo((): boolean => {
        return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    }, []);

    const modKey = isMac ? '⌘' : 'Ctrl';

    if (!isOpen) return null;

    // Render command item
    const renderCommandItem = (command: CommandItem, index: number, isRecent = false) => {
        const isActive = activeIndex === index;
        const CategoryIcon = getCategoryIcon(command.category);

        return (
            <button
                key={`${command.id}-${isRecent ? 'recent' : 'cmd'}`}
                data-command-item
                className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                onClick={() => handleExecute(command)}
                onMouseEnter={() => setActiveIndex(index)}
            >
                <span className={styles.itemIcon}>
                    <CategoryIcon size={16} />
                </span>
                <span className={styles.itemContent}>
                    <span className={styles.itemTitle}>
                        <HighlightText text={command.title} query={query} />
                    </span>
                    {command.description && (
                        <span className={styles.itemDescription}>
                            {command.description}
                        </span>
                    )}
                </span>
                {command.shortcut && (
                    <span className={styles.itemShortcut}>
                        {command.shortcut.includes('F') ? command.shortcut : `${modKey}${command.shortcut}`}
                    </span>
                )}
            </button>
        );
    };

    // Calculate global index for grouped view
    let globalIndex = 0;

    return (
        <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
        >
            <div ref={focusTrapRef} className={styles.modal}>
                {/* Search Input */}
                <div className={styles.searchRow}>
                    <div className={styles.searchContainer}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            placeholder="Type a command or search..."
                            className={styles.input}
                            id="command-palette-title"
                            autoComplete="off"
                            spellCheck="false"
                        />
                        <span className={styles.shortcutHint}>{modKey}K</span>
                    </div>
                </div>

                {/* Results */}
                <div ref={listRef} className={styles.list} role="listbox">
                    {filteredCommands ? (
                        // Filtered results (search mode)
                        filteredCommands.length > 0 ? (
                            filteredCommands.map((cmd, index) => renderCommandItem(cmd, index))
                        ) : (
                            <div className={styles.noResults}>
                                No commands found for "{query}"
                            </div>
                        )
                    ) : (
                        // Grouped view (no query)
                        <>
                            {/* Recent Commands */}
                            {recentCommands.length > 0 && (
                                <div className={styles.section}>
                                    <div className={styles.sectionLabel}>
                                        <Clock size={14} className={styles.sectionIcon} />
                                        Recent
                                    </div>
                                    {recentCommands.map((cmd) => {
                                        const index = globalIndex++;
                                        return renderCommandItem(cmd, index, true);
                                    })}
                                </div>
                            )}

                            {/* Grouped Commands */}
                            {groupedCommands.map((group) => {
                                const GroupIcon = getCategoryIcon(group.category as CommandCategory);
                                return (
                                    <div key={group.category} className={styles.section}>
                                        <div className={styles.sectionLabel}>
                                            <span className={styles.sectionIcon}><GroupIcon size={14} /></span>
                                            {group.label}
                                        </div>
                                        {group.commands.map((cmd) => {
                                            const index = globalIndex++;
                                            return renderCommandItem(cmd, index);
                                        })}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.footerHint}>
                        <kbd>↑↓</kbd> Navigate
                    </span>
                    <span className={styles.footerHint}>
                        <kbd>↵</kbd> Execute
                    </span>
                    <span className={styles.footerHint}>
                        <kbd>Esc</kbd> Close
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
