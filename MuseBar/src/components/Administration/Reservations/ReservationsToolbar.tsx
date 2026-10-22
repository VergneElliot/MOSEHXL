import React from 'react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type Props = {
  publicUrl: string | null;
  icsUrl: string | null;
  onCreate: () => void;
  onCopyPublicLink: () => void;
};

const ReservationsToolbar: React.FC<Props> = ({
  publicUrl,
  icsUrl,
  onCreate,
  onCopyPublicLink,
}) => (
  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button variant="contained" onClick={onCreate}>
      Nouvelle réservation
    </Button>
    {publicUrl && (
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
        <Typography variant="body2">
          Lien public :{' '}
          <a href={publicUrl} target="_blank" rel="noreferrer">
            {publicUrl}
          </a>
        </Typography>
        <Tooltip title="Copier le lien">
          <IconButton size="small" onClick={onCopyPublicLink} aria-label="Copier">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    )}
    {icsUrl && (
      <Typography variant="body2">
        Flux calendrier (ICS) :{' '}
        <a href={icsUrl} target="_blank" rel="noreferrer">
          {icsUrl}
        </a>
      </Typography>
    )}
  </Box>
);

export default ReservationsToolbar;
