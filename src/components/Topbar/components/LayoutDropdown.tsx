import React from 'react';
import type { ReactElement } from 'react';
import { BaseDropdown, DropdownItem } from '../../shared';

interface Position {
    top: number;
    left: number;
}

interface LayoutItem {
    value: string;
    label: string;
    icon: ReactElement;
}

export interface LayoutDropdownProps {
    position: Position;
    layout: string;
    onLayoutChange: (layout: string) => void;
    onClose: () => void;
}

/**
 * Layout Dropdown Component
 * Allows selection of chart layout configuration
 */
export const LayoutDropdown: React.FC<LayoutDropdownProps> = ({ position, layout, onLayoutChange, onClose }) => {
    const layouts: LayoutItem[] = [
        {
            value: '1',
            label: 'Single Chart',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M3 3h22v22H3V3z"></path>
                </svg>
            ),
        },
        {
            value: '2',
            label: '2 Charts',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M3 3h10v22H3V3zm12 0h10v22H15V3z"></path>
                </svg>
            ),
        },
        {
            value: '3',
            label: '3 Charts',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M3 3h6v22H3V3zm8 0h6v22h-6V3zm8 0h6v22h-6V3z"></path>
                </svg>
            ),
        },
        {
            value: '4',
            label: '4 Charts',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M3 3h10v10H3V3zm12 0h10v10H15V3zM3 15h10v10H3V15zm12 0h10v10H15V15z"></path>
                </svg>
            ),
        },
        {
            value: '6',
            label: '6 Charts',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M3 3h6v10H3V3zm8 0h6v10h-6V3zm8 0h6v10h-6V3zM3 15h6v10H3V15zm8 0h6v10h-6V15zm8 0h6v10h-6V15z"></path>
                </svg>
            ),
        },
        {
            value: '8',
            label: '8 Charts',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M3 3h4v10H3V3zm6 0h4v10H9V3zm6 0h4v10h-4V3zm6 0h4v10h-4V3zM3 15h4v10H3V15zm6 0h4v10H9V15zm6 0h4v10h-4V15zm6 0h4v10h-4V15z"></path>
                </svg>
            ),
        },
        {
            value: '10',
            label: '10 Charts',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M3 3h3v10H3V3zm5 0h3v10H8V3zm5 0h3v10h-3V3zm5 0h3v10h-3V3zm5 0h3v10h-3V3zM3 15h3v10H3V15zm5 0h3v10H8V15zm5 0h3v10h-3V15zm5 0h3v10h-3V15zm5 0h3v10h-3V15z"></path>
                </svg>
            ),
        },
        {
            value: '2v',
            label: '2 Vertical',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M3 3h22v10H3V3zm0 12h22v10H3V15z"></path>
                </svg>
            ),
        },
    ];

    return (
        <BaseDropdown
            isOpen={true}
            onClose={onClose}
            position={{ top: position.top, left: position.left }}
            width={200}
        >
            {layouts.map((item) => (
                <DropdownItem
                    key={item.value}
                    icon={item.icon}
                    label={item.label}
                    active={layout === item.value}
                    onClick={() => {
                        onLayoutChange(item.value);
                        onClose();
                    }}
                />
            ))}
        </BaseDropdown>
    );
};

export default LayoutDropdown;
