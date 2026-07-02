import { vi } from 'vitest';

/**
 * Mock Storage Utilities
 * Provides localStorage and sessionStorage mocks for testing
 */

/**
 * Mock localStorage implementation
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  const mockStorage = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };

  Object.defineProperty(window, 'localStorage', { value: mockStorage });
  return mockStorage;
};

/**
 * Mock sessionStorage implementation
 */
export const mockSessionStorage = () => {
  const store: Record<string, string> = {};

  const mockStorage = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };

  Object.defineProperty(window, 'sessionStorage', { value: mockStorage });
  return mockStorage;
};
