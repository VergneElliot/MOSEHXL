import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';
import { SystemUserForm } from './SystemUserForm';

interface CreateSystemUserDialogProps {
  open: boolean;
  onClose: () => void;
}

interface CreateSystemUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  role: 'system_admin' | 'system_operator';
  permissions: string[];
}

export const CreateSystemUserDialog: React.FC<CreateSystemUserDialogProps> = ({
  open,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateSystemUserRequest>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'system_operator',
    permissions: []
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: API call to create system user
      console.log('Creating system user:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and close dialog
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'system_operator',
        permissions: []
      });
      onClose();
    } catch (err) {
      setError('Erreur lors de la création de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.email && formData.first_name && formData.last_name;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Ajouter un Utilisateur Système</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <SystemUserForm 
          formData={formData}
          onChange={setFormData}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={loading || !isFormValid}
        >
          {loading ? 'Création...' : 'Créer l\'utilisateur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};