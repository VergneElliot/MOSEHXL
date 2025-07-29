// UI and component related types

export interface TabConfig {
  label: string;
  icon?: React.ReactElement;
  value: string;
  permission?: string;
  adminOnly?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface FormState<T = any> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
  onClose?: () => void;
  onConfirm?: () => void;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  autoHideDuration?: number;
}

export interface ThemeMode {
  mode: 'light' | 'dark';
  toggleMode: () => void;
}

// Common component props
export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
}

export interface WithChildren {
  children: React.ReactNode;
}

export interface WithLoading {
  loading?: boolean;
}

export interface WithError {
  error?: string | null;
}

// Table/Grid related types
export interface TableColumn<T = any> {
  id: keyof T;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  sortable?: boolean;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
}

// Form field types
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
export type FieldVariant = 'outlined' | 'filled' | 'standard';
