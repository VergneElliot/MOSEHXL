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
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
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
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };

  Object.defineProperty(window, 'sessionStorage', { value: mockStorage });
  return mockStorage;
};
