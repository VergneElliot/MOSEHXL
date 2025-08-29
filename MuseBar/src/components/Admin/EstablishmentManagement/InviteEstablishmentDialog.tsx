/**
 * Invite Establishment Dialog Component
 * Modal dialog for sending establishment invitations
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';
import { InviteEstablishmentData } from './types';

interface InviteEstablishmentDialogProps {
  open: boolean;
  formData: InviteEstablishmentData;
  onClose: () => void;
  onChange: (data: InviteEstablishmentData) => void;
  onSubmit: () => void;
  loading?: boolean;
}

const InviteEstablishmentDialog: React.FC<InviteEstablishmentDialogProps> = ({
  open,
  formData,
  onClose,
  onChange,
  onSubmit,
  loading = false
}) => {
  const handleFieldChange = (field: keyof InviteEstablishmentData, value: string) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Establishment Invitation</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Send an invitation email to create a new establishment. The recipient will receive an email with a link to set up their account.
        </Typography>
        
        <TextField
          label="Establishment Name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        
        <TextField
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        
        <TextField
          label="Phone"
          value={formData.phone}
          onChange={(e) => handleFieldChange('phone', e.target.value)}
          fullWidth
          margin="normal"
        />
        
        <TextField
          label="Address"
          value={formData.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          fullWidth
          margin="normal"
          multiline
          rows={3}
        />
        
        <FormControl fullWidth margin="normal">
          <InputLabel>Subscription Plan</InputLabel>
          <Select
            value={formData.subscription_plan}
            onChange={(e) => handleFieldChange('subscription_plan', e.target.value as 'basic' | 'premium' | 'enterprise')}
            label="Subscription Plan"
          >
            <MenuItem value="basic">Basic</MenuItem>
            <MenuItem value="premium">Premium</MenuItem>
            <MenuItem value="enterprise">Enterprise</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={onSubmit} 
          variant="contained" 
          disabled={loading || !formData.name || !formData.email}
        >
          {loading ? 'Sending...' : 'Send Invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteEstablishmentDialog;

