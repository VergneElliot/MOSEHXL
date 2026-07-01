import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { ProductOptionGroup } from '../../types';

interface OptionGroupsSectionProps {
  groups: ProductOptionGroup[];
  onCreateGroup: () => void;
  onEditGroup: (group: ProductOptionGroup) => void;
  onDuplicateGroup: (group: ProductOptionGroup) => void;
  onDeleteGroup: (id: string) => void;
}

const OptionGroupsSection: React.FC<OptionGroupsSectionProps> = ({
  groups,
  onCreateGroup,
  onEditGroup,
  onDuplicateGroup,
  onDeleteGroup,
}) => {
  return (
    <Accordion defaultExpanded sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" width="100%">
          <TuneIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Paramètres produits ({groups.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={(event) => {
              event.stopPropagation();
              onCreateGroup();
            }}
          >
            Nouveau paramètre
          </Button>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {groups.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            Créez des paramètres réutilisables (cuisson, notes, etc.) puis assignez-les aux produits.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {groups.map((group) => (
              <Grid item xs={12} md={6} key={group.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                      <Box>
                        <Typography variant="h6">{group.name}</Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                          {group.isRequired && <Chip size="small" color="warning" label="Obligatoire" />}
                          {group.allowFreeText && <Chip size="small" color="info" label="Note libre" />}
                        </Box>
                        {group.choices.length > 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {group.choices.map((choice) => choice.label).join(' · ')}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <IconButton aria-label="Modifier le paramètre" onClick={() => onEditGroup(group)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton aria-label="Dupliquer le paramètre" onClick={() => onDuplicateGroup(group)}>
                          <ContentCopyIcon />
                        </IconButton>
                        <IconButton aria-label="Supprimer le paramètre" onClick={() => onDeleteGroup(group.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default OptionGroupsSection;
