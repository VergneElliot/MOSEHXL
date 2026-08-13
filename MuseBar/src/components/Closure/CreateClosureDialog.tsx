import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { apiCore } from '../../services/api';

export type ClosureType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
export type DailyClosureMode = 'business_day' | 'close_now';

interface CreateClosureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    date: string;
    type: ClosureType;
    force?: boolean;
    fond_de_caisse: number;
    email_recipients?: string[];
    mode?: DailyClosureMode;
  }) => Promise<void>;
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
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0] ?? '', []);
  const [forceCreation, setForceCreation] = useState(false);
  const [fondDeCaisse, setFondDeCaisse] = useState<string>('');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [dailyMode, setDailyMode] = useState<DailyClosureMode>('close_now');
  const [cutTime, setCutTime] = useState('02:00');

  useEffect(() => {
    if (!open) return;
    const initial = defaultFondDeCaisse ?? 0;
    setFondDeCaisse(String(initial));
    setDailyMode('close_now');

    let cancelled = false;
    (async () => {
      try {
        const settingsRes = await apiCore.request<{
          settings?: { accounting_emails?: string[]; daily_closure_time?: string };
          daily_closure_time?: string;
        }>('/legal/closure-settings', { method: 'GET' });
        if (cancelled) return;
        const defaults = settingsRes?.settings?.accounting_emails;
        setEmailRecipients(Array.isArray(defaults) && defaults.length > 0 ? defaults.join(', ') : '');
        const time =
          settingsRes?.settings?.daily_closure_time ||
          settingsRes?.daily_closure_time ||
          '02:00';
        setCutTime(time);
      } catch {
        if (!cancelled) {
          setEmailRecipients('');
          setCutTime('02:00');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, defaultFondDeCaisse]);

  const fondDeCaisseNumber = useMemo(() => {
    const n = parseFloat(fondDeCaisse.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }, [fondDeCaisse]);

  const parsedEmails = useMemo(
    () =>
      emailRecipients
        .split(/[,;\n]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    [emailRecipients]
  );

  const isDaily = selectedClosureType === 'DAILY';
  const needsDate = !isDaily || dailyMode === 'business_day';

  const canCreate =
    !creating &&
    (!needsDate || selectedDate.trim().length > 0) &&
    !!selectedClosureType &&
    fondDeCaisseNumber !== null;

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
              onChange={e => onClosureTypeChange(e.target.value as ClosureType)}
              size="small"
            >
              <MenuItem value="DAILY">Journalière</MenuItem>
              <MenuItem value="WEEKLY">Hebdomadaire</MenuItem>
              <MenuItem value="MONTHLY">Mensuelle</MenuItem>
              <MenuItem value="ANNUAL">Annuelle</MenuItem>
            </TextField>
          </FormControl>

          {isDaily && (
            <FormControl component="fieldset">
              <Typography variant="subtitle2" gutterBottom>
                Mode journalier
              </Typography>
              <RadioGroup
                value={dailyMode}
                onChange={e => setDailyMode(e.target.value as DailyClosureMode)}
              >
                <FormControlLabel
                  value="close_now"
                  control={<Radio size="small" />}
                  label="Clôturer maintenant (depuis la dernière clôture → maintenant)"
                />
                <FormControlLabel
                  value="business_day"
                  control={<Radio size="small" />}
                  label="Clôturer une journée commerciale (date + heure de coupure)"
                />
              </RadioGroup>
              <Alert severity="info" sx={{ mt: 1 }}>
                {dailyMode === 'close_now' ? (
                  <>
                    Inclut toutes les ventes depuis la fin de la dernière clôture journalière
                    jusqu’à l’instant présent. Idéal en fin de service.
                  </>
                ) : (
                  <>
                    Journée commerciale : de <strong>{cutTime}</strong> le jour choisi jusqu’à{' '}
                    <strong>{cutTime}</strong> le lendemain (paramètre « heure de clôture »). Les
                    ventes déjà couvertes par une clôture précédente sont exclues.
                  </>
                )}
              </Alert>
            </FormControl>
          )}

          {needsDate && (
            <TextField
              label="Date de clôture"
              type="date"
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
              helperText={
                selectedClosureType === 'ANNUAL'
                  ? 'Bulletin annuel : année glissante se terminant à cette date (ex. 01/08/2025 → 01/08/2026)'
                  : isDaily
                    ? `Journée du calendrier sélectionné, coupée à ${cutTime}`
                    : undefined
              }
            />
          )}

          <TextField
            label="Fond de caisse (€)"
            value={fondDeCaisse}
            onChange={(e) => setFondDeCaisse(e.target.value)}
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
            onChange={(e) => setEmailRecipients(e.target.value)}
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
                    onChange={(e) => setForceCreation(e.target.checked)}
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
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={creating}>
          Annuler
        </Button>
        <Button
          onClick={() =>
            onCreate({
              date: selectedDate || todayISO,
              type: selectedClosureType,
              force: forceCreation,
              fond_de_caisse: fondDeCaisseNumber ?? 0,
              email_recipients: parsedEmails.length > 0 ? parsedEmails : undefined,
              ...(isDaily ? { mode: dailyMode } : {}),
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
