/**
 * User Actions
 * Handles user CRUD operations and API interactions
 */

import { useCallback } from 'react';
import { apiService } from '../../../../services/apiService';

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  permissions?: string[];
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

  /**
   * Fetch all users from API
   */
  const fetchUsers = useCallback(async () => {
    onLoading(true);
    onError(null);
    
    try {
      const response = await apiService.get<User[]>('/auth/users');
      onUsersUpdate(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      onError('Failed to load users');
    } finally {
      onLoading(false);
    }
  }, [onUsersUpdate, onLoading, onError]);

  /**
   * Create a new user
   */
  const createUser = useCallback(async (
    email: string,
    password: string,
    isAdmin: boolean
  ): Promise<boolean> => {
    onError(null);
    
    try {
      const response = await apiService.post<User>('/auth/users', {
        email,
        password,
        isAdmin,
      });
      
      onUserAdd(response.data);
      return true;
    } catch (error) {
      console.error('Failed to create user:', error);
      onError('Failed to create user');
      return false;
    }
  }, [onUserAdd, onError]);

  /**
   * Delete a user
   */
  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    onError(null);
    
    try {
      await apiService.delete(`/auth/users/${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      onError('Failed to delete user');
      return false;
    }
  }, [onError]);

  /**
   * Update user role
   */
  const updateUserRole = useCallback(async (
    userId: string,
    isAdmin: boolean
  ): Promise<boolean> => {
    onError(null);
    
    try {
      await apiService.put(`/auth/users/${userId}/role`, { isAdmin });
      return true;
    } catch (error) {
      console.error('Failed to update user role:', error);
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
