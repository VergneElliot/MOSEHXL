/**
 * User State Management
 * Core state management for user list and loading states
 */

import { useState, useCallback } from 'react';
import { EstablishmentMember as User } from '../../../../types/auth';

export const useUserState = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update users list
   */
  const updateUsers = useCallback((newUsers: User[]) => {
    setUsers(newUsers);
  }, []);

  /**
   * Add a new user to the list
   */
  const addUser = useCallback((newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  }, []);

  /**
   * Update a specific user in the list
   */
  const updateUser = useCallback((userId: number, updates: Partial<User>) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      )
    );
  }, []);

  /**
   * Remove a user from the list
   */
  const removeUser = useCallback((userId: number) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  }, []);

  /**
   * Set loading state
   */
  const setLoadingState = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  /**
   * Set error state
   */
  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    users,
    loading,
    error,
    updateUsers,
    addUser,
    updateUser,
    removeUser,
    setLoadingState,
    setErrorState,
    clearError,
  };
};
