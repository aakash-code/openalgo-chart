import React from 'react';
import type { MouseEvent } from 'react';
import styles from '../Topbar.module.css';

interface Position {
    top: number;
    right: number;
}

export interface SnapshotMenuProps {
    position: Position;
    onDownloadImage?: () => void;
    onCopyImage?: () => void;
    onClose: () => void;
}

/**
 * Snapshot Menu Component
 * Provides options for downloading and copying chart images
 */
export const SnapshotMenu: React.FC<SnapshotMenuProps> = ({ position, onDownloadImage, onCopyImage, onClose }) => {
    const handleClick = (e: MouseEvent<HTMLDivElement>): void => {
        e.stopPropagation();
    };

    return (
        <div
            className={styles.snapshotDropdown}
            style={{ top: position.top, right: position.right }}
            onClick={handleClick}
        >
            <div className={styles.snapshotHeader}>CHART SNAPSHOT</div>
            <div
                className={styles.snapshotItem}
                onClick={() => {
                    onDownloadImage?.();
                    onClose();
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="currentColor">
                    <path d="M14 18.5l-5-5h3.5V5h3v8.5H19l-5 5z"></path>
                    <path d="M6 20h16v2H6v-2z"></path>
                </svg>
                <span>Download image</span>
            </div>
            <div
                className={styles.snapshotItem}
                onClick={() => {
                    onCopyImage?.();
                    onClose();
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="currentColor">
                    <path d="M8 6h10v2H8V6zm12 4H8v12h12V10zm-2 10H10V12h8v8z"></path>
                    <path d="M6 8v14h14v-2H8V8H6z"></path>
                </svg>
                <span>Copy image</span>
            </div>
        </div>
    );
};

export default SnapshotMenu;
