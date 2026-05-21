import { useState, useEffect, useCallback } from 'react';
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
}

export const useAuth = (): AuthState & AuthActions => {
  const REFRESH_BOOTSTRAP_HINT_KEY = 'auth_refresh_bootstrap_hint';
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<string>('15m');

  // Initialize authentication from localStorage
  useEffect(() => {
    const storedRememberMe = localStorage.getItem('remember_me') === 'true';
    const storedExpiresIn = localStorage.getItem('token_expires_in') || '15m';

    setRememberMe(storedRememberMe);
    setTokenExpiresIn(storedExpiresIn);
  }, []);

  // Declare functions first
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    setRememberMe(false);
    setTokenExpiresIn('15m');

    // Clear localStorage
    localStorage.removeItem('remember_me');
    localStorage.removeItem('token_expires_in');
    localStorage.removeItem(REFRESH_BOOTSTRAP_HINT_KEY);
  }, [REFRESH_BOOTSTRAP_HINT_KEY]);

  const checkAuthStatus = useCallback(async () => {
    try {
      // Gate on API config: initialize once if not yet ready (no sleep hack — audit #48)
      if (!apiConfig.isReady()) {
        await apiConfig.initialize();
      }

      const response = await apiService.get<User>('/auth/me');
      const data = response.data;
      setUser(data);
      setPermissions(data.permissions || []);
    } catch (e) {
      // Do not log out on 429: keeps session; avoids cascading failures when global rate limit trips.
      const msg = e instanceof Error ? e.message : String(e);
      if (/\b429\b/i.test(msg) || /trop de requ[êe]tes/i.test(msg) || /rate limit/i.test(msg)) {
        return;
      }
      logout();
    }
  }, [logout]);

  const refreshToken = useCallback(async () => {
    try {
      // Ensure API config is ready
      if (!apiConfig.isReady()) {
        await apiConfig.initialize();
      }

      const rememberMeForRefresh =
        rememberMe || localStorage.getItem('remember_me') === 'true';
      const response = await apiService.post<{
        token: string;
        expiresIn?: string;
        refreshExpiresIn?: string;
      }>(
        '/auth/refresh',
        { rememberMe: rememberMeForRefresh }
      );
      const newToken = response.data.token;
      const refreshedExpiresIn = response.data.expiresIn || '15m';
      
      setToken(newToken);
      setRememberMe(rememberMeForRefresh);
      setTokenExpiresIn(refreshedExpiresIn);
      localStorage.setItem('remember_me', rememberMeForRefresh.toString());
      localStorage.setItem('token_expires_in', refreshedExpiresIn);
      localStorage.setItem(REFRESH_BOOTSTRAP_HINT_KEY, 'true');
    } catch (error) {
      // Refresh failed, logout required
      logout();
    }
  }, [logout, rememberMe, REFRESH_BOOTSTRAP_HINT_KEY]);

  // Check authentication status when token changes
  useEffect(() => {
    ApiService.setToken(token);

    if (token) {
      checkAuthStatus();
    } else {
      setUser(null);
      setPermissions([]);
    }
  }, [token, checkAuthStatus]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!token || !user) return;

    const refreshInterval =
      tokenExpiresIn === '15m'
        ? 12 * 60 * 1000
        : 12 * 60 * 1000;

    const intervalId = setInterval(refreshToken, refreshInterval);

    return () => clearInterval(intervalId);
  }, [token, user, tokenExpiresIn, refreshToken]);

  const login = useCallback((
    jwt: string,
    userObj: User,
    rememberMeFlag: boolean,
    expiresIn: string,
    _refreshExpiresIn?: string
  ) => {
    // Set token on API client immediately so any request after this (e.g. /auth/me, /auth/users)
    // has the Bearer header before React re-renders and child effects run.
    ApiService.setToken(jwt);
    setToken(jwt);
    setUser(userObj);
    setPermissions(userObj.permissions || []);
    setRememberMe(rememberMeFlag);
    setTokenExpiresIn(expiresIn);

    // Store in localStorage
    localStorage.setItem('remember_me', rememberMeFlag.toString());
    localStorage.setItem('token_expires_in', expiresIn);
    localStorage.setItem(REFRESH_BOOTSTRAP_HINT_KEY, 'true');
  }, [REFRESH_BOOTSTRAP_HINT_KEY]);

  // Attempt bootstrap refresh on initial mount when refresh cookie exists.
  useEffect(() => {
    if (token) return;
    const shouldAttemptBootstrapRefresh =
      localStorage.getItem(REFRESH_BOOTSTRAP_HINT_KEY) === 'true';
    if (!shouldAttemptBootstrapRefresh) return;
    void refreshToken();
  }, [token, refreshToken, REFRESH_BOOTSTRAP_HINT_KEY]);

  return {
    token,
    user,
    permissions,
    rememberMe,
    tokenExpiresIn,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    refreshToken,
  };
}; 