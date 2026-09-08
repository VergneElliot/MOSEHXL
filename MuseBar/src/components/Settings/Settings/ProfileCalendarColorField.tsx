/**
 * Calendar color picker for profile settings (spectrum, hex, used colors, suggestions).
 */

import React from 'react';
import { Box, TextField, Tooltip, Typography } from '@mui/material';
import { normalizeHex } from './profileTypes';

export interface ProfileCalendarColorFieldProps {
  selectedNorm: string | null;
  hexDraft: string;
  colorTaken: boolean;
  usedColors: string[];
  suggestions: string[];
  email?: string;
  disabled?: boolean;
  onSetColor: (raw: string) => void;
}

export const ProfileCalendarColorField: React.FC<ProfileCalendarColorFieldProps> = ({
  selectedNorm,
  hexDraft,
  colorTaken,
  usedColors,
  suggestions,
  email,
  disabled = false,
  onSetColor,
}) => (
  <>
    <Typography variant="subtitle2" gutterBottom>
      Couleur du calendrier (obligatoire, unique dans l’établissement)
    </Typography>
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'flex-start',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <Box
          component="input"
          type="color"
          value={selectedNorm || '#1565C0'}
          disabled={disabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSetColor(e.target.value)}
          aria-label="Sélecteur de couleur"
          sx={{
            width: 64,
            height: 48,
            p: 0,
            border: '1px solid rgba(0,0,0,0.23)',
            borderRadius: 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            bgcolor: 'transparent',
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Spectre
        </Typography>
      </Box>
      <TextField
        label="Hexadécimal"
        value={hexDraft}
        onChange={(e) => onSetColor(e.target.value)}
        onBlur={() => {
          const norm = normalizeHex(hexDraft);
          if (norm) onSetColor(norm);
        }}
        disabled={disabled}
        placeholder="#1565C0"
        error={Boolean(hexDraft) && !normalizeHex(hexDraft)}
        helperText={
          colorTaken
            ? 'Déjà utilisée par un collègue'
            : hexDraft && !normalizeHex(hexDraft)
              ? 'Format #RRGGBB'
              : 'Toute couleur #RRGGBB'
        }
        sx={{ width: 160 }}
        inputProps={{ maxLength: 7, spellCheck: false }}
      />
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderRadius: 1,
          bgcolor: selectedNorm || '#ccc',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          minWidth: 88,
          textAlign: 'center',
          alignSelf: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.45)',
        }}
      >
        Aperçu
      </Box>
    </Box>

    {usedColors.length > 0 && (
      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Couleurs déjà prises dans l’établissement
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {usedColors.map((color) => (
            <Tooltip key={color} title={color}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: 0.5,
                  bgcolor: color,
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              />
            </Tooltip>
          ))}
        </Box>
      </Box>
    )}

    {suggestions.length > 0 && (
      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Suggestions rapides
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {suggestions.map((color) => {
            const selected = selectedNorm === color.toUpperCase();
            return (
              <Tooltip key={color} title={color}>
                <Box
                  component="button"
                  type="button"
                  disabled={disabled}
                  onClick={() => onSetColor(color)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 0.5,
                    border: selected ? '3px solid #111' : '1px solid rgba(0,0,0,0.2)',
                    bgcolor: color,
                    cursor: 'pointer',
                    p: 0,
                  }}
                  aria-label={`Couleur ${color}`}
                />
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    )}

    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
      Compte : {email}
    </Typography>
  </>
);

export default ProfileCalendarColorField;
