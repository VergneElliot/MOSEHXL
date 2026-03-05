/**
 * Responsive layout for the cashier (Caisse): menu + order.
 * - Wide (≥ md): side-by-side Grid (menu 8 cols, order 4 cols).
 * - Narrow (< md): tabbed view (Menu | Commande) so only one panel is visible at a time.
 * Single responsibility: layout only; no POS state or business logic.
 */

import React, { useState } from 'react';
import { Box, Grid, Tabs, Tab, useTheme, useMediaQuery } from '@mui/material';
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

  if (!isNarrow) {
    return (
      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        <Grid item xs={12} md={8}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {menuContent}
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          {orderContent}
        </Grid>
      </Grid>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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
