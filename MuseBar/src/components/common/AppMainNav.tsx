/**
 * Hamburger main navigation — replaces the permanent side/top tab strip.
 */

import React from 'react';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

export type AppNavTab = {
  label: string;
  icon?: React.ReactElement;
  value: string;
};

type AppMainNavProps = {
  tabs: AppNavTab[];
  activeIndex: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (index: number) => void;
};

export const AppMainNav: React.FC<AppMainNavProps> = ({
  tabs,
  activeIndex,
  open,
  onOpen,
  onClose,
  onSelect,
}) => {
  const active = tabs[activeIndex];

  return (
    <>
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.75,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <IconButton
          aria-label="Ouvrir le menu de navigation"
          onClick={onOpen}
          edge="start"
          size="large"
          color="inherit"
        >
          <MenuIcon fontSize="large" />
        </IconButton>
        {active && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            {active.icon && (
              <Box sx={{ display: 'flex', color: 'primary.main', '& .MuiSvgIcon-root': { fontSize: 28 } }}>
                {active.icon}
              </Box>
            )}
            <Typography variant="h6" noWrap fontWeight={700}>
              {active.label}
            </Typography>
          </Box>
        )}
      </Box>

      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: 'min(100vw - 48px, 320px)', sm: 300 },
            pt: 1,
          },
        }}
      >
        <Typography variant="overline" sx={{ px: 2, pt: 1, color: 'text.secondary' }}>
          Navigation
        </Typography>
        <List aria-label="Navigation principale">
          {tabs.map((tab, idx) => {
            const selected = idx === activeIndex;
            return (
              <ListItemButton
                key={tab.value}
                selected={selected}
                onClick={() => {
                  onSelect(idx);
                  onClose();
                }}
                sx={{
                  py: 1.5,
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    borderLeft: 3,
                    borderColor: 'primary.main',
                  },
                }}
              >
                {tab.icon && (
                  <ListItemIcon sx={{ minWidth: 44, color: selected ? 'primary.main' : 'inherit' }}>
                    {tab.icon}
                  </ListItemIcon>
                )}
                <ListItemText
                  primary={tab.label}
                  primaryTypographyProps={{
                    fontWeight: selected ? 700 : 500,
                    fontSize: '1.15rem',
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>
    </>
  );
};

export default AppMainNav;
