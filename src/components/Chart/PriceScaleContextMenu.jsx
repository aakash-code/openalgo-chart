import React, { useEffect, useRef, useState } from 'react';
import styles from './PriceScaleContextMenu.module.css';

// Icons
const CheckIcon = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M7 14.17L2.83 10l-1.41 1.41L7 17 19 5l-1.41-1.42L7 14.17z" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="currentColor">
        <path d="M6.5 3.5L12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
);

const SettingsIcon = () => (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
        <path d="M15.95 10.78c.03-.25.05-.51.05-.78s-.02-.53-.06-.78l1.69-1.32c.15-.12.19-.34.1-.51l-1.6-2.77c-.1-.18-.31-.24-.49-.18l-1.99.8c-.42-.32-.86-.58-1.35-.78L12 2.34c-.03-.2-.2-.34-.4-.34H8.4c-.2 0-.36.14-.39.34l-.3 2.12c-.49.2-.94.47-1.35.78l-1.99-.8c-.18-.07-.39 0-.49.18l-1.6 2.77c-.1.18-.06.39.1.51l1.69 1.32c-.04.25-.07.52-.07.78s.02.53.06.78L2.37 12.1c-.15.12-.19.34-.1.51l1.6 2.77c.1.18.31.24.49.18l1.99-.8c.42.32.86.58 1.35.78l.3 2.12c.04.2.2.34.4.34h3.2c.2 0 .37-.14.39-.34l.3-2.12c.49-.2.94-.47 1.35-.78l1.99.8c.18.07.39 0 .49-.18l1.6-2.77c.1-.18.06-.39-.1-.51l-1.67-1.32zM10 13c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z" />
    </svg>
);

// Scale mode constants
const SCALE_MODES = {
    NORMAL: 0,
    LOGARITHMIC: 1,
    PERCENTAGE: 2,
    INDEXED_TO_100: 3
};

/**
 * PriceScaleContextMenu - TradingView-style context menu for price scale settings
 */
