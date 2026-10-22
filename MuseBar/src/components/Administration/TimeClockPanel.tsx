import React from 'react';
import { Alert, Box, Button, Tab, Tabs, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { User } from '../../types/auth';
import TimeClockEditEntryDialog from './TimeClock/TimeClockEditEntryDialog';
import TimeClockHoursReport from './TimeClock/TimeClockHoursReport';
import TimeClockPayrollReport from './TimeClock/TimeClockPayrollReport';
import TimeClockPresence from './TimeClock/TimeClockPresence';
import { useTimeClockPanel } from './TimeClock/useTimeClockPanel';

interface TimeClockPanelProps {
  user: User;
}

const TimeClockPanel: React.FC<TimeClockPanelProps> = ({ user }) => {
  const clock = useTimeClockPanel(user);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5">Pointage</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
            Ouvrir un badge PIN = entrée ; fermer le badge = sortie. Libérez ou transférez
            les tables ouvertes avant de fermer un badge. Les corrections manuelles restent
            disponibles pour les managers.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => void clock.refreshStaff()}
          disabled={clock.loading}
        >
          Actualiser
        </Button>
      </Box>

      {clock.error && (
        <Alert severity="error" onClose={() => clock.setError(null)}>
          {clock.error}
        </Alert>
      )}
      {clock.message && (
        <Alert severity="success" onClose={() => clock.setMessage(null)}>
          {clock.message}
        </Alert>
      )}

      {clock.canManage && (
        <Tabs
          value={clock.tab}
          onChange={(_, v) => clock.setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Présence" />
          <Tab label="Rapport heures" />
          <Tab label="Synthèse paie" />
        </Tabs>
      )}

      {(clock.tab === 0 || !clock.canManage) && (
        <TimeClockPresence
          staff={clock.staff}
          currentlyIn={clock.currentlyIn}
          loading={clock.loading}
        />
      )}

      {clock.canManage && clock.tab === 1 && (
        <TimeClockHoursReport
          from={clock.from}
          to={clock.to}
          reportLoading={clock.reportLoading}
          totals={clock.totals}
          entries={clock.entries}
          onFromChange={clock.setFrom}
          onToChange={clock.setTo}
          onRefresh={() => void clock.refreshReport()}
          onEdit={clock.openEdit}
          onDelete={(id) => void clock.removeEntry(id)}
        />
      )}

      {clock.canManage && clock.tab === 2 && (
        <TimeClockPayrollReport
          from={clock.from}
          to={clock.to}
          reportLoading={clock.reportLoading}
          payroll={clock.payroll}
          onFromChange={clock.setFrom}
          onToChange={clock.setTo}
          onRefresh={() => void clock.refreshPayroll()}
        />
      )}

      <TimeClockEditEntryDialog
        open={Boolean(clock.editEntry)}
        editIn={clock.editIn}
        editOut={clock.editOut}
        editNote={clock.editNote}
        onClose={() => clock.setEditEntry(null)}
        onEditInChange={clock.setEditIn}
        onEditOutChange={clock.setEditOut}
        onEditNoteChange={clock.setEditNote}
        onSave={() => void clock.saveEdit()}
      />
    </Box>
  );
};

export default TimeClockPanel;
