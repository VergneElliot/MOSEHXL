import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  SystemAdminLayout, 
  SystemDashboard, 
  EstablishmentsPage,
  SystemUsersPage,
  SystemSecurityLogsPage
} from '../SystemAdmin';

interface SystemAdminRouterProps {
  user: any;
}

const SystemAdminRouter: React.FC<SystemAdminRouterProps> = ({ user }) => {
  // Only allow system_admin role to access this router
  if (user?.role !== 'system_admin') {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <SystemAdminLayout>
      <Routes>
        <Route path="/" element={<SystemDashboard />} />
        <Route path="/system" element={<SystemDashboard />} />
        <Route path="/system/establishments" element={<EstablishmentsPage />} />
        <Route path="/system/establishments/create" element={<EstablishmentsPage />} />
        <Route path="/system/users" element={<SystemUsersPage />} />
        <Route path="/system/security-logs" element={<SystemSecurityLogsPage />} />
        <Route path="*" element={<Navigate to="/system" replace />} />
      </Routes>
    </SystemAdminLayout>
  );
};

export default SystemAdminRouter;