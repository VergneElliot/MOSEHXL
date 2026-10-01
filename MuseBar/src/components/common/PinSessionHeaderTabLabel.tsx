import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Badge as BadgeIcon,
  Close as CloseIcon,
  ErrorOutline as ExpiredIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import type { PinSession } from '../../contexts/PinSessionsContext';

export function PinSessionHeaderTabLabel(props: {
  session: PinSession;
  expired: boolean;
  unlocked: boolean;
  onDismiss: () => void;
}): React.ReactElement {
  const { session, expired, unlocked, onDismiss } = props;
  const statusHint = expired
    ? 'Session expirée — tapez pour ressaisir le PIN'
    : unlocked
      ? 'Badge actif sur cet appareil'
      : 'Badge ouvert ailleurs — PIN requis pour l’activer ici';

  return (
    <Tooltip title={statusHint} enterDelay={400}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {expired ? (
          <ExpiredIcon sx={{ fontSize: 16, color: 'warning.light' }} />
        ) : unlocked ? (
          <BadgeIcon sx={{ fontSize: 16 }} />
        ) : (
          <LockIcon sx={{ fontSize: 16, opacity: 0.85 }} />
        )}
        <Typography
          variant="body2"
          noWrap
          sx={{
            maxWidth: 120,
            textDecoration: expired ? 'line-through' : 'none',
          }}
        >
          {session.actor.displayName}
        </Typography>
        {expired ? (
          <Typography variant="caption" sx={{ color: 'warning.light' }}>
            · expirée
          </Typography>
        ) : !unlocked ? (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            · PIN
          </Typography>
        ) : (
          session.activeTable && (
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              · {session.activeTable.label}
            </Typography>
          )
        )}
        <IconButton
          size="small"
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          sx={{ color: 'inherit', p: 0.25, ml: 0.25 }}
          aria-label={`Fermer session ${session.actor.displayName}`}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Tooltip>
  );
}
