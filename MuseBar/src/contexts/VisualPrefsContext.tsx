/**
 * Per-PIN visual preferences: zoom, fine a11y scales, color mode.
 * Loads/saves via /auth/me/profile (membership.ui_prefs).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { ApiService } from '../services/apiService';
import { usePinSessions } from './PinSessionsContext';
import { createAppTheme } from '../theme/createAppTheme';
import {
  fineScaleRatio,
  htmlFontSizeForScale,
  normalizeUiPrefs,
  UI_PREFS_DEFAULTS,
  type ColorMode,
  type FineScaleKey,
  type UiPrefs,
} from '../utils/uiPrefs';
import { logger } from '../utils/logger';
import '../styles/a11yScales.css';

const api = ApiService.getInstance();

type VisualPrefsContextValue = {
  prefs: UiPrefs;
  ready: boolean;
  setScalePercent: (scale: number) => void;
  setColorMode: (mode: ColorMode) => void;
  setFineScale: (key: FineScaleKey, percent: number) => void;
};

const VisualPrefsContext = createContext<VisualPrefsContextValue | null>(null);

function applyDomPrefs(prefs: UiPrefs): void {
  const root = document.documentElement;
  root.style.fontSize = htmlFontSizeForScale(prefs.scale_percent);
  root.style.setProperty('--a11y-font-scale', fineScaleRatio(prefs.font_scale_percent));
  root.style.setProperty('--a11y-card-scale', fineScaleRatio(prefs.card_scale_percent));
  root.style.setProperty('--a11y-button-scale', fineScaleRatio(prefs.button_scale_percent));
  root.style.setProperty('--a11y-nav-scale', fineScaleRatio(prefs.nav_scale_percent));
}

function clearDomPrefs(): void {
  const root = document.documentElement;
  root.style.fontSize = '';
  root.style.removeProperty('--a11y-font-scale');
  root.style.removeProperty('--a11y-card-scale');
  root.style.removeProperty('--a11y-button-scale');
  root.style.removeProperty('--a11y-nav-scale');
}

export function VisualPrefsProvider({ children }: { children: ReactNode }) {
  const { activeSession } = usePinSessions();
  const actorUserId = activeSession?.actor.userId ?? null;
  const [prefs, setPrefs] = useState<UiPrefs>(UI_PREFS_DEFAULTS);
  const [ready, setReady] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    applyDomPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      clearDomPrefs();
    };
  }, []);

  const persist = useCallback((next: UiPrefs) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void (async () => {
        try {
          await api.patch('/auth/me/profile', { ui_prefs: next });
        } catch (err) {
          logger.error('Failed to save ui_prefs', err);
        }
      })();
    }, 250);
  }, []);

  useEffect(() => {
    if (actorUserId == null) {
      setPrefs(UI_PREFS_DEFAULTS);
      setReady(false);
      applyDomPrefs(UI_PREFS_DEFAULTS);
      return;
    }
    let cancelled = false;
    setReady(false);
    void (async () => {
      try {
        const { data } = await api.get<{ ui_prefs?: unknown }>('/auth/me/profile');
        if (cancelled) return;
        const next = normalizeUiPrefs(data?.ui_prefs);
        setPrefs(next);
        applyDomPrefs(next);
      } catch (err) {
        logger.error('Failed to load ui_prefs', err);
        if (!cancelled) {
          setPrefs(UI_PREFS_DEFAULTS);
          applyDomPrefs(UI_PREFS_DEFAULTS);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actorUserId]);

  const setScalePercent = useCallback(
    (scale: number) => {
      const next = normalizeUiPrefs({
        ...prefsRef.current,
        scale_percent: scale,
      });
      setPrefs(next);
      persist(next);
    },
    [persist]
  );

  const setColorMode = useCallback(
    (mode: ColorMode) => {
      const next = normalizeUiPrefs({
        ...prefsRef.current,
        color_mode: mode,
      });
      setPrefs(next);
      persist(next);
    },
    [persist]
  );

  const setFineScale = useCallback(
    (key: FineScaleKey, percent: number) => {
      const next = normalizeUiPrefs({
        ...prefsRef.current,
        [key]: percent,
      });
      setPrefs(next);
      persist(next);
    },
    [persist]
  );

  const theme = useMemo(
    () => createAppTheme(prefs.color_mode, prefs.font_scale_percent),
    [prefs.color_mode, prefs.font_scale_percent]
  );

  const value = useMemo(
    () => ({ prefs, ready, setScalePercent, setColorMode, setFineScale }),
    [prefs, ready, setScalePercent, setColorMode, setFineScale]
  );

  return (
    <VisualPrefsContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </VisualPrefsContext.Provider>
  );
}

export function useVisualPrefs(): VisualPrefsContextValue {
  const ctx = useContext(VisualPrefsContext);
  if (!ctx) {
    throw new Error('useVisualPrefs must be used within VisualPrefsProvider');
  }
  return ctx;
}
