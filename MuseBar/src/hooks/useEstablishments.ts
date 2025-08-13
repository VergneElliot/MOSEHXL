import { useState, useEffect } from 'react';
import { SystemEstablishment, CreateEstablishmentRequest } from '../types/system';
import { EstablishmentService } from '../services/establishmentService';

export const useEstablishments = () => {
  const [establishments, setEstablishments] = useState<SystemEstablishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEstablishments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await EstablishmentService.getEstablishments();
      setEstablishments(response.establishments);
    } catch (err) {
      setError('Erreur lors du chargement des établissements');
      console.error('Error loading establishments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEstablishments();
  }, []);

  const createEstablishment = async (data: CreateEstablishmentRequest) => {
    try {
      setLoading(true);
      setError(null);
    // console.debug('useEstablishments: Creating establishment...', data);
      
      const response = await EstablishmentService.createEstablishment(data);
    // console.debug('useEstablishments: Creation response:', response);
      
      // Reload establishments to get updated list
      await loadEstablishments();
      
      return response;
    } catch (err) {
      setError('Erreur lors de la création de l\'établissement');
      console.error('❌ useEstablishments: Error creating establishment:', err);
      throw err;
    }
  };

  const deleteEstablishment = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
    // console.debug('useEstablishments: Deleting establishment...', id);
      
      await EstablishmentService.deleteEstablishment(id);
    // console.debug('useEstablishments: Deletion successful');
      
      // Reload establishments to get updated list
      await loadEstablishments();
      
      return { success: true };
    } catch (err) {
      setError('Erreur lors de la suppression de l\'établissement');
      console.error('❌ useEstablishments: Error deleting establishment:', err);
      throw err;
    }
  };

  return {
    establishments,
    loading,
    error,
    createEstablishment,
    deleteEstablishment,
    refreshEstablishments: loadEstablishments
  };
};