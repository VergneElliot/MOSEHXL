import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { formatPeriodBound, type DailyClosurePreview } from './createClosureTypes';

type Props = {
  previewLoading: boolean;
  preview: DailyClosurePreview | null;
  cutTime: string;
};

const CreateClosureDailyPreview: React.FC<Props> = ({ previewLoading, preview, cutTime }) => (
  <Box>
    {previewLoading && (
      <Alert severity="info" icon={false}>
        Calcul de la période…
      </Alert>
    )}
    {!previewLoading && preview?.ok === false && (
      <Alert severity="error">
        <Typography variant="subtitle2">Clôture impossible</Typography>
        {preview.reason}
      </Alert>
    )}
    {!previewLoading && preview?.ok === true && (
      <Alert severity={preview.total_transactions === 0 ? 'warning' : 'success'}>
        <Typography variant="subtitle2" gutterBottom>
          Cette clôture couvrira
        </Typography>
        <Typography variant="body2">
          Du <strong>{formatPeriodBound(preview.period_start)}</strong> au{' '}
          <strong>{formatPeriodBound(preview.period_end)}</strong>
        </Typography>
        <Typography variant="body2">
          <strong>{preview.total_transactions}</strong> vente
          {preview.total_transactions > 1 ? 's' : ''} —{' '}
          <strong>
            {preview.total_amount.toLocaleString('fr-FR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            €
          </strong>
        </Typography>
        {preview.total_transactions === 0 && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Aucune vente sur cette période. Après l’heure de coupure ({cutTime}), la nuit
            qui vient de s’achever porte la date de la veille. Cochez « Forcer la
            création » s’il s’agit réellement d’une journée sans vente.
          </Typography>
        )}
      </Alert>
    )}
  </Box>
);

export default CreateClosureDailyPreview;
