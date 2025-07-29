import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, Button, Select, MenuItem, InputLabel, FormControl, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import { apiService } from '../services/apiService';

const ACTION_TYPES = [
  'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'AUTH_FAILED',
  'CREATE_USER', 'CREATE_USER_FAILED', 'SET_PERMISSIONS', 'SET_PERMISSIONS_FAILED',
  'CREATE_ORDER', 'UPDATE_ORDER', 'DELETE_ORDER',
  'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
  'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
  'EXPORT', 'SETTINGS_CHANGE'
];

const AuditTrailDashboard: React.FC<{ token: string }> = ({ token }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ user_id: '', action_type: '', resource_type: '', start: '', end: '' });
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
        limit: pageSize.toString(),
        offset: (page * pageSize).toString()
      });
      const response = await apiService.get<{ audit_entries: any[]; total: number }>(`/legal/audit/trail?${params.toString()}`);
      setLogs(response.data.audit_entries);
      setTotal(response.data.total);
    } catch {
      setError('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchLogs(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleFilter = () => {
    setPage(0);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({ user_id: '', action_type: '', resource_type: '', start: '', end: '' });
    setPage(0);
    fetchLogs();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Audit Trail (Journal de Sécurité)</Typography>
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField label="User ID" value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))} size="small" />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={filters.action_type}
              label="Action"
              onChange={e => setFilters(f => ({ ...f, action_type: e.target.value }))}
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {ACTION_TYPES.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Resource Type" value={filters.resource_type} onChange={e => setFilters(f => ({ ...f, resource_type: e.target.value }))} size="small" />
          <TextField label="Date début" type="date" InputLabelProps={{ shrink: true }} value={filters.start} onChange={e => setFilters(f => ({ ...f, start: e.target.value }))} size="small" />
          <TextField label="Date fin" type="date" InputLabelProps={{ shrink: true }} value={filters.end} onChange={e => setFilters(f => ({ ...f, end: e.target.value }))} size="small" />
          <Button variant="contained" onClick={handleFilter}>Filtrer</Button>
          <Button variant="outlined" onClick={handleClearFilters}>Réinitialiser</Button>
        </Box>
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date/Heure</TableCell>
              <TableCell>User ID</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Ressource</TableCell>
              <TableCell>Détails</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id} hover onClick={() => setSelected(log)} style={{ cursor: 'pointer' }}>
                <TableCell>{new Date(log.timestamp).toLocaleString('fr-FR')}</TableCell>
                <TableCell>{log.user_id}</TableCell>
                <TableCell>{log.action_type}</TableCell>
                <TableCell>{log.resource_type} {log.resource_id}</TableCell>
                <TableCell>{log.action_details ? (typeof log.action_details === 'string' ? log.action_details : JSON.stringify(log.action_details)) : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>Détail de l'action</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Typography><b>Date/Heure:</b> {new Date(selected.timestamp).toLocaleString('fr-FR')}</Typography>
              <Typography><b>User ID:</b> {selected.user_id}</Typography>
              <Typography><b>Action:</b> {selected.action_type}</Typography>
              <Typography><b>Ressource:</b> {selected.resource_type} {selected.resource_id}</Typography>
              <Typography><b>Détails:</b> <pre style={{ whiteSpace: 'pre-wrap' }}>{typeof selected.action_details === 'string' ? selected.action_details : JSON.stringify(selected.action_details, null, 2)}</pre></Typography>
              <Typography><b>IP:</b> {selected.ip_address}</Typography>
              <Typography><b>User Agent:</b> {selected.user_agent}</Typography>
              <Typography><b>Session:</b> {selected.session_id}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditTrailDashboard; 