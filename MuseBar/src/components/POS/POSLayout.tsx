/**
 * Responsive layout for the cashier (Caisse): menu + order.
 * - Wide (≥ md): two-column flex layout (menu ~2/3, order ~1/3) so height/overflow chain works for scroll and payment buttons.
 * - Narrow (< md): tabbed view (Menu | Commande) so only one panel is visible at a time.
 * Single responsibility: layout only; no POS state or business logic.
 */

import React, { useState } from 'react';
import { Box, Tabs, Tab, useTheme, useMediaQuery } from '@mui/material';
import { RestaurantMenu as MenuIcon, ShoppingCart as CartIcon } from '@mui/icons-material';

export interface POSLayoutProps {
  /** Content for the menu panel (category filter + product grid) */
  menuContent: React.ReactNode;
  /** Content for the order/cart panel */
  orderContent: React.ReactNode;
  /** Optional badge count for the Commande tab (e.g. number of items) */
  orderBadge?: number;
}

function TabPanel({
  children,
  value,
  index,
}: {
  children: React.ReactNode;
  value: number;
  index: number;
}) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pos-tabpanel-${index}`}
      aria-labelledby={`pos-tab-${index}`}
      style={{ flex: 1, minHeight: 0, display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
    >
      {value === index && (
        <Box sx={{ pt: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const POSLayout: React.FC<POSLayoutProps> = ({
  menuContent,
  orderContent,
  orderBadge = 0,
}) => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Wide: two-column flex layout (no MUI Grid) so height/overflow chain works reliably
  if (!isNarrow) {
    return (
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
          px: { xs: 0, lg: 1 },
          overflow: 'hidden',
          gap: 2,
        }}
      >
        <Box
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {menuContent}
        </Box>
        <Box
          sx={{
            flex: '0 0 33.333%',
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {orderContent}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="Menu et commande"
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
        }}
      >
        <Tab
          icon={<MenuIcon />}
          iconPosition="start"
          label="Menu"
          id="pos-tab-0"
          aria-controls="pos-tabpanel-0"
        />
        <Tab
          icon={<CartIcon />}
          iconPosition="start"
          label={orderBadge > 0 ? `Commande (${orderBadge})` : 'Commande'}
          id="pos-tab-1"
          aria-controls="pos-tabpanel-1"
        />
      </Tabs>
      <TabPanel value={tabValue} index={0}>
        {menuContent}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {orderContent}
      </TabPanel>
    </Box>
  );
};

export default POSLayout;
