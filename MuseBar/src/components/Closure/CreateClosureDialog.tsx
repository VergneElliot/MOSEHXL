import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { ParisDateField } from '../common/ParisDateTimeField';
import CreateClosureDailyMode from './CreateClosureDailyMode';
import CreateClosureDailyPreview from './CreateClosureDailyPreview';
import CreateClosureExtraFields from './CreateClosureExtraFields';
import {
  type ClosureType,
  type CreateClosurePayload,
  type DailyClosureMode,
} from './createClosureTypes';
import { useCreateClosureDialog } from './useCreateClosureDialog';

export type { ClosureType, DailyClosureMode };

interface CreateClosureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateClosurePayload) => Promise<void>;
  creating: boolean;
  selectedDate: string;
  selectedClosureType: ClosureType;
  onDateChange: (date: string) => void;
  onClosureTypeChange: (type: ClosureType) => void;
  disableForceCreation?: boolean;
  defaultFondDeCaisse?: number | null;
}

const CreateClosureDialog: React.FC<CreateClosureDialogProps> = ({
  open,
  onClose,
  onCreate,
  creating,
  selectedDate,
  selectedClosureType,
  onDateChange,
  onClosureTypeChange,
  disableForceCreation = true,
  defaultFondDeCaisse = null,
}) => {
  const dialog = useCreateClosureDialog({
    open,
    selectedDate,
    selectedClosureType,
    onDateChange,
    defaultFondDeCaisse,
  });

  const canCreate =
    !creating &&
    !dialog.previewLoading &&
    !dialog.previewBlocks &&
    (!dialog.previewIsEmpty || dialog.forceCreation) &&
    (!dialog.needsDate || selectedDate.trim().length > 0) &&
    !!selectedClosureType &&
    dialog.fondDeCaisseNumber !== null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Créer un bulletin de clôture</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth>
            <TextField
              select
              label="Type"
              value={selectedClosureType}
              onChange={(e) => onClosureTypeChange(e.target.value as ClosureType)}
              size="small"
            >
              <MenuItem value="DAILY">Journalière</MenuItem>
              <MenuItem value="WEEKLY">Hebdomadaire</MenuItem>
              <MenuItem value="MONTHLY">Mensuelle</MenuItem>
              <MenuItem value="ANNUAL">Annuelle</MenuItem>
            </TextField>
          </FormControl>

          {dialog.isDaily && (
            <CreateClosureDailyMode
              dailyMode={dialog.dailyMode}
              cutTime={dialog.cutTime}
              onChange={dialog.setDailyMode}
            />
          )}

          {dialog.needsDate && (
            <ParisDateField
              label="Date de clôture (jj/mm/aaaa)"
              value={selectedDate}
              onChange={onDateChange}
              size="small"
            />
          )}
          {dialog.needsDate && (
            <Typography variant="caption" color="text.secondary">
              {selectedClosureType === 'ANNUAL'
                ? 'Bulletin annuel : année glissante se terminant à cette date (ex. 01/08/2025 → 01/08/2026)'
                : dialog.isDaily
                  ? `Journée du calendrier sélectionné, coupée à ${dialog.cutTime}`
                  : null}
            </Typography>
          )}

          {dialog.isDaily && (
            <CreateClosureDailyPreview
              previewLoading={dialog.previewLoading}
              preview={dialog.preview}
              cutTime={dialog.cutTime}
            />
          )}

          <CreateClosureExtraFields
            fondDeCaisse={dialog.fondDeCaisse}
            fondDeCaisseNumber={dialog.fondDeCaisseNumber}
            emailRecipients={dialog.emailRecipients}
            forceCreation={dialog.forceCreation}
            disableForceCreation={disableForceCreation}
            onFondChange={dialog.setFondDeCaisse}
            onEmailsChange={dialog.setEmailRecipients}
            onForceChange={dialog.setForceCreation}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={creating}>
          Annuler
        </Button>
        <Button
          onClick={() =>
            onCreate({
              date: selectedDate || dialog.todayISO,
              type: selectedClosureType,
              force: dialog.forceCreation,
              fond_de_caisse: dialog.fondDeCaisseNumber ?? 0,
              email_recipients: dialog.parsedEmails.length > 0 ? dialog.parsedEmails : undefined,
              ...(dialog.isDaily ? { mode: dialog.dailyMode } : {}),
            })
          }
          variant="contained"
          color="primary"
          disabled={!canCreate}
        >
          {creating ? 'Création…' : 'Créer la clôture'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateClosureDialog;
