/**
 * Test Helper Utilities
 * Provides general testing utilities and helpers
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Wait for element to appear
   */
  waitForElement: async (text: string, options?: any) => {
    return await waitFor(() => screen.getByText(text, options));
  },

  /**
   * Wait for element to disappear
   */
  waitForElementToDisappear: async (text: string) => {
    return await waitFor(() => expect(screen.queryByText(text)).not.toBeInTheDocument());
  },

  /**
   * Fill form field
   */
  fillField: async (labelText: string, value: string) => {
    const user = userEvent.setup();
    const field = screen.getByLabelText(labelText);
    await user.clear(field);
    await user.type(field, value);
    return field;
  },

  /**
   * Click button by text
   */
  clickButton: async (buttonText: string) => {
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: buttonText });
    await user.click(button);
    return button;
  },

  /**
   * Select option from dropdown
   */
  selectOption: async (labelText: string, optionText: string) => {
    const user = userEvent.setup();
    const select = screen.getByLabelText(labelText);
    await user.click(select);
    const option = screen.getByText(optionText);
    await user.click(option);
    return { select, option };
  },

  /**
   * Wait for loading to complete
   */
  waitForLoading: async () => {
    // Wait for any loading indicators to disappear
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  },

  /**
   * Check if element exists
   */
  elementExists: (text: string) => {
    return screen.queryByText(text) !== null;
  },

  /**
   * Get element by test id
   */
  getByTestId: (testId: string) => {
    return screen.getByTestId(testId);
  },

  /**
   * Query element by test id
   */
  queryByTestId: (testId: string) => {
    return screen.queryByTestId(testId);
  },

  /**
   * Simulate keyboard events
   */
  keyboard: {
    escape: async () => {
      const user = userEvent.setup();
      await user.keyboard('{Escape}');
    },
    enter: async () => {
      const user = userEvent.setup();
      await user.keyboard('{Enter}');
    },
    tab: async () => {
      const user = userEvent.setup();
      await user.tab();
    },
  },

  /**
   * Generate test data arrays
   */
  generateArray: <T>(generator: () => T, count: number): T[] => {
    return Array.from({ length: count }, generator);
  },

  /**
   * Delay for testing async operations
   */
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};
