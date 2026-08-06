/**
 * Guest cancel page — /reserve/:slug/annuler/:token (48h rule enforced by API).
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { apiConfig } from '../../config/api';

const PublicReservationCancelPage: React.FC = () => {
  const { slug = '', token = '' } = useParams<{ slug: string; token: string }>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const cancel = async () => {
    setStatus('loading');
    setMessage(null);
    try {
      if (!apiConfig.isReady()) await apiConfig.initialize();
      const res = await fetch(
        apiConfig.getEndpoint(`/api/public/reservations/${encodeURIComponent(slug)}/cancel`),
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
        (body as { message?: string }).message || 'Votre réservation a bien été annulée.'
      );
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Annulation impossible');
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
          Annuler ma réservation
        </Typography>
        <Typography sx={{ color: '#cbd5e1', mb: 2 }}>
          L’annulation en ligne est possible jusqu’à 48 heures avant l’horaire prévu. Au-delà,
          contactez directement l’établissement.
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
            color="error"
            size="large"
            disabled={status === 'loading'}
            onClick={() => void cancel()}
          >
            {status === 'loading' ? <CircularProgress size={22} /> : 'Confirmer l’annulation'}
          </Button>
        )}
      </Container>
    </Box>
  );
};

export default PublicReservationCancelPage;
