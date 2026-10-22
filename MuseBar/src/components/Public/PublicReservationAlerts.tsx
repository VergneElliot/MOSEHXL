import React from 'react';
import { Alert } from '@mui/material';

type Props = {
  error: string | null;
  success: boolean;
  missingEstablishment: boolean;
  onClearError: () => void;
  onClearSuccess: () => void;
};

const PublicReservationAlerts: React.FC<Props> = ({
  error,
  success,
  missingEstablishment,
  onClearError,
  onClearSuccess,
}) => (
  <>
    {error && (
      <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
        {error}
      </Alert>
    )}
    {success && (
      <Alert severity="success" sx={{ mb: 2 }} onClose={onClearSuccess}>
        Demande envoyée. Vous recevrez un e-mail de confirmation de la part de l’établissement.
      </Alert>
    )}
    {missingEstablishment && <Alert severity="warning">Établissement introuvable.</Alert>}
  </>
);

export default PublicReservationAlerts;
