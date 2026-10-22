import React from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

type Props = {
  fondDeCaisse: string;
  fondDeCaisseNumber: number | null;
  emailRecipients: string;
  forceCreation: boolean;
  disableForceCreation: boolean;
  onFondChange: (value: string) => void;
  onEmailsChange: (value: string) => void;
  onForceChange: (value: boolean) => void;
};

const CreateClosureExtraFields: React.FC<Props> = ({
  fondDeCaisse,
  fondDeCaisseNumber,
  emailRecipients,
  forceCreation,
  disableForceCreation,
  onFondChange,
  onEmailsChange,
  onForceChange,
}) => (
  <>
    <TextField
      label="Fond de caisse (€)"
      value={fondDeCaisse}
      onChange={(e) => onFondChange(e.target.value)}
      size="small"
      fullWidth
      required
      error={fondDeCaisse.trim().length === 0 || fondDeCaisseNumber === null}
      helperText={
        fondDeCaisse.trim().length === 0
          ? 'Champ obligatoire'
          : fondDeCaisseNumber === null
            ? 'Veuillez saisir un montant valide (≥ 0)'
            : 'Montant informatif (n’impacte pas les totaux)'
      }
      inputMode="decimal"
    />

    <TextField
      label="Emails destinataires (optionnel)"
      value={emailRecipients}
      onChange={(e) => onEmailsChange(e.target.value)}
      size="small"
      fullWidth
      multiline
      minRows={2}
      placeholder="comptable@exemple.com, associe@exemple.com"
      helperText="Envoi ponctuel pour ce bulletin. Prérempli depuis les paramètres — ajoutez d'autres adresses ici sans les enregistrer. Les emails comptables des paramètres restent envoyés automatiquement s'ils sont configurés. Séparez par des virgules ; laissez vide pour n'utiliser que les paramètres."
    />

    <Tooltip
      title={
        disableForceCreation
          ? 'A activer plus tard après validation légale et backend (force de création).'
          : 'Cette option force la création même si un bulletin existe déjà.'
      }
    >
      <Box>
        <FormControlLabel
          disabled={disableForceCreation}
          control={
            <Checkbox
              checked={forceCreation}
              onChange={(e) => onForceChange(e.target.checked)}
            />
          }
          label="Forcer la création (crée un bulletin correctif, sans supprimer l'ancien)"
        />
      </Box>
    </Tooltip>

    <Typography variant="caption" color="textSecondary">
      Chaque vente doit figurer dans une clôture journalière : les périodes sont continues,
      sans chevauchement.
    </Typography>
  </>
);

export default CreateClosureExtraFields;
