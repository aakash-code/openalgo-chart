/**
 * PineScript Service - Wrapper for PineTS library
 * Handles Pine Script parsing, execution, and input extraction
 */

import { PineTS } from 'pinets';
import { logger } from '../utils/logger';

// Types for Pine Script inputs
export interface PineScriptInput {
    name: string;
    type: 'int' | 'float' | 'bool' | 'string' | 'color' | 'source';
    default: unknown;
    title: string;
    minval?: number;
    maxval?: number;
    step?: number;
    options?: string[];
    tooltip?: string;
    group?: string;
}

// Types for plot configuration
export interface PlotConfig {
    name: string;
    title: string;
    color: string;
    lineWidth: number;
    style: 'line' | 'histogram' | 'area' | 'circles' | 'columns';
    overlay: boolean;
}

// Result from Pine Script execution
export interface PineScriptResult {
    plots: Map<string, { data: number[]; config: PlotConfig }>;
    inputs: PineScriptInput[];
    errors: string[];
    warnings: string[];
    indicator: {
        name: string;
        overlay: boolean;
        shortName?: string;
    };
}

// OHLCV data type
export interface OHLCVData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

// Color mapping from Pine Script colors to hex
const PINE_COLORS: Record<string, string> = {
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

// Source options for input.source
const SOURCE_OPTIONS = ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4', 'hlcc4'];

class PineScriptService {
    private pineTS: PineTS | null = null;

    /**
     * Parse input.* function calls from Pine Script code
     */
    parseInputs(code: string): PineScriptInput[] {
        const inputs: PineScriptInput[] = [];

        // Match variable assignments with input functions
        // Pattern: varName = input.type(default, "title", ...)
        const inputPatterns = [
            // input.int(defval, title, minval, maxval, step, tooltip, inline, group, confirm)
            {
                type: 'int' as const,
                regex: /(\w+)\s*=\s*input\.int\s*\(\s*([^)]+)\)/g,
            },
            // input.float(defval, title, minval, maxval, step, tooltip, inline, group, confirm)
            {
                type: 'float' as const,
                regex: /(\w+)\s*=\s*input\.float\s*\(\s*([^)]+)\)/g,
            },
            // input.bool(defval, title, tooltip, inline, group, confirm)
            {
                type: 'bool' as const,
                regex: /(\w+)\s*=\s*input\.bool\s*\(\s*([^)]+)\)/g,
            },
            // input.string(defval, title, options, tooltip, inline, group, confirm)
            {
                type: 'string' as const,
                regex: /(\w+)\s*=\s*input\.string\s*\(\s*([^)]+)\)/g,
            },
            // input.color(defval, title, tooltip, inline, group, confirm)
            {
                type: 'color' as const,
                regex: /(\w+)\s*=\s*input\.color\s*\(\s*([^)]+)\)/g,
            },
            // input.source(defval, title, tooltip, inline, group)
            {
                type: 'source' as const,
                regex: /(\w+)\s*=\s*input\.source\s*\(\s*([^)]+)\)/g,
            },
            // Legacy input() function
            {
                type: 'float' as const,
                regex: /(\w+)\s*=\s*input\s*\(\s*([^)]+)\)/g,
            },
        ];

        for (const pattern of inputPatterns) {
            let match;
            while ((match = pattern.regex.exec(code)) !== null) {
                const varName = match[1];
                const argsStr = match[2];

                const input = this.parseInputArgs(varName, argsStr, pattern.type);
                if (input) {
                    inputs.push(input);
                }
            }
        }

        return inputs;
    }

    /**
     * Parse arguments from an input function call
     */
    private parseInputArgs(
        varName: string,
        argsStr: string,
        type: PineScriptInput['type']
    ): PineScriptInput | null {
        try {
            // Split by comma but respect nested parentheses and strings
            const args = this.splitArgs(argsStr);

            const input: PineScriptInput = {
                name: varName,
                type,
                default: this.parseDefaultValue(args[0], type),
                title: this.parseStringArg(args[1]) || varName,
            };

            // Parse named arguments
            for (let i = 2; i < args.length; i++) {
                const arg = args[i].trim();

                if (arg.startsWith('minval')) {
                    input.minval = this.parseNumberArg(arg);
                } else if (arg.startsWith('maxval')) {
                    input.maxval = this.parseNumberArg(arg);
                } else if (arg.startsWith('step')) {
                    input.step = this.parseNumberArg(arg);
                } else if (arg.startsWith('tooltip')) {
                    input.tooltip = this.parseStringArg(arg);
                } else if (arg.startsWith('group')) {
                    input.group = this.parseStringArg(arg);
                } else if (arg.startsWith('options')) {
                    input.options = this.parseOptionsArg(arg);
                }
            }

            // Set default options for source type
            if (type === 'source' && !input.options) {
                input.options = SOURCE_OPTIONS;
            }

            return input;
        } catch (e) {
            logger.warn(`Failed to parse input: ${varName}`, e);
            return null;
        }
    }

    /**
     * Split arguments respecting nested structures
     */
    private splitArgs(argsStr: string): string[] {
        const args: string[] = [];
        let current = '';
        let depth = 0;
        let inString = false;
        let stringChar = '';

        for (const char of argsStr) {
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar) {
                inString = false;
            } else if (!inString && (char === '(' || char === '[')) {
                depth++;
            } else if (!inString && (char === ')' || char === ']')) {
                depth--;
            } else if (!inString && depth === 0 && char === ',') {
                args.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }

        if (current.trim()) {
            args.push(current.trim());
        }

        return args;
    }

    /**
     * Parse default value based on type
     */
    private parseDefaultValue(arg: string | undefined, type: PineScriptInput['type']): unknown {
        if (!arg) return type === 'bool' ? false : type === 'string' ? '' : 0;

        const value = arg.trim();

        switch (type) {
            case 'int':
                return parseInt(value, 10) || 0;
            case 'float':
                return parseFloat(value) || 0;
            case 'bool':
                return value === 'true';
            case 'string':
                return this.parseStringArg(value) || '';
            case 'color':
                return this.parseColorArg(value);
            case 'source':
                return value || 'close';
            default:
                return value;
        }
    }

    /**
     * Parse string argument (remove quotes)
     */
    private parseStringArg(arg: string | undefined): string | undefined {
        if (!arg) return undefined;

        // Handle key=value format
        if (arg.includes('=')) {
            arg = arg.split('=')[1].trim();
        }

        // Remove quotes
        const match = arg.match(/["']([^"']+)["']/);
        return match ? match[1] : undefined;
    }

    /**
     * Parse number from named argument
     */
    private parseNumberArg(arg: string): number | undefined {
        const match = arg.match(/=\s*([\d.]+)/);
        return match ? parseFloat(match[1]) : undefined;
    }

    /**
     * Parse options array
     */
    private parseOptionsArg(arg: string): string[] | undefined {
        const match = arg.match(/\[([^\]]+)\]/);
        if (!match) return undefined;

        return match[1]
            .split(',')
            .map((s) => this.parseStringArg(s.trim()))
            .filter((s): s is string => s !== undefined);
    }

    /**
     * Parse color argument
     */
    private parseColorArg(arg: string): string {
        // Handle color.name format
        const colorMatch = arg.match(/color\.(\w+)/);
        if (colorMatch) {
            return PINE_COLORS[colorMatch[1]] || '#2962FF';
        }

        // Handle #RRGGBB format
        if (arg.startsWith('#')) {
            return arg;
        }

        return '#2962FF';
    }

    /**
     * Extract indicator metadata from Pine Script
     */
    extractIndicatorInfo(code: string): { name: string; overlay: boolean; shortName?: string } {
        // Match indicator() or strategy() call
        const indicatorMatch = code.match(
            /indicator\s*\(\s*["']([^"']+)["'](?:\s*,\s*[^)]*overlay\s*=\s*(true|false))?/
        );
        const strategyMatch = code.match(/strategy\s*\(\s*["']([^"']+)["']/);

        if (indicatorMatch) {
            return {
                name: indicatorMatch[1],
                overlay: indicatorMatch[2] === 'true',
            };
        }

        if (strategyMatch) {
            return {
                name: strategyMatch[1],
                overlay: true, // Strategies typically overlay
            };
        }

        return {
            name: 'Custom Indicator',
            overlay: false,
        };
    }

    /**
     * Extract plot configurations from Pine Script
     */
    extractPlots(code: string): PlotConfig[] {
        const plots: PlotConfig[] = [];

        // Match plot() calls
        const plotRegex =
            /plot\s*\(\s*([^,]+)\s*,\s*["']([^"']+)["'](?:\s*,\s*color\s*=\s*([^,)]+))?/g;
        let match;

        while ((match = plotRegex.exec(code)) !== null) {
            plots.push({
                name: match[2],
                title: match[2],
                color: match[3] ? this.parseColorArg(match[3]) : '#2962FF',
                lineWidth: 2,
                style: 'line',
                overlay: true,
            });
        }

        return plots;
    }

    /**
     * Validate Pine Script syntax
     * Note: This is a basic structural validation. Full validation happens at execution time.
     */
    validate(code: string): { valid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Remove comments for analysis
        const codeWithoutComments = code
            .replace(/\/\/.*$/gm, '')  // Remove single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '');  // Remove multi-line comments

        // Check for version tag
        if (!code.includes('//@version=5') && !code.includes('//@version=6') &&
            !code.includes('//@version=4') && !code.includes('//@version=3')) {
            warnings.push('No version tag found. Consider adding //@version=5 at the top.');
        }

        // Check for indicator or strategy declaration
        if (!code.includes('indicator(') && !code.includes('strategy(') && !code.includes('library(')) {
            errors.push('Missing indicator(), strategy(), or library() declaration.');
        }

        // Check for mismatched parentheses (accounting for strings)
        let parenDepth = 0;
        let inString = false;
        let stringChar = '';
        for (let i = 0; i < codeWithoutComments.length; i++) {
            const char = codeWithoutComments[i];
            const prevChar = i > 0 ? codeWithoutComments[i - 1] : '';

            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
            } else if (!inString) {
                if (char === '(') parenDepth++;
                else if (char === ')') parenDepth--;
            }
        }
        if (parenDepth !== 0) {
            errors.push(`Mismatched parentheses (${parenDepth > 0 ? 'missing ' + parenDepth + ' closing' : 'extra ' + Math.abs(parenDepth) + ' closing'}).`);
        }

        // Check for mismatched brackets
        let bracketDepth = 0;
        inString = false;
        for (let i = 0; i < codeWithoutComments.length; i++) {
            const char = codeWithoutComments[i];
            const prevChar = i > 0 ? codeWithoutComments[i - 1] : '';

            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
            } else if (!inString) {
                if (char === '[') bracketDepth++;
                else if (char === ']') bracketDepth--;
            }
        }
        if (bracketDepth !== 0) {
            errors.push(`Mismatched brackets (${bracketDepth > 0 ? 'missing ' + bracketDepth + ' closing' : 'extra ' + Math.abs(bracketDepth) + ' closing'}).`);
        }

        // Check for unclosed strings (simple check)
        const lines = codeWithoutComments.split('\n');
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            let inStr = false;
            let strChar = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';
                if (!inStr && (char === '"' || char === "'")) {
                    inStr = true;
                    strChar = char;
                } else if (inStr && char === strChar && prevChar !== '\\') {
                    inStr = false;
                }
            }
            if (inStr) {
                errors.push(`Unclosed string at line ${lineNum + 1}.`);
            }
        }

        // Check for obvious typos in common functions (only single-word functions to avoid false positives)
        const commonTypos: Record<string, string> = {
            'polt': 'plot',
            'plto': 'plot',
            'lot': 'plot',
            'plit': 'plot',
            'inpu': 'input',
            'imput': 'input',
            'inidcator': 'indicator',
            'indciator': 'indicator',
            'startegy': 'strategy',
            'stratagy': 'strategy',
        };

        for (const [typo, correct] of Object.entries(commonTypos)) {
            const typoRegex = new RegExp(`\\b${typo}\\s*\\(`, 'g');
            let match;
            while ((match = typoRegex.exec(codeWithoutComments)) !== null) {
                const beforeMatch = codeWithoutComments.substring(0, match.index);
                const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
                errors.push(`Possible typo '${typo}' at line ${lineNumber}. Did you mean '${correct}'?`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Execute Pine Script with given data and inputs
     */
    async execute(
        code: string,
        ohlcvData: OHLCVData[],
        inputValues: Record<string, unknown> = {}
    ): Promise<PineScriptResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Parse inputs from code
            const inputs = this.parseInputs(code);

            // Extract indicator info
            const indicator = this.extractIndicatorInfo(code);

            // Replace input variables with actual values
            let modifiedCode = code;
            for (const input of inputs) {
                const value = inputValues[input.name] ?? input.default;
                // Replace the input.* call with the actual value
                const inputRegex = new RegExp(
                    `${input.name}\\s*=\\s*input\\.\\w+\\s*\\([^)]+\\)`,
                    'g'
                );
                const legacyRegex = new RegExp(`${input.name}\\s*=\\s*input\\s*\\([^)]+\\)`, 'g');

                const replacement = `${input.name} = ${this.valueToString(value, input.type)}`;
                modifiedCode = modifiedCode.replace(inputRegex, replacement);
                modifiedCode = modifiedCode.replace(legacyRegex, replacement);
            }

            // Create PineTS instance with custom data
            // Convert OHLCV to candle format expected by PineTS
            const candles = ohlcvData.map((d) => ({
                time: d.time * 1000, // PineTS expects milliseconds
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume || 0,
            }));

            // Initialize PineTS with custom data provider
            this.pineTS = new PineTS(candles);

            // Run the Pine Script
            const result = await this.pineTS.run(modifiedCode);

            // Convert plots to our format
            const plots = new Map<string, { data: number[]; config: PlotConfig }>();

            if (result.plots) {
                for (const [plotName, plotData] of Object.entries(result.plots)) {
                    const data = plotData as { data: number[]; color?: string };
                    plots.set(plotName, {
                        data: data.data || [],
                        config: {
                            name: plotName,
                            title: plotName,
                            color: data.color || '#2962FF',
                            lineWidth: 2,
                            style: 'line',
                            overlay: indicator.overlay,
                        },
                    });
                }
            }

            return {
                plots,
                inputs,
                errors,
                warnings,
                indicator,
            };
        } catch (e) {
            const error = e instanceof Error ? e.message : 'Unknown error';
            errors.push(`Execution error: ${error}`);
            logger.error('PineScript execution error:', e);

            return {
                plots: new Map(),
                inputs: this.parseInputs(code),
                errors,
                warnings,
                indicator: this.extractIndicatorInfo(code),
            };
        }
    }

    /**
     * Convert value to Pine Script string representation
     */
    private valueToString(value: unknown, type: PineScriptInput['type']): string {
        switch (type) {
            case 'string':
            case 'source':
                return `"${value}"`;
            case 'color':
                // Convert hex to color constant if possible
                for (const [name, hex] of Object.entries(PINE_COLORS)) {
                    if (hex === value) return `color.${name}`;
                }
                return `"${value}"`;
            case 'bool':
                return value ? 'true' : 'false';
            default:
                return String(value);
        }
    }
}

// Export singleton instance
export const pineScriptService = new PineScriptService();
export default pineScriptService;
