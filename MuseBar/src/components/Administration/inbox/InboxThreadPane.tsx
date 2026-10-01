import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type {
  InboxAttachmentDto,
  ReservationDto,
} from '../../../services/api/adminSpace';
import type { InboxMessageDto } from '../../../services/api/adminInboxApi';
import { formatDate } from '../../../utils/formatDate';
import { INBOX_RESERVATION_STATUS_LABEL as STATUS_LABEL } from '../inboxReservationLabels';
import InboxMessageBubble from './InboxMessageBubble';

type Props = {
  thread: InboxMessageDto[];
  selected: InboxMessageDto & { attachments: InboxAttachmentDto[] };
  linkedReservation: ReservationDto | null;
  reply: string;
  busy: boolean;
  onReplyChange: (value: string) => void;
  onSendReply: () => void;
  onArchive: () => void;
  onImportAttachment: (att: InboxAttachmentDto) => void;
  onRequestStatus: (status: 'confirmed' | 'on_hold' | 'refused') => void;
};

const InboxThreadPane: React.FC<Props> = ({
  thread,
  selected,
  linkedReservation,
  reply,
  busy,
  onReplyChange,
  onSendReply,
  onArchive,
  onImportAttachment,
  onRequestStatus,
}) => {
  const title =
    linkedReservation?.customer_name ||
    selected.subject ||
    '(sans objet)';

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {linkedReservation?.customer_email && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Réponses et e-mails de statut → <strong>{linkedReservation.customer_email}</strong>
          {linkedReservation.customer_phone ? ` · ${linkedReservation.customer_phone}` : ''}
        </Typography>
      )}

      {linkedReservation && (
        <Alert
          severity={linkedReservation.guest_reliability?.flagged ? 'warning' : 'info'}
          sx={{ mb: 2 }}
        >
          Réservation :{' '}
          <strong>{STATUS_LABEL[linkedReservation.status] || linkedReservation.status}</strong>
          {' — '}
          {formatDate(linkedReservation.starts_at)}
          {' · '}
          {linkedReservation.party_size} pers.
          {linkedReservation.status_reason
            ? ` · Commentaire client : ${linkedReservation.status_reason}`
            : ''}
          {linkedReservation.notes
            ? ` · Notes internes : ${linkedReservation.notes.slice(0, 80)}${linkedReservation.notes.length > 80 ? '…' : ''}`
            : ''}
          {linkedReservation.guest_reliability?.flagged
            ? ` · ⚠ Contact déjà signalé no-show (${linkedReservation.guest_reliability.flag_count}×)`
            : ''}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          maxHeight: 340,
          overflow: 'auto',
          px: 0.5,
          py: 1,
          mb: 2,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.65)' : 'grey.50',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {thread.map((m) => (
          <InboxMessageBubble key={m.id} message={m} />
        ))}
      </Box>

      {selected.attachments?.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Pièces jointes (message ouvert)</Typography>
          {selected.attachments.map((a) => (
            <Box key={a.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', my: 0.5 }}>
              <Typography variant="body2">{a.file_name}</Typography>
              {a.imported_document_id ? (
                <Chip size="small" label="Importé" color="success" />
              ) : (
                <Button size="small" onClick={() => onImportAttachment(a)}>
                  Importer dans Documents
                </Button>
              )}
            </Box>
          ))}
        </Box>
      )}

      <TextField
        fullWidth
        multiline
        minRows={2}
        label={linkedReservation ? 'Réponse / commentaire au client' : 'Répondre'}
        value={reply}
        onChange={(e) => onReplyChange(e.target.value)}
        helperText={
          linkedReservation
            ? 'Envoyé au client (réponse seule ou avec Valider / Attente / Refuser).'
            : undefined
        }
        sx={{ mb: 1 }}
      />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" disabled={!reply.trim() || busy} onClick={onSendReply}>
          Envoyer
        </Button>
        <Button onClick={onArchive}>
          {selected.is_archived ? 'Désarchiver la conversation' : 'Archiver la conversation'}
        </Button>
      </Box>

      {linkedReservation && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="success"
            disabled={busy}
            onClick={() => onRequestStatus('confirmed')}
          >
            Valider
          </Button>
          <Button
            variant="outlined"
            color="warning"
            disabled={busy}
            onClick={() => onRequestStatus('on_hold')}
          >
            Mettre en attente
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={busy}
            onClick={() => onRequestStatus('refused')}
          >
            Refuser
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default InboxThreadPane;
