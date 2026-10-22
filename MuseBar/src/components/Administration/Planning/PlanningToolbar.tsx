import React from 'react';
import { Alert, Box, Button } from '@mui/material';

type Props = {
  dirty: boolean;
  dirtyCount: number;
  busy: boolean;
  onOpenCreate: () => void;
  onSave: () => void;
  onOpenLeave: () => void;
  onDuplicateWeek: () => void;
  onReset: () => void;
  onDiscard: () => void;
};

const PlanningToolbar: React.FC<Props> = ({
  dirty,
  dirtyCount,
  busy,
  onOpenCreate,
  onSave,
  onOpenLeave,
  onDuplicateWeek,
  onReset,
  onDiscard,
}) => (
  <>
    {dirty && (
      <Alert
        severity="warning"
        sx={{ mb: 2 }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" size="small" onClick={onDiscard} disabled={busy}>
              Annuler
            </Button>
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={onSave}
              disabled={busy}
            >
              Enregistrer ({dirtyCount})
            </Button>
          </Box>
        }
      >
        {dirtyCount} modification(s) non enregistrée(s) — les e-mails de confirmation seront
        envoyés uniquement à l’enregistrement.
      </Alert>
    )}
    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="contained" onClick={onOpenCreate}>
        Ajouter une vacation
      </Button>
      <Button variant="contained" color="success" onClick={onSave} disabled={!dirty || busy}>
        Enregistrer les modifications{dirty ? ` (${dirtyCount})` : ''}
      </Button>
      <Button variant="outlined" onClick={onOpenLeave}>
        Demander un congé
      </Button>
      <Button onClick={onDuplicateWeek}>Dupliquer la semaine →</Button>
      <Button onClick={() => window.print()}>Imprimer</Button>
      <Button color="error" variant="outlined" onClick={onReset} disabled={busy}>
        Réinitialiser le planning
      </Button>
    </Box>
  </>
);

export default PlanningToolbar;
