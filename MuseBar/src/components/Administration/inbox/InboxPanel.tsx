import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material';
import { importInboxAttachment } from '../../../services/api/adminSpace';
import { ParisDateField } from '../../common/ParisDateTimeField';
import InboxAddressBanner from '../InboxAddressBanner';
import { INBOX_RESERVATION_ACTION_LABEL as ACTION_LABEL } from '../inboxReservationLabels';
import InboxConversationList from './InboxConversationList';
import InboxThreadPane from './InboxThreadPane';
import { useInboxPanel } from './useInboxPanel';

type Props = {
  focusReservationId?: number | null;
  onFocusConsumed?: () => void;
};

const InboxPanel: React.FC<Props> = ({ focusReservationId = null, onFocusConsumed }) => {
  const inbox = useInboxPanel();

  React.useEffect(() => {
    if (focusReservationId == null) return;
    void inbox
      .openReservationConversation(focusReservationId)
      .finally(() => onFocusConsumed?.());
  }, [focusReservationId]); // eslint-disable-line react-hooks/exhaustive-deps -- open once per focus id

  return (
    <Box>
      {inbox.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => inbox.setError(null)}>
          {inbox.error}
        </Alert>
      )}
      {inbox.info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => inbox.setInfo(null)}>
          {inbox.info}
        </Alert>
      )}
      <InboxAddressBanner inboxAddress={inbox.inboxAddress} contactEmail={inbox.contactEmail} />
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={inbox.autoforward}
              onChange={(e) => void inbox.setAutoforwardAndPersist(e.target.checked)}
            />
          }
          label="Transférer une copie vers l'email de contact"
        />
        <FormControlLabel
          control={
            <Switch
              checked={inbox.archived}
              onChange={(e) => inbox.setArchived(e.target.checked)}
            />
          }
          label="Voir les archives"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.35fr' }, gap: 2 }}>
        <InboxConversationList
          conversations={inbox.conversations}
          selectedKey={inbox.selectedKey}
          onSelect={(id) => void inbox.openMessage(id)}
        />
        {!inbox.selected ? (
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              minHeight: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Alert severity="info" sx={{ width: '100%' }}>
              Sélectionnez une conversation — les messages s’affichent comme une discussion (client
              à gauche, établissement à droite). Les e-mails de confirmation envoyés par le lieu
              n’apparaissent plus comme des lignes séparées dans la liste.
            </Alert>
          </Box>
        ) : (
          <InboxThreadPane
            thread={inbox.thread}
            selected={inbox.selected}
            linkedReservation={inbox.linkedReservation}
            reply={inbox.reply}
            busy={inbox.busy}
            onReplyChange={inbox.setReply}
            onSendReply={() => void inbox.sendReply()}
            onArchive={() => void inbox.archiveSelected()}
            onImportAttachment={(att) => {
              inbox.setImportAtt(att);
              inbox.setImportTitle(att.file_name);
            }}
            onRequestStatus={inbox.requestStatus}
          />
        )}
      </Box>

      <Dialog
        open={Boolean(inbox.pendingStatus)}
        onClose={() => inbox.setPendingStatus(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Confirmer sans commentaire</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Vous allez{' '}
            <strong>{inbox.pendingStatus ? ACTION_LABEL[inbox.pendingStatus] : ''}</strong> cette
            réservation <strong>sans commentaire ni information supplémentaire</strong> pour le
            client.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => inbox.setPendingStatus(null)}>Annuler</Button>
          <Button
            variant="contained"
            color={
              inbox.pendingStatus === 'refused'
                ? 'error'
                : inbox.pendingStatus === 'on_hold'
                  ? 'warning'
                  : 'success'
            }
            disabled={inbox.busy || !inbox.pendingStatus}
            onClick={() => {
              if (!inbox.pendingStatus) return;
              void inbox.applyStatus(inbox.pendingStatus);
            }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!inbox.importAtt}
        onClose={() => inbox.setImportAtt(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Importer la pièce jointe</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Titre"
            value={inbox.importTitle}
            onChange={(e) => inbox.setImportTitle(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Catégorie"
            value={inbox.importCategory}
            onChange={(e) => inbox.setImportCategory(e.target.value)}
            SelectProps={{ native: true }}
            fullWidth
          >
            {inbox.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </TextField>
          <ParisDateField
            label="Expiration (jj/mm/aaaa)"
            value={inbox.importExpires}
            onChange={inbox.setImportExpires}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => inbox.setImportAtt(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!inbox.importAtt) return;
              await importInboxAttachment(inbox.importAtt.id, {
                title: inbox.importTitle,
                category: inbox.importCategory,
                expires_at: inbox.importExpires || null,
              });
              inbox.setImportAtt(null);
              if (inbox.selected) await inbox.openMessage(inbox.selected.id);
            }}
          >
            Importer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InboxPanel;
