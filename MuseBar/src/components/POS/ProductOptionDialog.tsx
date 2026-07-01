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
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Product, ProductOptionGroup } from '../../types';
import {
  LINE_NOTE_DISPLAY_ORDER,
  LINE_NOTE_GROUP_NAME,
  LINE_NOTE_MAX_LENGTH,
} from '../../utils/lineItemNote';

export interface ProductOptionSelection {
  groupId?: string;
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

const choiceButtonSx = {
  minHeight: 52,
  justifyContent: 'flex-start',
  px: 2,
  py: 1.5,
  fontSize: '1rem',
  textTransform: 'none' as const,
};

const ProductOptionDialog: React.FC<ProductOptionDialogProps> = ({
  open,
  product,
  quantity,
  onClose,
  onConfirm,
}) => {
  const groups = product?.optionGroups ?? [];
  const [selections, setSelections] = useState<SelectionState>({});
  const [lineNote, setLineNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && product) {
      setSelections(buildInitialState(product.optionGroups ?? []));
      setLineNote('');
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

    const trimmedLineNote = lineNote.trim().slice(0, LINE_NOTE_MAX_LENGTH);
    if (trimmedLineNote) {
      output.push({
        groupName: LINE_NOTE_GROUP_NAME,
        freeText: trimmedLineNote,
        displayOrder: LINE_NOTE_DISPLAY_ORDER,
      });
    }

    onConfirm(output);
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '1.25rem', pb: 1 }}>
        {product.name}
        {quantity > 1 ? ` × ${quantity}` : ''}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {sortedGroups.map((group) => {
            const current = selections[group.id] ?? {};
            return (
              <Box key={group.id}>
                <Typography variant="h6" gutterBottom>
                  {group.name}
                  {group.isRequired ? ' *' : ''}
                </Typography>

                {group.choices.length > 0 && (
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    orientation="vertical"
                    value={current.choiceId ?? ''}
                    onChange={(_event, value: string | null) => {
                      if (!value) return;
                      setSelections((prev) => ({
                        ...prev,
                        [group.id]: { choiceId: value, freeText: '' },
                      }));
                    }}
                    sx={{ gap: 1 }}
                  >
                    {group.choices.map((choice) => (
                      <ToggleButton key={choice.id} value={choice.id} sx={choiceButtonSx}>
                        {choice.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
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
                    sx={{
                      mt: group.choices.length > 0 ? 2 : 0,
                      '& .MuiInputBase-root': { fontSize: '1rem', minHeight: 52 },
                    }}
                  />
                )}
              </Box>
            );
          })}

          <Box>
            <Typography variant="h6" gutterBottom>
              Note libre (optionnel)
            </Typography>
            <TextField
              label="Ex. sans glaçons, sans citron"
              value={lineNote}
              onChange={(event) => setLineNote(event.target.value)}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: LINE_NOTE_MAX_LENGTH }}
              sx={{ '& .MuiInputBase-root': { fontSize: '1rem', minHeight: 52 } }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} size="large" sx={{ minHeight: 48 }}>
          Annuler
        </Button>
        <Button variant="contained" onClick={handleConfirm} size="large" sx={{ minHeight: 48, px: 3 }}>
          Ajouter au panier
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductOptionDialog;
