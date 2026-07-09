import React, { useState, useEffect } from 'react';
import type { FC, ChangeEvent, KeyboardEvent } from 'react';
import { getTemplates, saveTemplate } from '../../utils/riskTemplates';
import { formatCurrency } from '../../utils/shared/formatters';
import styles from './RiskCalculatorPanel.module.css';

interface Template {
    id: string;
    name: string;
    capital: number;
    riskPercent: number;
    isDefault?: boolean;
    isCustom?: boolean;
}

interface CurrentValues {
    capital: number;
    riskPercent: number;
}

interface TemplateValues {
    capital: number;
    riskPercent: number;
}

export interface TemplateSelectorProps {
    currentValues: CurrentValues;
    onTemplateSelect: (values: TemplateValues) => void;
}

/**
 * Template selector component for risk calculator
 * Allows users to select preset templates or save custom ones
 */
const TemplateSelector: FC<TemplateSelectorProps> = ({ currentValues, onTemplateSelect }) => {
    const [templates, setTemplates] = useState<Template[]>(() => getTemplates() as Template[]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('custom');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    const loadTemplates = (): void => {
        setTemplates(getTemplates() as Template[]);
    };

    const handleTemplateChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const templateId = event.target.value;

        if (templateId === 'save_new') {
            setShowSaveDialog(true);
            return;
        }

        setSelectedTemplateId(templateId);

        if (templateId === 'custom') {
            return; // Keep current values
        }

        const template = templates.find(t => t.id === templateId);
        if (template) {
            onTemplateSelect({
                capital: template.capital,
                riskPercent: template.riskPercent
            });
        }
    };

    const handleSaveTemplate = (): void => {
        if (!newTemplateName.trim()) return;

        const saved = saveTemplate({
            name: newTemplateName,
            capital: currentValues.capital,
            riskPercent: currentValues.riskPercent,
            isDefault: false
        }) as Template | null;

        if (saved) {
            loadTemplates();
            setSelectedTemplateId(saved.id);
            setShowSaveDialog(false);
            setNewTemplateName('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            handleSaveTemplate();
        }
    };

    // Detect if current values match any template
    useEffect(() => {
        const matchingTemplate = templates.find(t =>
            t.capital === currentValues.capital &&
            t.riskPercent === currentValues.riskPercent
        );

        if (matchingTemplate) {
            setSelectedTemplateId(matchingTemplate.id);
        } else {
            setSelectedTemplateId('custom');
        }
    }, [currentValues, templates]);

    return (
        <div className={styles.templateSelectorWrapper}>
            <div className={styles.inputGroup}>
                <label>Template</label>
                <select
                    value={selectedTemplateId}
                    onChange={handleTemplateChange}
                    className={styles.templateSelect}
                >
                    <option value="custom">Custom</option>
                    <optgroup label="Presets">
                        {templates.filter(t => !t.isCustom).map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({t.riskPercent}%)
                            </option>
                        ))}
                    </optgroup>
                    {templates.filter(t => t.isCustom).length > 0 && (
                        <optgroup label="My Templates">
                            {templates.filter(t => t.isCustom).map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.riskPercent}%)
                                </option>
                            ))}
                        </optgroup>
                    )}
                    <option value="save_new">+ Save Current...</option>
                </select>
            </div>

            {showSaveDialog && (
                <div className={styles.saveTemplateDialog}>
                    <div className={styles.dialogBackdrop} onClick={() => setShowSaveDialog(false)} />
                    <div className={styles.dialogContent}>
                        <h3 className={styles.dialogTitle}>Save Template</h3>
                        <p className={styles.dialogDescription}>
                            Capital: {formatCurrency(currentValues.capital, { showSymbol: true, decimals: 0 })}<br />
                            Risk: {currentValues.riskPercent}%
                        </p>
                        <input
                            type="text"
                            placeholder="Template name"
                            value={newTemplateName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTemplateName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className={styles.dialogInput}
                        />
                        <div className={styles.dialogActions}>
                            <button
                                onClick={() => setShowSaveDialog(false)}
                                className={styles.dialogCancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTemplate}
                                className={styles.dialogSaveButton}
                                disabled={!newTemplateName.trim()}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateSelector;
