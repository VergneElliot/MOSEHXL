import React from 'react';
import { Box, Button } from '@mui/material';

export interface UserRowActionsProps {
  isActive: boolean;
  hasPin: boolean;
  onPermissions: () => void;
  onSetPin: () => void;
  onClearPin: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onPurge: () => void;
}

/**
 * Row actions for one member. A deactivated member keeps only the two actions that can apply to
 * them: bring back, or delete outright when they never recorded anything.
 */
const UserRowActions: React.FC<UserRowActionsProps> = ({
  isActive,
  hasPin,
  onPermissions,
  onSetPin,
  onClearPin,
  onDeactivate,
  onReactivate,
  onPurge,
}) => {
  if (!isActive) {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onReactivate} variant="outlined" size="small">
          Réactiver
        </Button>
        <Button onClick={onPurge} variant="outlined" color="error" size="small">
          Supprimer définitivement
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Button onClick={onPermissions} variant="outlined" size="small">
        Permissions
      </Button>
      <Button onClick={onSetPin} variant="outlined" size="small">
        {hasPin ? 'Changer PIN' : 'Définir PIN'}
      </Button>
      {hasPin && (
        <Button onClick={onClearPin} variant="outlined" color="warning" size="small">
          Effacer PIN
        </Button>
      )}
      <Button onClick={onDeactivate} variant="outlined" color="error" size="small">
        Désactiver
      </Button>
    </Box>
  );
};

export default UserRowActions;
