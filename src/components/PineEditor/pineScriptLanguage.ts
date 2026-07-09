/**
 * Pine Script Language Definition for Monaco Editor
 * Provides syntax highlighting, autocomplete, and language configuration
 */

import type { languages } from 'monaco-editor';

export const PINE_SCRIPT_LANGUAGE_ID = 'pinescript';

// Pine Script keywords
export const PINE_KEYWORDS = [
    'if',
    'else',
    'for',
    'to',
    'while',
    'switch',
    'case',
    'default',
    'break',
    'continue',
    'return',
    'var',
    'varip',
    'export',
    'import',
    'as',
    'and',
    'or',
    'not',
    'true',
    'false',
    'na',
];

// Type keywords
export const PINE_TYPE_KEYWORDS = [
    'int',
    'float',
    'bool',
    'string',
    'color',
    'series',
    'simple',
    'const',
    'array',
    'matrix',
    'map',
    'line',
    'label',
    'box',
    'table',
];

// Built-in functions
export const PINE_BUILTIN_FUNCTIONS = [
    'indicator',
    'strategy',
    'plot',
    'plotshape',
    'plotchar',
    'plotarrow',
    'plotbar',
    'plotcandle',
    'hline',
    'fill',
    'bgcolor',
    'barcolor',
    'alertcondition',
    'alert',
    'log.info',
    'log.warning',
    'log.error',
    'runtime.error',
    'nz',
    'na',
    'fixnan',
];

// Technical Analysis namespace functions
export const TA_FUNCTIONS = [
    'sma',
    'ema',
    'wma',
    'vwma',
    'swma',
    'rma',
    'rsi',
    'macd',
    'bb',
    'bbw',
    'cci',
    'cmo',
    'cog',
    'dmi',
    'ema',
    'hma',
    'kc',
    'kcw',
    'linreg',
    'mfi',
    'mom',
    'percentile_linear_interpolation',
    'percentile_nearest_rank',
    'percentrank',
    'pivothigh',
    'pivotlow',
    'roc',
    'sar',
    'stoch',
    'supertrend',
    'tr',
    'atr',
    'tsi',
    'vwap',
    'wpr',
    'highest',
    'lowest',
    'highestbars',
    'lowestbars',
    'barssince',
    'valuewhen',
    'cross',
    'crossover',
    'crossunder',
    'change',
    'rising',
    'falling',
    'cum',
    'dev',
    'stdev',
    'variance',
    'correlation',
    'median',
    'mode',
    'range',
];

// Math namespace functions
export const MATH_FUNCTIONS = [
    'abs',
    'acos',
    'asin',
    'atan',
    'avg',
    'ceil',
    'cos',
    'exp',
    'floor',
    'log',
    'log10',
    'max',
    'min',
    'pow',
    'random',
    'round',
    'round_to_mintick',
    'sign',
    'sin',
    'sqrt',
    'sum',
    'tan',
    'todegrees',
    'toradians',
];

// String namespace functions
export const STR_FUNCTIONS = [
    'contains',
    'endswith',
    'format',
    'format_time',
    'length',
    'lower',
    'match',
    'pos',
    'replace',
    'replace_all',
    'split',
    'startswith',
    'substring',
    'tonumber',
    'tostring',
    'trim',
    'upper',
];

// Input namespace functions
export const INPUT_FUNCTIONS = [
    'int',
    'float',
    'bool',
    'string',
    'color',
    'source',
    'timeframe',
    'symbol',
    'session',
    'time',
    'text_area',
    'price',
];

// Request namespace functions
export const REQUEST_FUNCTIONS = [
    'security',
    'security_lower_tf',
    'currency_rate',
    'dividends',
    'earnings',
    'economic',
    'financial',
    'quandl',
    'seed',
    'splits',
];

