/**
 * Password Reset Component
 * Handles password reset requests and password reset with token
 */

import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useSearchParams } from 'react-router-dom';
import { PasswordResetRequest } from './auth/PasswordResetRequest';
import { PasswordResetForm } from './auth/PasswordResetForm';

const PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (token) {
      setMode('reset');
    }
  }, [token]);

  const handleRequestReset = async (email: string) => {
    setLoading(true);
    setError('');

    try {
      await apiService.post<{
        success: boolean;
        message?: string;
      }>('/user-management/request-password-reset', { email });
      setSuccess(true);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiService.post<{
        success: boolean;
        message?: string;
      }>('/user-management/reset-password', {
        token,
        newPassword: password,
      });
      setSuccess(true);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'reset') {
    return (
      <PasswordResetForm
        token={token!}
        onSubmit={handleResetPassword}
        loading={loading}
        error={error}
        success={success}
      />
    );
  }

  return (
    <PasswordResetRequest
      onSubmit={handleRequestReset}
      loading={loading}
      error={error}
      success={success}
    />
  );
};

export default PasswordReset; 