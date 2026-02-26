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
    console.log('🔍 useAuth: Initializing authentication from localStorage');
    const storedToken = localStorage.getItem('auth_token');
    const storedRememberMe = localStorage.getItem('remember_me') === 'true';
    const storedExpiresIn = localStorage.getItem('token_expires_in') || '12h';

    console.log('🔍 useAuth: Stored token:', storedToken ? 'Present' : 'Missing');
    console.log('🔍 useAuth: Stored rememberMe:', storedRememberMe);
    console.log('🔍 useAuth: Stored expiresIn:', storedExpiresIn);

    if (storedToken) {
      console.log('🔍 useAuth: Setting token from localStorage');
      setToken(storedToken);
      setRememberMe(storedRememberMe);
      setTokenExpiresIn(storedExpiresIn);
    } else {
      console.log('🔍 useAuth: No stored token found');
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
    console.log('🔍 useAuth: Token changed, current token:', token ? 'Present' : 'Missing');
    
    // Set token in both ApiService and apiCore to ensure consistency
    console.log('🔍 useAuth: Setting token in ApiService');
    ApiService.setToken(token);
    
    if (token) {
      console.log('🔍 useAuth: Token present, checking auth status');
      checkAuthStatus();
    } else {
      console.log('🔍 useAuth: No token, clearing user data');
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