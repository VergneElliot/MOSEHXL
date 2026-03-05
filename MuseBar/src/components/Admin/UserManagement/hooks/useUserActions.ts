/**
 * User Actions
 * Handles user CRUD operations and API interactions
 */

import { useCallback } from 'react';
import { apiService } from '../../../../services/apiService';
import { EstablishmentMember as User } from '../../../../types/auth';

/** Raw shape returned by the backend (snake_case). */
interface ApiUser {
  id: number;
  email: string;
  is_admin: boolean;
  role: string;
  establishment_id: string | null;
  first_name?: string;
  last_name?: string;
  permissions?: string[];
}

function mapApiUser(raw: ApiUser): User {
  return {
    id: raw.id,
    email: raw.email,
    isAdmin: raw.is_admin,
    role: raw.role,
    establishment_id: raw.establishment_id,
    permissions: raw.permissions,
  };
}

interface UseUserActionsProps {
  onUsersUpdate: (users: User[]) => void;
  onUserAdd: (user: User) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
}

export const useUserActions = ({
  onUsersUpdate,
  onUserAdd,
  onLoading,
  onError,
}: UseUserActionsProps) => {

  const fetchUsers = useCallback(async () => {
    onLoading(true);
    onError(null);
    
    try {
      const response = await apiService.get<ApiUser[]>('/auth/users');
      onUsersUpdate(response.data.map(mapApiUser));
    } catch {
      onError('Failed to load users');
    } finally {
      onLoading(false);
    }
  }, [onUsersUpdate, onLoading, onError]);

  /**
   * Create a new user in the establishment.
   * isAdmin=true maps to role 'establishment_admin'; false maps to 'cashier'.
   */
  const createUser = useCallback(async (
    email: string,
    password: string,
    isAdmin: boolean
  ): Promise<boolean> => {
    onError(null);
    
    try {
      const response = await apiService.post<ApiUser>('/auth/users', {
        email,
        password,
        role: isAdmin ? 'establishment_admin' : 'cashier',
      });
      
      onUserAdd(mapApiUser(response.data));
      return true;
    } catch {
      onError('Failed to create user');
      return false;
    }
  }, [onUserAdd, onError]);

  const deleteUser = useCallback(async (userId: number): Promise<boolean> => {
    onError(null);
    
    try {
      await apiService.delete(`/auth/users/${userId}`);
      return true;
    } catch {
      onError('Failed to delete user');
      return false;
    }
  }, [onError]);

  /**
   * Update user role.
   * isAdmin=true sets role to 'establishment_admin'; false sets role to 'cashier'.
   */
  const updateUserRole = useCallback(async (
    userId: number,
    isAdmin: boolean
  ): Promise<boolean> => {
    onError(null);
    
    try {
      await apiService.put(`/auth/users/${userId}/role`, {
        role: isAdmin ? 'establishment_admin' : 'cashier',
      });
      return true;
    } catch {
      onError('Failed to update user role');
      return false;
    }
  }, [onError]);

  return {
    fetchUsers,
    createUser,
    deleteUser,
    updateUserRole,
  };
};
