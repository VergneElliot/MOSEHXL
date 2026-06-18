import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { apiService, ApiService } from '../../services/apiService';
import { apiConfig } from '../../config/api';

jest.mock('../../services/apiService', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
  },
  ApiService: {
    setToken: jest.fn(),
  },
}));

jest.mock('../../config/api', () => ({
  apiConfig: {
    isReady: jest.fn(),
    initialize: jest.fn(),
  },
}));

describe('useAuth refresh rememberMe behavior', () => {
  const mockPost = apiService.post as jest.Mock;
  const mockGet = apiService.get as jest.Mock;
  const mockSetToken = ApiService.setToken as jest.Mock;
  const mockIsReady = apiConfig.isReady as jest.Mock;
  const mockInitialize = apiConfig.initialize as jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    mockPost.mockReset();
    mockGet.mockReset();
    mockSetToken.mockReset();
    mockIsReady.mockReset();
    mockInitialize.mockReset();

    mockIsReady.mockReturnValue(true);
    mockGet.mockResolvedValue({
      data: {
        id: 1,
        email: 'user@example.com',
        permissions: [],
      },
    });
    mockPost.mockResolvedValue({
      data: {
        token: 'refreshed-token',
        expiresIn: '15m',
      },
    });
  });

  it('sends rememberMe=true during refresh after remembered login', async () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login(
        'initial-token',
        {
          id: 1,
          email: 'user@example.com',
          is_admin: false,
          role: 'staff',
          establishment_id: 'est-1',
          first_name: 'Test',
          last_name: 'User',
          permissions: [],
        },
        true,
        '15m'
      );
    });

    await waitFor(() => expect(result.current.rememberMe).toBe(true));

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
      rememberMe: true,
    });
  });

  it('falls back to localStorage remember_me when refreshing', async () => {
    localStorage.setItem('remember_me', 'true');
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
      rememberMe: true,
    });
  });

  it('coalesces concurrent refresh calls into one request', async () => {
    localStorage.setItem('remember_me', 'true');
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await Promise.all([
        result.current.refreshToken(),
        result.current.refreshToken(),
        result.current.refreshToken(),
      ]);
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(result.current.token).toBe('refreshed-token');
  });
});
