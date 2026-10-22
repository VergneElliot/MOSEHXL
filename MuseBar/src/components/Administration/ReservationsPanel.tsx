import React from 'react';
import { Alert, Box } from '@mui/material';
import AdminMonthCalendar from './AdminMonthCalendar';
import ReservationEditDialog from './ReservationEditDialog';
import ReservationCommentDialog from './Reservations/ReservationCommentDialog';
import ReservationsToolbar from './Reservations/ReservationsToolbar';
import ReservationsUpcomingList from './Reservations/ReservationsUpcomingList';
import { localDateKey } from './Reservations/reservationConstants';
import { useReservationsPanel } from './Reservations/useReservationsPanel';

type ReservationsPanelProps = {
  onOpenConversation?: (reservationId: number) => void;
};

const ReservationsPanel: React.FC<ReservationsPanelProps> = ({ onOpenConversation }) => {
  const panel = useReservationsPanel({ onOpenConversation });

  return (
    <Box>
      {panel.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => panel.setError(null)}>
          {panel.error}
        </Alert>
      )}
      {!panel.hoursConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Configurez les plages de réservations dans Paramètres → Plages de réservations pour
          activer le calendrier public.
        </Alert>
      )}
      <ReservationsToolbar
        publicUrl={panel.publicUrl}
        icsUrl={panel.icsUrl}
        onCreate={() => panel.openCreate()}
        onCopyPublicLink={() => void panel.copyPublicLink()}
      />
      <AdminMonthCalendar
        month={panel.month}
        onMonthChange={panel.setMonth}
        items={panel.calendarItems}
        onDayClick={(day) => panel.openCreate(day)}
        onItemClick={(item) => {
          const row = panel.rows.find((r) => r.id === item.id);
          if (row) panel.openEdit(row);
        }}
        dayClosed={(day) => panel.closedDates.includes(localDateKey(day))}
      />
      <ReservationsUpcomingList
        upcomingRows={panel.upcomingRows}
        onOpenComment={(id, status) =>
          panel.setCommentDialog({ id, status, commentaire: '' })
        }
        onEdit={panel.openEdit}
      />
      <ReservationEditDialog
        open={panel.open}
        edit={panel.edit}
        dayContext={panel.dayContext}
        dialogTab={panel.dialogTab}
        selectedDayClosed={panel.selectedDayClosed}
        dayStatusBusy={panel.dayStatusBusy}
        conversationBusy={panel.conversationBusy}
        onClose={panel.closeDialog}
        onDialogTabChange={panel.setDialogTab}
        onEditChange={panel.setEdit}
        onSave={() => {
          void (async () => {
            try {
              await panel.saveEdit();
            } catch (err) {
              panel.setError(err instanceof Error ? err.message : 'Enregistrement impossible');
            }
          })();
        }}
        onToggleDayClosed={(closed) => void panel.toggleDayClosed(closed)}
        onOpenConversation={
          panel.edit?.id && onOpenConversation
            ? () => {
                void panel.openConversation();
              }
            : undefined
        }
      />
      <ReservationCommentDialog
        commentDialog={panel.commentDialog}
        onChange={panel.setCommentDialog}
        onSubmit={() => {
          void panel.submitComment();
        }}
      />
    </Box>
  );
};

export default ReservationsPanel;
