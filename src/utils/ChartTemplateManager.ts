/**
 * ChartTemplateManager - Manages saved chart templates
 * Templates store complete chart configurations: indicators, chart type, appearance settings
 */

import logger from './logger';
import { getJSON, setJSON } from '../services/storageService';

const STORAGE_KEY = 'chart_templates';

// Interfaces
export interface IndicatorSettings {
    [key: string]: unknown;
}

export interface SerializedIndicator {
    type: string;
    visible: boolean;
    settings: IndicatorSettings;
    [key: string]: unknown;
}

export interface ChartAppearance {
    theme?: string;
    showGrid?: boolean;
    showVolume?: boolean;
    upColor?: string;
    downColor?: string;
    [key: string]: unknown;
}

export interface ChartTemplate {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    chartType: string;
    indicators: SerializedIndicator[];
    appearance: ChartAppearance;
    isDefault?: boolean;
}

export interface ChartConfig {
    chartType?: string;
    indicators?: Array<{
        type: string;
        visible?: boolean;
        settings?: IndicatorSettings;
        data?: unknown;
        series?: unknown;
        _hash?: unknown;
        [key: string]: unknown;
    }>;
    appearance?: ChartAppearance;
}

export interface TemplateUpdates {
    name?: string;
    chartType?: string;
    indicators?: ChartConfig['indicators'];
    appearance?: ChartAppearance;
    isDefault?: boolean;
}

export interface ExportData {
    version: number;
    exportedAt: string;
    templates: ChartTemplate[];
}

export interface ImportResult {
    imported: number;
    errors: string[];
}

export type TemplateChangeCallback = (templates: ChartTemplate[]) => void;

class ChartTemplateManager {
    private _templates: ChartTemplate[] | null = null;
    private _listeners: Set<TemplateChangeCallback> = new Set();

    constructor() {
        this._templates = null;
        this._listeners = new Set();
    }

