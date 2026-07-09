/**
 * Risk Calculator Template Management
 * Stores and retrieves preset risk calculator configurations
 */

import logger from './logger';
import { getJSON, setJSON } from '../services/storageService';

const STORAGE_KEY = 'riskCalculatorTemplates';

// Interfaces
export interface RiskTemplate {
    id: string;
    name: string;
    capital: number;
    riskPercent: number;
    isDefault: boolean;
    isCustom: boolean;
}

export interface RiskTemplateInput {
    name: string;
    capital: number;
    riskPercent: number;
    isDefault?: boolean;
}

export interface RiskTemplateUpdates {
    name?: string;
    capital?: number;
    riskPercent?: number;
    isDefault?: boolean;
}

export const DEFAULT_TEMPLATES: RiskTemplate[] = [
    {
        id: 'conservative',
        name: 'Conservative',
        capital: 100000,
        riskPercent: 0.5,
        isDefault: false,
        isCustom: false
    },
    {
        id: 'moderate',
        name: 'Moderate',
        capital: 100000,
        riskPercent: 1.0,
        isDefault: false,
        isCustom: false
    },
    {
        id: 'aggressive',
        name: 'Aggressive',
        capital: 100000,
        riskPercent: 2.0,
        isDefault: false,
        isCustom: false
    }
];

/**
 * Get all templates (default + custom)
 */
export const getTemplates = (): RiskTemplate[] => {
    try {
        const customTemplates = getJSON(STORAGE_KEY, []) as RiskTemplate[];
        return [...DEFAULT_TEMPLATES, ...customTemplates];
    } catch (error) {
        logger.error('Error loading templates:', error);
        return DEFAULT_TEMPLATES;
    }
};

/**
 * Save a new custom template
 */
export const saveTemplate = (template: RiskTemplateInput): RiskTemplate | null => {
    try {
        const customTemplates = getJSON(STORAGE_KEY, []) as RiskTemplate[];

        const newTemplate: RiskTemplate = {
            id: `custom_${Date.now()}`,
            name: template.name,
            capital: template.capital,
            riskPercent: template.riskPercent,
            isCustom: true,
            isDefault: template.isDefault || false
        };

        // If this is being set as default, unset others
        if (newTemplate.isDefault) {
            customTemplates.forEach(t => t.isDefault = false);
        }

        customTemplates.push(newTemplate);
        setJSON(STORAGE_KEY, customTemplates);

        return newTemplate;
    } catch (error) {
        logger.error('Error saving template:', error);
        return null;
    }
};

/**
 * Update existing template
 */
export const updateTemplate = (templateId: string, updates: RiskTemplateUpdates): boolean => {
    try {
        const customTemplates = getJSON(STORAGE_KEY, []) as RiskTemplate[];

        const index = customTemplates.findIndex(t => t.id === templateId);
        if (index === -1) return false;

        // If setting as default, unset others
        if (updates.isDefault) {
            customTemplates.forEach(t => t.isDefault = false);
        }

        customTemplates[index] = { ...customTemplates[index], ...updates };
        setJSON(STORAGE_KEY, customTemplates);

        return true;
    } catch (error) {
        logger.error('Error updating template:', error);
        return false;
    }
};

/**
 * Delete a custom template
 */
export const deleteTemplate = (templateId: string): boolean => {
    try {
        const customTemplates = getJSON(STORAGE_KEY, []) as RiskTemplate[];

        const filtered = customTemplates.filter(t => t.id !== templateId);
        setJSON(STORAGE_KEY, filtered);

        return true;
    } catch (error) {
        logger.error('Error deleting template:', error);
        return false;
    }
};

/**
 * Get the default template (if any)
 */
export const getDefaultTemplate = (): RiskTemplate | null => {
    const templates = getTemplates();
    return templates.find(t => t.isDefault) || null;
};
