import React from 'react';
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { StaffLeaveDto } from '../../../services/api/adminSpace';
import { LEAVE_TYPE_LABELS } from './planningTypes';

type Props = {
  leaves: StaffLeaveDto[];
  nameOf: (id: number) => string;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
};

const PlanningLeavePending: React.FC<Props> = ({ leaves, nameOf, onApprove, onReject }) => {
  const pending = leaves.filter((l) => l.status === 'pending');
  if (pending.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Congés en attente d&apos;approbation
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Employé</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Période</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pending.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{nameOf(l.user_id)}</TableCell>
              <TableCell>{LEAVE_TYPE_LABELS[l.leave_type] ?? l.leave_type}</TableCell>
              <TableCell>
                {l.starts_on} → {l.ends_on}
              </TableCell>
              <TableCell align="right">
                <Button size="small" color="success" onClick={() => onApprove(l.id)}>
                  Approuver
                </Button>
                <Button size="small" color="error" onClick={() => onReject(l.id)}>
                  Refuser
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default PlanningLeavePending;
