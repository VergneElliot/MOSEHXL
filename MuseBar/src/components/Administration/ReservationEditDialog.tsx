import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { ReservationDto } from '../../services/api/adminSpace';
import { ParisDateTimeField } from '../common/ParisDateTimeField';
import { formatDateLong } from '../../utils/formatDate';

const STATUSES = [
  { id: 'requested', label: 'Demandée' },
  { id: 'on_hold', label: 'En attente' },
  { id: 'confirmed', label: 'Confirmée' },
  { id: 'refused', label: 'Refusée' },
  { id: 'seated', label: 'Installée' },
  { id: 'no_show', label: 'No-show' },
  { id: 'cancelled', label: 'Annulée' },
];

type Props = {
  open: boolean;
  edit: Partial<ReservationDto> | null;
  dayContext: Date | null;
  dialogTab: number;
  selectedDayClosed: boolean;
  dayStatusBusy: boolean;
  conversationBusy?: boolean;
  onClose: () => void;
  onDialogTabChange: (tab: number) => void;
  onEditChange: (next: Partial<ReservationDto>) => void;
  onSave: () => void;
  onToggleDayClosed: (closed: boolean) => void;
  onOpenConversation?: () => void;
};

const ReservationEditDialog: React.FC<Props> = ({
  open,
  edit,
  dayContext,
  dialogTab,
  selectedDayClosed,
  dayStatusBusy,
  conversationBusy,
  onClose,
  onDialogTabChange,
  onEditChange,
  onSave,
  onToggleDayClosed,
  onOpenConversation,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>
      {edit?.id
        ? 'Modifier la réservation'
        : dayContext
          ? formatDateLong(dayContext)
          : 'Nouvelle réservation'}
    </DialogTitle>
    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      {!edit?.id && dayContext && (
        <Tabs
          value={dialogTab}
          onChange={(_e, v) => onDialogTabChange(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
        >
          <Tab label="Nouvelle réservation" sx={{ textTransform: 'none' }} />
          <Tab label="Statut de la journée" sx={{ textTransform: 'none' }} />
        </Tabs>
      )}

      {(edit?.id || dialogTab === 0) && (
        <>
          {edit?.id && onOpenConversation && (
            <Button
              variant="outlined"
              disabled={conversationBusy}
              onClick={onOpenConversation}
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              Accéder à la conversation
            </Button>
          )}
          <TextField
            label="Nom"
            value={edit?.customer_name || ''}
            onChange={(e) => onEditChange({ ...edit, customer_name: e.target.value })}
            fullWidth
          />
          <TextField
            label="Téléphone"
            value={edit?.customer_phone || ''}
            onChange={(e) => onEditChange({ ...edit, customer_phone: e.target.value })}
            fullWidth
          />
          <TextField
            label="Email"
            value={edit?.customer_email || ''}
            onChange={(e) => onEditChange({ ...edit, customer_email: e.target.value })}
            fullWidth
          />
          <TextField
            label="Nombre de personnes"
            type="number"
            value={edit?.party_size ?? 2}
            onChange={(e) => onEditChange({ ...edit, party_size: Number(e.target.value) })}
            fullWidth
          />
          <ParisDateTimeField
            value={edit?.starts_at || ''}
            onChange={(next) => onEditChange({ ...edit, starts_at: next })}
          />
          <TextField
            select
            label="Statut"
            value={edit?.status || 'requested'}
            onChange={(e) => onEditChange({ ...edit, status: e.target.value })}
            fullWidth
          >
            {STATUSES.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Commentaire (au client)"
            multiline
            minRows={2}
            value={edit?.status_reason || ''}
            onChange={(e) => onEditChange({ ...edit, status_reason: e.target.value })}
            fullWidth
            helperText="Envoyé au client si le statut change ou si ce texte est modifié à l’enregistrement."
          />
          <TextField
            label="Notes (internes)"
            multiline
            minRows={2}
            value={edit?.notes || ''}
            onChange={(e) => onEditChange({ ...edit, notes: e.target.value })}
            fullWidth
            helperText="Uniquement pour l’établissement — jamais envoyé au client, jamais rempli automatiquement."
          />
        </>
      )}

      {!edit?.id && dayContext && dialogTab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
          <Alert severity={selectedDayClosed ? 'warning' : 'info'}>
            {selectedDayClosed
              ? 'Cette journée est fermée aux nouvelles demandes de réservation sur le calendrier public. Les réservations déjà acceptées restent visibles.'
              : 'Cette journée est ouverte aux demandes selon les plages de réservations configurées.'}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Fermer une journée complète évite de refuser manuellement chaque demande quand vous êtes
            complets, sans modifier les plages habituelles. Vous pourrez la rouvrir si une place se
            libère.
          </Typography>
          {selectedDayClosed ? (
            <Button
              variant="contained"
              color="success"
              disabled={dayStatusBusy}
              onClick={() => onToggleDayClosed(false)}
            >
              Rouvrir la journée aux réservations
            </Button>
          ) : (
            <Button
              variant="contained"
              color="warning"
              disabled={dayStatusBusy}
              onClick={() => onToggleDayClosed(true)}
            >
              Fermer la journée aux réservations
            </Button>
          )}
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>{dialogTab === 1 && !edit?.id ? 'Fermer' : 'Annuler'}</Button>
      {(edit?.id || dialogTab === 0) && (
        <Button variant="contained" onClick={onSave}>
          Enregistrer
        </Button>
      )}
    </DialogActions>
  </Dialog>
);

export default ReservationEditDialog;
