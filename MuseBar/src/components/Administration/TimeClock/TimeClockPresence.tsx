import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import type { TimeClockStaffDto } from '../../../services/api/adminSpace';
import { staffLabel } from './timeClockFormat';

type Props = {
  staff: TimeClockStaffDto[];
  currentlyIn: TimeClockStaffDto[];
  loading: boolean;
};

const TimeClockPresence: React.FC<Props> = ({ staff, currentlyIn, loading }) => (
  <Box>
    <Alert severity="info" sx={{ mb: 2 }}>
      Pas de boutons de pointage ici — utilisez le pavé PIN (ouvrir / fermer badge).
    </Alert>
    {currentlyIn.length > 0 && (
      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'success.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          En service ({currentlyIn.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {currentlyIn.map((s) => (
            <Chip key={s.id} color="success" label={staffLabel(s)} />
          ))}
        </Box>
      </Paper>
    )}

    {loading ? (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    ) : staff.length === 0 ? (
      <Alert severity="info">Aucun employé rattaché à cet établissement.</Alert>
    ) : (
      <Grid container spacing={2}>
        {staff.map((s) => {
          const inService = Boolean(s.open_entry);
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={s.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: '100%',
                  borderWidth: inService ? 2 : 1,
                  borderColor: inService ? 'success.main' : 'divider',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {staffLabel(s)}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  {s.email}
                </Typography>
                <Chip
                  size="small"
                  sx={{ mt: 1.5 }}
                  color={inService ? 'success' : 'default'}
                  label={inService ? 'En service' : 'Hors service'}
                />
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    )}
  </Box>
);

export default TimeClockPresence;
