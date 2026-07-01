import { useCallback, useEffect, useState } from 'react';
import { DataService } from '../services/dataService';
import { ProductOptionGroup } from '../types';
import type { ProductOptionGroupFormInput } from '../services/api/productOptionGroups';

export interface OptionGroupFormData {
  name: string;
  isRequired: boolean;
  allowFreeText: boolean;
  freeTextLabel: string;
  freeTextMaxLength: string;
  choices: Array<{ id?: string; label: string }>;
}

export const initialOptionGroupForm: OptionGroupFormData = {
  name: '',
  isRequired: false,
  allowFreeText: false,
  freeTextLabel: '',
  freeTextMaxLength: '120',
  choices: [{ label: '' }],
};

function toFormInput(form: OptionGroupFormData): ProductOptionGroupFormInput {
  return {
    name: form.name.trim(),
    isRequired: form.isRequired,
    allowFreeText: form.allowFreeText,
    freeTextLabel: form.freeTextLabel.trim() || undefined,
    freeTextMaxLength: parseInt(form.freeTextMaxLength, 10) || 120,
    choices: form.choices,
  };
}

export function useProductOptionGroups(
  showSuccess: (message: string) => void,
  showError: (message: string) => void
) {
  const dataService = DataService.getInstance();
  const [groups, setGroups] = useState<ProductOptionGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await dataService.getProductOptionGroups();
      setGroups(loaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      showError(`Erreur lors du chargement des paramètres: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [dataService, showError]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const createGroup = useCallback(
    async (form: OptionGroupFormData) => {
      await dataService.createProductOptionGroup(toFormInput(form));
      showSuccess('Paramètre créé avec succès');
      await loadGroups();
    },
    [dataService, loadGroups, showSuccess]
  );

  const updateGroup = useCallback(
    async (id: string, form: OptionGroupFormData) => {
      await dataService.updateProductOptionGroup(id, toFormInput(form));
      showSuccess('Paramètre mis à jour avec succès');
      await loadGroups();
    },
    [dataService, loadGroups, showSuccess]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      const result = await dataService.deleteProductOptionGroup(id);
      showSuccess(result.message || 'Paramètre supprimé');
      await loadGroups();
    },
    [dataService, loadGroups, showSuccess]
  );

  return {
    groups,
    loading,
    loadGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}

export function optionGroupToForm(group: ProductOptionGroup): OptionGroupFormData {
  return {
    name: group.name,
    isRequired: group.isRequired,
    allowFreeText: group.allowFreeText,
    freeTextLabel: group.freeTextLabel ?? '',
    freeTextMaxLength: String(group.freeTextMaxLength ?? 120),
    choices:
      group.choices.length > 0
        ? group.choices.map((choice) => ({ id: choice.id, label: choice.label }))
        : [{ label: '' }],
  };
}
