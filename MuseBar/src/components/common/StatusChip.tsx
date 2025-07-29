import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { BaseComponentProps } from '../../types/ui';

interface StatusConfig {
  label: string;
  color: ChipProps['color'];
  variant?: ChipProps['variant'];
}

interface StatusChipProps extends BaseComponentProps {
  status: string;
  statusConfig: Record<string, StatusConfig>;
  size?: ChipProps['size'];
  icon?: React.ReactElement;
}

const StatusChip: React.FC<StatusChipProps> = ({
  status,
  statusConfig,
  size = 'small',
  icon,
  className,
  'data-testid': testId
}) => {
  const config = statusConfig[status] || {
    label: status,
    color: 'default',
    variant: 'outlined'
  };

  return (
    <Chip
      label={config.label}
      color={config.color}
      variant={config.variant || 'filled'}
      size={size}
      icon={icon}
      className={className}
      data-testid={testId}
    />
  );
};

// Common status configurations
export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'En attente', color: 'warning' },
  completed: { label: 'Terminé', color: 'success' },
  cancelled: { label: 'Annulé', color: 'error' }
};

export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  paid: { label: 'Payé', color: 'success' },
  pending: { label: 'En attente', color: 'warning' },
  failed: { label: 'Échec', color: 'error' }
};

export const CLOSURE_STATUS_CONFIG: Record<string, StatusConfig> = {
  open: { label: 'Ouvert', color: 'info' },
  closed: { label: 'Clôturé', color: 'success' },
  locked: { label: 'Verrouillé', color: 'default' }
};

export default StatusChip; 