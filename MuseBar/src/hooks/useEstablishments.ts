import { useState, useEffect } from 'react';
import { Establishment, CreateEstablishmentRequest } from '../types/system';
import { EstablishmentService } from '../services/establishmentService';

export const useEstablishments = () => {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
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
      console.log('🔄 useEstablishments: Creating establishment...', data);
      
      const response = await EstablishmentService.createEstablishment(data);
      console.log('🔄 useEstablishments: Creation response:', response);
      
      // Reload establishments to get updated list
      await loadEstablishments();
      
      return response;
    } catch (err) {
      setError('Erreur lors de la création de l\'établissement');
      console.error('❌ useEstablishments: Error creating establishment:', err);
      throw err;
    }
  };

  return {
    establishments,
    loading,
    error,
    createEstablishment,
    refreshEstablishments: loadEstablishments
  };
};