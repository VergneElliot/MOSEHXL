import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fab,
  Tooltip,
  TextField,
  FormControlLabel,
  Switch,
  Snackbar,
  Divider
} from '@mui/material';
import {
  Receipt,
  Add,
  Schedule,
  EuroSymbol,
  TrendingUp,
  Download,
  Print,
  Visibility,
  Lock,
  Security,
  Timeline,
  Assignment,
  Settings as SettingsIcon,
  AccessTime,
  AutoMode
} from '@mui/icons-material';
import { ApiService } from '../services/apiService';

interface ClosureBulletin {
  id: number;
  closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: {
    vat_10: { amount: number; vat: number };
    vat_20: { amount: number; vat: number };
  };
  payment_methods_breakdown: { [key: string]: number };
  first_sequence: number;
  last_sequence: number;
  closure_hash: string;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
}

const ClosureBulletinDashboard: React.FC = () => {
  const [bulletins, setBulletins] = useState<ClosureBulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<ClosureBulletin | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [closureSettings, setClosureSettings] = useState<any>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadBulletins();
    loadTodayStatus();
    loadClosureSettings();
  }, []);

  const loadBulletins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/legal/closures');
      if (!response.ok) {
        throw new Error('Failed to load closure bulletins');
      }
      const data = await response.json();
      setBulletins(data || []);
    } catch (err) {
      setError('Erreur lors du chargement des bulletins de clôture');
      console.error('Error loading closure bulletins:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/legal/closure/today-status');
      if (response.ok) {
        const data = await response.json();
        setTodayStatus(data);
      }
    } catch (err) {
      console.error('Error loading today status:', err);
    }
  };

  const loadClosureSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/legal/closure-settings');
      if (response.ok) {
        const data = await response.json();
        setClosureSettings(data);
      }
    } catch (err) {
      console.error('Error loading closure settings:', err);
    }
  };

  const createClosure = async () => {
    try {
      setCreating(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/legal/closure/create-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create closure');
      }
      const result = await response.json();
      setBulletins(prev => [result.closure, ...prev]);
      setShowCreateDialog(false);
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSnackbar({ open: true, message: 'Bulletin de clôture créé avec succès', severity: 'success' });
      loadTodayStatus(); // Refresh today status
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const updateClosureSettings = async (newSettings: any) => {
    try {
      const response = await fetch('http://localhost:3001/api/legal/closure-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          settings: newSettings,
          updated_by: 'ADMIN' 
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      setClosureSettings((prev: any) => ({ ...prev, ...newSettings }));
      setSnackbar({ open: true, message: 'Paramètres de clôture mis à jour', severity: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getClosureTypeLabel = (type: string) => {
    switch (type) {
      case 'DAILY': return 'Journalière';
      case 'MONTHLY': return 'Mensuelle';
      case 'ANNUAL': return 'Annuelle';
      default: return type;
    }
  };

  const getClosureTypeColor = (type: string): 'primary' | 'secondary' | 'success' | 'default' => {
    switch (type) {
      case 'DAILY': return 'primary';
      case 'MONTHLY': return 'secondary';
      case 'ANNUAL': return 'success';
      default: return 'default';
    }
  };

  const filteredBulletins = bulletins.filter(bulletin => 
    filterType === 'ALL' || bulletin.closure_type === filterType
  );

  const totalStats = bulletins.reduce((acc, bulletin) => ({
    totalAmount: acc.totalAmount + bulletin.total_amount,
    totalTransactions: acc.totalTransactions + bulletin.total_transactions,
    totalVat: acc.totalVat + bulletin.total_vat
  }), { totalAmount: 0, totalTransactions: 0, totalVat: 0 });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Receipt />
            Bulletins de Clôture
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Conservation des données fiscales - Pilier ISCA
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Paramètres de clôture">
            <Fab color="secondary" onClick={() => setSettingsOpen(true)} sx={{ boxShadow: 3 }}>
              <SettingsIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="Créer un nouveau bulletin de clôture">
            <Fab color="primary" onClick={() => setShowCreateDialog(true)} sx={{ boxShadow: 3 }}>
              <Add />
            </Fab>
          </Tooltip>
        </Box>
      </Box>

      {/* Today's Status Card */}
      {todayStatus && (
        <Card sx={{ mb: 3, bgcolor: todayStatus.is_closed ? 'success.light' : 'warning.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Lock color={todayStatus.is_closed ? 'success' : 'warning'} />
                <Box>
                  <Typography variant="h6">
                    {todayStatus.is_closed ? 'Journée clôturée' : 'Journée en cours'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {todayStatus.is_closed 
                      ? `Clôturée le ${formatDate(todayStatus.closure_bulletin?.created_at)}`
                      : `Prochaine clôture automatique: ${formatDate(todayStatus.next_auto_closure)}`
                    }
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime />
                <Typography variant="body2">
                  {closureSettings.daily_closure_time?.value || '02:00'}
                </Typography>
                <Chip 
                  label={closureSettings.auto_closure_enabled?.value === 'true' ? 'Auto' : 'Manuel'} 
                  size="small"
                  color={closureSettings.auto_closure_enabled?.value === 'true' ? 'success' : 'default'}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Erreur</AlertTitle>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">{bulletins.length}</Typography>
              <Typography variant="body2" color="text.secondary">Bulletins créés</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">{totalStats.totalTransactions}</Typography>
              <Typography variant="body2" color="text.secondary">Transactions totales</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">{formatCurrency(totalStats.totalAmount)}</Typography>
              <Typography variant="body2" color="text.secondary">Chiffre d'affaires total</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">{formatCurrency(totalStats.totalVat)}</Typography>
              <Typography variant="body2" color="text.secondary">TVA collectée totale</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtres</Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Type de clôture</InputLabel>
            <Select
              value={filterType}
              label="Type de clôture"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="ALL">Tous</MenuItem>
              <MenuItem value="DAILY">Journalière</MenuItem>
              <MenuItem value="MONTHLY">Mensuelle</MenuItem>
              <MenuItem value="ANNUAL">Annuelle</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bulletins de Clôture ({filteredBulletins.length})
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Période</TableCell>
                  <TableCell align="right">Transactions</TableCell>
                  <TableCell align="right">Montant TTC</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBulletins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Aucun bulletin de clôture trouvé
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBulletins.map((bulletin) => (
                    <TableRow key={bulletin.id} hover>
                      <TableCell>
                        <Chip 
                          label={getClosureTypeLabel(bulletin.closure_type)}
                          color={getClosureTypeColor(bulletin.closure_type)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateShort(bulletin.period_start)} - {formatDateShort(bulletin.period_end)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {bulletin.total_transactions}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(bulletin.total_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={bulletin.is_closed ? <Lock /> : <Schedule />}
                          label={bulletin.is_closed ? 'Clôturé' : 'En cours'}
                          color={bulletin.is_closed ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => {
                            setSelectedBulletin(bulletin);
                            setShowDetailsDialog(true);
                          }}
                        >
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add />
            Créer un Bulletin de Clôture Journalière
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              type="date"
              label="Date de clôture"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <Alert severity="info">
              <AlertTitle>Information</AlertTitle>
              La clôture sera créée avec toutes les transactions de la journée sélectionnée.
              Une fois créée, la clôture sera immuable pour des raisons de conformité légale.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Annuler</Button>
          <Button 
            onClick={createClosure}
            disabled={creating || !selectedDate}
            variant="contained"
            startIcon={creating ? <CircularProgress size={20} /> : <Add />}
          >
            {creating ? 'Création...' : 'Créer la Clôture'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment />
            Détails du Bulletin de Clôture #{selectedBulletin?.id}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedBulletin && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Informations Générales</Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon><Receipt /></ListItemIcon>
                          <ListItemText 
                            primary="Type de clôture"
                            secondary={getClosureTypeLabel(selectedBulletin.closure_type)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Schedule /></ListItemIcon>
                          <ListItemText 
                            primary="Période"
                            secondary={`${formatDate(selectedBulletin.period_start)} - ${formatDate(selectedBulletin.period_end)}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Security /></ListItemIcon>
                          <ListItemText 
                            primary="Statut"
                            secondary={selectedBulletin.is_closed ? 'Clôturé définitivement' : 'En cours'}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Timeline /></ListItemIcon>
                          <ListItemText 
                            primary="Séquences"
                            secondary={`${selectedBulletin.first_sequence} - ${selectedBulletin.last_sequence}`}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Totaux</Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon><TrendingUp /></ListItemIcon>
                          <ListItemText 
                            primary="Transactions"
                            secondary={selectedBulletin.total_transactions}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><EuroSymbol /></ListItemIcon>
                          <ListItemText 
                            primary="Montant total TTC"
                            secondary={formatCurrency(selectedBulletin.total_amount)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><EuroSymbol /></ListItemIcon>
                          <ListItemText 
                            primary="TVA collectée"
                            secondary={formatCurrency(selectedBulletin.total_vat)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><EuroSymbol /></ListItemIcon>
                          <ListItemText 
                            primary="Montant HT"
                            secondary={formatCurrency(selectedBulletin.total_amount - selectedBulletin.total_vat)}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Informations de Sécurité</Typography>
                  <Alert severity="info">
                    <AlertTitle>Hash de Clôture</AlertTitle>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedBulletin.closure_hash}
                    </Typography>
                  </Alert>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Créé le:</strong> {formatDate(selectedBulletin.created_at)}
                    </Typography>
                    {selectedBulletin.closed_at && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Clôturé le:</strong> {formatDate(selectedBulletin.closed_at)}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<Download />} variant="outlined">Exporter</Button>
          <Button startIcon={<Print />} variant="outlined">Imprimer</Button>
          <Button onClick={() => setShowDetailsDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            Paramètres de Clôture Automatique
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={closureSettings.auto_closure_enabled?.value === 'true'}
                      onChange={(e) => updateClosureSettings({ auto_closure_enabled: e.target.checked.toString() })}
                    />
                  }
                  label="Clôture automatique quotidienne"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Quand activée, la clôture journalière sera automatiquement créée à l'heure définie.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  type="time"
                  label="Heure de clôture automatique"
                  value={closureSettings.daily_closure_time?.value || '02:00'}
                  onChange={(e) => updateClosureSettings({ daily_closure_time: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="Heure à laquelle la clôture automatique se déclenche (ex: 02:00 pour 2h du matin)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  type="number"
                  label="Période de grâce (minutes)"
                  value={closureSettings.closure_grace_period_minutes?.value || '30'}
                  onChange={(e) => updateClosureSettings({ closure_grace_period_minutes: e.target.value })}
                  fullWidth
                  helperText="Délai d'attente avant déclenchement de la clôture automatique"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Fuseau horaire"
                  value={closureSettings.timezone?.value || 'Europe/Paris'}
                  onChange={(e) => updateClosureSettings({ timezone: e.target.value })}
                  fullWidth
                  helperText="Fuseau horaire pour les calculs de clôture"
                />
              </Grid>
            </Grid>
            <Divider sx={{ my: 3 }} />
            <Alert severity="info">
              <AlertTitle>Conformité Légale</AlertTitle>
              Les clôtures automatiques sont recommandées pour la conformité à l'article 286-I-3 bis du CGI.
              Les paramètres peuvent être modifiés mais les clôtures existantes restent immuables.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClosureBulletinDashboard; 
