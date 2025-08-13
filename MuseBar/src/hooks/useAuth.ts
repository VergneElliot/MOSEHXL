import { useState, useEffect, useCallback } from 'react';
import { apiService, ApiService } from '../services/apiService';
import { apiConfig } from '../config/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  permissions: string[];
  rememberMe: boolean;
  tokenExpiresIn: string;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (jwt: string, userObj: User, rememberMeFlag: boolean, expiresIn: string) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuth = (): AuthState & AuthActions => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<string>('12h');

  // Initialize authentication from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedRememberMe = localStorage.getItem('remember_me') === 'true';
    const storedExpiresIn = localStorage.getItem('token_expires_in') || '12h';

    if (storedToken) {
      setToken(storedToken);
      setRememberMe(storedRememberMe);
      setTokenExpiresIn(storedExpiresIn);
    }
  }, []);

  // Declare functions first
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    setRememberMe(false);
    setTokenExpiresIn('12h');

    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('token_expires_in');
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      // Add delay to ensure API is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ensure API config is ready
      if (!apiConfig.isReady()) {
        await apiConfig.initialize();
      }

      const response = await apiService.get<User>('/auth/me');
      const data = response.data;
      setUser(data);
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token expired or invalid, logout required
      logout();
    }
  }, [logout]);

  const refreshToken = useCallback(async () => {
    try {
      // Ensure API config is ready
      if (!apiConfig.isReady()) {
        await apiConfig.initialize();
      }

      const response = await apiService.post<{ token: string }>('/auth/refresh');
      const newToken = response.data.token;
      
      setToken(newToken);
      localStorage.setItem('auth_token', newToken);
    } catch (error) {
      // Refresh failed, logout required
      logout();
    }
  }, [logout]);

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
      tokenExpiresIn === '7d'
        ? 6 * 24 * 60 * 60 * 1000 // Refresh every 6 days for 7-day tokens
        : 10 * 60 * 60 * 1000; // Refresh every 10 hours for 12-hour tokens

    const intervalId = setInterval(refreshToken, refreshInterval);

    return () => clearInterval(intervalId);
  }, [token, user, tokenExpiresIn, refreshToken]);

  const login = useCallback((jwt: string, userObj: User, rememberMeFlag: boolean, expiresIn: string) => {
    setToken(jwt);
    setUser(userObj);
    setPermissions(userObj.permissions || []);
    setRememberMe(rememberMeFlag);
    setTokenExpiresIn(expiresIn);

    // Store in localStorage
    localStorage.setItem('auth_token', jwt);
    localStorage.setItem('remember_me', rememberMeFlag.toString());
    localStorage.setItem('token_expires_in', expiresIn);
  }, []);

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