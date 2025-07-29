import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { Category } from '../../types';

interface CategorySectionProps {
  categories: Category[];
  archivedCategories: Category[];
  showArchived: boolean;
  onCreateCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onArchiveCategory: (id: string) => void;
  onRestoreCategory: (id: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  archivedCategories,
  showArchived,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onArchiveCategory,
  onRestoreCategory,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const activeCategories = categories.filter(cat => cat.isActive);

  return (
    <Accordion defaultExpanded>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="categories-content"
        id="categories-header"
      >
        <Box display="flex" alignItems="center" width="100%">
          <CategoryIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Gestion des Catégories ({activeCategories.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={e => {
              e.stopPropagation();
              onCreateCategory();
            }}
            size={isMobile ? 'small' : 'medium'}
          >
            Nouvelle Catégorie
          </Button>
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        {activeCategories.length === 0 ? (
          <Box textAlign="center" py={3}>
            <Typography color="textSecondary">
              Aucune catégorie active. Créez votre première catégorie pour commencer.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {activeCategories.map(category => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Card
                  sx={{
                    height: '100%',
                    borderLeft: `4px solid ${category.color || theme.palette.primary.main}`,
                    '&:hover': { boxShadow: 3 },
                  }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1}
                    >
                      <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
                        {category.name}
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => onEditCategory(category)}
                          title="Modifier"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onArchiveCategory(category.id)}
                          title="Archiver"
                          color="warning"
                        >
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onDeleteCategory(category.id)}
                          title="Supprimer"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {category.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {category.description}
                      </Typography>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip
                        size="small"
                        label={category.color || '#1976d2'}
                        sx={{
                          backgroundColor: category.color || theme.palette.primary.main,
                          color: theme.palette.getContrastText(
                            category.color || theme.palette.primary.main
                          ),
                        }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        ID: {category.id.substring(0, 8)}...
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Archived Categories */}
        {showArchived && archivedCategories.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom color="textSecondary">
              📁 Catégories Archivées ({archivedCategories.length})
            </Typography>
            <Grid container spacing={2}>
              {archivedCategories.map(category => (
                <Grid item xs={12} sm={6} md={4} key={category.id}>
                  <Card
                    sx={{
                      height: '100%',
                      opacity: 0.7,
                      borderLeft: `4px solid ${category.color || theme.palette.grey[400]}`,
                    }}
                  >
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={1}
                      >
                        <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
                          {category.name}
                        </Typography>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => onRestoreCategory(category.id)}
                            title="Restaurer"
                            color="success"
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => onDeleteCategory(category.id)}
                            title="Supprimer définitivement"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {category.description && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          {category.description}
                        </Typography>
                      )}

                      <Chip size="small" label="Archivée" color="default" variant="outlined" />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default CategorySection;
