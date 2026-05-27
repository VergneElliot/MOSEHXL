import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { TableColumn, BaseComponentProps } from '../../types/ui';
import LoadingSpinner from './LoadingSpinner';

interface DataTableProps<T extends Record<string, unknown>> extends BaseComponentProps {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  renderActions?: (row: T, index: number) => React.ReactNode;
  keyField?: keyof T;
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  error,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  renderActions,
  keyField = 'id' as keyof T,
  className,
  'data-testid': testId,
}: DataTableProps<T>) {
  const toCellDisplayValue = (input: unknown): React.ReactNode => {
    if (input == null || React.isValidElement(input)) {
      return input;
    }
    return String(input);
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des données..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} className={className} data-testid={testId}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map(column => (
              <TableCell
                key={String(column.id)}
                align={column.align || 'left'}
                style={{ minWidth: column.minWidth }}
              >
                {column.label}
              </TableCell>
            ))}
            {renderActions && <TableCell align="center">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              hover
              key={String(row[keyField]) || index}
              onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map(column => {
                const value = row[column.id];
                const formattedValue = column.format ? column.format(value) : value;
                const displayValue = toCellDisplayValue(formattedValue);

                return (
                  <TableCell key={String(column.id)} align={column.align || 'left'}>
                    {displayValue}
                  </TableCell>
                );
              })}
              {renderActions && (
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    {renderActions(row, index)}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DataTable;
