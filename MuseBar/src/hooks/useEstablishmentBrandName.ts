import { useEffect, useState } from 'react';
import { ApiService } from '../services/apiService';

/**
 * Display name for the POS shell header — from Paramètres → Établissement (legal business-info).
 * Refetches when the active establishment changes.
 */
export function useEstablishmentBrandName(
  enabled: boolean,
  establishmentId: string | null | undefined
): string {
  const [name, setName] = useState('');

  useEffect(() => {
    if (!enabled || !establishmentId) {
      setName('');
      return;
    }
    let cancelled = false;
    const api = ApiService.getInstance();
    void api
      .getBusinessInfo()
      .then((data) => {
        if (!cancelled) {
          setName(typeof data?.name === 'string' ? data.name.trim() : '');
        }
      })
      .catch(() => {
        if (!cancelled) setName('');
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, establishmentId]);

  return name;
}
