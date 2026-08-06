import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  archiveInboxMessage,
  getDocumentCategories,
  getInboxMessage,
  importInboxAttachment,
  listInbox,
  replyInboxMessage,
  updateInboxSettings,
  updateReservation,
  type InboxAttachmentDto,
  type InboxMessageDto,
  type ReservationDto,
} from '../../services/api/adminSpace';

const STATUS_LABEL: Record<string, string> = {
  requested: 'Demandée',
  on_hold: 'En attente',
  confirmed: 'Confirmée',
  refused: 'Refusée',
  cancelled: 'Annulée',
  seated: 'Installée',
  no_show: 'No-show',
};

const ACTION_LABEL: Record<'confirmed' | 'on_hold' | 'refused', string> = {
  confirmed: 'valider',
  on_hold: 'mettre en attente',
  refused: 'refuser',
};

const InboxPanel: React.FC = () => {
  const [messages, setMessages] = useState<InboxMessageDto[]>([]);
  const [selected, setSelected] = useState<
    (InboxMessageDto & { attachments: InboxAttachmentDto[] }) | null
  >(null);
  const [linkedReservation, setLinkedReservation] = useState<ReservationDto | null>(null);
  const [inboxAddress, setInboxAddress] = useState<string | null>(null);
  const [autoforward, setAutoforward] = useState(true);
  const [archived, setArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [importAtt, setImportAtt] = useState<InboxAttachmentDto | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [importTitle, setImportTitle] = useState('');
  const [importCategory, setImportCategory] = useState('autre');
  const [importExpires, setImportExpires] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'confirmed' | 'on_hold' | 'refused' | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await listInbox({ archived });
      setMessages(data.messages);
      setInboxAddress(data.inbox_address);
      setAutoforward(data.autoforward);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    }
  }, [archived]);

  useEffect(() => {
    void refresh();
    void getDocumentCategories().then((c) => setCategories(c.categories)).catch(() => undefined);
  }, [refresh]);

  const openMessage = async (id: number) => {
    const { message, reservation } = await getInboxMessage(id);
    setSelected(message);
    setLinkedReservation(reservation);
    setReply('');
    setPendingStatus(null);
    await refresh();
  };

  const applyStatus = async (status: 'confirmed' | 'on_hold' | 'refused') => {
    if (!linkedReservation) return;
    setBusy(true);
    try {
      setError(null);
      const commentaire = reply.trim();
      const { reservation } = await updateReservation(linkedReservation.id, {
        status,
        status_reason: commentaire || null,
      });
      setLinkedReservation(reservation);
      setPendingStatus(null);
      setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    } finally {
      setBusy(false);
    }
  };

  const requestStatus = (status: 'confirmed' | 'on_hold' | 'refused') => {
    if (!reply.trim()) {
      setPendingStatus(status);
      return;
    }
    void applyStatus(status);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        Adresse établissement : <strong>{inboxAddress || 'slug non provisionné'}</strong>
      </Alert>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={autoforward}
              onChange={async (e) => {
                const next = e.target.checked;
                setAutoforward(next);
                await updateInboxSettings(next);
              }}
            />
          }
          label="Transférer une copie vers l'email du propriétaire"
        />
        <FormControlLabel
          control={<Switch checked={archived} onChange={(e) => setArchived(e.target.checked)} />}
          label="Voir les archives"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' }, gap: 2 }}>
        <List dense sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 520, overflow: 'auto' }}>
          {messages.map((m) => (
            <ListItemButton key={m.id} selected={selected?.id === m.id} onClick={() => void openMessage(m.id)}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {!m.is_read && <Chip size="small" color="primary" label="Nouveau" />}
                    <Typography noWrap fontWeight={m.is_read ? 400 : 700}>
                      {m.subject || '(sans objet)'}
                    </Typography>
                  </Box>
                }
                secondary={`${m.from_address} — ${new Date(m.received_at).toLocaleString('fr-FR')}`}
              />
            </ListItemButton>
          ))}
          {messages.length === 0 && (
            <Typography sx={{ p: 2 }} color="text.secondary">
              Aucun message
            </Typography>
          )}
        </List>

        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, minHeight: 320 }}>
          {!selected ? (
            <Typography color="text.secondary">Sélectionnez un message</Typography>
          ) : (
            <>
              <Typography variant="h6">{selected.subject || '(sans objet)'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                De : {selected.from_address}
              </Typography>
              <Typography
                component="pre"
                sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', mb: 2, maxHeight: 220, overflow: 'auto' }}
              >
                {selected.text_body || '(pas de texte)'}
              </Typography>

              {linkedReservation && (
                <Alert
                  severity={linkedReservation.guest_reliability?.flagged ? 'warning' : 'info'}
                  sx={{ mb: 2 }}
                >
                  Réservation liée :{' '}
                  <strong>{STATUS_LABEL[linkedReservation.status] || linkedReservation.status}</strong>
                  {' — '}
                  {new Date(linkedReservation.starts_at).toLocaleString('fr-FR')}
                  {' · '}
                  {linkedReservation.party_size} pers.
                  {linkedReservation.status_reason
                    ? ` · Commentaire : ${linkedReservation.status_reason}`
                    : ''}
                  {linkedReservation.guest_reliability?.flagged
                    ? ` · ⚠ Contact déjà signalé no-show (${linkedReservation.guest_reliability.flag_count}×)`
                    : ''}
                </Alert>
              )}

              {selected.attachments?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Pièces jointes</Typography>
                  {selected.attachments.map((a) => (
                    <Box key={a.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', my: 0.5 }}>
                      <Typography variant="body2">{a.file_name}</Typography>
                      {a.imported_document_id ? (
                        <Chip size="small" label="Importé" color="success" />
                      ) : (
                        <Button
                          size="small"
                          onClick={() => {
                            setImportAtt(a);
                            setImportTitle(a.file_name);
                          }}
                        >
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
                minRows={3}
                label={
                  linkedReservation
                    ? 'Réponse / commentaire au client'
                    : 'Répondre'
                }
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                helperText={
                  linkedReservation
                    ? 'Ce texte est envoyé au client dans l’e-mail de statut (valider / attente / refuser). Vous pouvez aussi l’envoyer seul via « Envoyer ».'
                    : undefined
                }
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  disabled={!reply.trim() || busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await replyInboxMessage(selected.id, reply.trim());
                      setReply('');
                      setError(null);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Envoi impossible');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Envoyer la réponse
                </Button>
                <Button
                  onClick={async () => {
                    await archiveInboxMessage(selected.id, !selected.is_archived);
                    setSelected(null);
                    setLinkedReservation(null);
                    await refresh();
                  }}
                >
                  {selected.is_archived ? 'Désarchiver' : 'Archiver'}
                </Button>
              </Box>

              {linkedReservation && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={busy}
                    onClick={() => requestStatus('confirmed')}
                  >
                    Valider
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={busy}
                    onClick={() => requestStatus('on_hold')}
                  >
                    Mettre en attente
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={busy}
                    onClick={() => requestStatus('refused')}
                  >
                    Refuser
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Box>
      </Box>

      <Dialog
        open={Boolean(pendingStatus)}
        onClose={() => setPendingStatus(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Confirmer sans commentaire</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Vous allez{' '}
            <strong>{pendingStatus ? ACTION_LABEL[pendingStatus] : ''}</strong> cette réservation{' '}
            <strong>sans commentaire ni information supplémentaire</strong> pour le client.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingStatus(null)}>Annuler</Button>
          <Button
            variant="contained"
            color={
              pendingStatus === 'refused'
                ? 'error'
                : pendingStatus === 'on_hold'
                  ? 'warning'
                  : 'success'
            }
            disabled={busy || !pendingStatus}
            onClick={() => {
              if (!pendingStatus) return;
              void applyStatus(pendingStatus);
            }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!importAtt} onClose={() => setImportAtt(null)} fullWidth maxWidth="sm">
        <DialogTitle>Importer la pièce jointe</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Titre" value={importTitle} onChange={(e) => setImportTitle(e.target.value)} fullWidth />
          <TextField
            select
            label="Catégorie"
            value={importCategory}
            onChange={(e) => setImportCategory(e.target.value)}
            SelectProps={{ native: true }}
            fullWidth
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </TextField>
          <TextField
            type="date"
            label="Expiration"
            InputLabelProps={{ shrink: true }}
            value={importExpires}
            onChange={(e) => setImportExpires(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportAtt(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!importAtt) return;
              await importInboxAttachment(importAtt.id, {
                title: importTitle,
                category: importCategory,
                expires_at: importExpires || null,
              });
              setImportAtt(null);
              if (selected) await openMessage(selected.id);
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
