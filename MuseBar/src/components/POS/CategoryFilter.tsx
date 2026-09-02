import React, { useMemo } from 'react';
import { Box, Chip, useTheme, useMediaQuery } from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import { Category } from '../../types';
import { FAVORITES_CATEGORY_ID } from '../../hooks/usePOSCatalogLogic';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const activeCategories = categories.filter((cat) => cat.isActive);

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
    <Box sx={{ mb: 2, px: { xs: 0, md: 0 } }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          overflowX: isMobile ? 'auto' : 'visible',
          pb: isMobile ? 1 : 0,
          '&::-webkit-scrollbar': { height: 6 },
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

        <Chip
          icon={<StarIcon />}
          label="Favoris"
          onClick={() => onCategorySelect(FAVORITES_CATEGORY_ID)}
          color={selectedCategory === FAVORITES_CATEGORY_ID ? 'primary' : 'default'}
          variant={selectedCategory === FAVORITES_CATEGORY_ID ? 'filled' : 'outlined'}
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
            ...(selectedCategory !== FAVORITES_CATEGORY_ID && {
              borderColor: theme.palette.warning.main,
              color: theme.palette.warning.dark,
            }),
          }}
        />

        {activeCategories.map((category) => {
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
  );
};

export default React.memo(CategoryFilter);
