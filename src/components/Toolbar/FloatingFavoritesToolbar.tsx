import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ComponentType, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './FloatingFavoritesToolbar.module.css';

interface IconProps {
    size?: number;
}

interface ToolItem {
    id: string;
    icon: ComponentType<IconProps>;
    label: string;
}

interface ToolGroup {
    id: string;
    items: ToolItem[];
}

interface Position {
    x: number;
    y: number;
}

export interface FloatingFavoritesToolbarProps {
    favoriteTools: string[];
    activeTool: string | null;
    onToolChange: (toolId: string) => void;
    toolGroups: ToolGroup[];
}

/**
 * FloatingFavoritesToolbar - A draggable floating toolbar showing favorite drawing tools
 * Only renders when there are favorite tools selected
 */
const FloatingFavoritesToolbar: React.FC<FloatingFavoritesToolbarProps> = ({
    favoriteTools,
    activeTool,
    onToolChange,
    toolGroups
}) => {
    const [position, setPosition] = useState<Position>(() => {
        // Load saved position or use default
        const saved = localStorage.getItem('tv_floating_toolbar_pos');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                // Default to right side of screen
                return { x: window.innerWidth - 800, y: 100 };
            }
        }
        // Default to right side of screen
        return { x: window.innerWidth - 800, y: 100 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);
    const dragOffset = useRef<Position>({ x: 0, y: 0 });
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Get all tools flattened from groups for lookup (memoized)
    const allTools = useMemo(() => {
        const tools: ToolItem[] = [];
        toolGroups.forEach(group => {
            group.items.forEach(item => {
                tools.push(item);
            });
        });
        return tools;
    }, [toolGroups]);

    // Get the tool data for each favorite (memoized)
    const favoritedToolData = useMemo(() => {
        if (!favoriteTools || favoriteTools.length === 0) return [];
        return favoriteTools
            .map(toolId => allTools.find(t => t.id === toolId))
            .filter((tool): tool is ToolItem => Boolean(tool));
    }, [favoriteTools, allTools]);

    const handleMouseMove = useCallback((e: globalThis.MouseEvent): void => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;

        // Keep within viewport bounds
        const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 200);
        const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 50);

        setPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        });
    }, [isDragging]);

    const handleMouseUp = useCallback((): void => {
        if (isDragging) {
            setIsDragging(false);
            // Save position to localStorage
            localStorage.setItem('tv_floating_toolbar_pos', JSON.stringify(position));
        }
    }, [isDragging, position]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
        if ((e.target as HTMLElement).closest(`.${styles.dragHandle}`)) {
            setIsDragging(true);
            const rect = toolbarRef.current?.getBoundingClientRect();
            if (rect) {
                dragOffset.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }
            e.preventDefault();
        }
    };

    // Don't render if no favorites - MUST be after all hooks
    if (!favoriteTools || favoriteTools.length === 0) {
        return null;
    }

    return createPortal(
        <div
            ref={toolbarRef}
            className={styles.floatingToolbar}
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
            onMouseDown={handleMouseDown}
        >
            <div className={styles.widgetWrapper}>
                {/* Drag Handle */}
                <div className={styles.dragHandle}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 12" width="8" height="12" fill="currentColor">
                        <rect width="2" height="2" rx="1"></rect>
                        <rect width="2" height="2" rx="1" y="5"></rect>
                        <rect width="2" height="2" rx="1" y="10"></rect>
                        <rect width="2" height="2" rx="1" x="6"></rect>
                        <rect width="2" height="2" rx="1" x="6" y="5"></rect>
                        <rect width="2" height="2" rx="1" x="6" y="10"></rect>
                    </svg>
                </div>

                {/* Tool Icons */}
                <div className={styles.content}>
                    {favoritedToolData.map(tool => (
                        <div
                            key={tool.id}
                            className={`${styles.widget} ${activeTool === tool.id ? styles.active : ''}`}
                            onClick={() => onToolChange(tool.id)}
                            onMouseEnter={() => setHoveredTool(tool.id)}
                            onMouseLeave={() => setHoveredTool(null)}
                        >
                            <tool.icon size={28} />
                            {hoveredTool === tool.id && (
                                <div className={styles.tooltip}>
                                    {tool.label}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FloatingFavoritesToolbar;
