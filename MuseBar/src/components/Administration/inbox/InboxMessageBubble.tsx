import React from 'react';
import { Box, Typography } from '@mui/material';
import type { InboxMessageDto } from '../../../services/api/adminInboxApi';
import { formatDate } from '../../../utils/formatDate';

type Props = {
  message: InboxMessageDto;
};

const InboxMessageBubble: React.FC<Props> = ({ message }) => {
  const outbound = message.direction === 'outbound';
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: outbound ? 'flex-end' : 'flex-start',
        mb: 1.25,
      }}
    >
      <Box
        sx={{
          maxWidth: '85%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          borderTopRightRadius: outbound ? 0.5 : 2,
          borderTopLeftRadius: outbound ? 2 : 0.5,
          bgcolor: outbound
            ? 'primary.main'
            : (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
          color: outbound ? 'primary.contrastText' : 'text.primary',
          border: outbound ? 'none' : '1px solid',
          borderColor: outbound ? 'transparent' : 'divider',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            opacity: 0.85,
            display: 'block',
            mb: 0.5,
            color: outbound ? 'inherit' : 'text.secondary',
          }}
        >
          {outbound ? 'Établissement' : message.from_address} · {formatDate(message.received_at)}
        </Typography>
        <Typography
          component="pre"
          sx={{
            m: 0,
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            lineHeight: 1.45,
            color: 'inherit',
          }}
        >
          {message.text_body || '(pas de texte)'}
        </Typography>
      </Box>
    </Box>
  );
};

export default InboxMessageBubble;
