/**
 * Establishment operating hours — real service schedule for CP décompte.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import { Storefront as StorefrontIcon, Save as SaveIcon } from '@mui/icons-material';
import { apiService } from '../../../services/apiService';
import {
  WeeklyHoursSettingsForm,
  defaultWeeklyHours,
  type WeeklyHoursSettings,
} from './WeeklyHoursSettingsForm';

export const EstablishmentOperatingHoursPanel: React.FC = () => {
  const [settings, setSettings] = useState<WeeklyHoursSettings>(defaultWeeklyHours);
  const [fallbackFromReservations, setFallbackFromReservations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiService.get<{
        settings: WeeklyHoursSettings;
        configured: boolean;
        fallback_from_reservations: boolean;
      }>('/settings/operating-hours');
      if (data?.settings) setSettings(data.settings);
      setFallbackFromReservations(Boolean(data?.fallback_from_reservations));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiService.put('/settings/operating-hours', { settings });
      setFallbackFromReservations(false);
      setMessage('Horaires d\'ouverture enregistrés.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <StorefrontIcon color="primary" />
          <Typography variant="h6">Horaires d&apos;ouverture</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Jours où l&apos;établissement est réellement ouvert au public (service, bar, salle).
          Utilisés pour le décompte des congés payés, indépendamment des plages de réservations
          en ligne.
        </Typography>

        {fallbackFromReservations && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Les plages de réservations sont utilisées par défaut. Enregistrez vos horaires
            d&apos;ouverture réels pour un décompte CP correct (ex. ouvert le dimanche sans
            réservations en ligne).
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        <WeeklyHoursSettingsForm
          settings={settings}
          onChange={setSettings}
          loading={loading}
          saving={saving}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void handleSave()}
            disabled={loading || saving}
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EstablishmentOperatingHoursPanel;
