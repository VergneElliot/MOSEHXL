import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiService, ApiService } from '../services/apiService';
import { apiConfig } from '../config/api';
import { User } from '../types/auth';

interface AuthState {
  token: string | null;
  user: User | null;
  permissions: string[];
  rememberMe: boolean;
  tokenExpiresIn: string;
  isAuthenticated: boolean;
  /** False until initial refresh-cookie bootstrap finishes (avoids reload race). */
  authReady: boolean;
}

interface AuthActions {
  login: (
    jwt: string,
    userObj: User,
    rememberMeFlag: boolean,
    expiresIn: string,
    refreshExpiresIn?: string
  ) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  switchEstablishment: (establishmentId: string) => Promise<void>;
}

type RefreshResponse = {
  token: string;
  expiresIn?: string;
  refreshExpiresIn?: string;
};

type SwitchEstablishmentResponse = {
  token: string;
  expiresIn?: string;
  user: User;
};

type AuthContextValue = AuthState & AuthActions;

const REFRESH_BOOTSTRAP_HINT_KEY = 'auth_refresh_bootstrap_hint';

let inFlightRefresh: Promise<RefreshResponse> | null = null;

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [rememberMe, setRememberMe] = useState<boolean>(
    () => localStorage.getItem('remember_me') === 'true'
  );
  const [tokenExpiresIn, setTokenExpiresIn] = useState<string>(
    () => localStorage.getItem('token_expires_in') || '15m'
  );
  const [authReady, setAuthReady] = useState<boolean>(
    () => localStorage.getItem(REFRESH_BOOTSTRAP_HINT_KEY) !== 'true'
  );

  const clearLocalSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    setRememberMe(false);
    setTokenExpiresIn('15m');
    ApiService.setToken(null);
    localStorage.removeItem('remember_me');
    localStorage.removeItem('token_expires_in');
    localStorage.removeItem(REFRESH_BOOTSTRAP_HINT_KEY);
  }, []);

  const logout = useCallback(() => {
    void (async () => {
      try {
        await apiService.post('/auth/logout', {});
      } catch {
        // Cookie/token may already be invalid — still clear local session.
      } finally {
        clearLocalSession();
      }
    })();
  }, [clearLocalSession]);

  const checkAuthStatus = useCallback(async () => {
    try {
      if (!apiConfig.isReady()) {
        await apiConfig.initialize();
      }

      const response = await apiService.get<User>('/auth/me');
      const data = response.data;
      setUser(data);
      setPermissions(data.permissions || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/\b429\b/i.test(msg) || /trop de requ[êe]tes/i.test(msg) || /rate limit/i.test(msg)) {
        return;
      }
      clearLocalSession();
    }
  }, [clearLocalSession]);

  const refreshToken = useCallback(async () => {
    try {
      if (!apiConfig.isReady()) {
        await apiConfig.initialize();
      }

      const rememberMeForRefresh =
        rememberMe || localStorage.getItem('remember_me') === 'true';
      if (!inFlightRefresh) {
        inFlightRefresh = apiService
          .post<RefreshResponse>('/auth/refresh', { rememberMe: rememberMeForRefresh })
          .then((response) => response.data)
          .finally(() => {
            inFlightRefresh = null;
          });
      }
      const response = await inFlightRefresh;
      const newToken = response.token;
      const refreshedExpiresIn = response.expiresIn || '15m';

      ApiService.setToken(newToken);
      setToken(newToken);
      setRememberMe(rememberMeForRefresh);
      setTokenExpiresIn(refreshedExpiresIn);
      localStorage.setItem('remember_me', rememberMeForRefresh.toString());
      localStorage.setItem('token_expires_in', refreshedExpiresIn);
      localStorage.setItem(REFRESH_BOOTSTRAP_HINT_KEY, 'true');
    } catch {
      clearLocalSession();
    }
  }, [clearLocalSession, rememberMe]);

  const switchEstablishment = useCallback(async (establishmentId: string) => {
    if (!apiConfig.isReady()) {
      await apiConfig.initialize();
    }
    const rememberMeFlag = rememberMe || localStorage.getItem('remember_me') === 'true';
    const response = await apiService.post<SwitchEstablishmentResponse>(
      '/auth/switch-establishment',
      { establishment_id: establishmentId, rememberMe: rememberMeFlag }
    );
    const { token: newToken, user: nextUser, expiresIn } = response.data;
    ApiService.setToken(newToken);
    setToken(newToken);
    setUser(nextUser);
    setPermissions(nextUser.permissions || []);
    if (expiresIn) {
      setTokenExpiresIn(expiresIn);
      localStorage.setItem('token_expires_in', expiresIn);
    }
  }, [rememberMe]);

  // Keep API Bearer in sync; load /me when token appears (skip if user already set).
  useEffect(() => {
    ApiService.setToken(token);

    if (token) {
      void checkAuthStatus();
    } else {
      setUser(null);
      setPermissions([]);
    }
  }, [token, checkAuthStatus]);

  // Auto-refresh access token while logged in.
  useEffect(() => {
    if (!token || !user) return;

    const refreshInterval = 12 * 60 * 1000;
    const intervalId = setInterval(() => {
      void refreshToken();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [token, user, refreshToken]);

  const login = useCallback((
    jwt: string,
    userObj: User,
    rememberMeFlag: boolean,
    expiresIn: string,
    _refreshExpiresIn?: string
  ) => {
    ApiService.setToken(jwt);
    setToken(jwt);
    setUser(userObj);
    setPermissions(userObj.permissions || []);
    setRememberMe(rememberMeFlag);
    setTokenExpiresIn(expiresIn);
    setAuthReady(true);

    localStorage.setItem('remember_me', rememberMeFlag.toString());
    localStorage.setItem('token_expires_in', expiresIn);
    localStorage.setItem(REFRESH_BOOTSTRAP_HINT_KEY, 'true');
  }, []);

  // Bootstrap from refresh cookie once on mount (remember-me / reload).
  useEffect(() => {
    let cancelled = false;
    const shouldAttemptBootstrapRefresh =
      localStorage.getItem(REFRESH_BOOTSTRAP_HINT_KEY) === 'true';

    if (!shouldAttemptBootstrapRefresh) {
      setAuthReady(true);
      return;
    }

    void (async () => {
      try {
        await refreshToken();
        // Load profile before unlocking the UI so we don't flash Login or fire 401s.
        if (localStorage.getItem(REFRESH_BOOTSTRAP_HINT_KEY) === 'true') {
          await checkAuthStatus();
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      permissions,
      rememberMe,
      tokenExpiresIn,
      isAuthenticated: !!token && !!user,
      authReady,
      login,
      logout,
      refreshToken,
      switchEstablishment,
    }),
    [
      token,
      user,
      permissions,
      rememberMe,
      tokenExpiresIn,
      authReady,
      login,
      logout,
      refreshToken,
      switchEstablishment,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
