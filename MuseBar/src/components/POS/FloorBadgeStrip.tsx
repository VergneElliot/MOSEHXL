import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { Badge as BadgeIcon, TableRestaurant as TableIcon } from '@mui/icons-material';

interface FloorBadgeStripProps {
  displayName: string | null;
  tableLabel: string | null;
  onBadgeClick: () => void;
  onBadgeOut: () => void;
  onTableClick: () => void;
}

export const FloorBadgeStrip: React.FC<FloorBadgeStripProps> = ({
  displayName,
  tableLabel,
  onBadgeClick,
  onBadgeOut,
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
      {displayName ? (
        <>
          <Chip
            icon={<BadgeIcon />}
            label={displayName}
            color="primary"
            onClick={onBadgeClick}
            onDelete={onBadgeOut}
            sx={{ fontWeight: 600 }}
          />
        </>
      ) : (
        <Button
          size="small"
          variant="contained"
          startIcon={<BadgeIcon />}
          onClick={onBadgeClick}
        >
          Badge
        </Button>
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
