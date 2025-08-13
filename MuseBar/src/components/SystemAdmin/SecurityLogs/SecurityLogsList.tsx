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
  AccordionDetails
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { SystemSecurityLog } from '../../../types/system';

interface SecurityLogsListProps {
  filters: any; // Filters will be used when connected to API
}

export const SecurityLogsList: React.FC<SecurityLogsListProps> = ({ filters }) => {
  // TODO: Replace with actual data from hook based on filters
  const logs: SystemSecurityLog[] = [
    {
      id: '1',
      user_id: '3',
      action_type: 'LOGIN',
      resource_type: 'SYSTEM',
      details: 'System administrator login successful',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      timestamp: '2025-08-01T10:00:00Z',
      severity: 'low'
    },
    {
      id: '2',
      user_id: '3',
      action_type: 'CREATE_ESTABLISHMENT',
      resource_type: 'ESTABLISHMENT',
      resource_id: 'est_001',
      details: 'New establishment created: Test Restaurant',
      ip_address: '192.168.1.100',
      timestamp: '2025-08-01T09:30:00Z',
      severity: 'medium'
    }
  ]; // Mock data

  const getSeverityColor = (
    severity: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  if (logs.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          Aucun événement de sécurité trouvé
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Ajustez les filtres pour voir plus d'événements
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
                <Typography variant="body2">
                  {formatTimestamp(log.timestamp)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  ID: {log.user_id}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={log.action_type} 
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2">
                    {log.resource_type}
                  </Typography>
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
                  {log.ip_address}
                </Typography>
              </TableCell>
              <TableCell>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {log.details}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Détails:</strong> {log.details}
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