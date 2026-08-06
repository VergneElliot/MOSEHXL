import React, { useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { SecurityLogsStats } from './SecurityLogsStats';
import { SecurityLogsList } from './SecurityLogsList';
import { SecurityLogsFilter } from './SecurityLogsFilter';
import { useSystemSecurityLogs } from '../../../hooks/useSystemSecurityLogs';
import type { SecurityLogFilters } from '../../../types/system';

const SystemSecurityLogsPage: React.FC = () => {
  const [filters, setFilters] = useState<SecurityLogFilters>({
    severity: [],
    dateRange: { start: null, end: null },
    actionType: [],
    userId: '',
  });

  const { logs, total, loading, error } = useSystemSecurityLogs(filters);

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Journal de Sécurité Système
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SecurityLogsStats logs={logs} total={total} />

      <SecurityLogsFilter filters={filters} onChange={setFilters} />

      <SecurityLogsList logs={logs} loading={loading} />
    </Box>
  );
};

export default SystemSecurityLogsPage;
