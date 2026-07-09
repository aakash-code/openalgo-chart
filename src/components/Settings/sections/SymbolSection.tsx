/**
 * Symbol Section Component
 * Symbol settings (Candle colors, etc) for SettingsPopup
 */
import React from 'react';
import type { ChangeEvent } from 'react';
import styles from '../SettingsPopup.module.css';
import { ChartAppearance } from '../constants/settingsConstants';

export interface SymbolSectionProps {
    localAppearance: ChartAppearance;
    setLocalAppearance: React.Dispatch<React.SetStateAction<ChartAppearance>>;
}

const SymbolSection: React.FC<SymbolSectionProps> = ({ localAppearance, setLocalAppearance }) => {

    const handleColorChange = (field: keyof ChartAppearance, value: string, linkedField: keyof ChartAppearance | null = null): void => {
        setLocalAppearance(prev => {
            const update: any = { ...prev, [field]: value };
            if (linkedField) {
                update[linkedField] = value;
            }
            return update;
        });
    };

    const handleHexInput = (field: keyof ChartAppearance, value: string, linkedField: keyof ChartAppearance | null = null): void => {
        let val = value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
            handleColorChange(field, val, linkedField);
        }
    };

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>CANDLE COLORS</h3>

            <div className={styles.colorRow}>
                <label className={styles.colorLabel}>Up Color (Bullish)</label>
                <div className={styles.colorInputWrapper}>
                    <input
                        type="color"
                        value={localAppearance.candleUpColor}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleColorChange('candleUpColor', e.target.value, 'wickUpColor')}
                        className={styles.colorInput}
                    />
                    <input
                        type="text"
                        value={localAppearance.candleUpColor}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleHexInput('candleUpColor', e.target.value, 'wickUpColor')}
                        className={styles.hexInput}
                        maxLength={7}
                        placeholder="#000000"
                    />
                </div>
            </div>

            <div className={styles.colorRow}>
                <label className={styles.colorLabel}>Down Color (Bearish)</label>
                <div className={styles.colorInputWrapper}>
                    <input
                        type="color"
                        value={localAppearance.candleDownColor}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleColorChange('candleDownColor', e.target.value, 'wickDownColor')}
                        className={styles.colorInput}
                    />
                    <input
                        type="text"
                        value={localAppearance.candleDownColor}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleHexInput('candleDownColor', e.target.value, 'wickDownColor')}
                        className={styles.hexInput}
                        maxLength={7}
                        placeholder="#000000"
                    />
                </div>
            </div>
            
            <div className={styles.optionGroup}>
                <p className={styles.inputHint} style={{ marginTop: '16px' }}>
                    Note: Wick colors are automatically matched to candle colors.
                </p>
            </div>
        </div>
    );
};

export default SymbolSection;
