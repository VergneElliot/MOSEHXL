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
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Print as PrintIcon,
  PrintOutlined as PrintOutlinedIcon,
} from '@mui/icons-material';
import { KitchenPrinter } from '../../types';

interface KitchenPrintersSectionProps {
  printers: KitchenPrinter[];
  onCreatePrinter: () => void;
  onEditPrinter: (printer: KitchenPrinter) => void;
  onDeletePrinter: (id: string) => void;
  onTestPrinter: (id: string) => void;
}

const KitchenPrintersSection: React.FC<KitchenPrintersSectionProps> = ({
  printers,
  onCreatePrinter,
  onEditPrinter,
  onDeletePrinter,
  onTestPrinter,
}) => {
  return (
    <Accordion defaultExpanded sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" width="100%">
          <PrintOutlinedIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Imprimantes de commande ({printers.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={(event) => {
              event.stopPropagation();
              onCreatePrinter();
            }}
          >
            Nouvelle imprimante
          </Button>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {printers.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            Configurez les imprimantes cuisine/bar, puis assignez-les aux produits.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {printers.map((printer) => (
              <Grid item xs={12} md={6} key={printer.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                      <Box>
                        <Typography variant="h6">{printer.name}</Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                          <Chip size="small" label={`slug: ${printer.slug}`} />
                          <Chip
                            size="small"
                            color="info"
                            label={printer.connectionType === 'bridge' ? 'Bridge' : 'Réseau ESC/POS'}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {printer.connectionType === 'network_escpos'
                            ? `${printer.connectionConfig.host ?? '—'}:${printer.connectionConfig.port ?? 9100}`
                            : `Bridge → ${printer.connectionConfig.bridgeTarget ?? printer.slug}`}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          aria-label={`Tester ${printer.name}`}
                          onClick={() => onTestPrinter(printer.id)}
                        >
                          <PrintIcon />
                        </IconButton>
                        <IconButton aria-label={`Modifier ${printer.name}`} onClick={() => onEditPrinter(printer)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          aria-label={`Supprimer ${printer.name}`}
                          onClick={() => onDeletePrinter(printer.id)}
                        >
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

export default KitchenPrintersSection;
