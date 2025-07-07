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

  useEffect(() => {
    loadClosureSettings();
  }, []);

  const loadClosureSettings = async () => {
    try {
      const response = await apiService.get('/legal/scheduler/status');
      setClosureSettings(response.data.settings);
      setSchedulerStatus(response.data.scheduler);
    } catch (error) {
      console.error('Error loading closure settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveClosureSettings = async () => {
    setSaving(true);
    try {
      await apiService.post('/legal/settings/closure', closureSettings);
      alert('Closure settings saved successfully');
      await loadClosureSettings(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving closure settings:', error);
      alert('Error saving closure settings');
    } finally {
      setSaving(false);
    }
  };

  const triggerManualCheck = async () => {
    try {
      await apiService.post('/legal/scheduler/trigger');
      alert('Manual closure check triggered');
      await loadClosureSettings(); // Reload status
    } catch (error) {
      console.error('Error triggering manual check:', error);
      alert('Error triggering manual check');
    }
  };

  const handleSaveSettings = () => {
    // Ici on pourrait sauvegarder dans localStorage ou une base de données
    localStorage.setItem('musebar-settings', JSON.stringify(settings));
    console.log('Paramètres sauvegardés:', settings);
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
                value={settings.barName}
                onChange={(e) => setSettings(prev => ({ ...prev, barName: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Adresse"
                fullWidth
                multiline
                rows={3}
                value={settings.address}
                onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Téléphone"
                fullWidth
                value={settings.phone}
                onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                value={settings.email}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Numéro de TVA"
                fullWidth
                value={settings.taxIdentification}
                onChange={(e) => setSettings(prev => ({ ...prev, taxIdentification: e.target.value }))}
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
                onClick={handleSaveSettings}
                fullWidth
              >
                Sauvegarder les paramètres
              </Button>
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

        {/* Compliance Information */}
        <Grid item xs={12}>
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