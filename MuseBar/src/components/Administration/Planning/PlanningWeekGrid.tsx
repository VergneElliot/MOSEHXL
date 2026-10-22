import React from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDateOnly, formatTime } from '../../../utils/formatDate';
import { isPendingShift, type DisplayShift, type PlanningStaffMember } from './planningTypes';

type Props = {
  staff: PlanningStaffMember[];
  days: Date[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onOpenCreate: (day: Date) => void;
  onOpenCreateForStaff: (userId: number, day: Date) => void;
  onCopyIcs: (userId: number) => void;
  onDeleteShift: (shift: DisplayShift) => void;
  nameOf: (id: number) => string;
  colorOf: (id: number) => string;
  shiftsFor: (userId: number, day: Date) => DisplayShift[];
};

const PlanningWeekGrid: React.FC<Props> = ({
  staff,
  days,
  weekStart,
  onPrevWeek,
  onNextWeek,
  onOpenCreate,
  onOpenCreateForStaff,
  onCopyIcs,
  onDeleteShift,
  nameOf,
  colorOf,
  shiftsFor,
}) => (
  <>
    <Typography variant="subtitle2" sx={{ mb: 1 }}>
      Grille semaine (par employé)
    </Typography>
    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button onClick={onPrevWeek}>Semaine précédente</Button>
      <Typography fontWeight={600}>Semaine du {formatDateOnly(weekStart)}</Typography>
      <Button onClick={onNextWeek}>Semaine suivante</Button>
    </Box>

    <Table size="small" sx={{ '@media print': { fontSize: 12 } }}>
      <TableHead>
        <TableRow>
          <TableCell>Employé</TableCell>
          {days.map((d) => (
            <TableCell
              key={d.toISOString()}
              onClick={() => onOpenCreate(d)}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              title="Cliquer pour ajouter une vacation ce jour"
            >
              {formatDateOnly(d)}
            </TableCell>
          ))}
          <TableCell>ICS</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {staff.map((u) => (
          <TableRow key={u.id}>
            <TableCell>{nameOf(u.id)}</TableCell>
            {days.map((d) => (
              <TableCell
                key={`${u.id}-${d.toISOString()}`}
                sx={{
                  verticalAlign: 'top',
                  cursor: 'pointer',
                  minWidth: 90,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => onOpenCreateForStaff(u.id, d)}
              >
                {shiftsFor(u.id, d).map((s) => {
                  const pending = isPendingShift(s);
                  return (
                    <Box
                      key={s.id}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        bgcolor: pending ? 'warning.main' : colorOf(s.user_id),
                        color: pending ? 'warning.contrastText' : 'common.white',
                        borderRadius: 1,
                        p: 0.5,
                        mb: 0.5,
                        fontSize: 12,
                      }}
                      title={
                        s._draft
                          ? 'Non enregistré'
                          : pending
                            ? 'En attente de confirmation employé'
                            : undefined
                      }
                    >
                      {formatTime(s.starts_at)}–{formatTime(s.ends_at)}
                      {s.label ? ` ${s.label}` : ''}
                      {s._draft ? ' *' : pending ? ' (attente)' : ''}
                      <Button
                        size="small"
                        sx={{ color: 'inherit', minWidth: 0, p: 0, ml: 0.5 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteShift(s);
                        }}
                      >
                        ×
                      </Button>
                    </Box>
                  );
                })}
              </TableCell>
            ))}
            <TableCell>
              <Button size="small" onClick={() => onCopyIcs(u.id)}>
                Copier ICS
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </>
);

export default PlanningWeekGrid;
