/**
 * Layout Template Service
 * Handles CRUD operations for layout templates with localStorage persistence
 */

import { getJSON, setJSON, STORAGE_KEYS } from '../services/storageService';

const MAX_TEMPLATES = 50;
const EXPORT_VERSION = '1.0';

// Interfaces
export interface ChartIndicators {
    sma?: boolean;
    ema?: boolean;
    rsi?: { enabled: boolean };
    macd?: { enabled: boolean };
    bollingerBands?: { enabled: boolean };
    volume?: { enabled: boolean };
    atr?: { enabled: boolean };
    stochastic?: { enabled: boolean };
    vwap?: { enabled: boolean };
    [key: string]: unknown;
}

export interface ChartConfig {
    id: string;
    symbol: string;
    exchange: string;
    interval: string;
    indicators?: ChartIndicators;
    comparisonSymbols?: string[];
}

export interface ChartAppearance {
    theme?: string;
    upColor?: string;
    downColor?: string;
    [key: string]: unknown;
}

export interface LayoutTemplate {
    id: string;
    name: string;
    description?: string;
    layout: string;
    chartType?: string;
    charts: ChartConfig[];
    appearance?: {
        chartAppearance?: ChartAppearance | null;
        theme?: string;
    };
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TemplateInput {
    id?: string;
    name: string;
    description?: string;
    layout: string;
    chartType?: string;
    charts: ChartConfig[];
    appearance?: {
        chartAppearance?: ChartAppearance | null;
        theme?: string;
    };
    isFavorite?: boolean;
}

export interface SaveResult {
    success: boolean;
    template?: LayoutTemplate;
    error?: string;
}

export interface DeleteResult {
    success: boolean;
    error?: string;
}

export interface ToggleFavoriteResult {
    success: boolean;
    template?: LayoutTemplate;
    error?: string;
}

export interface ExportData {
    version: string;
    exportedAt: string;
    templates: LayoutTemplate[];
}

export interface ImportResult {
    success: boolean;
    imported?: number;
    errors?: string[] | null;
    error?: string;
}

export interface AppState {
    layout: string;
    charts: Array<{
        id: string;
        symbol: string;
        exchange: string;
        interval: string;
        indicators?: ChartIndicators;
        comparisonSymbols?: string[];
    }>;
    chartType?: string;
    chartAppearance?: ChartAppearance | null;
    theme?: string;
}

/**
 * Generate unique template ID
 */
const generateId = (): string => `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get all templates from localStorage
 * @returns Array of template objects
 */
export const getAll = (): LayoutTemplate[] => {
    const saved = getJSON(STORAGE_KEYS.LAYOUT_TEMPLATES, []);
    return Array.isArray(saved) ? saved : [];
};

/**
 * Get template by ID
 * @param id - Template ID
 * @returns Template object or null
 */
export const getById = (id: string): LayoutTemplate | null => {
    const templates = getAll();
    return templates.find(t => t.id === id) || null;
};

/**
 * Save templates to localStorage
 * @param templates - Array of templates
 */
const saveAll = (templates: LayoutTemplate[]): boolean => {
    return setJSON(STORAGE_KEYS.LAYOUT_TEMPLATES, templates);
};

/**
 * Save a new template or update existing
 * @param template - Template object (with or without id)
 * @returns Result with success flag and template/error
 */
export const save = (template: TemplateInput): SaveResult => {
    const templates = getAll();
    const now = new Date().toISOString();

    if (template.id) {
        // Update existing template
        const index = templates.findIndex(t => t.id === template.id);
        if (index === -1) {
            return { success: false, error: 'Template not found' };
        }
        templates[index] = {
            ...templates[index],
            ...template,
            id: template.id,
            updatedAt: now,
        };
    } else {
        // Create new template
        if (templates.length >= MAX_TEMPLATES) {
            return { success: false, error: `Maximum ${MAX_TEMPLATES} templates allowed. Please delete some templates first.` };
        }
        const newTemplate: LayoutTemplate = {
            ...template,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
            isFavorite: false,
        };
        templates.unshift(newTemplate); // Add to beginning
        if (saveAll(templates)) {
            return { success: true, template: newTemplate };
        }
        return { success: false, error: 'Failed to save template' };
    }

    if (saveAll(templates)) {
        return { success: true, template: templates.find(t => t.id === template.id) };
    }
    return { success: false, error: 'Failed to save template' };
};

/**
 * Delete a template by ID
 * @param id - Template ID
 * @returns Result with success flag
 */
export const deleteTemplate = (id: string): DeleteResult => {
    const templates = getAll();
    const filtered = templates.filter(t => t.id !== id);

    if (filtered.length === templates.length) {
        return { success: false, error: 'Template not found' };
    }

    if (saveAll(filtered)) {
        return { success: true };
    }
    return { success: false, error: 'Failed to delete template' };
};

/**
 * Toggle favorite status for a template
 * @param id - Template ID
 * @returns Result with success flag and updated template
 */
export const toggleFavorite = (id: string): ToggleFavoriteResult => {
    const templates = getAll();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) {
        return { success: false, error: 'Template not found' };
    }

    templates[index] = {
        ...templates[index],
        isFavorite: !templates[index].isFavorite,
        updatedAt: new Date().toISOString(),
    };

    if (saveAll(templates)) {
        return { success: true, template: templates[index] };
    }
    return { success: false, error: 'Failed to update template' };
};

/**
 * Export all templates as JSON string
 * @returns JSON string for download
 */
export const exportAll = (): string => {
    const templates = getAll();
    const exportData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        templates,
    };
    return JSON.stringify(exportData, null, 2);
};

/**
 * Export a single template as JSON string
 * @param id - Template ID
 * @returns JSON string or null if not found
 */
export const exportOne = (id: string): string | null => {
    const template = getById(id);
    if (!template) return null;

    const exportData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        templates: [template],
    };
    return JSON.stringify(exportData, null, 2);
};

/**
 * Import templates from JSON string
 * @param jsonString - JSON string to import
 * @returns Result with success flag, imported count, and errors
 */
export const importTemplates = (jsonString: string): ImportResult => {
    let importData: ExportData;
    try {
        importData = JSON.parse(jsonString);
    } catch {
        return { success: false, error: 'Invalid JSON format' };
    }

    if (!importData.templates || !Array.isArray(importData.templates)) {
        return { success: false, error: 'Invalid template format: missing templates array' };
    }

    const currentTemplates = getAll();
    const importedTemplates: LayoutTemplate[] = [];
    const errors: string[] = [];

    for (const template of importData.templates) {
        if (!template.name || !template.layout || !template.charts) {
            errors.push(`Skipped invalid template: ${template.name || 'unnamed'}`);
            continue;
        }

        if (currentTemplates.length + importedTemplates.length >= MAX_TEMPLATES) {
            errors.push(`Maximum ${MAX_TEMPLATES} templates reached. Some templates were not imported.`);
            break;
        }

        // Generate new ID to avoid conflicts
        const newTemplate: LayoutTemplate = {
            ...template,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: false,
        };
        importedTemplates.push(newTemplate);
    }

    if (importedTemplates.length > 0) {
        const allTemplates = [...importedTemplates, ...currentTemplates];
        if (saveAll(allTemplates)) {
            return {
                success: true,
                imported: importedTemplates.length,
                errors: errors.length > 0 ? errors : null,
            };
        }
        return { success: false, error: 'Failed to save imported templates' };
    }

    return {
        success: false,
        error: errors.length > 0 ? errors.join('; ') : 'No valid templates to import',
    };
};

/**
 * Capture current layout state as a template object
 * @param appState - Current app state
 * @param name - Template name
 * @param description - Optional description
 * @returns Template object (without id - will be added on save)
 */
export const captureCurrentLayout = (appState: AppState, name: string, description: string = ''): TemplateInput => {
    const {
        layout,
        charts,
        chartType,
        chartAppearance,
        theme,
    } = appState;

    // Deep clone charts to avoid reference issues
    const chartsCopy: ChartConfig[] = charts.map(chart => ({
        id: chart.id,
        symbol: chart.symbol,
        exchange: chart.exchange,
        interval: chart.interval,
        indicators: JSON.parse(JSON.stringify(chart.indicators || {})),
        comparisonSymbols: JSON.parse(JSON.stringify(chart.comparisonSymbols || [])),
    }));

    return {
        name,
        description,
        layout,
        chartType,
        charts: chartsCopy,
        appearance: {
            chartAppearance: chartAppearance ? JSON.parse(JSON.stringify(chartAppearance)) : null,
            theme,
        },
    };
};

/**
 * Get templates sorted with favorites first
 * @returns Sorted templates array
 */
export const getAllSorted = (): LayoutTemplate[] => {
    const templates = getAll();
    return templates.sort((a, b) => {
        // Favorites first
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        // Then by updated date (newest first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
};

/**
 * Get count of templates
 * @returns Number of templates
 */
export const getCount = (): number => getAll().length;

/**
 * Check if max templates reached
 * @returns True if at max capacity
 */
export const isAtMaxCapacity = (): boolean => getCount() >= MAX_TEMPLATES;

/**
 * Get enabled indicators as display string
 * @param indicators - Indicators object
 * @returns Comma-separated indicator names
 */
export const getIndicatorSummary = (indicators: ChartIndicators | null | undefined): string => {
    if (!indicators) return '';

    const enabled: string[] = [];
    if (indicators.sma) enabled.push('SMA');
    if (indicators.ema) enabled.push('EMA');
    if (indicators.rsi?.enabled) enabled.push('RSI');
    if (indicators.macd?.enabled) enabled.push('MACD');
    if (indicators.bollingerBands?.enabled) enabled.push('BB');
    if (indicators.volume?.enabled) enabled.push('Vol');
    if (indicators.atr?.enabled) enabled.push('ATR');
    if (indicators.stochastic?.enabled) enabled.push('Stoch');
    if (indicators.vwap?.enabled) enabled.push('VWAP');

    return enabled.join(', ') || 'None';
};

// Export as service object for convenience
export const layoutTemplateService = {
    getAll,
    getAllSorted,
    getById,
    save,
    delete: deleteTemplate,
    toggleFavorite,
    exportAll,
    exportOne,
    importTemplates,
    captureCurrentLayout,
    getCount,
    isAtMaxCapacity,
    getIndicatorSummary,
    MAX_TEMPLATES,
};

export default layoutTemplateService;
