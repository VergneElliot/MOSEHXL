import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from '@mui/material';
import { Product, ProductOptionGroup } from '../../types';

export interface ProductOptionSelection {
  groupId: string;
  groupName: string;
  choiceId?: string | null;
  choiceLabel?: string | null;
  freeText?: string | null;
  displayOrder: number;
}

interface ProductOptionDialogProps {
  open: boolean;
  product: Product | null;
  quantity: number;
  onClose: () => void;
  onConfirm: (selections: ProductOptionSelection[]) => void;
}

type SelectionState = Record<string, { choiceId?: string; freeText?: string }>;

function buildInitialState(groups: ProductOptionGroup[]): SelectionState {
  const state: SelectionState = {};
  for (const group of groups) {
    state[group.id] = {};
  }
  return state;
}

const ProductOptionDialog: React.FC<ProductOptionDialogProps> = ({
  open,
  product,
  quantity,
  onClose,
  onConfirm,
}) => {
  const groups = product?.optionGroups ?? [];
  const [selections, setSelections] = useState<SelectionState>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && product) {
      setSelections(buildInitialState(product.optionGroups ?? []));
      setError(null);
    }
  }, [open, product]);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.displayOrder - b.displayOrder),
    [groups]
  );

  const handleConfirm = () => {
    if (!product) return;
    const output: ProductOptionSelection[] = [];

    for (const group of sortedGroups) {
      const current = selections[group.id] ?? {};
      const freeText = group.allowFreeText ? current.freeText?.trim() || '' : '';
      const choiceId = current.choiceId;

      if (group.isRequired) {
        if (!choiceId && !freeText) {
          setError(`Le paramètre "${group.name}" est obligatoire.`);
          return;
        }
        if (choiceId && freeText) {
          setError(`Choisissez une valeur prédéfinie ou une note libre pour "${group.name}".`);
          return;
        }
      }

      if (!choiceId && !freeText) continue;

      const choice = group.choices.find((entry) => entry.id === choiceId);
      output.push({
        groupId: group.id,
        groupName: group.name,
        choiceId: choice?.id ?? null,
        choiceLabel: choice?.label ?? null,
        freeText: freeText || null,
        displayOrder: group.displayOrder,
      });
    }

    onConfirm(output);
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {product.name}
        {quantity > 1 ? ` × ${quantity}` : ''}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {sortedGroups.map((group) => {
            const current = selections[group.id] ?? {};
            return (
              <Box key={group.id}>
                <Typography variant="subtitle1" gutterBottom>
                  {group.name}
                  {group.isRequired ? ' *' : ''}
                </Typography>

                {group.choices.length > 0 && (
                  <FormControl component="fieldset" sx={{ width: '100%' }}>
                    <FormLabel component="legend" sx={{ display: 'none' }}>
                      {group.name}
                    </FormLabel>
                    <RadioGroup
                      value={current.choiceId ?? ''}
                      onChange={(event) =>
                        setSelections((prev) => ({
                          ...prev,
                          [group.id]: { ...prev[group.id], choiceId: event.target.value, freeText: '' },
                        }))
                      }
                    >
                      {group.choices.map((choice) => (
                        <FormControlLabel
                          key={choice.id}
                          value={choice.id}
                          control={<Radio />}
                          label={choice.label}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                )}

                {group.allowFreeText && (
                  <TextField
                    label={group.freeTextLabel || 'Note libre'}
                    value={current.freeText ?? ''}
                    onChange={(event) =>
                      setSelections((prev) => ({
                        ...prev,
                        [group.id]: {
                          choiceId: event.target.value.trim() ? undefined : prev[group.id]?.choiceId,
                          freeText: event.target.value,
                        },
                      }))
                    }
                    fullWidth
                    multiline
                    minRows={2}
                    inputProps={{ maxLength: group.freeTextMaxLength }}
                    sx={{ mt: group.choices.length > 0 ? 1.5 : 0 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Ajouter au panier
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductOptionDialog;
