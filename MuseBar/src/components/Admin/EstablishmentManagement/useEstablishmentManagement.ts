/**
 * Custom Hook for Establishment Management
 * Manages state and business logic for establishment operations
 */

import { useState, useEffect } from 'react';
import { apiService } from '../../../services/apiService';
import { 
  EstablishmentsResponse, 
  SuccessResponse 
} from '../../../types/api';
import { 
  Establishment, 
  CreateEstablishmentData, 
  InviteEstablishmentData, 
  SnackbarState 
} from './types';

interface UseEstablishmentManagementReturn {
  // State
  establishments: Establishment[];
  loading: boolean;
  error: string | null;
  snackbar: SnackbarState;
  
  // Dialog states
  showCreateDialog: boolean;
  showInviteDialog: boolean;
  
  // Form data
  createForm: CreateEstablishmentData;
  inviteForm: InviteEstablishmentData;
  
  // Actions
  fetchEstablishments: () => Promise<void>;
  handleCreateEstablishment: () => Promise<void>;
  handleSendInvitation: () => Promise<void>;
  handleDeleteEstablishment: (id: string) => Promise<void>;
  
  // Dialog controls
  setShowCreateDialog: (show: boolean) => void;
  setShowInviteDialog: (show: boolean) => void;
  
  // Form controls
  setCreateForm: (data: CreateEstablishmentData) => void;
  setInviteForm: (data: InviteEstablishmentData) => void;
  
  // Snackbar controls
  setSnackbar: (state: SnackbarState) => void;
  closeSnackbar: () => void;
}

export const useEstablishmentManagement = (token: string): UseEstablishmentManagementReturn => {
  // State management
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Form states
  const [createForm, setCreateForm] = useState<CreateEstablishmentData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscription_plan: 'basic'
  });

  const [inviteForm, setInviteForm] = useState<InviteEstablishmentData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscription_plan: 'basic'
  });

  // Fetch establishments
  const fetchEstablishments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<EstablishmentsResponse>('/establishments');
      if (response.data.success) {
        setEstablishments(response.data.data || []);
      } else {
        setError('Failed to load establishments');
      }
    } catch (e) {
      setError('Error loading establishments');
    } finally {
      setLoading(false);
    }
  };

  // Create establishment
  const handleCreateEstablishment = async () => {
    try {
      const response = await apiService.post<SuccessResponse>('/establishments', createForm);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Establishment created successfully',
          severity: 'success'
        });
        setShowCreateDialog(false);
        setCreateForm({
          name: '',
          email: '',
          phone: '',
          address: '',
          subscription_plan: 'basic'
        });
        fetchEstablishments();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to create establishment',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error creating establishment',
        severity: 'error'
      });
    }
  };

  // Send invitation
  const handleSendInvitation = async () => {
    try {
      const response = await apiService.post<SuccessResponse>('/user-management/send-establishment-invitation', inviteForm);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Invitation sent successfully',
          severity: 'success'
        });
        setShowInviteDialog(false);
        setInviteForm({
          name: '',
          email: '',
          phone: '',
          address: '',
          subscription_plan: 'basic'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to send invitation',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error sending invitation',
        severity: 'error'
      });
    }
  };

  // Delete establishment
  const handleDeleteEstablishment = async (id: string) => {
    try {
      const response = await apiService.delete<SuccessResponse>(`/establishments/${id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Establishment deleted successfully',
          severity: 'success'
        });
        fetchEstablishments();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to delete establishment',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error deleting establishment',
        severity: 'error'
      });
    }
  };

  // Snackbar helper
  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Load establishments on mount
  useEffect(() => {
    fetchEstablishments();
  }, [token]);

  return {
    // State
    establishments,
    loading,
    error,
    snackbar,
    
    // Dialog states
    showCreateDialog,
    showInviteDialog,
    
    // Form data
    createForm,
    inviteForm,
    
    // Actions
    fetchEstablishments,
    handleCreateEstablishment,
    handleSendInvitation,
    handleDeleteEstablishment,
    
    // Dialog controls
    setShowCreateDialog,
    setShowInviteDialog,
    
    // Form controls
    setCreateForm,
    setInviteForm,
    
    // Snackbar controls
    setSnackbar,
    closeSnackbar
  };
};

