import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

export interface WaiterFilterOption {
  waiter_user_id: number;
  waiter_display_name: string;
}

interface SearchBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  placeholder?: string;
  waiterUserId: number | '';
  waiters: WaiterFilterOption[];
  onWaiterChange: (waiterUserId: number | '') => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  search,
  onSearchChange,
  placeholder = 'Rechercher par ID, date, produit, montant...',
  waiterUserId,
  waiters,
  onWaiterChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleClear = () => {
    onSearchChange('');
  };

  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        gap: 2,
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      <TextField
        fullWidth
        placeholder={placeholder}
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        size={isMobile ? 'small' : 'medium'}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: search && (
            <InputAdornment position="end">
              <IconButton onClick={handleClear} size="small" edge="end">
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: theme.palette.primary.main,
            },
          },
        }}
      />
      <FormControl size={isMobile ? 'small' : 'medium'} sx={{ minWidth: 200 }}>
        <InputLabel id="history-waiter-filter">Serveur</InputLabel>
        <Select
          labelId="history-waiter-filter"
          label="Serveur"
          value={waiterUserId === '' ? '' : String(waiterUserId)}
          onChange={(e) => {
            const v = e.target.value;
            onWaiterChange(v === '' ? '' : Number(v));
          }}
        >
          <MenuItem value="">Tous</MenuItem>
          {waiters.map((w) => (
            <MenuItem key={w.waiter_user_id} value={String(w.waiter_user_id)}>
              {w.waiter_display_name || `Serveur #${w.waiter_user_id}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default SearchBar;
