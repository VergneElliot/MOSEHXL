import React, { useCallback, useState } from 'react';
import { Chip, CircularProgress, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '@mosehxl/types';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import { HappyHourService } from '../../services/happyHourService';

interface HappyHourHeaderChipProps {
  isHappyHourActive: boolean;
  timeUntilHappyHour: string;
  onStatusUpdate: () => void;
}

export const HappyHourHeaderChip: React.FC<HappyHourHeaderChipProps> = ({
  isHappyHourActive,
  timeUntilHappyHour,
  onStatusUpdate,
}) => {
  const { t } = useTranslation('common');
  const { ensurePermission } = useStepUpAuth();
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ensurePermission(PERMISSIONS.pos_happyhour_manual, {
        title: isHappyHourActive ? 'Désactiver Happy Hour' : 'Activer Happy Hour',
        description:
          'PIN d’un profil autorisé au Happy Hour manuel pour activer ou désactiver la session globale.',
      });
      HappyHourService.getInstance().toggleManualActivation();
      onStatusUpdate();
    } catch {
      /* cancelled or denied */
    } finally {
      setBusy(false);
    }
  }, [busy, ensurePermission, isHappyHourActive, onStatusUpdate]);

  const label = isHappyHourActive
    ? t('happyHour.active')
    : t('happyHour.in', { time: timeUntilHappyHour });

  return (
    <Tooltip
      title={
        busy
          ? '…'
          : isHappyHourActive
            ? 'Cliquer pour désactiver Happy Hour (PIN requis)'
            : 'Cliquer pour activer Happy Hour manuellement (PIN requis)'
      }
    >
      <Chip
        label={busy ? <CircularProgress size={14} color="inherit" /> : label}
        color={isHappyHourActive ? 'success' : 'warning'}
        variant={isHappyHourActive ? 'filled' : 'outlined'}
        onClick={() => void handleClick()}
        clickable={!busy}
        sx={{
          fontWeight: 'bold',
          display: { xs: 'none', sm: 'flex' },
          cursor: busy ? 'wait' : 'pointer',
          '&:hover': { filter: busy ? 'none' : 'brightness(1.08)' },
        }}
      />
    </Tooltip>
  );
};

export default HappyHourHeaderChip;