// Array namespace functions
export const ARRAY_FUNCTIONS = [
    'new',
    'from',
    'clear',
    'concat',
    'copy',
    'covariance',
    'fill',
    'first',
    'get',
    'includes',
    'indexof',
    'insert',
    'join',
    'last',
    'lastindexof',
    'max',
    'median',
    'min',
    'mode',
    'percentile_linear_interpolation',
    'percentile_nearest_rank',
    'percentrank',
    'pop',
    'push',
    'range',
    'remove',
    'reverse',
    'set',
    'shift',
    'size',
    'slice',
    'sort',
    'sort_indices',
    'standardize',
    'stdev',
    'sum',
    'unshift',
    'variance',
];

// Built-in constants
export const PINE_CONSTANTS = [
    'open',
    'high',
    'low',
    'close',
    'volume',
    'time',
    'time_close',
    'time_tradingday',
    'hl2',
    'hlc3',
    'ohlc4',
    'hlcc4',
    'bar_index',
    'barstate.isfirst',
    'barstate.islast',
    'barstate.ishistory',
    'barstate.isrealtime',
    'barstate.isnew',
    'barstate.isconfirmed',
    'barstate.islastconfirmedhistory',
    'dayofmonth',
    'dayofweek',
    'hour',
    'minute',
    'month',
    'second',
    'weekofyear',
    'year',
    'timenow',
    'last_bar_index',
    'last_bar_time',
    'syminfo.ticker',
    'syminfo.tickerid',
    'syminfo.prefix',
    'syminfo.description',
    'syminfo.currency',
    'syminfo.basecurrency',
    'syminfo.mintick',
    'syminfo.pointvalue',
    'syminfo.session',
    'syminfo.timezone',
    'syminfo.type',
    'syminfo.volumetype',
    'timeframe.period',
    'timeframe.multiplier',
    'timeframe.isintraday',
    'timeframe.isdaily',
    'timeframe.isweekly',
    'timeframe.ismonthly',
];

// Color constants
export const PINE_COLORS = [
    'red',
    'green',
    'blue',
    'white',
    'black',
    'yellow',
    'orange',
    'purple',
    'aqua',
    'lime',
    'navy',
    'fuchsia',
    'maroon',
    'olive',
    'teal',
    'silver',
    'gray',
    'grey',
    'new',
    'rgb',
    'from_gradient',
];

// Plot styles
export const PLOT_STYLES = [
    'plot.style_line',
    'plot.style_linebr',
    'plot.style_stepline',
    'plot.style_stepline_diamond',
    'plot.style_histogram',
    'plot.style_cross',
    'plot.style_area',
    'plot.style_areabr',
    'plot.style_columns',
    'plot.style_circles',
];

// Shape styles
export const SHAPE_STYLES = [
    'shape.xcross',
    'shape.cross',
    'shape.triangleup',
    'shape.triangledown',
    'shape.flag',
    'shape.circle',
    'shape.arrowup',
    'shape.arrowdown',
    'shape.labelup',
    'shape.labeldown',
    'shape.square',
    'shape.diamond',
];

// Line styles
export const LINE_STYLES = [
    'line.style_solid',
    'line.style_dotted',
    'line.style_dashed',
    'line.style_arrow_left',
    'line.style_arrow_right',
    'line.style_arrow_both',
];

// Hline styles
export const HLINE_STYLES = ['hline.style_solid', 'hline.style_dotted', 'hline.style_dashed'];

/**
 * Monaco language configuration for Pine Script
 */
export const pineScriptLanguageConfiguration: languages.LanguageConfiguration = {
    comments: {
        lineComment: '//',
        blockComment: ['/*', '*/'],
    },
    brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
    ],
    autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
    ],
    surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
    ],
    folding: {
        markers: {
            start: /^\s*\/\/#region\b/,
            end: /^\s*\/\/#endregion\b/,
        },
    },
    indentationRules: {
        increaseIndentPattern: /^\s*(if|else|for|while|switch)\b.*$|.*\{\s*$/,
        decreaseIndentPattern: /^\s*(\}|else\b)/,
    },
};

