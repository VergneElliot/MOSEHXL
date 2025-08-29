/**
 * Establishment Table Component
 * Displays the list of establishments in a table format with actions
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { Establishment } from './types';

interface EstablishmentTableProps {
  establishments: Establishment[];
  onView?: (establishment: Establishment) => void;
  onEdit?: (establishment: Establishment) => void;
  onDelete?: (establishment: Establishment) => void;
}

const EstablishmentTable: React.FC<EstablishmentTableProps> = ({
  establishments,
  onView,
  onEdit,
  onDelete
}) => {
  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPlanColor = (plan: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (plan) {
      case 'enterprise': return 'error';
      case 'premium': return 'warning';
      case 'basic': return 'success';
      default: return 'default';
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {establishments.map((establishment) => (
            <TableRow key={establishment.id}>
              <TableCell>{establishment.name}</TableCell>
              <TableCell>{establishment.email}</TableCell>
              <TableCell>{establishment.phone || '-'}</TableCell>
              <TableCell>
                <Chip
                  label={establishment.subscription_plan}
                  color={getPlanColor(establishment.subscription_plan)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={establishment.subscription_status}
                  color={getStatusColor(establishment.subscription_status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {new Date(establishment.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {onView && (
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onView(establishment)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {onEdit && (
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(establishment)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {onDelete && (
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete(establishment)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EstablishmentTable;

