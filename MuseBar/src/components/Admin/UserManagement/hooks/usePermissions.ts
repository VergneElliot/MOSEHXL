/**
 * Permission Management
 * Handles user permission operations and state
 */

import { useState, useCallback } from 'react';
import { apiService } from '../../../../services/apiService';
import { EstablishmentMember as User, ALL_PERMISSIONS as PERMISSIONS } from '../../../../types/auth';

export { PERMISSIONS };

interface PermissionDialog {
  open: boolean;
  user: User | null;
}

export const usePermissions = () => {
  const [permDialog, setPermDialog] = useState<PermissionDialog>({
    open: false,
    user: null,
  });
  const [permState, setPermState] = useState<{ [key: string]: boolean }>({});
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  /**
   * Open permission dialog for a user
   */
  const openPermDialog = useCallback(async (user: User) => {
    setPermDialog({ open: true, user });
    setPermError(null);
    
    try {
      const response = await apiService.get<{ permissions: string[] }>(`/auth/users/${user.id}/permissions`);
      const data = response.data;
      const state: { [key: string]: boolean } = {};
      
      PERMISSIONS.forEach(p => {
        state[p.key] = data.permissions?.includes(p.key) || false;
      });
      
      setPermState(state);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermError('Failed to load user permissions');
    }
  }, []);

  /**
   * Close permission dialog
   */
  const closePermDialog = useCallback(() => {
    setPermDialog({ open: false, user: null });
    setPermState({});
    setPermError(null);
  }, []);

  /**
   * Update permission state
   */
  const updatePermission = useCallback((permissionKey: string, enabled: boolean) => {
    setPermState(prev => ({
      ...prev,
      [permissionKey]: enabled,
    }));
  }, []);

  /**
   * Save user permissions
   */
  const savePermissions = useCallback(async (): Promise<boolean> => {
    if (!permDialog.user) return false;
    
    setPermSaving(true);
    setPermError(null);
    
    const userId = permDialog.user.id;
    const enabledPermissions = Object.keys(permState).filter(k => permState[k]);
    
    try {
      await apiService.put(`/auth/users/${userId}/permissions`, {
        permissions: enabledPermissions,
      });
      
      closePermDialog();
      return true;
    } catch (error) {
      console.error('Failed to save permissions:', error);
      setPermError('Failed to save permissions');
      return false;
    } finally {
      setPermSaving(false);
    }
  }, [permDialog.user, permState, closePermDialog]);

  /**
   * Toggle all permissions
   */
  const toggleAllPermissions = useCallback((enabled: boolean) => {
    const newState: { [key: string]: boolean } = {};
    PERMISSIONS.forEach(p => {
      newState[p.key] = enabled;
    });
    setPermState(newState);
  }, []);

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback((permissionKey: string): boolean => {
    return permState[permissionKey] || false;
  }, [permState]);

  /**
   * Get enabled permissions count
   */
  const getEnabledCount = useCallback((): number => {
    return Object.values(permState).filter(Boolean).length;
  }, [permState]);

  return {
    // Dialog state
    permDialog,
    permState,
    permSaving,
    permError,
    
    // Actions
    openPermDialog,
    closePermDialog,
    updatePermission,
    savePermissions,
    toggleAllPermissions,
    
    // Utilities
    hasPermission,
    getEnabledCount,
    
    // Constants
    availablePermissions: PERMISSIONS,
  };
};
