import React, { useState } from 'react';
import { X, Minimize2, Maximize2, Edit2 } from 'lucide-react';
import { validateRiskParamsDetailed, autoDetectSide } from '../../utils/indicators/riskCalculator';
import TemplateSelector from './TemplateSelector';
import styles from './RiskCalculatorPanel.module.css';

/**
 * Floating panel that displays risk calculator results and allows editing parameters
 *
 * @param {Object} props
 * @param {Object} props.results - Calculation results from useRiskCalculator
 * @param {Object} props.params - Current parameters
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onUpdateSettings - Callback to update indicator settings
 * @param {number} props.ltp - Current last traded price
 * @param {boolean} props.draggable - Whether panel is draggable
 * @returns {JSX.Element}
 */
export default function RiskCalculatorPanel({
  results,
  params,
  onClose,
  onUpdateSettings,
  ltp = 0,
  draggable = false
}) {
  // Edit mode: show when there's an error or initially
  const [editMode, setEditMode] = useState(!results || results.error);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Local state for form inputs
  const [formValues, setFormValues] = useState({
    capital: params?.capital || 100000,
    riskPercent: params?.riskPercent || 2,
    side: params?.side || 'BUY',
    entryPrice: params?.entryPrice || 0,
    stopLossPrice: params?.stopLossPrice || 0,
    targetPrice: params?.targetPrice || 0,
    riskRewardRatio: params?.riskRewardRatio || 2,
  });

  // Validation state
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});

  // Handle drag start
  const handleMouseDown = (e) => {
    if (!draggable) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Handle drag move
  const handleMouseMove = (e) => {
    if (!isDragging || !draggable) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Update edit mode when results change
  React.useEffect(() => {
    if (results && !results.error) {
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  }, [results]);

  // Validation helper function
  const validateField = (key, value) => {
    // Construct params with current form values
    const params = {
      ...formValues,
      [key]: value
    };

    const validation = validateRiskParamsDetailed(params);

    // Update errors for this field
    setFieldErrors(prev => {
      const updated = { ...prev };

      // Clear previous errors/suggestions for this field
      delete updated[key];
      delete updated[`${key}Suggestion`];
      delete updated[`${key}Level`];

      // Add new errors if any
      if (validation.errors[key]) {
        updated[key] = validation.errors[key];
        if (validation.errors[`${key}Suggestion`]) {
          updated[`${key}Suggestion`] = validation.errors[`${key}Suggestion`];
        }
        if (validation.errors[`${key}Level`]) {
          updated[`${key}Level`] = validation.errors[`${key}Level`];
        }
      }

      return updated;
    });

    return validation.isValid;
  };

  // Handle input blur (field was touched)
  const handleBlur = (key) => {
    setFieldTouched(prev => ({ ...prev, [key]: true }));
    validateField(key, formValues[key]);
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormValues(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-detect side when entry or stop loss changes
      if ((field === 'entryPrice' || field === 'stopLossPrice') &&
          updated.entryPrice > 0 && updated.stopLossPrice > 0) {

        const autoSide = autoDetectSide(updated.entryPrice, updated.stopLossPrice);
        if (autoSide) {
          updated.side = autoSide;
        }
      }

      return updated;
    });

    // Only validate if field was touched before
    if (fieldTouched[field]) {
      validateField(field, value);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    const validation = validateRiskParamsDetailed({
      ...formValues
    });
    return validation.isValid;
  };

  // Handle Use LTP button
  const handleUseLTP = () => {
    if (ltp > 0) {
      handleInputChange('entryPrice', ltp);
    }
  };

  // Handle Calculate button
  const handleCalculate = () => {
    if (onUpdateSettings) {
      const updates = {
        capital: Number(formValues.capital),
        riskPercent: Number(formValues.riskPercent),
        side: formValues.side,
        entryPrice: Number(formValues.entryPrice),
        stopLossPrice: Number(formValues.stopLossPrice),
        showTarget: true
      };

      // Include targetPrice if provided, otherwise use riskRewardRatio
      if (formValues.targetPrice && Number(formValues.targetPrice) > 0) {
        updates.targetPrice = Number(formValues.targetPrice);
      } else {
        updates.riskRewardRatio = Number(formValues.riskRewardRatio);
      }

      onUpdateSettings(updates);
    }
  };

  // Handle Edit button (switch back to edit mode)
  const handleEdit = () => {
    setEditMode(true);
  };

  // Helper function to render input with validation
  const renderValidatedInput = (key, label, type = 'number', options = {}) => {
    const hasError = fieldErrors[key] && fieldTouched[key] && fieldErrors[`${key}Level`] !== 'warning';
    const hasWarning = fieldErrors[key] && fieldTouched[key] && fieldErrors[`${key}Level`] === 'warning';
    const isValid = !hasError && !hasWarning && fieldTouched[key] && formValues[key] !== '' && formValues[key] !== 0;
    const suggestion = fieldErrors[`${key}Suggestion`];

    let inputClass = '';
    if (hasError) inputClass = styles.inputError;
    else if (hasWarning) inputClass = styles.inputWarning;
    else if (isValid) inputClass = styles.inputValid;

    return (
      <div className={styles.inputGroup}>
        <label>{label}</label>
        <div className={styles.inputWrapper}>
          <input
            type={type}
            value={formValues[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            onBlur={() => handleBlur(key)}
            className={inputClass}
            {...options}
          />
          {isValid && <span className={styles.validCheck}>✓</span>}
        </div>
        {hasError && (
          <div className={styles.fieldError}>
            <span>{fieldErrors[key]}</span>
            {suggestion && (
              <button
                className={styles.suggestionButton}
                onClick={() => {
                  handleInputChange(key, parseFloat(suggestion));
                  handleBlur(key);
                }}
              >
                Try ₹{suggestion}
              </button>
            )}
          </div>
        )}
        {hasWarning && (
          <div className={styles.fieldWarning}>
            <span>{fieldErrors[key]}</span>
          </div>
        )}
      </div>
    );
  };

  // Helper function to render select with validation
  const renderValidatedSelect = (key, label, options) => {
    const hasError = fieldErrors[key] && fieldTouched[key];
    const isValid = !hasError && fieldTouched[key] && formValues[key];

    let selectClass = '';
    if (hasError) selectClass = styles.inputError;
    else if (isValid) selectClass = styles.inputValid;

    return (
      <div className={styles.inputGroup}>
        <label>{label}</label>
        <select
          value={formValues[key]}
          onChange={(e) => handleInputChange(key, e.target.value)}
          onBlur={() => handleBlur(key)}
          className={selectClass}
        >
          {options}
        </select>
        {hasError && (
          <div className={styles.fieldError}>
            {fieldErrors[key]}
          </div>
        )}
      </div>
    );
  };

  // Edit mode - show input fields
  if (editMode) {
    return (
      <div
        className={styles.panel}
        style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, position: 'fixed' } : {}}
      >
        <div className={styles.header} onMouseDown={handleMouseDown}>
          <span>Risk Calculator</span>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={16} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Show error message if any */}
          {results?.error && (
            <div className={styles.errorMessage}>
              {results.error}
            </div>
          )}

          {/* Template Selector */}
          <TemplateSelector
            currentValues={{
              capital: formValues.capital,
              riskPercent: formValues.riskPercent
            }}
            onTemplateSelect={(values) => {
              setFormValues(prev => ({
                ...prev,
                capital: values.capital,
                riskPercent: values.riskPercent
              }));
              // Validate the new values if fields were previously touched
              if (fieldTouched.capital) {
                validateField('capital', values.capital);
              }
              if (fieldTouched.riskPercent) {
                validateField('riskPercent', values.riskPercent);
              }
            }}
          />

          {/* Capital Input */}
          {renderValidatedInput('capital', 'Capital (₹)', 'number', { min: '1000', step: '1000' })}

          {/* Risk Percent Input */}
          {renderValidatedInput('riskPercent', 'Risk %', 'number', { min: '0.1', max: '100', step: '0.1' })}

          {/* Side Select */}
          {renderValidatedSelect('side', 'Side', (
            <>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </>
          ))}

          {/* Entry Price Input */}
          <div className={styles.inputGroup}>
            <label>Entry Price</label>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                value={formValues.entryPrice || ''}
                onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                onBlur={() => handleBlur('entryPrice')}
                className={
                  fieldErrors.entryPrice && fieldTouched.entryPrice
                    ? styles.inputError
                    : !fieldErrors.entryPrice && fieldTouched.entryPrice && formValues.entryPrice > 0
                    ? styles.inputValid
                    : ''
                }
                min="0"
                step="0.01"
              />
              {!fieldErrors.entryPrice && fieldTouched.entryPrice && formValues.entryPrice > 0 && (
                <span className={styles.validCheck}>✓</span>
              )}
            </div>
            {ltp > 0 && (
              <button onClick={handleUseLTP} className={styles.useLtp}>
                Use LTP (₹{ltp.toFixed(2)})
              </button>
            )}
            {fieldErrors.entryPrice && fieldTouched.entryPrice && (
              <div className={styles.fieldError}>
                <span>{fieldErrors.entryPrice}</span>
              </div>
            )}
          </div>

          {/* Stop Loss Input */}
          {renderValidatedInput('stopLossPrice', 'Stop Loss', 'number', { min: '0', step: '0.01' })}

          {/* Target Price Input */}
          {renderValidatedInput('targetPrice', 'Target Price (optional)', 'number', { min: '0', step: '0.01', placeholder: 'Leave empty for auto-calc' })}

          {/* Risk:Reward Ratio Select - only if no target price */}
          {(!formValues.targetPrice || Number(formValues.targetPrice) <= 0) && renderValidatedSelect('riskRewardRatio', 'Risk : Reward', (
            <>
              <option value="1">1:1</option>
              <option value="1.5">1:1.5</option>
              <option value="2">1:2</option>
              <option value="2.5">1:2.5</option>
              <option value="3">1:3</option>
              <option value="4">1:4</option>
              <option value="5">1:5</option>
            </>
          ))}

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className={styles.calculateButton}
            disabled={!isFormValid()}
          >
            Calculate
          </button>
        </div>
      </div>
    );
  }

  // Minimized state
  if (minimized) {
    return (
      <div
        className={styles.panelMinimized}
        style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, position: 'fixed' } : {}}
        onMouseDown={handleMouseDown}
      >
        <span>Qty: {results.formatted.quantity}</span>
        <button onClick={() => setMinimized(false)} className={styles.iconButton}>
          <Maximize2 size={14} />
        </button>
      </div>
    );
  }

  // Full panel display
  return (
    <div
      className={styles.panel}
      style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, position: 'fixed' } : {}}
    >
      <div className={styles.header} onMouseDown={handleMouseDown}>
        <span>Risk Calculator</span>
        <div className={styles.headerButtons}>
          <button onClick={handleEdit} className={styles.iconButton} title="Edit">
            <Edit2 size={16} />
          </button>
          <button onClick={() => setMinimized(true)} className={styles.iconButton}>
            <Minimize2 size={16} />
          </button>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Capital & Risk Section */}
        <div className={styles.section}>
          <div className={styles.row}>
            <span className={styles.label}>Capital:</span>
            <span className={styles.value}>{results.formatted.capital}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Risk %:</span>
            <span className={styles.value}>{results.formatted.riskPercent}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Risk Amount:</span>
            <span className={`${styles.value} ${styles.risk}`}>{results.formatted.riskAmount}</span>
          </div>
        </div>

        {/* Entry & Stop Loss Section */}
        <div className={styles.section}>
          <div className={styles.row}>
            <span className={styles.label}>Entry:</span>
            <span className={`${styles.value} ${styles.entry}`}>{results.formatted.entryPrice}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Stop Loss:</span>
            <span className={`${styles.value} ${styles.stopLoss}`}>{results.formatted.stopLossPrice}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>SL Points:</span>
            <span className={styles.value}>{results.formatted.slPoints}</span>
          </div>
        </div>

        {/* Position Section */}
        <div className={styles.section}>
          <div className={styles.row}>
            <span className={styles.label}>✓ Quantity:</span>
            <span className={`${styles.value} ${styles.quantity}`}>{results.formatted.quantity} shares</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Position Value:</span>
            <span className={styles.value}>{results.formatted.positionValue}</span>
          </div>
        </div>

        {/* Target & Reward Section */}
        {params.showTarget && (
          <div className={styles.section}>
            <div className={styles.row}>
              <span className={styles.label}>Target:</span>
              <span className={`${styles.value} ${styles.target}`}>{results.formatted.targetPrice}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Reward Points:</span>
              <span className={styles.value}>{results.formatted.rewardPoints}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Reward Amount:</span>
              <span className={`${styles.value} ${styles.reward}`}>{results.formatted.rewardAmount}</span>
            </div>
          </div>
        )}

        {/* Risk:Reward Ratio */}
        <div className={styles.section}>
          <div className={styles.row}>
            <span className={styles.label}>Risk : Reward</span>
            <span className={`${styles.value} ${styles.rrRatio}`}>{results.formatted.rrRatio}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
