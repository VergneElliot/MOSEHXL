import { useCallback, useEffect, useState } from 'react';
import {
  archiveInboxMessage,
  getDocumentCategories,
  updateInboxSettings,
  type InboxAttachmentDto,
  type ReservationDto,
} from '../../../services/api/adminSpace';
import {
  getInboxMessage,
  listInbox,
  patchReservationStatus,
  replyInboxMessage,
  resolveInboxByReservation,
  type InboxConversationDto,
  type InboxMessageDto,
} from '../../../services/api/adminInboxApi';

export function useInboxPanel() {
  const [conversations, setConversations] = useState<InboxConversationDto[]>([]);
  const [selected, setSelected] = useState<
    (InboxMessageDto & { attachments: InboxAttachmentDto[] }) | null
  >(null);
  const [thread, setThread] = useState<InboxMessageDto[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [linkedReservation, setLinkedReservation] = useState<ReservationDto | null>(null);
  const [inboxAddress, setInboxAddress] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
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
  const [info, setInfo] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await listInbox({ archived });
      setConversations(data.conversations);
      setInboxAddress(data.inbox_address);
      setContactEmail(data.contact_email ?? data.owner_email ?? null);
      setAutoforward(data.autoforward);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    }
  }, [archived]);

  useEffect(() => {
    void refresh();
    void getDocumentCategories()
      .then((c) => setCategories(c.categories))
      .catch(() => undefined);
  }, [refresh]);

  const openMessage = async (id: number) => {
    const { message, reservation, thread: threadMessages } = await getInboxMessage(id);
    setSelected(message);
    setThread(threadMessages?.length ? threadMessages : [message]);
    setLinkedReservation(reservation);
    setSelectedKey(
      reservation?.id != null
        ? `r:${reservation.id}`
        : message.reservation_id != null
          ? `r:${message.reservation_id}`
          : `m:${message.id}`
    );
    setReply('');
    setPendingStatus(null);
    await refresh();
  };

  const applyStatus = async (status: 'confirmed' | 'on_hold' | 'refused') => {
    if (!linkedReservation || !selected) return;
    setBusy(true);
    try {
      setError(null);
      setInfo(null);
      const commentaire = reply.trim();
      const { reservation, guest_email_delivery } = await patchReservationStatus(
        linkedReservation.id,
        {
          status,
          status_reason: commentaire || null,
        }
      );
      setLinkedReservation(reservation);
      setPendingStatus(null);
      setReply('');
      if (guest_email_delivery?.sent && guest_email_delivery.to) {
        setInfo(`E-mail de statut envoyé à ${guest_email_delivery.to}`);
      } else if (guest_email_delivery && !guest_email_delivery.sent) {
        setError(
          `Statut enregistré, mais l’e-mail client n’a pas été envoyé${
            guest_email_delivery.error ? ` (${guest_email_delivery.error})` : ''
          }. Vérifiez l’adresse du client.`
        );
      }
      await openMessage(selected.id);
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

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      const result = await replyInboxMessage(selected.id, reply.trim());
      setReply('');
      setError(null);
      setInfo(result.to ? `Réponse envoyée à ${result.to}` : 'Réponse envoyée');
      await openMessage(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setBusy(false);
    }
  };

  const openReservationConversation = async (reservationId: number) => {
    try {
      setError(null);
      const hit = await resolveInboxByReservation(reservationId);
      if (hit.is_archived) {
        setArchived(true);
      } else {
        setArchived(false);
      }
      // Slight delay so list refresh with archived flag can settle; openMessage is independent.
      await openMessage(hit.message_id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Aucune conversation trouvée pour cette réservation'
      );
    }
  };

  const archiveSelected = async () => {
    if (!selected) return;
    await archiveInboxMessage(selected.id, !selected.is_archived);
    setSelected(null);
    setThread([]);
    setLinkedReservation(null);
    setSelectedKey(null);
    await refresh();
  };

  const setAutoforwardAndPersist = async (next: boolean) => {
    setAutoforward(next);
    await updateInboxSettings(next);
  };

  return {
    conversations,
    selected,
    thread,
    selectedKey,
    linkedReservation,
    inboxAddress,
    contactEmail,
    autoforward,
    archived,
    error,
    info,
    reply,
    importAtt,
    categories,
    importTitle,
    importCategory,
    importExpires,
    pendingStatus,
    busy,
    setError,
    setInfo,
    setArchived,
    setReply,
    setImportAtt,
    setImportTitle,
    setImportCategory,
    setImportExpires,
    setPendingStatus,
    refresh,
    openMessage,
    openReservationConversation,
    applyStatus,
    requestStatus,
    sendReply,
    archiveSelected,
    setAutoforwardAndPersist,
  };
}
