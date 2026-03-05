import { useState, useEffect } from 'react';
import { SystemEstablishment, CreateEstablishmentRequest } from '../types/system';
import { EstablishmentService } from '../services/establishmentService';
import { ensureAuthentication } from '../services/authHelper';

export const useEstablishments = () => {
  const [establishments, setEstablishments] = useState<SystemEstablishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEstablishments = async () => {
    try {
      setLoading(true);
      setError(null);
      ensureAuthentication();
      const response = await EstablishmentService.getEstablishments();
      setEstablishments(response.establishments);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des établissements';
      setError(errorMessage);
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
      ensureAuthentication();
      const response = await EstablishmentService.createEstablishment(data);
      await loadEstablishments();
      return response;
    } catch (err) {
      setError('Erreur lors de la création de l\'établissement');
      throw err;
    }
  };

  const deleteEstablishment = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await EstablishmentService.deleteEstablishment(id);
      await loadEstablishments();
      return { success: true };
    } catch (err) {
      setError('Erreur lors de la suppression de l\'établissement');
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