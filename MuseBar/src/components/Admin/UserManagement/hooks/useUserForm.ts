/**
 * User Form Management
 * Handles add user form state and validation
 */

import { useState, useCallback } from 'react';

export const useUserForm = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);

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
    setNewIsAdmin(false);
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

  /**
   * Update admin status
   */
  const updateIsAdmin = useCallback((isAdmin: boolean) => {
    setNewIsAdmin(isAdmin);
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
      isAdmin: newIsAdmin,
    };
  }, [newEmail, newPassword, newIsAdmin]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setNewEmail('');
    setNewPassword('');
    setNewIsAdmin(false);
  }, []);

  return {
    // Dialog state
    showAdd,
    
    // Form fields
    newEmail,
    newPassword,
    newIsAdmin,
    
    // Actions
    openAddDialog,
    closeAddDialog,
    updateEmail,
    updatePassword,
    updateIsAdmin,
    resetForm,
    
    // Validation
    validateForm,
    isFormValid,
    getFormData,
  };
};
