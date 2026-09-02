import React from 'react';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import { Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';

interface POSSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

/** Full-width product search strip (above category chips). */
const POSSearchBar: React.FC<POSSearchBarProps> = ({ searchQuery, onSearchChange }) => {
  return (
    <Box
      sx={{
        flexShrink: 0,
        px: 1.5,
        py: 0.75,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Rechercher un produit…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: searchQuery ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => onSearchChange('')}
                aria-label="Effacer la recherche"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
      />
    </Box>
  );
};

export default React.memo(POSSearchBar);
