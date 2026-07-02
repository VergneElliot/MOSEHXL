/**
 * Lazy-loaded establishment tab panels (Phase 6 code splitting).
 * POS stays eagerly imported in AppRouter — cashier cold path only.
 */

import React from 'react';
import { Box, CircularProgress } from '@mui/material';

export function TabPanelFallback(): React.ReactElement {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={200} p={3}>
      <CircularProgress />
    </Box>
  );
}

export const LazyMenuContainer = React.lazy(() =>
  import('../Menu').then(mod => ({ default: mod.MenuContainer }))
);

export const LazyHistoryContainer = React.lazy(() =>
  import('../History').then(mod => ({ default: mod.HistoryContainer }))
);

export const LazySettings = React.lazy(() => import('../Settings'));

export const LazyLegalComplianceDashboard = React.lazy(() =>
  import('../Legal').then(mod => ({ default: mod.LegalComplianceDashboard }))
);

export const LazyClosureContainer = React.lazy(() =>
  import('../Closure').then(mod => ({ default: mod.ClosureContainer }))
);

export const LazyUserManagement = React.lazy(() => import('../Admin/UserManagement'));

export const LazyAuditTrailDashboard = React.lazy(() => import('../Admin/AuditTrailDashboard'));
