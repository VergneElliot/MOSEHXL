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
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { SystemSecurityLog } from '../../../types/system';

interface SecurityLogsListProps {
  logs: SystemSecurityLog[];
  loading?: boolean;
}

export const SecurityLogsList: React.FC<SecurityLogsListProps> = ({ logs, loading }) => {
  const getSeverityColor = (
    severity: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (logs.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          Aucun événement de sécurité trouvé
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Ajustez les filtres pour voir plus d&apos;événements
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Horodatage</TableCell>
            <TableCell>Utilisateur</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Ressource</TableCell>
            <TableCell>Sévérité</TableCell>
            <TableCell>IP</TableCell>
            <TableCell>Détails</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <Typography variant="body2">{formatTimestamp(log.timestamp)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {log.user_id ? `ID: ${log.user_id}` : '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={log.action_type} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2">{log.resource_type}</Typography>
                  {log.resource_id && (
                    <Typography variant="caption" color="textSecondary">
                      {log.resource_id}
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={log.severity}
                  color={getSeverityColor(log.severity)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {log.ip_address || '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {log.details || '—'}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Détails:</strong> {log.details || '—'}
                    </Typography>
                    {log.user_agent && (
                      <Typography variant="caption" color="textSecondary">
                        <strong>User Agent:</strong> {log.user_agent}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
