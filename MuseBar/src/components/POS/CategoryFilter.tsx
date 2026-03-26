import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { Category } from '../../types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  searchQuery: string;
  onCategorySelect: (categoryId: string) => void;
  onSearchChange: (query: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  searchQuery,
  onCategorySelect,
  onSearchChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchExpanded, setSearchExpanded] = useState(Boolean(searchQuery));

  const activeCategories = categories.filter(cat => cat.isActive);
  const hasSearchValue = searchQuery.trim().length > 0;

  useEffect(() => {
    if (hasSearchValue) {
      setSearchExpanded(true);
    }
  }, [hasSearchValue]);

  const getChipTextColor = useMemo(
    () => (backgroundColor: string) => {
      try {
        return theme.palette.getContrastText(backgroundColor);
      } catch {
        return theme.palette.text.primary;
      }
    },
    [theme.palette]
  );

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search + categories on same line to save vertical space */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 0.5,
        }}
      >
        {!searchExpanded ? (
          <Tooltip title="Rechercher un produit">
            <IconButton
              color="primary"
              onClick={() => setSearchExpanded(true)}
              aria-label="Ouvrir la recherche"
              size={isMobile ? 'small' : 'medium'}
              sx={{ flexShrink: 0 }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Collapse in={searchExpanded} orientation="horizontal" timeout={180} sx={{ width: { xs: '100%', md: 320 } }}>
            <TextField
              fullWidth
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        onSearchChange('');
                        setSearchExpanded(false);
                      }}
                      aria-label="Fermer la recherche"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              size={isMobile ? 'small' : 'medium'}
            />
          </Collapse>
        )}

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            overflowX: isMobile ? 'auto' : 'visible',
            pb: isMobile ? 1 : 0,
            flex: 1,
            '&::-webkit-scrollbar': {
              height: 6,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: theme.palette.grey[200],
              borderRadius: 3,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.grey[400],
              borderRadius: 3,
            },
          }}
      >
        <Chip
          label="Tous"
          onClick={() => onCategorySelect('')}
          color={selectedCategory === '' ? 'primary' : 'default'}
          variant={selectedCategory === '' ? 'filled' : 'outlined'}
          size="medium"
          sx={{
            minWidth: 'fit-content',
            flexShrink: 0,
            height: isMobile ? 36 : 42,
            '& .MuiChip-label': {
              px: isMobile ? 1.35 : 1.7,
              fontSize: isMobile ? '0.92rem' : '1rem',
              fontWeight: 700,
            },
          }}
        />

        {activeCategories.map(category => {
          const baseColor = category.color || theme.palette.grey[100];
          const isSelected = selectedCategory === category.id;
          const backgroundColor = isSelected ? theme.palette.primary.main : baseColor;
          const textColor = isSelected
            ? theme.palette.primary.contrastText
            : getChipTextColor(backgroundColor);

          return (
            <Chip
              key={category.id}
              label={category.name}
              onClick={() => onCategorySelect(category.id)}
              color={isSelected ? 'primary' : 'default'}
              variant={isSelected ? 'filled' : 'outlined'}
              size="medium"
              sx={{
                minWidth: 'fit-content',
                flexShrink: 0,
                height: isMobile ? 36 : 42,
                '& .MuiChip-label': {
                  px: isMobile ? 1.35 : 1.7,
                  fontSize: isMobile ? '0.92rem' : '1rem',
                  fontWeight: 700,
                },
                backgroundColor,
                color: textColor,
                '&:hover': {
                  backgroundColor: isSelected ? theme.palette.primary.dark : backgroundColor,
                  filter: isSelected ? 'none' : 'brightness(0.95)',
                },
              }}
            />
          );
        })}
      </Box>
      </Box>
    </Box>
  );
};

export default CategoryFilter;
