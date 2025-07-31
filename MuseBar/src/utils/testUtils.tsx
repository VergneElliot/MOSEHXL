/**
 * Professional Testing Utilities
 * Provides comprehensive testing setup with custom renders, mocks, and helpers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { LoadingProvider } from '../components/common/LoadingStates';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

/**
 * Mock data generators
 */
export const mockGenerators = {
  /**
   * Generate mock product
   */
  product: (overrides: Partial<any> = {}) => ({
    id: 'product-1',
    name: 'Test Product',
    description: 'A test product description',
    price: 12.50,
    taxRate: 0.20,
    categoryId: 'category-1',
    isHappyHourEligible: false,
    happyHourDiscountType: 'percentage' as const,
    happyHourDiscountValue: 0,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  /**
   * Generate mock category
   */
  category: (overrides: Partial<any> = {}) => ({
    id: 'category-1',
    name: 'Test Category',
    description: 'A test category description',
    color: '#3f51b5',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  /**
   * Generate mock order
   */
  order: (overrides: Partial<any> = {}) => ({
    id: 'order-1',
    totalAmount: 25.00,
    totalTax: 5.00,
    paymentMethod: 'cash' as const,
    status: 'completed' as const,
    items: [mockGenerators.orderItem()],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  /**
   * Generate mock order item
   */
  orderItem: (overrides: Partial<any> = {}) => ({
    id: 'item-1',
    productId: 'product-1',
    productName: 'Test Product',
    quantity: 2,
    unitPrice: 12.50,
    totalPrice: 25.00,
    taxRate: 0.20,
    taxAmount: 5.00,
    happyHourApplied: false,
    ...overrides,
  }),

  /**
   * Generate mock user
   */
  user: (overrides: Partial<any> = {}) => ({
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'cashier' as const,
    permissions: ['pos:read', 'pos:write'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-01-01'),
    ...overrides,
  }),

  /**
   * Generate multiple items
   */
  multiple: (generator: (overrides?: any) => any, count: number, overrides?: any): any[] => {
    return Array.from({ length: count }, (_, index) => 
      generator({ 
        id: `${generator.name}-${index + 1}`,
        ...overrides 
      })
    );
  },
};

/**
 * API response mocks
 */
export const mockApiResponses = {
  success: (data: any) => ({
    success: true,
    data,
    message: 'Operation successful',
  }),

  error: (message: string = 'Test error', code: string = 'TEST_ERROR') => ({
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
    },
  }),

  paginated: (data: any[], page: number = 1, limit: number = 10) => ({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNext: page * limit < data.length,
      hasPrev: page > 1,
    },
  }),
};

/**
 * Local storage mock
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
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
    get store() {
      return { ...store };
    },
  };
};

/**
 * Session storage mock
 */
export const mockSessionStorage = () => {
  const store: Record<string, string> = {};

  return {
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
    get store() {
      return { ...store };
    },
  };
};

/**
 * Fetch mock
 */
export const mockFetch = (responses: Array<{ url?: string; response: any; status?: number }>) => {
  const mockFn = jest.fn();

  responses.forEach(({ url, response, status = 200 }, index) => {
    const call = url ? mockFn.mockImplementationOnce : mockFn.mockResolvedValueOnce;
    
    call((input: string | Request) => {
      const requestUrl = typeof input === 'string' ? input : input.url;
      
      if (url && !requestUrl.includes(url)) {
        return Promise.reject(new Error(`Unexpected URL: ${requestUrl}`));
      }

      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      } as Response);
    });
  });

  return mockFn;
};

/**
 * Timer mocks
 */
export const mockTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  return {
    advanceTimersByTime: jest.advanceTimersByTime,
    runAllTimers: jest.runAllTimers,
    runOnlyPendingTimers: jest.runOnlyPendingTimers,
  };
};

/**
 * Test theme
 */
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

/**
 * All providers wrapper
 */
interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider theme={testTheme}>
      <CssBaseline />
      <ErrorBoundary level="component">
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

/**
 * Custom render function
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Custom wrapper component
   */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  /**
   * Initial route for router testing
   */
  route?: string;
  /**
   * Mock user for auth testing
   */
  user?: any;
  /**
   * Mock API responses
   */
  apiMocks?: Array<{ url: string; response: any; status?: number }>;
}

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { wrapper, route = '/', user, apiMocks, ...renderOptions } = options;

  // Setup API mocks if provided
  if (apiMocks) {
    global.fetch = mockFetch(apiMocks) as any;
  }

  // Setup initial route
  if (route !== '/') {
    window.history.pushState({}, '', route);
  }

  const Wrapper = wrapper || AllProviders;

  const renderResult = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  return {
    ...renderResult,
    user: userEvent.setup(),
  };
};

/**
 * Test utilities for common actions
 */
