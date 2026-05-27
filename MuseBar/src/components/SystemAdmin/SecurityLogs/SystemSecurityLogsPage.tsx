import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SecurityLogsStats } from './SecurityLogsStats';
import { SecurityLogsList } from './SecurityLogsList';
import { SecurityLogsFilter } from './SecurityLogsFilter';
import type { SecurityLogFilters } from '../../../types/system';

const SystemSecurityLogsPage: React.FC = () => {
  const [filters, setFilters] = useState<SecurityLogFilters>({
    severity: [],
    dateRange: { start: null, end: null },
    actionType: [],
    userId: ''
  });

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Journal de Sécurité Système
      </Typography>

      <SecurityLogsStats />
      
      <SecurityLogsFilter 
        filters={filters}
        onChange={setFilters}
      />
      
      <SecurityLogsList filters={filters} />
    </Box>
  );
};

export default SystemSecurityLogsPage;