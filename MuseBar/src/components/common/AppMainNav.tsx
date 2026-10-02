/**
 * Hamburger main navigation — replaces the permanent side/top tab strip.
 * When the active page registers sub-tabs, they appear nested under that item.
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
import { PinSessionHeaderTabs } from './PinSessionHeaderTabs';
import { useNavSubsections } from '../../contexts/NavSubsectionsContext';

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
  /** PIN badges strip — kept here so top-bar zoom never hides sessions. */
  showPinSessions?: boolean;
};

export const AppMainNav: React.FC<AppMainNavProps> = ({
  tabs,
  activeIndex,
  open,
  onOpen,
  onClose,
  onSelect,
  showPinSessions = false,
}) => {
  const active = tabs[activeIndex];
  const subsections = useNavSubsections();
  const showSubs =
    subsections != null &&
    active != null &&
    subsections.mainTabValue === active.value &&
    subsections.items.length > 0;

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
          minWidth: 0,
        }}
      >
        <IconButton
          aria-label="Ouvrir le menu de navigation"
          onClick={onOpen}
          edge="start"
          size="large"
          color="inherit"
          sx={{ flexShrink: 0 }}
        >
          <MenuIcon fontSize="large" />
        </IconButton>
        {active && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              flexShrink: 0,
              maxWidth: { xs: 120, sm: 200 },
            }}
          >
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
        {showPinSessions ? (
          <PinSessionHeaderTabs tone="onPaper" />
        ) : (
          <Box sx={{ flex: 1 }} />
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
              <React.Fragment key={tab.value}>
                <ListItemButton
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
                {selected && showSubs
                  ? subsections!.items.map((sub) => {
                      const subSelected = sub.id === subsections!.activeId;
                      return (
                        <ListItemButton
                          key={sub.id}
                          selected={subSelected}
                          onClick={() => {
                            subsections!.onSelect(sub.id);
                            onClose();
                          }}
                          sx={{
                            py: 1,
                            pl: 5,
                            pr: 2,
                            '&.Mui-selected': {
                              bgcolor: 'action.selected',
                              borderLeft: 3,
                              borderColor: 'primary.light',
                            },
                          }}
                        >
                          {sub.icon != null && (
                            <ListItemIcon
                              sx={{
                                minWidth: 36,
                                color: subSelected ? 'primary.main' : 'text.secondary',
                                '& .MuiSvgIcon-root': { fontSize: 20 },
                              }}
                            >
                              {sub.icon}
                            </ListItemIcon>
                          )}
                          <ListItemText
                            primary={sub.label}
                            primaryTypographyProps={{
                              fontWeight: subSelected ? 600 : 400,
                              fontSize: '1rem',
                              color: subSelected ? 'text.primary' : 'text.secondary',
                            }}
                          />
                        </ListItemButton>
                      );
                    })
                  : null}
              </React.Fragment>
            );
          })}
        </List>
      </Drawer>
    </>
  );
};

export default AppMainNav;
