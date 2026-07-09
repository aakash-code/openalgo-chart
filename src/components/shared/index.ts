/**
 * Shared Components Library
 *
 * Centralized reusable component exports for consistency across the app.
 *
 * Usage:
 * import { BaseModal, BaseDialog, ConfirmDialog } from '../shared';
 */

// Basic UI
// Basic UI
export * from './Text/Text';

// Modal Components
export { BaseModal } from './Modal';
export type { BaseModalProps } from './Modal';

// Dialog Components
export { BaseDialog, ConfirmDialog, AlertDialog, DangerDialog } from './Dialog';
export type { BaseDialogProps, AlertDialogProps } from './Dialog';

// Context Menu Components
export { BaseContextMenu, MenuItem, MenuDivider, MenuGroup } from './ContextMenu';
export type { BaseContextMenuProps, MenuItemProps, MenuGroupProps, MenuPosition } from './ContextMenu';

// Dropdown Components
export { BaseDropdown, DropdownItem, DropdownDivider, DropdownWithTrigger } from './Dropdown';
export type { BaseDropdownProps, DropdownItemProps, DropdownPosition, DropdownWithTriggerProps } from './Dropdown';

// Button Components
export { BaseButton, IconButton, ButtonGroup, Button } from './Button';
export type { BaseButtonProps, IconButtonProps, ButtonGroupProps, ButtonProps } from './Button';

// Table Components
export { BaseTable } from './Table';
export type { BaseTableProps, ColumnDefinition, SortConfig } from './Table';
