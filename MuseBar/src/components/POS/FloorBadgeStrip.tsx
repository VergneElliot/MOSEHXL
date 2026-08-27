import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { TableRestaurant as TableIcon } from '@mui/icons-material';

interface FloorBadgeStripProps {
  sessionName: string | null;
  tableLabel: string | null;
  onOpenSession: () => void;
  onTableClick: () => void;
}

/** POS strip under header sessions: table binding only (PIN sessions live in AppHeader). */
export const FloorBadgeStrip: React.FC<FloorBadgeStripProps> = ({
  sessionName,
  tableLabel,
  onOpenSession,
  onTableClick,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      {!sessionName ? (
        <Button size="small" variant="contained" onClick={onOpenSession}>
          Ouvrir une session PIN
        </Button>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Session active : <strong>{sessionName}</strong>
        </Typography>
      )}
      {tableLabel ? (
        <Chip
          icon={<TableIcon />}
          label={`Table ${tableLabel}`}
          color="secondary"
          variant="outlined"
          onClick={onTableClick}
        />
      ) : (
        <Typography variant="caption" color="text.secondary">
          Mode comptoir — ou ouvrez une table
        </Typography>
      )}
    </Box>
  );
};

export default FloorBadgeStrip;
