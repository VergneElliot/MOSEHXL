import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import { SystemUserForm, type SystemUserFormData } from './SystemUserForm';

interface CreateSystemUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
}

const emptyForm: SystemUserFormData = {
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  role: 'system_admin',
};

export const CreateSystemUserDialog: React.FC<CreateSystemUserDialogProps> = ({
  open,
  onClose,
  onCreate,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SystemUserFormData>(emptyForm);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      await onCreate({
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
      });
      setFormData(emptyForm);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création de l'utilisateur");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.email && formData.first_name && formData.last_name && formData.password.length >= 8;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter un Utilisateur Système</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <SystemUserForm formData={formData} onChange={setFormData} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isFormValid || loading}>
          {loading ? 'Création...' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
