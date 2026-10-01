import React from 'react';
import { Box, Slider, Tooltip, Typography } from '@mui/material';
import { ZoomIn as ZoomInIcon } from '@mui/icons-material';
import { useVisualPrefs } from '../../contexts/VisualPrefsContext';
import { SCALE_MAX, SCALE_MIN, SCALE_STEP } from '../../utils/uiPrefs';

/** Live display-scale control (per active PIN membership). */
export const DisplayScaleControl: React.FC = () => {
  const { prefs, setScalePercent } = useVisualPrefs();

  return (
    <Tooltip title="Taille d’affichage (badge PIN actif)">
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
        }}
        aria-label="Réglage taille d’affichage"
      >
        <ZoomInIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
        <Slider
          size="small"
          value={prefs.scale_percent}
          min={SCALE_MIN}
          max={SCALE_MAX}
          step={SCALE_STEP}
          onChange={(_, v) => setScalePercent(v as number)}
          sx={{
            width: 72,
            color: 'rgba(255,255,255,0.85)',
            '& .MuiSlider-thumb': { width: 12, height: 12 },
          }}
        />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', minWidth: 32 }}>
          {prefs.scale_percent}%
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default DisplayScaleControl;
