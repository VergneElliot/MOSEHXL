/**
 * Password Reset Component
 * Main component that handles both password reset request and form
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PasswordResetRequest from './PasswordResetRequest';
import PasswordResetForm from './PasswordResetForm';

const PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // State management
  const [mode, setMode] = useState<'request' | 'reset'>('request');

  useEffect(() => {
    if (token) {
      setMode('reset');
    }
  }, [token]);

  const handleBack = () => {
    setMode('request');
  };

  const handleSuccess = () => {
    // Handle success - could navigate to login or show success message
    navigate('/login');
  };

  if (mode === 'reset' && token) {
    return (
      <PasswordResetForm
        token={token}
        onSuccess={handleSuccess}
        onBack={handleBack}
      />
    );
  }

  return (
    <PasswordResetRequest
      onSuccess={handleSuccess}
      onBack={handleBack}
    />
  );
};

export default PasswordReset; 