const PriceScaleContextMenu = ({
    visible,
    x,
    y,
    priceScaleId = 'right',
    // Current settings
    autoScale = true,
    scalePriceChartOnly = false,
    invertScale = false,
    scaleMode = SCALE_MODES.NORMAL,
    plusButtonVisible = true,
    // Callbacks
    onAutoScaleChange,
    onScalePriceChartOnlyChange,
    onInvertScaleChange,
    onScaleModeChange,
    onPlusButtonChange,
    onMergeScales,
    onOpenSettings,
    onClose
}) => {
    const menuRef = useRef(null);
    const [labelsSubmenu, setLabelsSubmenu] = useState(false);
    const [linesSubmenu, setLinesSubmenu] = useState(false);
    const [mergeSubmenu, setMergeSubmenu] = useState(false);

    // Close menu when clicking outside
    useEffect(() => {
        if (!visible) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside, true);
            document.addEventListener('keydown', handleKeyDown);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [visible, onClose]);

    // Reset submenus when menu closes
    useEffect(() => {
        if (!visible) {
            setLabelsSubmenu(false);
            setLinesSubmenu(false);
            setMergeSubmenu(false);
        }
    }, [visible]);

    if (!visible) return null;

    // Position adjustment to keep menu in viewport
    const menuStyle = {
        left: x,
        top: y,
        transform: priceScaleId === 'left' ? 'none' : 'translate(-100%, 0)'
    };

    const handleItemClick = (callback, value) => {
        callback?.(value);
    };

    const handleScaleModeClick = (mode) => {
        onScaleModeChange?.(mode);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className={styles.menu}
            style={menuStyle}
        >
            {/* Auto (fits data to screen) */}
            <button
                className={styles.menuItem}
                onClick={() => handleItemClick(onAutoScaleChange, !autoScale)}
            >
                <div className={styles.menuItemCheck}>
                    {autoScale && <CheckIcon />}
                </div>
                <span className={styles.menuItemText}>Auto (fits data to screen)</span>
            </button>

            {/* Scale price chart only */}
            <button
                className={styles.menuItem}
                onClick={() => handleItemClick(onScalePriceChartOnlyChange, !scalePriceChartOnly)}
            >
                <div className={styles.menuItemCheck}>
                    {scalePriceChartOnly && <CheckIcon />}
                </div>
                <span className={styles.menuItemText}>Scale price chart only</span>
            </button>

            {/* Invert scale */}
            <button
                className={styles.menuItem}
                onClick={() => handleItemClick(onInvertScaleChange, !invertScale)}
            >
                <div className={styles.menuItemCheck}>
                    {invertScale && <CheckIcon />}
                </div>
                <span className={styles.menuItemText}>Invert scale</span>
            </button>

            <div className={styles.divider} />

            {/* Scale Type Options */}
            <button
                className={styles.menuItem}
                onClick={() => handleScaleModeClick(SCALE_MODES.NORMAL)}
            >
                <div className={styles.menuItemCheck}>
                    {scaleMode === SCALE_MODES.NORMAL && <CheckIcon />}
                </div>
                <span className={styles.menuItemText}>Regular</span>
            </button>

            <button
                className={styles.menuItem}
                onClick={() => handleScaleModeClick(SCALE_MODES.PERCENTAGE)}
            >
                <div className={styles.menuItemCheck}>
                    {scaleMode === SCALE_MODES.PERCENTAGE && <CheckIcon />}
                </div>
                <span className={styles.menuItemText}>Percent</span>
            </button>

            <button
                className={styles.menuItem}
                onClick={() => handleScaleModeClick(SCALE_MODES.INDEXED_TO_100)}
            >
                <div className={styles.menuItemCheck}>
                    {scaleMode === SCALE_MODES.INDEXED_TO_100 && <CheckIcon />}
                </div>
                <span className={styles.menuItemText}>Indexed to 100</span>
            </button>

            <button
                className={styles.menuItem}
                onClick={() => handleScaleModeClick(SCALE_MODES.LOGARITHMIC)}
            >
                <div className={styles.menuItemCheck}>
                    {scaleMode === SCALE_MODES.LOGARITHMIC && <CheckIcon />}
                </div>
                <span className={styles.menuItemText}>Logarithmic</span>
            </button>

            <div className={styles.divider} />

            {/* Merge all scales into one */}
            <button
                className={`${styles.menuItem} ${styles.hasSubmenu}`}
                onMouseEnter={() => setMergeSubmenu(true)}
                onMouseLeave={() => setMergeSubmenu(false)}
            >
                <div className={styles.menuItemCheck} />
                <span className={styles.menuItemText}>Merge all scales into one</span>
                <ChevronRightIcon />

                {mergeSubmenu && (
                    <div className={styles.submenu}>
                        <button
                            className={styles.menuItem}
                            onClick={() => {
                                onMergeScales?.('no_scale');
                                onClose();
                            }}
                        >
                            <span className={styles.menuItemText}>No scale (full width)</span>
                        </button>
                        <button
                            className={styles.menuItem}
                            onClick={() => {
                                onMergeScales?.('left');
                                onClose();
                            }}
                        >
                            <span className={styles.menuItemText}>Left scale</span>
                        </button>
                        <button
                            className={styles.menuItem}
                            onClick={() => {
                                onMergeScales?.('right');
                                onClose();
                            }}
                        >
                            <span className={styles.menuItemText}>Right scale</span>
                        </button>
                    </div>
                )}
            </button>

            {/* Labels submenu */}
            <button
                className={`${styles.menuItem} ${styles.hasSubmenu}`}
                onMouseEnter={() => setLabelsSubmenu(true)}
                onMouseLeave={() => setLabelsSubmenu(false)}
            >
                <div className={styles.menuItemCheck} />
                <span className={styles.menuItemText}>Labels</span>
                <ChevronRightIcon />

                {labelsSubmenu && (
                    <div className={styles.submenu}>
                        <button className={styles.menuItem}>
                            <div className={styles.menuItemCheck}><CheckIcon /></div>
                            <span className={styles.menuItemText}>Symbol last value label</span>
                        </button>
                        <button className={styles.menuItem}>
                            <div className={styles.menuItemCheck}><CheckIcon /></div>
                            <span className={styles.menuItemText}>Indicator last value label</span>
                        </button>
                        <button className={styles.menuItem}>
                            <div className={styles.menuItemCheck}><CheckIcon /></div>
                            <span className={styles.menuItemText}>Show symbol labels</span>
                        </button>
                    </div>
                )}
            </button>

            {/* Lines submenu */}
            <button
                className={`${styles.menuItem} ${styles.hasSubmenu}`}
                onMouseEnter={() => setLinesSubmenu(true)}
                onMouseLeave={() => setLinesSubmenu(false)}
            >
                <div className={styles.menuItemCheck} />
                <span className={styles.menuItemText}>Lines</span>
                <ChevronRightIcon />

                {linesSubmenu && (
                    <div className={styles.submenu}>
                        <button className={styles.menuItem}>
                            <div className={styles.menuItemCheck}><CheckIcon /></div>
                            <span className={styles.menuItemText}>Symbol previous close</span>
                        </button>
                        <button className={styles.menuItem}>
                            <div className={styles.menuItemCheck} />
                            <span className={styles.menuItemText}>Bid and ask</span>
                        </button>
                        <button className={styles.menuItem}>
                            <div className={styles.menuItemCheck} />
                            <span className={styles.menuItemText}>Pre/post market price</span>
                        </button>
                        <button className={styles.menuItem}>
                            <div className={styles.menuItemCheck}><CheckIcon /></div>
                            <span className={styles.menuItemText}>High and low price</span>
                        </button>
                        <button className={styles.menuItem}>
                            <div className={styles.menuItemCheck}><CheckIcon /></div>
                            <span className={styles.menuItemText}>Average close price</span>
                        </button>
                    </div>
                )}
            </button>

            {/* Plus button */}
            <button
                className={styles.menuItem}
                onClick={() => handleItemClick(onPlusButtonChange, !plusButtonVisible)}
            >
                <div className={styles.menuItemCheck}>
                    {plusButtonVisible && <CheckIcon />}
                </div>
                <span className={styles.menuItemText}>Plus button</span>
            </button>

            <div className={styles.divider} />

            {/* More settings */}
            <button
                className={styles.menuItem}
                onClick={() => {
                    onOpenSettings?.();
                    onClose();
                }}
            >
                <div className={styles.menuItemIcon}>
                    <SettingsIcon />
                </div>
                <span className={styles.menuItemText}>More settings...</span>
            </button>
        </div>
    );
};

export { SCALE_MODES };
export default PriceScaleContextMenu;
