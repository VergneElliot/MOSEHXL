import React from 'react';
import { Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  formatResumeQty,
  groupResumeLines,
  resumeAgeLabel,
  resumeStatusChipColor,
  resumeStatusLabel,
  type ResumeGroupedLine,
} from './tableResumeDisplay';
import type { ResumeTicketItem } from './tableResumeTimers';

type Props = {
  items: ResumeTicketItem[];
  nowMs: number;
};

const TableResumeLinesList: React.FC<Props> = ({ items, nowMs }) => {
  const grouped = groupResumeLines(items);
  if (grouped.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune ligne sur cette addition.
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {grouped.map((line) => (
        <ResumeGroupedRow key={line.key} line={line} nowMs={nowMs} />
      ))}
    </List>
  );
};

function ResumeGroupedRow({ line, nowMs }: { line: ResumeGroupedLine; nowMs: number }) {
  return (
    <ListItem
      disableGutters
      secondaryAction={
        <Typography variant="body2" sx={{ opacity: line.muted ? 0.6 : 1 }}>
          {formatCurrency(line.total_price)}
        </Typography>
      }
      sx={{ opacity: line.muted ? 0.65 : 1, alignItems: 'flex-start' }}
    >
      <ListItemText
        primary={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" fontWeight={600}>
              {formatResumeQty(line.quantity)} {line.product_name}
            </Typography>
            <Chip
              size="small"
              label={resumeStatusLabel(line.status)}
              color={resumeStatusChipColor(line.status)}
              variant="outlined"
            />
          </Stack>
        }
        secondary={resumeAgeLabel(line.status, line.stepIso, nowMs)}
      />
    </ListItem>
  );
}

export default TableResumeLinesList;
