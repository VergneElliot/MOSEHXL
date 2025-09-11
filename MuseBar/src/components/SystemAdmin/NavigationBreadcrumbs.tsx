/**
 * Navigation Breadcrumbs Component
 * Provides breadcrumb navigation for SystemAdmin pages
 */

import React from 'react';
import { Box, Breadcrumbs, Typography, Link, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Home as HomeIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrentPage?: boolean;
}

interface NavigationBreadcrumbsProps {
  showBackButton?: boolean;
  customTitle?: string;
}

/**
 * Navigation Breadcrumbs Component
 */
export const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({
  showBackButton = true,
  customTitle
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Generate breadcrumb items based on current route
   */
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with dashboard
    breadcrumbs.push({
      label: 'Tableau de Bord',
      path: '/system'
    });

    // Add specific page breadcrumbs
    if (pathSegments.includes('establishments')) {
      breadcrumbs.push({
        label: customTitle || 'Gestion des Établissements',
        path: '/system/establishments',
        isCurrentPage: true
      });
    } else if (pathSegments.includes('users')) {
      breadcrumbs.push({
        label: customTitle || 'Gestion des Utilisateurs',
        path: '/system/users',
        isCurrentPage: true
      });
    } else if (pathSegments.includes('security-logs')) {
      breadcrumbs.push({
        label: customTitle || 'Journal de Sécurité',
        path: '/system/security-logs',
        isCurrentPage: true
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const isOnDashboard = location.pathname === '/system' || location.pathname === '/system/';

  /**
   * Handle back button click
   */
  const handleBackClick = () => {
    navigate('/system');
  };

  /**
   * Handle breadcrumb click
   */
  const handleBreadcrumbClick = (path: string) => {
    navigate(path);
  };

  // Don't show breadcrumbs on dashboard
  if (isOnDashboard) {
    return null;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2, 
      mb: 3,
      px: 3,
      pt: 2
    }}>
      {/* Back Button */}
      {showBackButton && (
        <IconButton
          onClick={handleBackClick}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            mr: 1
          }}
          aria-label="Retour au tableau de bord"
        >
          <ArrowBackIcon />
        </IconButton>
      )}

      {/* Breadcrumbs */}
      <Breadcrumbs 
        separator="›" 
        sx={{ 
          '& .MuiBreadcrumbs-separator': { 
            color: 'text.secondary',
            fontSize: '1.2rem'
          }
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          if (isLast) {
            return (
              <Typography
                key={item.path}
                color="text.primary"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '1.1rem'
                }}
              >
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.path}
              component="button"
              variant="body1"
              onClick={() => handleBreadcrumbClick(item.path)}
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                },
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {index === 0 && <HomeIcon sx={{ fontSize: '1rem' }} />}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default NavigationBreadcrumbs;