    /**
     * Generate a unique ID
     */
    private _generateId(): string {
        return 'tpl_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get all templates from storage
     * @returns List of templates
     */
    getAllTemplates(): ChartTemplate[] {
        if (this._templates === null) {
            try {
                this._templates = getJSON(STORAGE_KEY, []) as ChartTemplate[];
            } catch (e) {
                logger.warn('Failed to load chart templates:', e);
                this._templates = [];
            }
        }
        return [...this._templates];
    }

    /**
     * Save templates to storage
     */
    private _saveTemplates(): void {
        try {
            setJSON(STORAGE_KEY, this._templates);
            this._notifyListeners();
        } catch (e) {
            logger.warn('Failed to save chart templates:', e);
        }
    }

    /**
     * Get a template by ID
     * @param id - Template ID
     * @returns Template or null if not found
     */
    getTemplate(id: string): ChartTemplate | null {
        const templates = this.getAllTemplates();
        return templates.find(t => t.id === id) || null;
    }

    /**
     * Save a new template
     * @param name - Template name
     * @param config - Chart configuration
     * @returns The saved template
     */
    saveTemplate(name: string, config: ChartConfig): ChartTemplate {
        const templates = this.getAllTemplates();

        const template: ChartTemplate = {
            id: this._generateId(),
            name: name.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            chartType: config.chartType || 'Candlestick',
            indicators: this._serializeIndicators(config.indicators || []),
            appearance: config.appearance || {},
            isDefault: false,
        };

        this._templates = [...templates, template];
        this._saveTemplates();

        return template;
    }

    /**
     * Update an existing template
     * @param id - Template ID
     * @param updates - Fields to update
     * @returns Updated template or null if not found
     */
    updateTemplate(id: string, updates: TemplateUpdates): ChartTemplate | null {
        const templates = this.getAllTemplates();
        const index = templates.findIndex(t => t.id === id);

        if (index === -1) return null;

        const template: ChartTemplate = {
            ...templates[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        } as any;

        // Re-serialize indicators if updated
        if (updates.indicators) {
            template.indicators = this._serializeIndicators(updates.indicators);
        }

        this._templates = [...templates];
        this._templates[index] = template;
        this._saveTemplates();

        return template;
    }

    /**
     * Delete a template
     * @param id - Template ID
     * @returns True if deleted
     */
    deleteTemplate(id: string): boolean {
        const templates = this.getAllTemplates();
        const filtered = templates.filter(t => t.id !== id);

        if (filtered.length === templates.length) return false;

        this._templates = filtered;
        this._saveTemplates();

        return true;
    }

    /**
     * Rename a template
     * @param id - Template ID
     * @param newName - New name
     * @returns Updated template or null if not found
     */
    renameTemplate(id: string, newName: string): ChartTemplate | null {
        return this.updateTemplate(id, { name: newName.trim() });
    }

    /**
     * Set a template as default
     * @param id - Template ID to set as default (null to clear)
     */
    setDefaultTemplate(id: string | null): void {
        const templates = this.getAllTemplates();

        this._templates = templates.map(t => ({
            ...t,
            isDefault: t.id === id,
        }));

        this._saveTemplates();
    }

    /**
     * Get the default template
     * @returns Default template or null if none set
     */
    getDefaultTemplate(): ChartTemplate | null {
        const templates = this.getAllTemplates();
        return templates.find(t => t.isDefault) || null;
    }

    /**
     * Serialize indicators for storage
     * Removes calculated data, keeps only configuration
     */
    private _serializeIndicators(indicators: NonNullable<ChartConfig['indicators']>): SerializedIndicator[] {
        return indicators.map(ind => ({
            type: ind.type,
            visible: ind.visible !== false,
            settings: { ...ind.settings },
            // Copy all non-function properties except 'data' and 'series'
            ...Object.fromEntries(
                Object.entries(ind).filter(([key, value]) =>
                    !['type', 'visible', 'settings', 'data', 'series', '_hash'].includes(key) &&
                    typeof value !== 'function'
                )
            ),
        }));
    }

    /**
     * Export all templates as JSON
     * @returns JSON string
     */
    exportTemplates(): string {
        return JSON.stringify({
            version: 1,
            exportedAt: new Date().toISOString(),
            templates: this.getAllTemplates(),
        }, null, 2);
    }

    /**
     * Import templates from JSON
     * @param jsonString - JSON string to import
     * @param merge - If true, merge with existing; if false, replace all
     * @returns { imported: number, errors: string[] }
     */
    importTemplates(jsonString: string, merge: boolean = true): ImportResult {
        const result: ImportResult = { imported: 0, errors: [] };

        try {
            const data = JSON.parse(jsonString) as ExportData;

            if (!data.templates || !Array.isArray(data.templates)) {
                result.errors.push('Invalid template file format');
                return result;
            }

            const existing = merge ? this.getAllTemplates() : [];
            const existingNames = new Set(existing.map(t => t.name.toLowerCase()));
            const newTemplates: ChartTemplate[] = [];

            for (const template of data.templates) {
                // Validate required fields
                if (!template.name || !template.chartType) {
                    result.errors.push(`Skipped invalid template: missing name or chartType`);
                    continue;
                }

                // Handle name conflicts
                let name = template.name;
                if (existingNames.has(name.toLowerCase())) {
                    name = `${name} (imported)`;
                }

                newTemplates.push({
                    ...template,
                    id: this._generateId(),
                    name,
                    isDefault: false, // Don't import default status
                    updatedAt: new Date().toISOString(),
                });

                result.imported++;
                existingNames.add(name.toLowerCase());
            }

            this._templates = [...existing, ...newTemplates];
            this._saveTemplates();

        } catch (e) {
            const error = e as Error;
            result.errors.push(`Parse error: ${error.message}`);
        }

        return result;
    }

    /**
     * Add a listener for template changes
     * @param callback - Callback function
     * @returns Unsubscribe function
     */
    subscribe(callback: TemplateChangeCallback): () => void {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    /**
     * Notify all listeners of changes
     */
    private _notifyListeners(): void {
        const templates = this.getAllTemplates();
        this._listeners.forEach(cb => cb(templates));
    }

    /**
     * Clear all templates
     */
    clearAll(): void {
        this._templates = [];
        this._saveTemplates();
    }
}

// Singleton instance
export const chartTemplateManager = new ChartTemplateManager();
export default chartTemplateManager;
