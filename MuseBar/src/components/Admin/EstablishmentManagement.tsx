/**
 * Establishment Management Component
 * System administrator interface for managing establishments and sending invitations
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';
import { 
  EstablishmentsResponse, 
  SuccessResponse, 
  SendEstablishmentInvitationData 
} from '../../types/api';

interface Establishment {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
  stats?: {
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    subscriptionStatus: string;
  };
}

interface CreateEstablishmentData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
}

const EstablishmentManagement: React.FC<{ token: string }> = ({ token }) => {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  // const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Form states
  const [createForm, setCreateForm] = useState<CreateEstablishmentData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscription_plan: 'basic'
  });

  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscription_plan: 'basic' as const
  });

  const fetchEstablishments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<EstablishmentsResponse>('/establishments');
      if (response.data.success) {
        setEstablishments(response.data.data || []);
      } else {
        setError('Failed to load establishments');
      }
    } catch (e) {
      setError('Error loading establishments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstablishments();
  }, [token]);

  const handleCreateEstablishment = async () => {
    try {
      const response = await apiService.post<SuccessResponse>('/establishments', createForm);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Establishment created successfully',
          severity: 'success'
        });
        setShowCreateDialog(false);
        setCreateForm({ name: '', email: '', phone: '', address: '', subscription_plan: 'basic' });
        fetchEstablishments();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to create establishment',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error creating establishment',
        severity: 'error'
      });
    }
  };

  const handleSendInvitation = async () => {
    try {
      const response = await apiService.post<SuccessResponse>('/user-management/send-establishment-invitation', inviteForm);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Establishment invitation sent successfully',
          severity: 'success'
        });
        setShowInviteDialog(false);
        setInviteForm({ name: '', email: '', phone: '', address: '', subscription_plan: 'basic' });
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || 'Failed to send invitation',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error sending invitation',
        severity: 'error'
      });
    }
  };

  const handleDeleteEstablishment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this establishment? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiService.delete<SuccessResponse>(`/establishments/${id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Establishment deleted successfully',
          severity: 'success'
        });
        fetchEstablishments();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to delete establishment',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error deleting establishment',
        severity: 'error'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'error';
      case 'premium': return 'warning';
      case 'basic': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" gutterBottom>
          Establishment Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={() => setShowInviteDialog(true)}
            sx={{ mr: 2 }}
          >
            Send Invitation
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            Create Establishment
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BusinessIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{establishments.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Establishments
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {establishments.filter(e => e.subscription_status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Establishments
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {establishments.filter(e => e.subscription_plan === 'premium' || e.subscription_plan === 'enterprise').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Premium Plans
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <EmailIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {establishments.filter(e => e.subscription_status === 'suspended').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Suspended
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Establishments Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {establishments.map(establishment => (
              <TableRow key={establishment.id}>
                <TableCell>
                  <Typography variant="subtitle2">{establishment.name}</Typography>
                  {establishment.phone && (
                    <Typography variant="body2" color="textSecondary">
                      {establishment.phone}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{establishment.email}</TableCell>
                <TableCell>
                  <Chip
                    label={establishment.subscription_plan}
                    color={getPlanColor(establishment.subscription_plan)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={establishment.subscription_status}
                    color={getStatusColor(establishment.subscription_status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(establishment.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => {/* TODO: Implement establishment selection */}}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteEstablishment(establishment.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Establishment Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Establishment</DialogTitle>
        <DialogContent>
          <TextField
            label="Establishment Name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Phone"
            value={createForm.phone}
            onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Address"
            value={createForm.address}
            onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Subscription Plan</InputLabel>
            <Select
              value={createForm.subscription_plan}
              onChange={(e) => setCreateForm({ ...createForm, subscription_plan: e.target.value as any })}
              label="Subscription Plan"
            >
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
              <MenuItem value="enterprise">Enterprise</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateEstablishment} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Invitation Dialog */}
      <Dialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Establishment Invitation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Send an invitation email to create a new establishment. The recipient will receive an email with a link to set up their account.
          </Typography>
          <TextField
            label="Establishment Name"
            value={inviteForm.name}
            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Email"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Phone"
            value={inviteForm.phone}
            onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Address"
            value={inviteForm.address}
            onChange={(e) => setInviteForm({ ...inviteForm, address: e.target.value })}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Subscription Plan</InputLabel>
            <Select
              value={inviteForm.subscription_plan}
              onChange={(e) => setInviteForm({ ...inviteForm, subscription_plan: e.target.value as any })}
              label="Subscription Plan"
            >
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
              <MenuItem value="enterprise">Enterprise</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInviteDialog(false)}>Cancel</Button>
          <Button onClick={handleSendInvitation} variant="contained">
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
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

export default EstablishmentManagement; 