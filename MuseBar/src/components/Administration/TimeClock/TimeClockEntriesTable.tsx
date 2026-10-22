import React from 'react';
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import type { TimeEntryDto } from '../../../services/api/adminSpace';
import { formatDate } from '../../../utils/formatDate';
import { formatDuration, staffLabel } from './timeClockFormat';

type Props = {
  entries: TimeEntryDto[];
  onEdit: (entry: TimeEntryDto) => void;
  onDelete: (id: number) => void;
};

const TimeClockEntriesTable: React.FC<Props> = ({ entries, onEdit, onDelete }) => (
  <>
    <Typography variant="subtitle2" gutterBottom>
      Détail des pointages
    </Typography>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Employé</TableCell>
          <TableCell>Entrée</TableCell>
          <TableCell>Sortie</TableCell>
          <TableCell>Durée</TableCell>
          <TableCell>Source</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((e) => {
          const start = new Date(e.clock_in_at).getTime();
          const end = e.clock_out_at ? new Date(e.clock_out_at).getTime() : Date.now();
          return (
            <TableRow key={e.id}>
              <TableCell>
                {staffLabel({
                  first_name: e.first_name ?? null,
                  last_name: e.last_name ?? null,
                  email: e.email || '',
                })}
              </TableCell>
              <TableCell>{formatDate(e.clock_in_at)}</TableCell>
              <TableCell>{e.clock_out_at ? formatDate(e.clock_out_at) : '—'}</TableCell>
              <TableCell>{formatDuration(Math.max(0, end - start))}</TableCell>
              <TableCell>{e.source}</TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => onEdit(e)} aria-label="Modifier">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(e.id)}
                  aria-label="supprimer"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </>
);

export default TimeClockEntriesTable;