export const testUtils = {
  /**
   * Wait for element to appear
   */
  waitForElement: async (selector: string, timeout: number = 1000) => {
    return waitFor(() => screen.getByTestId(selector), { timeout });
  },

  /**
   * Wait for element to disappear
   */
  waitForElementToDisappear: async (selector: string, timeout: number = 1000) => {
    return waitFor(() => {
      expect(screen.queryByTestId(selector)).not.toBeInTheDocument();
    }, { timeout });
  },

  /**
   * Fill form fields
   */
  fillForm: async (fields: Record<string, string>) => {
    const user = userEvent.setup();
    
    for (const [fieldName, value] of Object.entries(fields)) {
      const field = screen.getByLabelText(new RegExp(fieldName, 'i'));
      await user.clear(field);
      await user.type(field, value);
    }
  },

  /**
   * Submit form
   */
  submitForm: async (formTestId?: string) => {
    const user = userEvent.setup();
    const form = formTestId 
      ? screen.getByTestId(formTestId)
      : screen.getByRole('form') || document.querySelector('form');
    
    if (!form) {
      throw new Error('No form found');
    }

    const submitButton = form.querySelector('button[type="submit"]') || 
                        form.querySelector('input[type="submit"]');
    
    if (submitButton) {
      await user.click(submitButton);
    } else {
      throw new Error('No submit button found');
    }
  },

  /**
   * Select option from dropdown
   */
  selectOption: async (selectLabel: string, optionText: string) => {
    const user = userEvent.setup();
    const select = screen.getByLabelText(new RegExp(selectLabel, 'i'));
    await user.click(select);
    
    const option = await screen.findByText(optionText);
    await user.click(option);
  },

  /**
   * Upload file
   */
  uploadFile: async (inputLabel: string, file: File) => {
    const user = userEvent.setup();
    const input = screen.getByLabelText(new RegExp(inputLabel, 'i'));
    await user.upload(input, file);
  },

  /**
   * Take screenshot (for visual regression testing)
   */
  takeScreenshot: async (name: string) => {
    // This would integrate with a visual testing tool like Percy or Chromatic
    console.log(`Screenshot taken: ${name}`);
  },

  /**
   * Check accessibility
   */
  checkA11y: async (container?: HTMLElement) => {
    // This would integrate with axe-core for accessibility testing
    const { axe, toHaveNoViolations } = require('jest-axe');
    expect.extend(toHaveNoViolations);
    
    const results = await axe(container || document.body);
    expect(results).toHaveNoViolations();
  },
};

/**
 * Custom matchers
 */
export const customMatchers = {
  /**
   * Check if element is visible
   */
  toBeVisible: (element: HTMLElement) => {
    const isVisible = element.offsetWidth > 0 && 
                     element.offsetHeight > 0 && 
                     window.getComputedStyle(element).visibility !== 'hidden';

    return {
      pass: isVisible,
      message: () => `expected element to ${isVisible ? 'not ' : ''}be visible`,
    };
  },

  /**
   * Check if element has loading state
   */
  toBeLoading: (element: HTMLElement) => {
    const hasLoadingAttribute = element.hasAttribute('aria-busy') && 
                               element.getAttribute('aria-busy') === 'true';
    const hasLoadingClass = element.classList.contains('loading') ||
                           element.classList.contains('MuiCircularProgress-root');

    const isLoading = hasLoadingAttribute || hasLoadingClass || 
                     element.querySelector('[role="progressbar"]') !== null;

    return {
      pass: isLoading,
      message: () => `expected element to ${isLoading ? 'not ' : ''}be in loading state`,
    };
  },

  /**
   * Check if element has error state
   */
  toHaveError: (element: HTMLElement, expectedError?: string) => {
    const errorElement = element.querySelector('[role="alert"]') ||
                        element.querySelector('.error') ||
                        element.querySelector('.MuiAlert-standardError');

    const hasError = errorElement !== null;
    
    if (expectedError && hasError) {
      const errorText = errorElement!.textContent || '';
      const hasExpectedError = errorText.includes(expectedError);
      
      return {
        pass: hasExpectedError,
        message: () => `expected element to have error "${expectedError}", but got "${errorText}"`,
      };
    }

    return {
      pass: hasError,
      message: () => `expected element to ${hasError ? 'not ' : ''}have an error`,
    };
  },
};

/**
 * Test data generators
 */
export const generateTestData = {
  /**
   * Generate random string
   */
  randomString: (length: number = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  },

  /**
   * Generate random number
   */
  randomNumber: (min: number = 0, max: number = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate random email
   */
  randomEmail: () => {
    return `test${generateTestData.randomNumber()}@example.com`;
  },

  /**
   * Generate random price
   */
  randomPrice: (min: number = 1, max: number = 100) => {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  },

  /**
   * Generate random date
   */
  randomDate: (start: Date = new Date(2024, 0, 1), end: Date = new Date()) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },
};

/**
 * Performance testing utilities
 */
export const performanceUtils = {
  /**
   * Measure render time
   */
  measureRenderTime: (name: string) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`${name} render time: ${duration.toFixed(2)}ms`);
        return duration;
      },
    };
  },

  /**
   * Check for memory leaks
   */
  checkMemoryLeaks: () => {
    if ('gc' in window && typeof window.gc === 'function') {
      const initialMemory = (performance as any).memory?.usedJSHeapSize;
      
      return {
        check: () => {
          window.gc!();
          const finalMemory = (performance as any).memory?.usedJSHeapSize;
          const difference = finalMemory - initialMemory;
          
          if (difference > 1024 * 1024) { // 1MB threshold
            console.warn(`Potential memory leak detected: ${difference} bytes`);
          }
          
          return difference;
        },
      };
    }
    
    return { check: () => 0 };
  },
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Export custom render as default
export { customRender as render }; 