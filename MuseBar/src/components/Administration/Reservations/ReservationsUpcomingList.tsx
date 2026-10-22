import React from 'react';
import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ReservationDto } from '../../../services/api/adminSpace';
import { formatDate } from '../../../utils/formatDate';
import ReservationStatusActions from './ReservationStatusActions';
import { STATUSES, statusColor } from './reservationConstants';

type CommentStatus = 'confirmed' | 'on_hold' | 'refused';

type Props = {
  upcomingRows: ReservationDto[];
  onOpenComment: (id: number, status: CommentStatus) => void;
  onEdit: (reservation: ReservationDto) => void;
};

const ReservationsUpcomingList: React.FC<Props> = ({
  upcomingRows,
  onOpenComment,
  onEdit,
}) => (
  <>
    <Typography variant="subtitle2" sx={{ mb: 1 }}>
      À venir
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      Les réservations passées restent visibles sur le calendrier (cliquer pour modifier / no-show).
    </Typography>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Date</TableCell>
          <TableCell>Client</TableCell>
          <TableCell>Nombre de personnes</TableCell>
          <TableCell>Statut</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {upcomingRows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{formatDate(r.starts_at)}</TableCell>
            <TableCell>
              <Typography fontWeight={600}>{r.customer_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {[r.customer_phone, r.customer_email].filter(Boolean).join(' · ')}
              </Typography>
              {r.guest_reliability?.flagged && (
                <Chip
                  size="small"
                  color="error"
                  label={`No-show (${r.guest_reliability.flag_count}×)`}
                  sx={{ mt: 0.5 }}
                />
              )}
              {r.status_reason && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Commentaire : {r.status_reason}
                </Typography>
              )}
            </TableCell>
            <TableCell>{r.party_size}</TableCell>
            <TableCell>
              <Chip
                size="small"
                color={statusColor(r.status)}
                label={STATUSES.find((s) => s.id === r.status)?.label ?? r.status}
              />
            </TableCell>
            <TableCell align="right">
              <ReservationStatusActions
                reservation={r}
                onOpenComment={onOpenComment}
                onEdit={onEdit}
              />
            </TableCell>
          </TableRow>
        ))}
        {upcomingRows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5}>
              <Typography color="text.secondary">Aucune réservation à venir</Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </>
);

export default ReservationsUpcomingList;
