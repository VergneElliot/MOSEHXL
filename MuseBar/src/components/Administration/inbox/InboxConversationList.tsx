import React from 'react';
import { Box, Chip, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import type { InboxConversationDto } from '../../../services/api/adminInboxApi';
import { formatDate } from '../../../utils/formatDate';
import { INBOX_RESERVATION_STATUS_LABEL as STATUS_LABEL } from '../inboxReservationLabels';

type Props = {
  conversations: InboxConversationDto[];
  selectedKey: string | null;
  onSelect: (latestMessageId: number) => void;
};

function counterpartLabel(c: InboxConversationDto): string {
  if (c.counterpart_name?.trim()) return c.counterpart_name.trim();
  if (c.counterpart_email) return c.counterpart_email;
  return 'Conversation';
}

function snippet(c: InboxConversationDto): string {
  const raw = (c.latest_snippet || '').replace(/\s+/g, ' ').trim();
  if (!raw) return c.latest_subject || '(sans objet)';
  return raw.length > 90 ? `${raw.slice(0, 90)}…` : raw;
}

const InboxConversationList: React.FC<Props> = ({ conversations, selectedKey, onSelect }) => (
  <List
    dense
    sx={{
      border: 1,
      borderColor: 'divider',
      borderRadius: 2,
      maxHeight: { xs: 360, md: 640 },
      overflow: 'auto',
      bgcolor: 'background.paper',
    }}
  >
    {conversations.map((c) => {
      const selected = selectedKey === c.conversation_key;
      const statusLabel =
        c.reservation_status != null
          ? STATUS_LABEL[c.reservation_status] || c.reservation_status
          : null;
      return (
        <ListItemButton
          key={c.conversation_key}
          selected={selected}
          onClick={() => onSelect(c.latest_message_id)}
          sx={{
            alignItems: 'flex-start',
            py: 1.25,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {c.unread_count > 0 && (
                  <Chip size="small" color="primary" label={c.unread_count > 1 ? `${c.unread_count}` : 'Nouveau'} />
                )}
                <Typography noWrap fontWeight={c.unread_count > 0 ? 700 : 600} sx={{ maxWidth: '100%' }}>
                  {counterpartLabel(c)}
                </Typography>
                {statusLabel && <Chip size="small" variant="outlined" label={statusLabel} />}
              </Box>
            }
            secondary={
              <Box component="span" sx={{ display: 'block' }}>
                <Typography component="span" variant="body2" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {snippet(c)}
                </Typography>
                <Typography component="span" variant="caption" color="text.disabled">
                  {formatDate(c.last_activity_at)}
                  {c.reservation_party_size != null ? ` · ${c.reservation_party_size} pers.` : ''}
                  {c.message_count > 1 ? ` · ${c.message_count} messages` : ''}
                </Typography>
              </Box>
            }
          />
        </ListItemButton>
      );
    })}
    {conversations.length === 0 && (
      <Typography sx={{ p: 2 }} color="text.secondary">
        Aucune conversation
      </Typography>
    )}
  </List>
);

export default InboxConversationList;
