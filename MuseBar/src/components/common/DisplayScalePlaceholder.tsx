import React, { useState } from 'react';
import { Box, Slider, Tooltip, Typography } from '@mui/material';
import { ZoomIn as ZoomInIcon } from '@mui/icons-material';

/** Visual placeholder for future global UI scale (accessibility). Not wired yet. */
export const DisplayScalePlaceholder: React.FC = () => {
  const [value, setValue] = useState(100);

  return (
    <Tooltip title="Taille d’affichage (bientôt disponible)">
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          alignItems: 'center',
          gap: 0.75,
          px: 1,
          py: 0.25,
          borderRadius: 1,
          border: '1px solid rgba(255,255,255,0.2)',
          bgcolor: 'rgba(255,255,255,0.06)',
          minWidth: 140,
          opacity: 0.85,
        }}
        aria-label="Réglage taille d’affichage (placeholder)"
      >
        <ZoomInIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
        <Slider
          size="small"
          value={value}
          min={80}
          max={130}
          step={5}
          disabled
          onChange={(_, v) => setValue(v as number)}
          sx={{
            width: 72,
            color: 'rgba(255,255,255,0.5)',
            '& .MuiSlider-thumb': { width: 12, height: 12 },
          }}
        />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', minWidth: 32 }}>
          {value}%
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default DisplayScalePlaceholder;
