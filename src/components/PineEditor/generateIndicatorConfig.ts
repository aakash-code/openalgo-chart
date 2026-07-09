/**
 * Generate IndicatorConfigDefinition from Pine Script code
 * Enables auto-generated settings dialog from Pine Script input functions
 */

import { PineScriptInput, pineScriptService } from '../../services/pineScriptService';

// Import types from indicatorConfigs
interface ConfigField {
    key: string;
    label: string;
    type: 'number' | 'color' | 'boolean' | 'select' | 'text';
    default: unknown;
    min?: number;
    max?: number;
    step?: number;
    options?: string[] | Array<{ value: string; label: string }>;
    tooltip?: string;
}

interface IndicatorConfigDefinition {
    name: string;
    fullName: string;
    pane: string;
    category?: string;
    inputs: ConfigField[];
    style: ConfigField[];
}

// Map Pine Script input types to config field types
function mapPineTypeToFieldType(pineType: PineScriptInput['type']): ConfigField['type'] {
    switch (pineType) {
        case 'int':
        case 'float':
            return 'number';
        case 'bool':
            return 'boolean';
        case 'color':
            return 'color';
        case 'string':
        case 'source':
            return 'select';
        default:
            return 'text';
    }
}

// Convert Pine Script input to config field
function inputToConfigField(input: PineScriptInput): ConfigField {
    const field: ConfigField = {
        key: input.name,
        label: input.title || input.name,
        type: mapPineTypeToFieldType(input.type),
        default: input.default,
    };

    // Add number constraints
    if (input.type === 'int' || input.type === 'float') {
        if (input.minval !== undefined) field.min = input.minval;
        if (input.maxval !== undefined) field.max = input.maxval;
        if (input.step !== undefined) field.step = input.step;
        else if (input.type === 'float') field.step = 0.1;
    }

    // Add options for select types
    if (input.options && input.options.length > 0) {
        field.type = 'select';
        field.options = input.options;
    }

    // Add tooltip
    if (input.tooltip) {
        field.tooltip = input.tooltip;
    }

    return field;
}

// Extract plot style fields from code
function extractStyleFields(code: string): ConfigField[] {
    const styleFields: ConfigField[] = [];
    const plotMatches = code.matchAll(
        /plot\s*\(\s*[^,]+\s*,\s*["']([^"']+)["'](?:\s*,\s*color\s*=\s*([^,)]+))?(?:\s*,\s*linewidth\s*=\s*(\d+))?/g
    );

    for (const match of plotMatches) {
        const plotName = match[1];
        const colorMatch = match[2];
        const lineWidth = match[3];

        // Add color field for this plot
        styleFields.push({
            key: `${plotName.toLowerCase().replace(/\s+/g, '_')}_color`,
            label: `${plotName} Color`,
            type: 'color',
            default: extractColor(colorMatch) || '#2962FF',
        });

        // Add line width field
        styleFields.push({
            key: `${plotName.toLowerCase().replace(/\s+/g, '_')}_linewidth`,
            label: `${plotName} Width`,
            type: 'number',
            default: lineWidth ? parseInt(lineWidth, 10) : 2,
            min: 1,
            max: 5,
            step: 1,
        });
    }

    return styleFields;
}

// Extract color value from Pine Script color expression
function extractColor(colorExpr: string | undefined): string | undefined {
    if (!colorExpr) return undefined;

    const colorMap: Record<string, string> = {
        red: '#F23645',
        green: '#089981',
        blue: '#2962FF',
        white: '#FFFFFF',
        black: '#000000',
        yellow: '#FFEB3B',
        orange: '#FF9800',
        purple: '#9C27B0',
        aqua: '#00BCD4',
        lime: '#8BC34A',
        navy: '#1A237E',
        fuchsia: '#E91E63',
        maroon: '#B71C1C',
        olive: '#827717',
        teal: '#00796B',
        silver: '#9E9E9E',
        gray: '#787B86',
        grey: '#787B86',
    };

    // Check for color.name pattern
    const colorMatch = colorExpr.match(/color\.(\w+)/);
    if (colorMatch && colorMap[colorMatch[1]]) {
        return colorMap[colorMatch[1]];
    }

    // Check for hex color
    if (colorExpr.startsWith('#')) {
        return colorExpr;
    }

    return undefined;
}

/**
 * Generate IndicatorConfigDefinition from Pine Script code
 */
export function generateIndicatorConfig(code: string): IndicatorConfigDefinition {
    // Parse inputs from code
    const inputs = pineScriptService.parseInputs(code);

    // Extract indicator info
    const indicatorInfo = pineScriptService.extractIndicatorInfo(code);

    // Convert inputs to config fields
    const inputFields = inputs.map(inputToConfigField);

    // Extract style fields from plots
    const styleFields = extractStyleFields(code);

    return {
        name: indicatorInfo.name,
        fullName: indicatorInfo.name,
        pane: indicatorInfo.overlay ? 'main' : 'pine_indicator',
        category: 'pine',
        inputs: inputFields,
        style: styleFields,
    };
}

/**
 * Generate default settings from inputs
 */
export function generateDefaultSettings(inputs: PineScriptInput[]): Record<string, unknown> {
    const settings: Record<string, unknown> = {};

    for (const input of inputs) {
        settings[input.name] = input.default;
    }

    return settings;
}

/**
 * Merge user settings with default settings
 */
export function mergeSettings(
    inputs: PineScriptInput[],
    userSettings: Record<string, unknown>
): Record<string, unknown> {
    const defaults = generateDefaultSettings(inputs);
    return { ...defaults, ...userSettings };
}
