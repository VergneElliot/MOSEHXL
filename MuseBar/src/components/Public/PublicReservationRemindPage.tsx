/**
 * Guest-facing page to remind the venue about a pending reservation request.
 * Route: /reserve/:slug/relancer/:token
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { apiConfig } from '../../config/api';

const PublicReservationRemindPage: React.FC = () => {
  const { slug = '', token = '' } = useParams<{ slug: string; token: string }>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const sendRemind = async () => {
    setStatus('loading');
    setMessage(null);
    try {
      if (!apiConfig.isReady()) await apiConfig.initialize();
      const res = await fetch(
        apiConfig.getEndpoint(`/api/public/reservations/${encodeURIComponent(slug)}/remind`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: decodeURIComponent(token) }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errObj = (body as { error?: string | { message?: string } }).error;
        const msg =
          typeof errObj === 'string'
            ? errObj
            : errObj?.message || `Erreur ${res.status}`;
        throw new Error(msg);
      }
      setStatus('ok');
      setMessage(
        (body as { message?: string }).message ||
          'L’établissement a été relancé. Merci de votre patience.'
      );
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Relance impossible');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 45%, #334155 100%)',
        py: 6,
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="h4"
          sx={{
            color: '#f8fafc',
            fontFamily: '"Fraunces", "Georgia", serif',
            fontWeight: 600,
            mb: 2,
          }}
        >
          Relancer l’établissement
        </Typography>
        <Typography sx={{ color: '#cbd5e1', mb: 3 }}>
          Si vous n’avez pas encore reçu de réponse à votre demande de réservation, vous pouvez
          renvoyer une notification à l’établissement.
        </Typography>

        {status === 'ok' && message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}
        {status === 'error' && message && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        {status !== 'ok' && (
          <Button
            variant="contained"
            size="large"
            disabled={status === 'loading'}
            onClick={() => void sendRemind()}
            sx={{ bgcolor: '#f8fafc', color: '#0f172a', '&:hover': { bgcolor: '#e2e8f0' } }}
          >
            {status === 'loading' ? (
              <CircularProgress size={22} />
            ) : (
              'Relancer l’établissement'
            )}
          </Button>
        )}
      </Container>
    </Box>
  );
};

export default PublicReservationRemindPage;
