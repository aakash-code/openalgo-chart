/**
 * useOrderFormState Hook
 * Consolidates order form state management for ModifyOrderModal and ExitPositionModal
 * Handles price, quantity, triggerPrice state with validation
 */

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { validateOrder, createOrderPayload } from '../utils/shared/orderUtils';

// ==================== TYPES ====================

/** Validation errors object */
export interface ValidationErrors {
  price?: string | undefined;
  quantity?: string | undefined;
  triggerPrice?: string | undefined;
  submit?: string | undefined;
  [key: string]: string | undefined;
}

/** Initial order data */
export interface InitialOrderData {
  symbol: string;
  exchange?: string | undefined;
  action: string;
  price?: string | number | undefined;
  limit_price?: string | number | undefined;
  quantity?: string | number | undefined;
  trigger_price?: string | number | undefined;
  triggerprice?: string | number | undefined;
  pricetype?: string | undefined;
  order_type?: string | undefined;
  product?: string | undefined;
  lotSize?: number | undefined;
  lot_size?: number | undefined;
  strategy?: string | undefined;
  disclosed_quantity?: number | undefined;
  orderid?: string | undefined;
  order_id?: string | undefined;
}

/** Order payload for submission */
export interface OrderPayload {
  symbol: string;
  exchange: string;
  action: string;
  quantity: string;
  product?: string | undefined;
  orderType?: string | undefined;
  price: string;
  triggerPrice: string;
  strategy?: string | undefined;
  disclosedQuantity?: number | undefined;
  orderId?: string | undefined;
}

/** Hook options */
export interface UseOrderFormStateOptions {
  initialData?: InitialOrderData | null | undefined;
  isOpen?: boolean | undefined;
  onSubmit: (payload: OrderPayload) => Promise<void>;
  onClose: () => void;
}

/** Hook return type */
export interface UseOrderFormStateReturn {
  // State
  price: string;
  quantity: string;
  triggerPrice: string;
  isSubmitting: boolean;
  errors: ValidationErrors;
  estimatedValue: number;

  // Setters
  setPrice: Dispatch<SetStateAction<string>>;
  setQuantity: Dispatch<SetStateAction<string>>;
  setTriggerPrice: Dispatch<SetStateAction<string>>;
  setErrors: Dispatch<SetStateAction<ValidationErrors>>;

  // Handlers
  handleSubmit: () => Promise<void>;
  handleClose: () => void;
  validate: () => boolean;
  clearError: (field: string) => void;
}

// ==================== HOOK ====================

/**
 * Custom hook for order form state management
 *
 * @param options - Hook options
 * @returns Form state and handlers
 */
const useOrderFormState = ({
  initialData = null,
  isOpen = false,
  onSubmit,
  onClose,
}: UseOrderFormStateOptions): UseOrderFormStateReturn => {
  // Form state
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Pre-fill with initial data when modal opens or data changes
  useEffect(() => {
    if (isOpen && initialData) {
      setPrice(String(initialData.price || initialData.limit_price || ''));
      setQuantity(String(initialData.quantity || ''));
      setTriggerPrice(String(initialData.trigger_price || initialData.triggerprice || ''));
      setErrors({});
    }
  }, [isOpen, initialData]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Validate form inputs
  const validate = useCallback((): boolean => {
    if (!initialData) {
      setErrors({ submit: 'No order data available' });
      return false;
    }

    const result = validateOrder({
      symbol: initialData.symbol,
      exchange: initialData.exchange,
      action: initialData.action,
      quantity,
      orderType: initialData.pricetype || initialData.order_type,
      price,
      triggerPrice,
      lotSize: initialData.lotSize || initialData.lot_size || 1,
    }) as { isValid: boolean; errors: ValidationErrors };

    setErrors(result.errors);
    return result.isValid;
  }, [initialData, quantity, price, triggerPrice]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (!initialData) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = createOrderPayload({
        symbol: initialData.symbol,
        exchange: initialData.exchange || 'NSE',
        action: initialData.action,
        quantity,
        product: initialData.product,
        orderType: initialData.pricetype || initialData.order_type,
        price,
        triggerPrice,
        strategy: initialData.strategy || 'MANUAL',
        disclosedQuantity: initialData.disclosed_quantity || 0,
        orderId: initialData.orderid || initialData.order_id,
      }) as any;

      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('[useOrderFormState] Submit failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit order';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }, [initialData, quantity, price, triggerPrice, validate, onSubmit, onClose]);

  // Handle close (prevent close during submission)
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Clear a specific error
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Calculate estimated value
  const estimatedValue = parseFloat(price || '0') * parseInt(quantity || '0', 10);

  return {
    // State
    price,
    quantity,
    triggerPrice,
    isSubmitting,
    errors,
    estimatedValue,

    // Setters
    setPrice,
    setQuantity,
    setTriggerPrice,
    setErrors,

    // Handlers
    handleSubmit,
    handleClose,
    validate,
    clearError,
  };
};

export default useOrderFormState;
