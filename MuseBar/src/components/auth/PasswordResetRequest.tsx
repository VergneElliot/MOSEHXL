/**
 * Password Reset Request Component
 * Handles the initial password reset request form
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

interface PasswordResetRequestProps {
  onSubmit: (email: string) => Promise<void>;
  loading: boolean;
  error: string;
  success: boolean;
}

export const PasswordResetRequest: React.FC<PasswordResetRequestProps> = ({
  onSubmit,
  loading,
  error,
  success,
}) => {
  const { t } = useTranslation(['auth']);
  const [email, setEmail] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (email.trim()) {
      await onSubmit(email);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 2 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" justifyContent="flex-end" mb={1}>
          <LanguageSwitcher />
        </Box>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LockIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            {t('passwordResetRequest.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('passwordResetRequest.subtitle')}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {t('passwordResetRequest.success')}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('passwordResetRequest.emailLabel')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!email.trim() || loading}
              startIcon={<SendIcon />}
            >
              {loading ? t('passwordResetRequest.sending') : t('passwordResetRequest.sendLink')}
            </Button>
          </Box>
        </form>

        <Card sx={{ mt: 4, bgcolor: 'info.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('passwordResetRequest.nextTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              - {t('passwordResetRequest.nextStep1')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              - {t('passwordResetRequest.nextStep2')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              - {t('passwordResetRequest.nextStep3')}
            </Typography>
          </CardContent>
        </Card>
      </Paper>
    </Box>
  );
}; 