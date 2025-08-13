import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';
import { EstablishmentForm } from './EstablishmentForm';
import { CreateEstablishmentRequest } from '../../../types/system';
import { useEstablishments } from '../../../hooks/useEstablishments';

interface CreateEstablishmentDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CreateEstablishmentDialog: React.FC<CreateEstablishmentDialogProps> = ({
  open,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { createEstablishment } = useEstablishments();
  
  const [formData, setFormData] = useState<CreateEstablishmentRequest>({
    name: '',
    phone: '',
    address: '',
    tva_number: '',
    siret_number: '',
    subscription_plan: 'basic',
    owner_email: ''
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('🏗️ Creating establishment with data:', formData);
      
      const response = await createEstablishment(formData);
      
      console.log('✅ Establishment created successfully:', response);
      
      setSuccess(`Établissement créé avec succès! Invitation envoyée à ${formData.owner_email}`);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        address: '',
        tva_number: '',
        siret_number: '',
        subscription_plan: 'basic',
        owner_email: ''
      });
      
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('❌ Error creating establishment:', err);
      setError('Erreur lors de la création de l\'établissement');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name && formData.owner_email && formData.phone && formData.address;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Créer un Nouvel Établissement</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <EstablishmentForm 
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
          {loading ? 'Création...' : 'Créer l\'établissement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};