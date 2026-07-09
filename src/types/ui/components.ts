/**
 * UI Component Types
 * Common component prop types
 */

import type { ReactNode, CSSProperties, MouseEvent, KeyboardEvent } from 'react';

/** Base props for all components */
export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  id?: string;
  'data-testid'?: string;
}

/** Props for components with children */
export interface WithChildren {
  children?: ReactNode;
}

/** Button variant */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';

/** Button size */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Button props */
export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

/** Input props */
export interface InputProps extends BaseComponentProps {
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  type?: 'text' | 'number' | 'password' | 'email' | 'search';
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

/** Select option */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Select props */
export interface SelectProps<T = string> extends BaseComponentProps {
  value?: T;
  defaultValue?: T;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  onChange?: (value: T) => void;
}

/** Modal props */
export interface ModalProps extends BaseComponentProps, WithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

/** Dialog props */
export interface DialogProps extends ModalProps {
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmVariant?: ButtonVariant;
  loading?: boolean;
}

/** Toast type */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Toast props */
export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Tooltip placement */
export type TooltipPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'right';

/** Tooltip props */
export interface TooltipProps extends WithChildren {
  content: ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
}

/** Tab item */
export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

/** Tabs props */
export interface TabsProps extends BaseComponentProps {
  items: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
}

/** Dropdown menu item */
export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  onClick?: () => void;
  shortcut?: string;
}

/** Dropdown menu props */
export interface DropdownMenuProps extends BaseComponentProps {
  items: DropdownMenuItem[];
  trigger: ReactNode;
  placement?: TooltipPlacement;
  align?: 'start' | 'center' | 'end';
}

/** Table column definition */
export interface TableColumn<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
}

/** Table props */
export interface TableProps<T> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  rowKey: keyof T | ((row: T) => string);
  stickyHeader?: boolean;
  virtualized?: boolean;
}
