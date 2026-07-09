import React from 'react';
import type { FC } from 'react';
import { BaseContextMenu, MenuItem, MenuDivider } from '../../shared';

// Icons
const MaximizeIcon: FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3 3h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zm0 1v8h10V4H3z" />
    </svg>
);

const RestoreIcon: FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5 1h6a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V3a2 2 0 012-2zm0 1a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H5z" />
        <path d="M3 5v6a2 2 0 002 2h6v1H5a3 3 0 01-3-3V5h1z" />
    </svg>
);

const CollapseIcon: FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 6l4 4 4-4H4z" />
    </svg>
);

const ExpandIcon: FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 4l4 4H4l4-4zm0 8l-4-4h8l-4 4z" />
    </svg>
);

const MoveUpIcon: FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 3l5 5h-3v5H6V8H3l5-5z" />
    </svg>
);

const DeleteIcon: FC = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" />
        <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
    </svg>
);

type Theme = 'dark' | 'light';

export interface PaneContextMenuProps {
    show: boolean;
    x: number;
    y: number;
    paneId: string;
    isMaximized: boolean;
    isCollapsed: boolean;
    canMoveUp: boolean;
    onMaximize: (paneId: string) => void;
    onCollapse: (paneId: string) => void;
    onMoveUp: (paneId: string) => void;
    onDelete: (paneId: string) => void;
    onClose: () => void;
    theme?: Theme;
}

/**
 * TradingView-style context menu for indicator panes
 * Options: Maximize, Collapse, Move Up, Delete
 */
const PaneContextMenu: FC<PaneContextMenuProps> = ({
    show,
    x,
    y,
    paneId,
    isMaximized,
    isCollapsed,
    canMoveUp,
    onMaximize,
    onCollapse,
    onMoveUp,
    onDelete,
    onClose,
    theme = 'dark'
}) => {
    return (
        <BaseContextMenu
            isVisible={show}
            position={{ x, y }}
            onClose={onClose}
            width={200}
        >
            {/* Maximize Pane */}
            <MenuItem
                icon={isMaximized ? RestoreIcon : MaximizeIcon}
                label={isMaximized ? 'Restore pane' : 'Maximize pane'}
                onClick={() => {
                    onMaximize(paneId);
                    onClose();
                }}
                shortcut="Double click"
            />

            {/* Collapse Pane */}
            <MenuItem
                icon={isCollapsed ? ExpandIcon : CollapseIcon}
                label={isCollapsed ? 'Expand pane' : 'Collapse pane'}
                onClick={() => {
                    onCollapse(paneId);
                    onClose();
                }}
                shortcut={`${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}Double click`}
            />

            {/* Move Pane Up */}
            <MenuItem
                icon={MoveUpIcon}
                label="Move pane up"
                onClick={() => {
                    onMoveUp(paneId);
                    onClose();
                }}
                disabled={!canMoveUp}
            />

            <MenuDivider />

            {/* Delete Pane */}
            <MenuItem
                icon={DeleteIcon}
                label="Delete pane"
                onClick={() => {
                    onDelete(paneId);
                    onClose();
                }}
                danger
            />
        </BaseContextMenu>
    );
};

export default PaneContextMenu;
