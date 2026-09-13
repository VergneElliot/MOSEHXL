import type { SxProps, Theme } from '@mui/material/styles';

/** Shared POS action-column button density — keeps labels readable without clipping. */
export function posActionButtonSx(isMobile: boolean): SxProps<Theme> {
  return {
    py: isMobile ? 0.9 : 1.05,
    px: 1,
    minHeight: isMobile ? 40 : 44,
    fontSize: { xs: '0.72rem', sm: '0.8rem', md: '0.85rem' },
    fontWeight: 800,
    whiteSpace: 'normal',
    lineHeight: 1.15,
    justifyContent: 'flex-start',
    textAlign: 'left',
    overflow: 'hidden',
    '& .MuiButton-startIcon': { mr: 0.6, flexShrink: 0 },
    '& .MuiButton-startIcon > *:nth-of-type(1)': { fontSize: '1.15rem' },
  };
}
