import React from 'react';
import { Button, Stack } from '@mui/material';
import type { ReservationDto } from '../../../services/api/adminSpace';

type CommentStatus = 'confirmed' | 'on_hold' | 'refused';

type Props = {
  reservation: ReservationDto;
  onOpenComment: (id: number, status: CommentStatus) => void;
  onEdit: (reservation: ReservationDto) => void;
};

const ReservationStatusActions: React.FC<Props> = ({ reservation, onOpenComment, onEdit }) => (
  <>
    {reservation.status === 'requested' && (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
        <Button
          size="small"
          color="success"
          onClick={() => onOpenComment(reservation.id, 'confirmed')}
        >
          Confirmer
        </Button>
        <Button
          size="small"
          color="warning"
          onClick={() => onOpenComment(reservation.id, 'on_hold')}
        >
          En attente
        </Button>
        <Button
          size="small"
          color="error"
          onClick={() => onOpenComment(reservation.id, 'refused')}
        >
          Refuser
        </Button>
      </Stack>
    )}
    {reservation.status === 'on_hold' && (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
        <Button
          size="small"
          color="success"
          onClick={() => onOpenComment(reservation.id, 'confirmed')}
        >
          Confirmer
        </Button>
        <Button
          size="small"
          color="error"
          onClick={() => onOpenComment(reservation.id, 'refused')}
        >
          Refuser
        </Button>
      </Stack>
    )}
    <Button size="small" onClick={() => onEdit(reservation)}>
      Modifier
    </Button>
  </>
);

export default ReservationStatusActions;
