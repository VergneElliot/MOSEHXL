import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, Lock as LockIcon } from '@mui/icons-material';
import type { PinPortalCardDto } from '../../services/api/pin';
import { SOLID, cardTone, formatClockIn } from './pinPortalCardLogic';

export type PinPortalStaffCardProps = {
  card: PinPortalCardDto;
  unlockedHere: boolean;
  onOpen: (card: PinPortalCardDto) => void;
  onCloseBadge: (e: React.MouseEvent, card: PinPortalCardDto) => void;
};

export const PinPortalStaffCard: React.FC<PinPortalStaffCardProps> = ({
  card,
  unlockedHere,
  onOpen,
  onCloseBadge,
}) => {
  const tone = cardTone(card);
  const { bg, fg } = SOLID[tone];
  const dimmed = card.badge === 'open' && !unlockedHere;
  const clockIn = formatClockIn(card.clock_in_at);

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        bgcolor: bg,
        color: fg,
        borderRadius: 2,
        minHeight: { xs: 220, sm: 240 },
        overflow: 'hidden',
        boxShadow: dimmed ? 'none' : '0 8px 24px rgba(0,0,0,0.35)',
        '&::after': dimmed
          ? {
              content: '""',
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.55)',
              pointerEvents: 'none',
              zIndex: 1,
            }
          : undefined,
        filter: dimmed ? 'grayscale(0.85) brightness(0.65)' : 'none',
      }}
    >
      {card.badge === 'open' && (
        <IconButton
          aria-label={`Fermer le badge de ${card.display_name}`}
          onClick={(e) => onCloseBadge(e, card)}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 3,
            color: '#fff',
            bgcolor: 'rgba(0,0,0,0.45)',
            '&:hover': { bgcolor: 'rgba(183,28,28,0.95)' },
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      )}
      <CardActionArea
        onClick={() => onOpen(card)}
        sx={{ height: '100%', position: 'relative', zIndex: 2 }}
      >
        <CardContent
          sx={{
            height: '100%',
            minHeight: { xs: 220, sm: 240 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 2.5,
            pr: card.badge === 'open' ? 5 : 2.5,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ color: fg, lineHeight: 1.2, mb: 1.5 }}
            >
              {card.display_name}
            </Typography>
            {dimmed && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <LockIcon sx={{ fontSize: 18, color: fg, opacity: 0.95 }} />
                <Typography variant="body2" sx={{ color: fg, fontWeight: 600 }}>
                  Autre appareil — PIN
                </Typography>
              </Stack>
            )}
          </Box>

          <Stack spacing={0.75}>
            {clockIn && (
              <Typography variant="body2" sx={{ color: fg, opacity: 0.95 }}>
                Entrée {clockIn}
              </Typography>
            )}
            {card.owned_table_count > 0 ? (
              <Typography variant="body2" sx={{ color: fg, fontWeight: 600 }}>
                Tables · {card.owned_tables.map((t) => t.label).join(', ')}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: fg, opacity: 0.75 }}>
                {tone === 'red' ? 'Aucune table' : 'Pas de table ouverte'}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};