/**
 * Monaco token provider for Pine Script syntax highlighting
 */
export const pineScriptTokenProvider: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    tokenPostfix: '.pine',

    keywords: PINE_KEYWORDS,
    typeKeywords: PINE_TYPE_KEYWORDS,
    builtinFunctions: PINE_BUILTIN_FUNCTIONS,
    constants: PINE_CONSTANTS,

    operators: [
        '=',
        '>',
        '<',
        '!',
        '~',
        '?',
        ':',
        '==',
        '<=',
        '>=',
        '!=',
        '&&',
        '||',
        '++',
        '--',
        '+',
        '-',
        '*',
        '/',
        '&',
        '|',
        '^',
        '%',
        '<<',
        '>>',
        '>>>',
        '+=',
        '-=',
        '*=',
        '/=',
        '&=',
        '|=',
        '^=',
        '%=',
        '<<=',
        '>>=',
        '>>>=',
        ':=',
        '=>',
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
        root: [
            // Version tag - use [@] to escape @ since Monarch uses @ for rule references
            [/\/\/[@]version=\d+/, 'annotation'],

            // Annotations/Decorators - use [@] to escape @
            [/\/\/[@]\w+/, 'annotation'],

            // Identifiers and keywords
            [
                /[a-zA-Z_]\w*/,
                {
                    cases: {
                        '@keywords': 'keyword',
                        '@typeKeywords': 'type',
                        '@builtinFunctions': 'function',
                        '@constants': 'constant',
                        '@default': 'identifier',
                    },
                },
            ],

            // Namespaces
            [/(ta|math|str|input|request|array|matrix|map|color)\s*\./, 'namespace'],

            // Whitespace
            { include: '@whitespace' },

            // Delimiters and operators
            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [
                /@symbols/,
                {
                    cases: {
                        '@operators': 'operator',
                        '@default': '',
                    },
                },
            ],

            // Numbers
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/0[xX][0-9a-fA-F]+/, 'number.hex'],
            [/\d+/, 'number'],

            // Delimiter: after number because of .\d floats
            [/[;,.]/, 'delimiter'],

            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'], // Non-terminated string
            [/'([^'\\]|\\.)*$/, 'string.invalid'], // Non-terminated string
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
        ],

        whitespace: [
            [/[ \t\r\n]+/, 'white'],
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],
        ],

        comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment'],
        ],

        string_double: [
            [/[^\\"]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop'],
        ],

        string_single: [
            [/[^\\']+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/'/, 'string', '@pop'],
        ],
    },
};

/**
 * Generate autocomplete suggestions for Pine Script
 */
export function getPineScriptCompletionItems(): languages.CompletionItem[] {
    const items: languages.CompletionItem[] = [];

    // Keywords
    for (const keyword of PINE_KEYWORDS) {
        items.push({
            label: keyword,
            kind: 17, // Keyword
            insertText: keyword,
            detail: 'Keyword',
        } as languages.CompletionItem);
    }

    // Type keywords
    for (const type of PINE_TYPE_KEYWORDS) {
        items.push({
            label: type,
            kind: 25, // TypeParameter
            insertText: type,
            detail: 'Type',
        } as languages.CompletionItem);
    }

    // Built-in functions
    for (const func of PINE_BUILTIN_FUNCTIONS) {
        items.push({
            label: func,
            kind: 3, // Function
            insertText: func.includes('.') ? func : `${func}($0)`,
            insertTextRules: 4, // InsertAsSnippet
            detail: 'Built-in Function',
        } as languages.CompletionItem);
    }

    // TA functions
    for (const func of TA_FUNCTIONS) {
        items.push({
            label: `ta.${func}`,
            kind: 3, // Function
            insertText: `ta.${func}($0)`,
            insertTextRules: 4,
            detail: 'Technical Analysis',
        } as languages.CompletionItem);
    }

    // Math functions
    for (const func of MATH_FUNCTIONS) {
        items.push({
            label: `math.${func}`,
            kind: 3, // Function
            insertText: `math.${func}($0)`,
            insertTextRules: 4,
            detail: 'Math Function',
        } as languages.CompletionItem);
    }

    // String functions
    for (const func of STR_FUNCTIONS) {
        items.push({
            label: `str.${func}`,
            kind: 3, // Function
            insertText: `str.${func}($0)`,
            insertTextRules: 4,
            detail: 'String Function',
        } as languages.CompletionItem);
    }

    // Input functions
    for (const func of INPUT_FUNCTIONS) {
        items.push({
            label: `input.${func}`,
            kind: 3, // Function
            insertText: `input.${func}($0)`,
            insertTextRules: 4,
            detail: 'Input Function',
        } as languages.CompletionItem);
    }

    // Constants
    for (const constant of PINE_CONSTANTS) {
        items.push({
            label: constant,
            kind: 21, // Constant
            insertText: constant,
            detail: 'Constant',
        } as languages.CompletionItem);
    }

    // Colors
    for (const color of PINE_COLORS) {
        items.push({
            label: `color.${color}`,
            kind: 16, // Color
            insertText: `color.${color}`,
            detail: 'Color',
        } as languages.CompletionItem);
    }

    return items;
}

/**
 * Register Pine Script language with Monaco Editor
 */
export function registerPineScriptLanguage(monaco: typeof import('monaco-editor')): void {
    // Register the language
    monaco.languages.register({ id: PINE_SCRIPT_LANGUAGE_ID });

    // Set the language configuration
    monaco.languages.setLanguageConfiguration(
        PINE_SCRIPT_LANGUAGE_ID,
        pineScriptLanguageConfiguration
    );

    // Set the token provider for syntax highlighting
    monaco.languages.setMonarchTokensProvider(PINE_SCRIPT_LANGUAGE_ID, pineScriptTokenProvider);

    // Register completion provider
    monaco.languages.registerCompletionItemProvider(PINE_SCRIPT_LANGUAGE_ID, {
        provideCompletionItems: () => {
            return {
                suggestions: getPineScriptCompletionItems(),
            };
        },
    });

    // Define custom theme tokens for Pine Script
    monaco.editor.defineTheme('pine-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'annotation', foreground: '6A9955', fontStyle: 'italic' },
            { token: 'namespace', foreground: '4EC9B0' },
            { token: 'function', foreground: 'DCDCAA' },
            { token: 'constant', foreground: '569CD6' },
            { token: 'type', foreground: '4EC9B0' },
            { token: 'keyword', foreground: 'C586C0' },
            { token: 'number', foreground: 'B5CEA8' },
            { token: 'string', foreground: 'CE9178' },
            { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
            { token: 'operator', foreground: 'D4D4D4' },
        ],
        colors: {
            'editor.background': '#1E1E1E',
            'editor.foreground': '#D4D4D4',
            'editor.lineHighlightBackground': '#2D2D2D',
            'editorCursor.foreground': '#FFFFFF',
            'editor.selectionBackground': '#264F78',
        },
    });
}

