import React from 'react';
import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import { providerInfo } from './printerSetupProviders';

interface PrinterProviderStepProps {
  selectedProvider: string;
  onSelect: (provider: string) => void;
  onNext: () => void;
}

export const PrinterProviderStep: React.FC<PrinterProviderStepProps> = ({
  selectedProvider,
  onSelect,
  onNext,
}) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Select Printing Method
    </Typography>
    <Grid container spacing={2}>
      {Object.entries(providerInfo).map(([key, info]) => (
        <Grid item xs={12} sm={6} key={key}>
          <Card
            variant={selectedProvider === key ? 'elevation' : 'outlined'}
            sx={{
              cursor: 'pointer',
              border: selectedProvider === key ? 2 : 1,
              borderColor: selectedProvider === key ? 'primary.main' : 'divider',
            }}
            onClick={() => onSelect(key)}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                {info.icon}
                <Typography variant="h6" ml={1}>
                  {info.name}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {info.description}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
    <Box mt={3}>
      <Button variant="contained" onClick={onNext} disabled={!selectedProvider}>
        Next
      </Button>
    </Box>
  </Box>
);
