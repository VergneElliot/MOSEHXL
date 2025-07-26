import React from 'react';
import {
  Box,
  Chip,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
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

  const activeCategories = categories.filter(cat => cat.isActive);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Rechercher un produit..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
        size={isMobile ? "small" : "medium"}
      />

      {/* Category Chips */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1,
          overflowX: isMobile ? 'auto' : 'visible',
          pb: isMobile ? 1 : 0,
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
          size={isMobile ? "small" : "medium"}
          sx={{
            minWidth: 'fit-content',
            flexShrink: 0,
          }}
        />
        
        {activeCategories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            onClick={() => onCategorySelect(category.id)}
            color={selectedCategory === category.id ? 'primary' : 'default'}
            variant={selectedCategory === category.id ? 'filled' : 'outlined'}
            size={isMobile ? "small" : "medium"}
            sx={{
              minWidth: 'fit-content',
              flexShrink: 0,
              backgroundColor: selectedCategory === category.id 
                ? theme.palette.primary.main 
                : category.color || theme.palette.grey[100],
              color: selectedCategory === category.id 
                ? theme.palette.primary.contrastText 
                : theme.palette.text.primary,
              '&:hover': {
                backgroundColor: selectedCategory === category.id 
                  ? theme.palette.primary.dark 
                  : category.color 
                    ? `${category.color}20` 
                    : theme.palette.grey[200],
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default CategoryFilter; 