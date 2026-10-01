/**
 * Header control: install PWA when the browser allows, or iOS Add-to-Home-Screen tip.
 */

import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import IosShareIcon from '@mui/icons-material/IosShare';
import { usePwaInstall } from '../../pwa/usePwaInstall';

export const PwaInstallControl: React.FC = () => {
  const { isStandalone, canPromptInstall, showIosHint, promptInstall, dismissIosHint } =
    usePwaInstall();
  const [iosOpen, setIosOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (isStandalone) return null;
  if (!canPromptInstall && !showIosHint) return null;

  const handleInstall = async () => {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  };

  if (canPromptInstall) {
    return (
      <Tooltip title="Installer l’application (sans barre d’adresse)">
        <span>
          <Button
            color="inherit"
            size="small"
            startIcon={<GetAppIcon />}
            disabled={busy}
            onClick={() => void handleInstall()}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Installer
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <>
      <Tooltip title="Ajouter à l’écran d’accueil">
        <IconButton
          color="inherit"
          size="small"
          aria-label="Installer MuseBar sur l’écran d’accueil"
          onClick={() => setIosOpen(true)}
        >
          <IosShareIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={iosOpen} onClose={() => setIosOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Installer MuseBar</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Sur iPhone / iPad, Safari ne propose pas le même bouton d’installation que Chrome.
            Ajoutez MuseBar à l’écran d’accueil pour l’ouvrir sans barre d’adresse :
          </Typography>
          <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
            <li>Touchez le bouton Partager (carré avec flèche).</li>
            <li>Choisissez « Sur l’écran d’accueil ».</li>
            <li>Confirmez « Ajouter ».</li>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              dismissIosHint();
              setIosOpen(false);
            }}
          >
            Ne plus afficher
          </Button>
          <Button variant="contained" onClick={() => setIosOpen(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
