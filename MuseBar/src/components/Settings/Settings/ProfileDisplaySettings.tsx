/**
 * Profil → Affichage + Accessibilité for the active PIN badge.
 */

import React from 'react';
import {
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Slider,
  Typography,
} from '@mui/material';
import { useVisualPrefs } from '../../../contexts/VisualPrefsContext';
import {
  SCALE_MAX,
  SCALE_MIN,
  SCALE_STEP,
  type ColorMode,
  type FineScaleKey,
} from '../../../utils/uiPrefs';

const SCALE_MARKS = [
  { value: 50, label: '50%' },
  { value: 100, label: '100%' },
  { value: 150, label: '150%' },
];

function FineSlider({
  label,
  value,
  scaleKey,
  onChange,
}: {
  label: string;
  value: number;
  scaleKey: FineScaleKey;
  onChange: (key: FineScaleKey, percent: number) => void;
}) {
  return (
    <Box sx={{ mb: 2.5, maxWidth: 420 }}>
      <Typography variant="body2" gutterBottom>
        {label} — {value}%
      </Typography>
      <Slider
        value={value}
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={SCALE_STEP}
        marks={SCALE_MARKS}
        onChange={(_, v) => onChange(scaleKey, v as number)}
        aria-label={label}
      />
    </Box>
  );
}

export const ProfileDisplaySettings: React.FC = () => {
  const { prefs, setColorMode, setScalePercent, setFineScale } = useVisualPrefs();

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Affichage
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Préférences du badge PIN actuellement sélectionné. Elles suivent le badge
        lors d’un changement de session.
      </Typography>

      <FormControl component="fieldset" sx={{ mb: 3, display: 'block' }}>
        <FormLabel component="legend">Thème</FormLabel>
        <RadioGroup
          row
          value={prefs.color_mode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
        >
          <FormControlLabel value="dark" control={<Radio />} label="Sombre" />
          <FormControlLabel value="light" control={<Radio />} label="Clair" />
        </RadioGroup>
      </FormControl>

      <Typography variant="body2" gutterBottom>
        Zoom global (aussi dans l’en-tête) — {prefs.scale_percent}%
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Agrandit ou réduit toute l’interface proportionnellement.
      </Typography>
      <Slider
        value={prefs.scale_percent}
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={SCALE_STEP}
        marks={SCALE_MARKS}
        onChange={(_, v) => setScalePercent(v as number)}
        sx={{ maxWidth: 420, mb: 1 }}
        aria-label="Zoom global"
      />

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" gutterBottom>
        Accessibilité
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Réglages fins, indépendants du zoom global : ils changent les proportions
        (police, cartes produit, boutons, onglets / catégories).
      </Typography>

      <FineSlider
        label="Police (textes de l’interface)"
        value={prefs.font_scale_percent}
        scaleKey="font_scale_percent"
        onChange={setFineScale}
      />
      <FineSlider
        label="Cartes produit"
        value={prefs.card_scale_percent}
        scaleKey="card_scale_percent"
        onChange={setFineScale}
      />
      <FineSlider
        label="Boutons"
        value={prefs.button_scale_percent}
        scaleKey="button_scale_percent"
        onChange={setFineScale}
      />
      <FineSlider
        label="Onglets et catégories"
        value={prefs.nav_scale_percent}
        scaleKey="nav_scale_percent"
        onChange={setFineScale}
      />
    </Box>
  );
};

export default ProfileDisplaySettings;
