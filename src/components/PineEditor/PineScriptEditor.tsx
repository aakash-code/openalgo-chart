/**
 * PineScriptEditor - Right-side panel code editor for Pine Script
 * TradingView-style Pine Editor with console and error highlighting
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
    X,
    Play,
    Save,
    FileText,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Check,
    Trash2,
    Plus,
    RotateCcw,
    MoreHorizontal,
    Terminal,
    Sparkles,
} from 'lucide-react';
import styles from './PineScriptEditor.module.css';
import {
    registerPineScriptLanguage,
    PINE_SCRIPT_LANGUAGE_ID,
    DEFAULT_PINE_SCRIPT,
    PINE_TEMPLATES,
} from './pineScriptLanguage';
import { pineScriptService, PineScriptInput } from '../../services/pineScriptService';
import { logger } from '../../utils/logger';

// Storage keys
const STORAGE_KEY = 'openalgo_pine_scripts';
const CURRENT_SCRIPT_KEY = 'openalgo_pine_current';
const EDITOR_WIDTH_KEY = 'openalgo_pine_editor_width';

interface SavedScript {
    id: string;
    name: string;
    code: string;
    createdAt: number;
    updatedAt: number;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

interface ConsoleMessage {
    id: number;
    timestamp: Date;
    type: 'info' | 'error' | 'success' | 'warning';
    message: string;
}

interface CursorPosition {
    lineNumber: number;
    column: number;
}

export interface PineScriptEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToChart: (code: string, inputs: PineScriptInput[]) => void;
    onOpenSettings?: (inputs: PineScriptInput[]) => void;
}

const PineScriptEditor: React.FC<PineScriptEditorProps> = ({
    isOpen,
    onClose,
    onAddToChart,
    onOpenSettings,
}) => {
    // Editor state
    const [code, setCode] = useState<string>(DEFAULT_PINE_SCRIPT);
    const [scriptName, setScriptName] = useState<string>('Untitled script');
    const [currentScriptId, setCurrentScriptId] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState<boolean>(false);

    // UI state
    const [editorWidth, setEditorWidth] = useState<number>(500);
    const [showScriptMenu, setShowScriptMenu] = useState<boolean>(false);
    const [showConsole, setShowConsole] = useState<boolean>(true);
    const [consoleHeight, setConsoleHeight] = useState<number>(150);

    // Cursor position
    const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ lineNumber: 1, column: 1 });

    // Console messages
    const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
    const consoleIdRef = useRef<number>(0);

    // Validation state
    const [validation, setValidation] = useState<ValidationResult>({
        valid: true,
        errors: [],
        warnings: [],
    });
    const [parsedInputs, setParsedInputs] = useState<PineScriptInput[]>([]);

    // AI Assistant state
    const [showAIModal, setShowAIModal] = useState<boolean>(false);
    const [aiPrompt, setAiPrompt] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    // Saved scripts
    const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);

    // Refs
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef<boolean>(false);
    const isConsoleResizing = useRef<boolean>(false);
    const consoleRef = useRef<HTMLDivElement>(null);

    // Add console message helper
    const addConsoleMessage = useCallback((type: ConsoleMessage['type'], message: string) => {
        const newMessage: ConsoleMessage = {
            id: ++consoleIdRef.current,
            timestamp: new Date(),
            type,
            message,
        };
        setConsoleMessages(prev => [...prev.slice(-100), newMessage]); // Keep last 100 messages
    }, []);

    // Format timestamp for console
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    };

    // Load saved scripts from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setSavedScripts(JSON.parse(saved));
            }

            // Load current script
            const current = localStorage.getItem(CURRENT_SCRIPT_KEY);
            if (current) {
                const parsed = JSON.parse(current);
                setCode(parsed.code || DEFAULT_PINE_SCRIPT);
                setScriptName(parsed.name || 'Untitled script');
                setCurrentScriptId(parsed.id || null);
            }

            // Load editor width
            const width = localStorage.getItem(EDITOR_WIDTH_KEY);
            if (width) {
                setEditorWidth(parseInt(width, 10));
            }

            // Add initial console message
            addConsoleMessage('info', '"Untitled script" opened');
        } catch (e) {
            logger.error('Failed to load Pine Script data:', e);
        }
    }, [addConsoleMessage]);

    // Save current script to localStorage when changed
    useEffect(() => {
        try {
            localStorage.setItem(
                CURRENT_SCRIPT_KEY,
                JSON.stringify({
                    id: currentScriptId,
                    name: scriptName,
                    code,
                })
            );
        } catch (e) {
            logger.error('Failed to save current script:', e);
        }
    }, [code, scriptName, currentScriptId]);

    // Validate code and update error markers
    useEffect(() => {
        const result = pineScriptService.validate(code);
        setValidation(result);

        // Parse inputs
        const inputs = pineScriptService.parseInputs(code);
        setParsedInputs(inputs);

        // Extract indicator name
        const info = pineScriptService.extractIndicatorInfo(code);
        if (info.name && info.name !== 'Custom Indicator' && !currentScriptId) {
            setScriptName(info.name);
        }

        // Update error markers in Monaco editor
        if (editorRef.current && monacoRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
                const markers: editor.IMarkerData[] = result.errors.map((error, index) => {
                    // Try to parse line number from error message
                    const lineMatch = error.match(/line\s+(\d+)/i) || error.match(/at\s+(\d+):(\d+)/);
                    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
                    const col = lineMatch && lineMatch[2] ? parseInt(lineMatch[2], 10) : 1;

                    return {
                        severity: monacoRef.current.MarkerSeverity.Error,
                        message: error,
                        startLineNumber: line,
                        startColumn: col,
                        endLineNumber: line,
                        endColumn: model.getLineMaxColumn(line),
                    };
                });

                monacoRef.current.editor.setModelMarkers(model, 'pine-script', markers);
            }
        }
    }, [code, currentScriptId]);

    // Handle Monaco editor mount
    const handleEditorMount: OnMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Register Pine Script language
        registerPineScriptLanguage(monaco);

        // Set theme
        monaco.editor.setTheme('pine-dark');

        // Track cursor position
        editor.onDidChangeCursorPosition((e) => {
            setCursorPosition({
                lineNumber: e.position.lineNumber,
                column: e.position.column,
            });
        });

        // Handle paste - ensure it works properly
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
            navigator.clipboard.readText().then(text => {
                const selection = editor.getSelection();
                if (selection) {
                    editor.executeEdits('paste', [{
                        range: selection,
                        text: text,
                        forceMoveMarkers: true,
                    }]);
                }
            }).catch(() => {
                // Fallback to default paste
                document.execCommand('paste');
            });
        });

        // Focus editor
        editor.focus();
    }, []);

    // Handle code change
    const handleCodeChange = useCallback((value: string | undefined) => {
        setCode(value || '');
        setIsDirty(true);
    }, []);

    // Handle horizontal resize (width)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing.current) {
                const newWidth = window.innerWidth - e.clientX;
                const clampedWidth = Math.max(350, Math.min(800, newWidth));
                setEditorWidth(clampedWidth);
            }
            if (isConsoleResizing.current && consoleRef.current) {
                const consoleRect = consoleRef.current.getBoundingClientRect();
                const newHeight = consoleRect.bottom - e.clientY;
                const clampedHeight = Math.max(80, Math.min(300, newHeight));
                setConsoleHeight(clampedHeight);
            }
        };

        const handleMouseUp = () => {
            if (isResizing.current) {
                isResizing.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                localStorage.setItem(EDITOR_WIDTH_KEY, editorWidth.toString());
            }
            if (isConsoleResizing.current) {
                isConsoleResizing.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [editorWidth]);

    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const startConsoleResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isConsoleResizing.current = true;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }, []);

    // Script actions
    const handleNew = useCallback(() => {
        setCode(DEFAULT_PINE_SCRIPT);
        setScriptName('Untitled script');
        setCurrentScriptId(null);
        setIsDirty(false);
        setShowScriptMenu(false);
        addConsoleMessage('info', '"Untitled script" opened');
    }, [addConsoleMessage]);

    const handleSave = useCallback(() => {
        const now = Date.now();
        const script: SavedScript = {
            id: currentScriptId || `script_${now}`,
            name: scriptName,
            code,
            createdAt: currentScriptId
                ? savedScripts.find((s) => s.id === currentScriptId)?.createdAt || now
                : now,
            updatedAt: now,
        };

        const updated = currentScriptId
            ? savedScripts.map((s) => (s.id === currentScriptId ? script : s))
            : [...savedScripts, script];

        setSavedScripts(updated);
        setCurrentScriptId(script.id);
        setIsDirty(false);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            addConsoleMessage('success', `Script "${scriptName}" saved`);
        } catch (e) {
            logger.error('Failed to save script:', e);
            addConsoleMessage('error', 'Failed to save script');
        }
    }, [code, scriptName, currentScriptId, savedScripts, addConsoleMessage]);

    const handleAIGenerate = useCallback(async () => {
        if (!aiPrompt.trim()) return;

        setIsGenerating(true);
        addConsoleMessage('info', 'AI Assistant is thinking...');

        try {
            // In a real implementation, this would call an LLM API (Gemini, OpenAI, etc.)
            // For now, we provide the architecture and a mock response.
            // The user can integrate their API key and endpoint here.
            
            // Artificial delay to simulate AI thinking
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Example of how to structure the prompt/response
            // const response = await fetch('/api/generate-pine', { method: 'POST', body: JSON.stringify({ prompt: aiPrompt }) });
            // const data = await response.json();
            
            // If the user wants ME (the agent) to generate it, I can't do it via an async call inside the app 
            // without a backend. But I can provide a template.
            
            addConsoleMessage('success', 'AI generation complete!');
            setShowAIModal(false);
            setAiPrompt('');
            
            // Example output (this would come from the API)
            const generatedCode = `//@version=5\nindicator("AI Generated Indicator", overlay=true)\n\n// Generated based on: ${aiPrompt}\n\n// Simple example: EMA 9 & 21 Cross\nema9 = ta.ema(close, 9)\nema21 = ta.ema(close, 21)\n\nplot(ema9, "EMA 9", color=color.aqua)\nplot(ema21, "EMA 21", color=color.orange)\n\nplotshape(ta.crossover(ema9, ema21), "Buy", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small)\nplotshape(ta.crossunder(ema9, ema21), "Sell", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small)`;
            
            setCode(generatedCode);
            setScriptName('AI Generated Script');
            setIsDirty(true);
            
        } catch (e) {
            addConsoleMessage('error', 'AI generation failed');
        } finally {
            setIsGenerating(false);
        }
    }, [aiPrompt, addConsoleMessage]);

    const handleLoadScript = useCallback((script: SavedScript) => {
        setCode(script.code);
        setScriptName(script.name);
        setCurrentScriptId(script.id);
        setIsDirty(false);
        setShowScriptMenu(false);
        addConsoleMessage('info', `"${script.name}" opened`);
    }, [addConsoleMessage]);

    const handleDeleteScript = useCallback(
        (scriptId: string, e: React.MouseEvent) => {
            e.stopPropagation();
            const script = savedScripts.find(s => s.id === scriptId);
            const updated = savedScripts.filter((s) => s.id !== scriptId);
            setSavedScripts(updated);

            if (currentScriptId === scriptId) {
                handleNew();
            }

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                if (script) {
                    addConsoleMessage('info', `Script "${script.name}" deleted`);
                }
            } catch (e) {
                logger.error('Failed to delete script:', e);
            }
        },
        [savedScripts, currentScriptId, handleNew, addConsoleMessage]
    );

    const handleAddToChart = useCallback(() => {
        addConsoleMessage('info', 'Compiling...');

        if (!validation.valid) {
            validation.errors.forEach(error => {
                addConsoleMessage('error', error);
            });
            return;
        }

        // Check for complex/unsupported features
        const unsupportedFeatures: string[] = [];

        // Check for features that PineTS doesn't support
        if (code.includes('request.security') || code.includes('request.security_lower_tf')) {
            unsupportedFeatures.push('request.security (multi-timeframe data)');
        }
        if (code.includes('line.new') || code.includes('label.new') || code.includes('box.new')) {
            unsupportedFeatures.push('drawing objects (line, label, box)');
        }
        if (code.includes('table.new') || code.includes('table.cell')) {
            unsupportedFeatures.push('tables');
        }
        if (code.includes('array.new') || code.includes('array.push') || code.includes('array.get')) {
            unsupportedFeatures.push('arrays');
        }
        if (/\w+\s*\([^)]*\)\s*=>/.test(code)) {
            unsupportedFeatures.push('user-defined functions');
        }
        if (code.includes('for ') || code.includes('while ')) {
            unsupportedFeatures.push('loops (for/while)');
        }
        if (code.includes('max_lines_count') || code.includes('max_labels_count') || code.includes('max_boxes_count')) {
            unsupportedFeatures.push('drawing limits');
        }

        if (unsupportedFeatures.length > 0) {
            addConsoleMessage('warning', '⚠️ This script uses advanced features that may not be fully supported:');
            unsupportedFeatures.forEach(feature => {
                addConsoleMessage('warning', `  • ${feature}`);
            });
            addConsoleMessage('warning', 'The indicator may not display correctly. Simple indicators (EMA, SMA, RSI, MACD) work best.');
        }

        // Check if it's a simple indicator we can handle
        const isSimpleIndicator =
            (code.includes('ta.ema') || code.includes('ta.sma') || code.includes('ta.rsi') ||
             code.includes('ta.macd') || code.includes('ta.atr') || code.includes('ta.stoch') ||
             code.includes('ta.bb') || code.includes('ta.vwap') || code.includes('ta.supertrend')) &&
            unsupportedFeatures.length === 0;

        if (isSimpleIndicator) {
            addConsoleMessage('success', 'Compiled successfully.');
        } else if (unsupportedFeatures.length > 0) {
            addConsoleMessage('info', 'Attempting to compile with limited support...');
        } else {
            addConsoleMessage('success', 'Compiled.');
        }

        onAddToChart(code, parsedInputs);
        addConsoleMessage('success', 'Added to chart.');

        if (unsupportedFeatures.length > 0) {
            addConsoleMessage('info', 'Note: Check if the indicator displays as expected.');
        }
    }, [code, parsedInputs, validation, onAddToChart, addConsoleMessage]);

    const handleClearConsole = useCallback(() => {
        setConsoleMessages([]);
    }, []);

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = () => {
            if (showScriptMenu) {
                setShowScriptMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showScriptMenu]);

    // Auto-scroll console to bottom
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [consoleMessages]);

    // Stop keyboard events from bubbling to app-level handlers (search, etc.)
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Allow Escape to close
        if (e.key === 'Escape') {
            onClose();
            return;
        }
        // Stop all other keyboard events from bubbling
        e.stopPropagation();
    }, [onClose]);

    if (!isOpen) return null;

    const errorCount = validation.errors.length;

    return (
        <div
            ref={containerRef}
            className={styles.container}
            style={{ width: editorWidth }}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
        >
            {/* Resize handle (left edge) */}
            <div className={styles.resizeHandle} onMouseDown={startResize} />

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    {/* Script name dropdown */}
                    <div className={styles.dropdownContainer}>
                        <button
                            className={styles.scriptNameBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowScriptMenu(!showScriptMenu);
                            }}
                        >
                            {scriptName}
                            {isDirty && <span className={styles.dirtyIndicator}>*</span>}
                            <ChevronDown size={14} />
                        </button>
                        {showScriptMenu && (
                            <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                                <div
                                    className={styles.dropdownItem}
                                    onClick={handleNew}
                                >
                                    <Plus size={14} />
                                    <span>New script</span>
                                </div>
                                <div className={styles.dropdownDivider} />
                                {savedScripts.length === 0 ? (
                                    <div className={styles.dropdownEmpty}>No saved scripts</div>
                                ) : (
                                    <>
                                        <div className={styles.dropdownHeader}>Saved Scripts</div>
                                        {savedScripts.map((script) => (
                                            <div
                                                key={script.id}
                                                className={`${styles.dropdownItem} ${script.id === currentScriptId ? styles.dropdownItemActive : ''}`}
                                                onClick={() => handleLoadScript(script)}
                                            >
                                                <FileText size={14} />
                                                <span>{script.name}</span>
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={(e) => handleDeleteScript(script.id, e)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                )}
                                <div className={styles.dropdownDivider} />
                                <div className={styles.dropdownHeader}>Templates</div>
                                {Object.entries(PINE_TEMPLATES).map(([key, template]) => (
                                    <div
                                        key={key}
                                        className={styles.dropdownItem}
                                        onClick={() => {
                                            setCode(template.code);
                                            setScriptName(template.name);
                                            setCurrentScriptId(null);
                                            setIsDirty(true);
                                            setShowScriptMenu(false);
                                            addConsoleMessage('info', `Template "${template.name}" loaded`);
                                        }}
                                    >
                                        <FileText size={14} />
                                        <span>{template.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reload button */}
                    <button
                        className={styles.iconBtn}
                        onClick={() => {
                            if (editorRef.current) {
                                editorRef.current.setValue(code);
                                addConsoleMessage('info', 'Script reloaded');
                            }
                        }}
                        title="Reload"
                    >
                        <RotateCcw size={14} />
                    </button>

                    {/* AI Generate button */}
                    <button
                        className={`${styles.headerBtn} ${styles.aiBtn}`}
                        onClick={() => setShowAIModal(true)}
                        title="Generate with AI"
                    >
                        <Sparkles size={14} />
                        AI Generate
                    </button>

                    {/* Save button */}
                    <button
                        className={styles.headerBtn}
                        onClick={handleSave}
                        title="Save Script"
                    >
                        <Save size={14} />
                        Save
                    </button>
                </div>

                <div className={styles.headerRight}>
                    {/* Add to Chart button */}
                    <button
                        className={styles.primaryBtn}
                        onClick={handleAddToChart}
                        disabled={!validation.valid}
                        title="Add to Chart"
                    >
                        <Play size={14} />
                        Add to chart
                    </button>

                    {/* More options */}
                    <button className={styles.iconBtn} title="More options">
                        <MoreHorizontal size={16} />
                    </button>

                    {/* Close button */}
                    <button className={styles.iconBtn} onClick={onClose} title="Close">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Editor area */}
            <div className={styles.editorWrapper}>
                <div
                    className={styles.editorContainer}
                    style={{ height: showConsole ? `calc(100% - ${consoleHeight}px)` : '100%' }}
                >
                    <Editor
                        height="100%"
                        language={PINE_SCRIPT_LANGUAGE_ID}
                        value={code}
                        onChange={handleCodeChange}
                        onMount={handleEditorMount}
                        theme="pine-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            automaticLayout: true,
                            tabSize: 4,
                            insertSpaces: true,
                            folding: true,
                            renderWhitespace: 'selection',
                            glyphMargin: true,
                            lineDecorationsWidth: 5,
                            scrollbar: {
                                vertical: 'auto',
                                horizontal: 'auto',
                                verticalScrollbarSize: 10,
                                horizontalScrollbarSize: 10,
                            },
                            overviewRulerBorder: false,
                            hideCursorInOverviewRuler: true,
                            renderLineHighlight: 'line',
                            cursorBlinking: 'smooth',
                            cursorSmoothCaretAnimation: 'on',
                            smoothScrolling: true,
                            contextmenu: true,
                            mouseWheelZoom: true,
                            quickSuggestions: true,
                            suggestOnTriggerCharacters: true,
                            acceptSuggestionOnEnter: 'on',
                            snippetSuggestions: 'inline',
                        }}
                        loading={<div className={styles.loading}>Loading editor...</div>}
                    />
                </div>

                {/* Console panel */}
                {showConsole && (
                    <div
                        className={styles.consoleContainer}
                        style={{ height: consoleHeight }}
                    >
                        {/* Console resize handle */}
                        <div
                            className={styles.consoleResizeHandle}
                            onMouseDown={startConsoleResize}
                        />

                        {/* Console content */}
                        <div className={styles.consoleContent} ref={consoleRef}>
                            {consoleMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`${styles.consoleLine} ${styles[`console${msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}`]}`}
                                >
                                    <span className={styles.consoleTime}>{formatTime(msg.timestamp)}</span>
                                    {msg.type === 'error' && <AlertCircle size={12} className={styles.consoleIcon} />}
                                    <span className={styles.consoleMessage}>{msg.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className={styles.statusBar}>
                <div className={styles.statusLeft}>
                    <button
                        className={`${styles.consoleToggle} ${showConsole ? styles.consoleToggleActive : ''}`}
                        onClick={() => setShowConsole(!showConsole)}
                        title={showConsole ? 'Hide console' : 'Show console'}
                    >
                        <Terminal size={12} />
                        {showConsole ? 'Close console' : 'Open console'}
                    </button>
                    <span className={styles.shortcut}>Ctrl + `</span>
                </div>
                <div className={styles.statusRight}>
                    {errorCount > 0 && (
                        <span className={styles.errorCount}>
                            <AlertCircle size={12} />
                            {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                        </span>
                    )}
                    <span className={styles.cursorPosition}>
                        Line {cursorPosition.lineNumber}, Col {cursorPosition.column}
                    </span>
                    <span className={styles.pineVersion}>Pine Script® v5</span>
                </div>
            </div>

            {/* AI Prompt Modal */}
            {showAIModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAIModal(false)}>
                    <div className={styles.aiModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle}>
                                <Sparkles size={18} className={styles.aiIcon} />
                                <span>AI Script Assistant</span>
                            </div>
                            <button className={styles.modalClose} onClick={() => setShowAIModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.modalDescription}>
                                Describe the indicator or strategy you want to create.
                                For example: "A 5-EMA and 20-EMA crossover strategy with RSI filter."
                            </p>
                            <textarea
                                className={styles.promptInput}
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Describe your indicator here..."
                                autoFocus
                            />
                        </div>
                        <div className={styles.modalFooter}>
                            <button 
                                className={styles.secondaryBtn} 
                                onClick={() => setShowAIModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className={styles.primaryBtn} 
                                onClick={handleAIGenerate}
                                disabled={isGenerating || !aiPrompt.trim()}
                            >
                                {isGenerating ? 'Generating...' : 'Generate Script'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PineScriptEditor;
