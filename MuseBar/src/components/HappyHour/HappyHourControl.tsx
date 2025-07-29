import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Grid,
  Alert,
  Chip,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { HappyHourService } from '../services/happyHourService';
import { DataService } from '../services/dataService';
import { Product } from '../types';

interface HappyHourControlProps {
  isActive: boolean;
  timeUntil: string;
  onStatusUpdate: () => void;
}

const HappyHourControl: React.FC<HappyHourControlProps> = ({ isActive, timeUntil, onStatusUpdate }) => {
  const [settings, setSettings] = useState({
    startTime: '16:00',
    endTime: '19:00',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 20,
    isEnabled: true
  });
  const [isManuallyActivated, setIsManuallyActivated] = useState(false);
  const [eligibleProducts, setEligibleProducts] = useState<Product[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ type: 'percentage' | 'fixed'; value: string }>({ type: 'percentage', value: '0' });

  const happyHourService = HappyHourService.getInstance();
  const dataService = DataService.getInstance();

  useEffect(() => {
    // Charger les paramètres actuels
    const currentSettings = happyHourService.getSettings();
    setSettings({
      startTime: currentSettings.startTime,
      endTime: currentSettings.endTime,
      discountType: currentSettings.discountType || 'percentage',
      discountValue: currentSettings.discountType === 'fixed'
        ? (currentSettings.discountValue * 1)
        : (currentSettings.discountValue * 100),
      isEnabled: currentSettings.isEnabled
    });
    setIsManuallyActivated(currentSettings.isManuallyActivated);

    // Charger les produits éligibles (async)
    dataService.getProducts().then((products: Product[]) => {
      setEligibleProducts(products.filter((p: Product) => p.isHappyHourEligible && p.isActive));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleManual = () => {
    happyHourService.toggleManualActivation();
    setIsManuallyActivated(!isManuallyActivated);
    onStatusUpdate();
  };

  const handleUpdateSettings = () => {
    happyHourService.updateSettings({
      startTime: settings.startTime,
      endTime: settings.endTime,
      discountType: settings.discountType,
      discountValue: settings.discountType === 'fixed'
        ? parseFloat(settings.discountValue.toString())
        : parseFloat(settings.discountValue.toString()) / 100,
      isEnabled: settings.isEnabled
    });
    onStatusUpdate();
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Contrôle Happy Hour
      </Typography>

      <Grid container spacing={3}>
        {/* Statut actuel */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statut actuel
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {isActive ? (
                  <Chip
                    icon={<CheckIcon />}
                    label="HAPPY HOUR ACTIF"
                    color="success"
                    variant="filled"
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : (
                  <Chip
                    icon={<CancelIcon />}
                    label="Happy Hour inactif"
                    color="default"
                    variant="outlined"
                  />
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Heure actuelle: {getCurrentTime()}
                </Typography>
                {!isActive && (
                  <Typography variant="body2" color="text.secondary">
                    Prochain Happy Hour dans: {timeUntil}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant={isManuallyActivated ? 'contained' : 'outlined'}
                  color="success"
                  startIcon={<PlayIcon />}
                  onClick={handleToggleManual}
                  disabled={!settings.isEnabled}
                >
                  {isManuallyActivated ? 'Désactiver manuellement' : 'Activer manuellement'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Paramètres
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.isEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, isEnabled: e.target.checked }))}
                  />
                }
                label="Happy Hour activé"
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Heure de début"
                    type="time"
                    value={settings.startTime}
                    onChange={(e) => setSettings(prev => ({ ...prev, startTime: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Heure de fin"
                    type="time"
                    value={settings.endTime}
                    onChange={(e) => setSettings(prev => ({ ...prev, endTime: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Type de réduction par défaut</InputLabel>
                    <Select
                      value={settings.discountType}
                      label="Type de réduction par défaut"
                      onChange={e => setSettings(prev => ({ ...prev, discountType: e.target.value as 'percentage' | 'fixed', discountValue: 0 }))}
                    >
                      <MenuItem value="percentage">Pourcentage (%)</MenuItem>
                      <MenuItem value="fixed">Montant fixe (€)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label={settings.discountType === 'percentage' ? 'Réduction par défaut (%)' : 'Réduction par défaut (€)'}
                    type="number"
                    value={settings.discountValue}
                    onChange={(e) => setSettings(prev => ({ ...prev, discountValue: Number(e.target.value) }))}
                    fullWidth
                    inputProps={settings.discountType === 'percentage' ? { min: 0, max: 100 } : { min: 0, step: 0.01 }}
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={handleUpdateSettings}
                sx={{ mt: 2 }}
                fullWidth
              >
                Sauvegarder les paramètres
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Produits éligibles */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Produits éligibles à l'Happy Hour ({eligibleProducts.length})
              </Typography>

              {eligibleProducts.length === 0 ? (
                <Alert severity="info">
                  Aucun produit éligible à l'Happy Hour. Vous pouvez configurer l'éligibilité dans la gestion du menu.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {eligibleProducts.map((product) => {
                    const value = typeof product.happyHourDiscountValue === 'number' ? product.happyHourDiscountValue : 0;
                    const label = product.happyHourDiscountType === 'percentage'
                      ? `-${(value * 100).toFixed(0)}%`
                      : `-${value.toFixed(2)}€`;
                    const happyHourPrice = product.happyHourDiscountType === 'percentage'
                      ? (product.price * (1 - value))
                      : Math.max(0, product.price - value);
                    const isEditing = editingProductId === product.id;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={product.id}>
                        <Paper sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" noWrap>
                              {product.name}
                            </Typography>
                            <IconButton size="small" onClick={() => {
                              setEditingProductId(product.id);
                              setEditForm({
                                type: product.happyHourDiscountType || 'percentage',
                                value: product.happyHourDiscountType === 'fixed'
                                  ? (value.toFixed(2))
                                  : ((value * 100).toFixed(0))
                              });
                            }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {product.description}
                          </Typography>
                          {!isEditing ? (
                            <>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2">
                                  Prix normal: {product.price.toFixed(2)}€
                                </Typography>
                                <Chip
                                  label={label}
                                  color="warning"
                                  size="small"
                                />
                              </Box>
                              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                                Prix Happy Hour: {happyHourPrice.toFixed(2)}€
                              </Typography>
                            </>
                          ) : (
                            <Box sx={{ mt: 1 }}>
                              <FormControl fullWidth sx={{ mb: 1 }}>
                                <InputLabel>Type de réduction</InputLabel>
                                <Select
                                  value={editForm.type}
                                  label="Type de réduction"
                                  onChange={e => setEditForm(f => ({ ...f, type: e.target.value as 'percentage' | 'fixed', value: '0' }))}
                                >
                                  <MenuItem value="percentage">Pourcentage (%)</MenuItem>
                                  <MenuItem value="fixed">Montant fixe (€)</MenuItem>
                                </Select>
                              </FormControl>
                              <TextField
                                label={editForm.type === 'percentage' ? 'Réduction (%)' : 'Réduction (€)'}
                                type="number"
                                fullWidth
                                value={editForm.value}
                                onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))}
                                inputProps={editForm.type === 'percentage' ? { min: 0, max: 100 } : { min: 0, step: 0.01 }}
                                sx={{ mb: 1 }}
                              />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={async () => {
                                    // Sauvegarder la modif
                                    const newValue = editForm.type === 'percentage'
                                      ? parseFloat(editForm.value) / 100
                                      : parseFloat(editForm.value);
                                    await dataService.updateProduct(product.id, {
                                      happyHourDiscountType: editForm.type,
                                      happyHourDiscountValue: isNaN(newValue) ? 0 : newValue
                                    });
                                    setEditingProductId(null);
                                    // Rafraîchir la liste des produits éligibles (async)
                                    const products = await dataService.getProducts();
                                    setEligibleProducts(products.filter((p: Product) => p.isHappyHourEligible && p.isActive));
                                    onStatusUpdate();
                                  }}
                                >
                                  Sauvegarder
                                </Button>
                                <Button size="small" onClick={() => setEditingProductId(null)}>Annuler</Button>
                              </Box>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Informations */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Comment fonctionne l'Happy Hour :
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <ScheduleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Activation automatique"
                  secondary="L'Happy Hour s'active automatiquement selon les heures configurées"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PlayIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Activation manuelle"
                  secondary="Vous pouvez activer/désactiver l'Happy Hour manuellement à tout moment"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Produits éligibles"
                  secondary="Seuls les produits marqués comme éligibles bénéficient de la réduction"
                />
              </ListItem>
            </List>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HappyHourControl; 