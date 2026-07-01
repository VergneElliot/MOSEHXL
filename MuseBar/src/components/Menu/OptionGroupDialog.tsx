import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
  Divider,
} from '@mui/material';
import { Add as AddIcon, ArrowDownward, ArrowUpward, Delete as DeleteIcon } from '@mui/icons-material';
import { ProductOptionGroup } from '../../types';
import { OptionGroupFormData } from '../../hooks/useProductOptionGroups';

interface OptionGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: OptionGroupFormData;
  onFormChange: (form: OptionGroupFormData) => void;
  editingGroup: ProductOptionGroup | null;
  loading: boolean;
  error: string | null;
}

const OptionGroupDialog: React.FC<OptionGroupDialogProps> = ({
  open,
  onClose,
  onSubmit,
  form,
  onFormChange,
  editingGroup,
  loading,
  error,
}) => {
  const updateField = <K extends keyof OptionGroupFormData>(field: K, value: OptionGroupFormData[K]) => {
    onFormChange({ ...form, [field]: value });
  };

  const updateChoice = (index: number, label: string) => {
    const choices = [...form.choices];
    choices[index] = { ...choices[index], label };
    updateField('choices', choices);
  };

  const addChoice = () => {
    updateField('choices', [...form.choices, { label: '' }]);
  };

  const removeChoice = (index: number) => {
    if (form.choices.length <= 1) return;
    updateField(
      'choices',
      form.choices.filter((_, choiceIndex) => choiceIndex !== index)
    );
  };

  const moveChoice = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= form.choices.length) return;
    const choices = [...form.choices];
    const current = choices[index];
    const target = choices[targetIndex];
    if (!current || !target) return;
    choices[index] = target;
    choices[targetIndex] = current;
    updateField('choices', choices);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <DialogTitle>
          {editingGroup ? `Modifier le paramètre "${editingGroup.name}"` : 'Nouveau paramètre produit'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nom du paramètre"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
              fullWidth
              placeholder="Ex: Cuisson, Note boisson"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isRequired}
                  onChange={(event) => updateField('isRequired', event.target.checked)}
                />
              }
              label="Obligatoire à la commande"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.allowFreeText}
                  onChange={(event) => updateField('allowFreeText', event.target.checked)}
                />
              }
              label="Autoriser une note libre dans ce paramètre (rare — les notes à la volée sont disponibles sur toutes les lignes au POS)"
            />
            {form.allowFreeText && (
              <TextField
                label="Libellé de la note libre"
                value={form.freeTextLabel}
                onChange={(event) => updateField('freeTextLabel', event.target.value)}
                fullWidth
                placeholder="Ex: Note pour le bar"
              />
            )}
            <Divider />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">Valeurs prédéfinies</Typography>
              <Button startIcon={<AddIcon />} onClick={addChoice} size="small">
                Ajouter
              </Button>
            </Box>
            {form.choices.map((choice, index) => (
              <Box key={choice.id ?? `new-${index}`} display="flex" gap={1} alignItems="center">
                <TextField
                  label={`Valeur ${index + 1}`}
                  value={choice.label}
                  onChange={(event) => updateChoice(index, event.target.value)}
                  fullWidth
                  placeholder="Ex: Saignant, À point, Bien cuit"
                />
                <IconButton
                  aria-label="Monter la valeur"
                  onClick={() => moveChoice(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUpward fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label="Descendre la valeur"
                  onClick={() => moveChoice(index, 1)}
                  disabled={index === form.choices.length - 1}
                >
                  <ArrowDownward fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label="Supprimer la valeur"
                  onClick={() => removeChoice(index)}
                  disabled={form.choices.length <= 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={loading || !form.name.trim()}>
            {editingGroup ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default OptionGroupDialog;
