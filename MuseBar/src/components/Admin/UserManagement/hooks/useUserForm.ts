/**
 * User Form Management
 * Handles add user form state and validation
 */

import { useState, useCallback } from 'react';
import { EstablishmentAssignableRole } from '../../../../types/auth';

export const useUserForm = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<EstablishmentAssignableRole>('staff');

  /**
   * Open add user dialog
   */
  const openAddDialog = useCallback(() => {
    setShowAdd(true);
  }, []);

  /**
   * Close add user dialog and reset form
   */
  const closeAddDialog = useCallback(() => {
    setShowAdd(false);
    setNewEmail('');
    setNewPassword('');
    setNewRole('staff');
  }, []);

  /**
   * Update email field
   */
  const updateEmail = useCallback((email: string) => {
    setNewEmail(email);
  }, []);

  /**
   * Update password field
   */
  const updatePassword = useCallback((password: string) => {
    setNewPassword(password);
  }, []);

  const updateRole = useCallback((role: EstablishmentAssignableRole) => {
    setNewRole(role);
  }, []);

  /**
   * Validate form fields
   */
  const validateForm = useCallback((): string | null => {
    if (!newEmail.trim()) {
      return 'Email is required';
    }
    
    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      return 'Invalid email format';
    }
    
    if (!newPassword.trim()) {
      return 'Password is required';
    }
    
    if (newPassword.length < 6) {
      return 'Password must be at least 6 characters';
    }
    
    return null;
  }, [newEmail, newPassword]);

  /**
   * Check if form is valid
   */
  const isFormValid = useCallback((): boolean => {
    return validateForm() === null;
  }, [validateForm]);

  /**
   * Get form data
   */
  const getFormData = useCallback(() => {
    return {
      email: newEmail.trim(),
      password: newPassword,
      role: newRole,
    };
  }, [newEmail, newPassword, newRole]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setNewEmail('');
    setNewPassword('');
    setNewRole('staff');
  }, []);

  return {
    // Dialog state
    showAdd,
    
    // Form fields
    newEmail,
    newPassword,
    newRole,
    
    // Actions
    openAddDialog,
    closeAddDialog,
    updateEmail,
    updatePassword,
    updateRole,
    resetForm,
    
    // Validation
    validateForm,
    isFormValid,
    getFormData,
  };
};
