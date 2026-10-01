import { createTheme, type Theme } from '@mui/material/styles';
import { clampFineScalePercent, type ColorMode } from '../utils/uiPrefs';

export function createAppTheme(mode: ColorMode, fontScalePercent = 100): Theme {
  const isDark = mode === 'dark';
  const fontScale = clampFineScalePercent(fontScalePercent) / 100;
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      ...(isDark
        ? {
            background: {
              default: '#0f172a',
              paper: '#1e293b',
            },
          }
        : {}),
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      // Rem lengths still follow documentElement (header zoom).
      // fontSize base is multiplied by the independent font accessibility slider.
      htmlFontSize: 14,
      fontSize: 14 * fontScale,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#0f172a' : undefined,
          },
        },
      },
    },
  });
}
