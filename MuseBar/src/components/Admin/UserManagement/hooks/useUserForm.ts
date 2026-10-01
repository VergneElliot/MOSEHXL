/**
 * User Form Management — PIN-only staff create.
 */

import { useState, useCallback } from 'react';
import { EstablishmentAssignableRole } from '../../../../types/auth';

export const useUserForm = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<EstablishmentAssignableRole>('staff');

  const openAddDialog = useCallback(() => {
    setShowAdd(true);
  }, []);

  const closeAddDialog = useCallback(() => {
    setShowAdd(false);
    setNewFirstName('');
    setNewLastName('');
    setNewPin('');
    setNewRole('staff');
  }, []);

  const updateFirstName = useCallback((v: string) => setNewFirstName(v), []);
  const updateLastName = useCallback((v: string) => setNewLastName(v), []);
  const updatePin = useCallback((v: string) => setNewPin(v), []);
  const updateRole = useCallback((role: EstablishmentAssignableRole) => setNewRole(role), []);

  const validateForm = useCallback((): string | null => {
    if (!newFirstName.trim()) return 'Prénom requis';
    if (!/^\d{2,8}$/.test(newPin.trim())) return 'PIN : 2 à 8 chiffres';
    return null;
  }, [newFirstName, newPin]);

  const isFormValid = useCallback((): boolean => validateForm() === null, [validateForm]);

  const getFormData = useCallback(
    () => ({
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      pin: newPin.trim(),
      role: newRole,
    }),
    [newFirstName, newLastName, newPin, newRole]
  );

  return {
    showAdd,
    newFirstName,
    newLastName,
    newPin,
    newRole,
    // legacy aliases so older call sites keep compiling during transition
    newEmail: newFirstName,
    newPassword: newPin,
    openAddDialog,
    closeAddDialog,
    updateFirstName,
    updateLastName,
    updatePin,
    updateEmail: updateFirstName,
    updatePassword: updatePin,
    updateRole,
    validateForm,
    isFormValid,
    getFormData,
  };
};
