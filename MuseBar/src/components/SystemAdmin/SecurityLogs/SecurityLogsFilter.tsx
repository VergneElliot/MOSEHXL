import React from 'react';
import {
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Box,
  Typography
} from '@mui/material';

interface SecurityLogsFilters {
  severity: string[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  actionType: string[];
  userId: string;
}

interface SecurityLogsFilterProps {
  filters: SecurityLogsFilters;
  onChange: (filters: SecurityLogsFilters) => void;
}

const severityLevels = ['low', 'medium', 'high', 'critical'];
const actionTypes = [
  'LOGIN',
  'LOGOUT', 
  'CREATE_USER',
  'DELETE_USER',
  'CREATE_ESTABLISHMENT',
  'DELETE_ESTABLISHMENT',
  'SYSTEM_CONFIG_CHANGE',
  'DATABASE_ACCESS',
  'FAILED_LOGIN'
];

export const SecurityLogsFilter: React.FC<SecurityLogsFilterProps> = ({
  filters,
  onChange
}) => {
  const handleSeverityChange = (severity: string) => {
    const newSeverity = filters.severity.includes(severity)
      ? filters.severity.filter(s => s !== severity)
      : [...filters.severity, severity];
    
    onChange({ ...filters, severity: newSeverity });
  };

  const handleActionTypeChange = (actionType: string) => {
    const newActionTypes = filters.actionType.includes(actionType)
      ? filters.actionType.filter(a => a !== actionType)
      : [...filters.actionType, actionType];
    
    onChange({ ...filters, actionType: newActionTypes });
  };

  const handleDateChange = (field: 'start' | 'end') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: event.target.value || null
      }
    });
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Filtres
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Date de début"
            type="date"
            value={filters.dateRange.start || ''}
            onChange={handleDateChange('start')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Date de fin"
            type="date"
            value={filters.dateRange.end || ''}
            onChange={handleDateChange('end')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="ID Utilisateur"
            value={filters.userId}
            onChange={(e) => onChange({ ...filters, userId: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Niveau de sévérité</InputLabel>
            <Select
              multiple
              value={filters.severity}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {severityLevels.map((level) => (
                <MenuItem
                  key={level}
                  value={level}
                  onClick={() => handleSeverityChange(level)}
                >
                  {level}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Types d'action
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {actionTypes.map((type) => (
              <Chip
                key={type}
                label={type}
                clickable
                color={filters.actionType.includes(type) ? 'primary' : 'default'}
                onClick={() => handleActionTypeChange(type)}
                size="small"
              />
            ))}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};