// Default Pine Script template
export const DEFAULT_PINE_SCRIPT = `//@version=5
indicator("My Indicator", overlay=true)

// Input parameters
length = input.int(14, "Length", minval=1, maxval=200)
source = input.source(close, "Source")

// Calculate indicator
emaValue = ta.ema(source, length)

// Plot
plot(emaValue, "EMA", color=color.blue, linewidth=2)
`;

// Template scripts
export const PINE_TEMPLATES = {
    ema_cross: {
        name: 'EMA Crossover',
        code: `//@version=5
indicator("EMA Crossover", overlay=true)

// Inputs
fastLength = input.int(9, "Fast EMA Length", minval=1)
slowLength = input.int(21, "Slow EMA Length", minval=1)

// Calculate EMAs
fastEMA = ta.ema(close, fastLength)
slowEMA = ta.ema(close, slowLength)

// Crossover signals
bullish = ta.crossover(fastEMA, slowEMA)
bearish = ta.crossunder(fastEMA, slowEMA)

// Plot
plot(fastEMA, "Fast EMA", color=color.blue, linewidth=2)
plot(slowEMA, "Slow EMA", color=color.red, linewidth=2)
plotshape(bullish, "Buy", shape.triangleup, location.belowbar, color.green, size=size.small)
plotshape(bearish, "Sell", shape.triangledown, location.abovebar, color.red, size=size.small)
`,
    },

    rsi: {
        name: 'RSI',
        code: `//@version=5
indicator("RSI", overlay=false)

// Inputs
length = input.int(14, "RSI Length", minval=1)
overbought = input.int(70, "Overbought Level", minval=50, maxval=100)
oversold = input.int(30, "Oversold Level", minval=0, maxval=50)

// Calculate RSI
rsiValue = ta.rsi(close, length)

// Plot
plot(rsiValue, "RSI", color=color.purple, linewidth=2)
hline(overbought, "Overbought", color=color.red, linestyle=hline.style_dashed)
hline(oversold, "Oversold", color=color.green, linestyle=hline.style_dashed)
hline(50, "Middle", color=color.gray, linestyle=hline.style_dotted)

// Background color for extreme zones
bgcolor(rsiValue >= overbought ? color.new(color.red, 90) : rsiValue <= oversold ? color.new(color.green, 90) : na)
`,
    },

    bollinger_bands: {
        name: 'Bollinger Bands',
        code: `//@version=5
indicator("Bollinger Bands", overlay=true)

// Inputs
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "StdDev Multiplier", minval=0.1, step=0.1)
source = input.source(close, "Source")

// Calculate Bollinger Bands
[middle, upper, lower] = ta.bb(source, length, mult)

// Plot
plot(middle, "Middle Band", color=color.blue, linewidth=1)
p1 = plot(upper, "Upper Band", color=color.red, linewidth=1)
p2 = plot(lower, "Lower Band", color=color.green, linewidth=1)
fill(p1, p2, color=color.new(color.blue, 90), title="Background")
`,
    },

    macd: {
        name: 'MACD',
        code: `//@version=5
indicator("MACD", overlay=false)

// Inputs
fastLength = input.int(12, "Fast Length", minval=1)
slowLength = input.int(26, "Slow Length", minval=1)
signalLength = input.int(9, "Signal Length", minval=1)
source = input.source(close, "Source")

// Calculate MACD
[macdLine, signalLine, histLine] = ta.macd(source, fastLength, slowLength, signalLength)

// Plot
plot(macdLine, "MACD", color=color.blue, linewidth=2)
plot(signalLine, "Signal", color=color.orange, linewidth=2)
plot(histLine, "Histogram", color=histLine >= 0 ? color.green : color.red, style=plot.style_histogram, linewidth=2)
hline(0, "Zero", color=color.gray, linestyle=hline.style_dotted)
`,
    },

    supertrend: {
        name: 'Supertrend',
        code: `//@version=5
indicator("Supertrend", overlay=true)

// Inputs
atrPeriod = input.int(10, "ATR Length", minval=1)
factor = input.float(3.0, "Factor", minval=0.1, step=0.1)

// Calculate Supertrend
[supertrend, direction] = ta.supertrend(factor, atrPeriod)

// Plot
plot(supertrend, "Supertrend", color=direction < 0 ? color.green : color.red, linewidth=2)

// Signal markers
buySignal = ta.crossover(close, supertrend)
sellSignal = ta.crossunder(close, supertrend)
plotshape(buySignal, "Buy", shape.triangleup, location.belowbar, color.green, size=size.small)
plotshape(sellSignal, "Sell", shape.triangledown, location.abovebar, color.red, size=size.small)
`,
    },
};
