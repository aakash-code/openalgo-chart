import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ComponentType } from 'react';
import { ChevronRight } from 'lucide-react';
import styles from './DrawingToolbar.module.css';

interface IconProps {
    size?: number;
    strokeWidth?: number;
}

export interface Tool {
    id: string;
    icon: ComponentType<IconProps>;
    label: string;
}

export interface ToolGroupProps {
    tools: Tool[];
    activeTool: string | null;
    onToolChange: (toolId: string) => void;
}

const ToolGroup: React.FC<ToolGroupProps> = ({ tools, activeTool, onToolChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine current tool based on active tool or default to first tool
    const currentToolId = useMemo(() => {
        const found = tools.find(t => t.id === activeTool);
        return found ? found.id : tools[0].id;
    }, [activeTool, tools]);

    const currentTool = tools.find(t => t.id === currentToolId) || tools[0];
    const isActive = tools.some(t => t.id === activeTool);

    // Handle click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleMainClick = (): void => {
        onToolChange(currentToolId);
    };

    const handleArrowClick = (e: React.MouseEvent): void => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleSubToolClick = (toolId: string): void => {
        onToolChange(toolId);
        setIsOpen(false);
    };

    return (
        <div className={styles.toolGroupContainer} ref={containerRef}>
            <div className={`${styles.toolButton} ${isActive ? styles.active : ''}`} onClick={handleMainClick}>
                <div className={styles.toolIcon} title={currentTool.label}>
                    <currentTool.icon size={20} strokeWidth={1.5} />
                </div>
                {tools.length > 1 && (
                    <div className={styles.arrow} onClick={handleArrowClick}>
                        <ChevronRight size={10} />
                    </div>
                )}
            </div>

            {isOpen && tools.length > 1 && (
                <div className={styles.popover}>
                    {tools.map((tool) => (
                        <div
                            key={tool.id}
                            className={`${styles.popoverItem} ${tool.id === currentToolId ? styles.active : ''}`}
                            onClick={() => handleSubToolClick(tool.id)}
                        >
                            <tool.icon size={20} strokeWidth={1.5} />
                            <span className={styles.popoverLabel}>{tool.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ToolGroup;
