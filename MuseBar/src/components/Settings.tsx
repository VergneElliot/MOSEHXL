import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { apiService } from '../services/apiService';

interface ClosureSettings {
  auto_closure_enabled: boolean;
  daily_closure_time: string;
  timezone: string;
  grace_period_minutes: number;
}

interface SchedulerStatus {
  is_running: boolean;
  has_interval: boolean;
  next_check: string;
}

interface SchedulerStatusResponse {
  settings: ClosureSettings;
  scheduler: SchedulerStatus;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    barName: 'MuseBar',
    address: '',
    phone: '',
    email: '',
    taxIdentification: '',
    currency: 'EUR',
    language: 'fr'
  });
  const [closureSettings, setClosureSettings] = useState<ClosureSettings>({
    auto_closure_enabled: true,
    daily_closure_time: '02:00',
    timezone: 'Europe/Paris',
    grace_period_minutes: 30
  });
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus>({
    is_running: false,
    has_interval: false,
    next_check: 'Not scheduled'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    siret: '',
    taxIdentification: ''
  });
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessInfo();
    loadClosureSettings();
  }, []);

  const loadClosureSettings = async () => {
    try {
      const response = await apiService.get<SchedulerStatusResponse>('/legal/scheduler/status');
      setClosureSettings(response.data.settings);
      setSchedulerStatus(response.data.scheduler);
    } catch (error) {
      console.error('Error loading closure settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessInfo = async () => {
    setInfoLoading(true);
    try {
      const info = await apiService.getBusinessInfo();
      setBusinessInfo({
        name: info.name || '',
        address: info.address || '',
        phone: info.phone || '',
        email: info.email || '',
        siret: info.siret || '',
        taxIdentification: info.tax_identification || ''
      });
    } catch (error) {
      setInfoMessage('Erreur lors du chargement des informations du bar');
    } finally {
      setInfoLoading(false);
    }
  };

  const saveClosureSettings = async () => {
    setSaving(true);
    try {
      await apiService.post<any>('/legal/settings/closure', closureSettings);
      alert('Closure settings saved successfully');
      await loadClosureSettings(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving closure settings:', error);
      alert('Error saving closure settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessInfo = async () => {
    setInfoSaving(true);
    setInfoMessage(null);
    try {
      await apiService.updateBusinessInfo({
        name: businessInfo.name,
        address: businessInfo.address,
        phone: businessInfo.phone,
        email: businessInfo.email,
        siret: businessInfo.siret,
        tax_identification: businessInfo.taxIdentification
      });
      setInfoMessage('Informations du bar sauvegardées avec succès');
    } catch (error) {
      setInfoMessage('Erreur lors de la sauvegarde des informations du bar');
    } finally {
      setInfoSaving(false);
    }
  };

  const triggerManualCheck = async () => {
    try {
      await apiService.post<any>('/legal/scheduler/trigger');
      alert('Manual closure check triggered');
      await loadClosureSettings(); // Reload status
    } catch (error) {
      console.error('Error triggering manual check:', error);
      alert('Error triggering manual check');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Paramètres
      </Typography>

      <Grid container spacing={3}>
        {/* Informations du bar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations du bar
              </Typography>

              <TextField
                label="Nom du bar"
                fullWidth
                value={businessInfo.name}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Adresse"
                fullWidth
                multiline
                rows={3}
                value={businessInfo.address}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Téléphone"
                fullWidth
                value={businessInfo.phone}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                value={businessInfo.email}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, email: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Numéro de TVA"
                fullWidth
                value={businessInfo.taxIdentification}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, taxIdentification: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                label="SIRET"
                fullWidth
                value={businessInfo.siret}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, siret: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres système */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Paramètres système
              </Typography>

              <TextField
                label="Devise"
                fullWidth
                value={settings.currency}
                onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Langue"
                fullWidth
                value={settings.language}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={handleSaveBusinessInfo}
                fullWidth
              >
                Sauvegarder les paramètres
              </Button>
              {infoMessage && (
                <Alert severity={infoMessage.includes('succès') ? 'success' : 'error'} sx={{ mt: 2 }}>
                  {infoMessage}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Closure Settings Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔒 Daily Closure Settings
              </Typography>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Scheduler Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    schedulerStatus.is_running 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {schedulerStatus.is_running ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Next check: {schedulerStatus.next_check}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-closure Enabled
                  </label>
                  <select
                    value={closureSettings.auto_closure_enabled ? 'true' : 'false'}
                    onChange={(e) => setClosureSettings({
                      ...closureSettings,
                      auto_closure_enabled: e.target.value === 'true'
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Closure Time
                  </label>
                  <input
                    type="time"
                    value={closureSettings.daily_closure_time}
                    onChange={(e) => setClosureSettings({
                      ...closureSettings,
                      daily_closure_time: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grace Period (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={closureSettings.grace_period_minutes}
                    onChange={(e) => setClosureSettings({
                      ...closureSettings,
                      grace_period_minutes: parseInt(e.target.value) || 30
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Time window after closure time to execute automatic closure
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={closureSettings.timezone}
                    onChange={(e) => setClosureSettings({
                      ...closureSettings,
                      timezone: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={saveClosureSettings}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                
                <button
                  onClick={triggerManualCheck}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Test Closure Check
                </button>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Thermal Printer Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🖨️ Imprimante Thermique
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:3001/api/legal/thermal-printer/status');
                      const status = await response.json();
                      
                      if (status.available) {
                        alert(`✅ Imprimante disponible: ${status.status}`);
                      } else {
                        alert(`❌ Imprimante non disponible: ${status.status}`);
                      }
                    } catch (error) {
                      alert('❌ Erreur lors de la vérification du statut de l\'imprimante');
                    }
                  }}
                  sx={{ mr: 1, mb: 1 }}
                >
                  Vérifier le Statut
                </Button>
                
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:3001/api/legal/thermal-printer/test', {
                        method: 'POST'
                      });
                      const result = await response.json();
                      
                      if (result.success) {
                        alert('✅ Test d\'impression réussi! Vérifiez l\'imprimante.');
                      } else {
                        alert(`❌ Échec du test: ${result.message}`);
                      }
                    } catch (error) {
                      alert('❌ Erreur lors du test d\'impression');
                    }
                  }}
                  sx={{ mb: 1 }}
                >
                  Test d'Impression
                </Button>
              </Box>
              
              <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                <strong>Imprimante configurée:</strong> Oxhoo TP85v Network<br />
                Utilisez ces boutons pour tester la connectivité et l'impression thermique.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Legal Compliance
              </Typography>
              <p className="text-sm text-blue-700 mb-2">
                This system complies with French fiscal regulations (Article 286-I-3 bis du CGI):
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Inaltérabilité:</strong> Transactions are immutable and cannot be modified</li>
                <li>• <strong>Sécurisation:</strong> All data is cryptographically signed and verified</li>
                <li>• <strong>Conservation:</strong> Daily closure bulletins preserve transaction integrity</li>
                <li>• <strong>Archivage:</strong> All records are maintained for legal audit purposes</li>
              </ul>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings; 