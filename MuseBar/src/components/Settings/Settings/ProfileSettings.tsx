/**
 * Settings → Profil : personal info, unique calendar color, password & PIN.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { Person as PersonIcon, Save as SaveIcon } from '@mui/icons-material';
import { ApiService } from '../../../services/apiService';
import { ParisDateField } from '../../common/ParisDateTimeField';
import { logger } from '../../../utils/logger';
import { ProfileCalendarColorField } from './ProfileCalendarColorField';
import { ProfileSecurityDialogs } from './ProfileSecurityDialogs';
import { normalizeHex, type UserProfileDto } from './profileTypes';

export type { UserProfileDto } from './profileTypes';

const api = ApiService.getInstance();

export const ProfileSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    calendar_color: '',
  });
  const [hexDraft, setHexDraft] = useState('');

  const applyProfile = (data: UserProfileDto) => {
    setProfile(data);
    const color = data.calendar_color || '';
    setForm({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      phone: data.phone || '',
      date_of_birth: data.date_of_birth || '',
      calendar_color: color,
    });
    setHexDraft(color);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<UserProfileDto>('/auth/me/profile');
      applyProfile(data);
    } catch (err) {
      logger.error('Failed to load profile', err);
      setError(err instanceof Error ? err.message : 'Chargement du profil impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const usedSet = useMemo(
    () =>
      new Set(
        (profile?.used_colors || [])
          .map((c) => normalizeHex(c))
          .filter((c): c is string => Boolean(c))
      ),
    [profile?.used_colors]
  );

  const selectedNorm = normalizeHex(form.calendar_color);
  const colorTaken = selectedNorm != null && usedSet.has(selectedNorm);

  const setColor = (raw: string) => {
    const norm = normalizeHex(raw);
    if (norm) {
      setForm((prev) => ({ ...prev, calendar_color: norm }));
      setHexDraft(norm);
    } else {
      setHexDraft(raw);
    }
  };

  const save = async () => {
    const color = normalizeHex(form.calendar_color) || normalizeHex(hexDraft);
    if (!color) {
      setError('Couleur invalide (attendu #RRGGBB)');
      return;
    }
    if (usedSet.has(color)) {
      setError('Cette couleur est déjà utilisée dans l’établissement');
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { data } = await api.patch<UserProfileDto>('/auth/me/profile', {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        calendar_color: color,
      });
      applyProfile(data);
      setMessage('Profil enregistré');
    } catch (err) {
      logger.error('Failed to save profile', err);
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6">Mon profil</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Informations personnelles (facultatives) et couleur unique dans cet établissement —
          utilisée notamment dans le planning.
        </Typography>

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

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Prénom"
              fullWidth
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              disabled={saving}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nom"
              fullWidth
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              disabled={saving}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Téléphone"
              fullWidth
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={saving}
              placeholder="06 12 34 56 78"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ParisDateField
              label="Date de naissance (jj/mm/aaaa)"
              value={form.date_of_birth}
              onChange={(ymd) => setForm({ ...form, date_of_birth: ymd })}
              disabled={saving}
            />
          </Grid>

          <Grid item xs={12}>
            <ProfileCalendarColorField
              selectedNorm={selectedNorm}
              hexDraft={hexDraft}
              colorTaken={colorTaken}
              usedColors={[...usedSet]}
              suggestions={profile?.available_colors || []}
              email={profile?.email}
              disabled={saving}
              onSetColor={setColor}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void save()}
            disabled={saving || colorTaken}
          >
            Enregistrer
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <ProfileSecurityDialogs onMessage={setMessage} />
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
