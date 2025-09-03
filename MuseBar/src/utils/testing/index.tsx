/**
 * Testing Utilities Index
 * Aggregates and re-exports all testing modules
 */

// Re-export all testing utilities
export * from './mockGenerators';
export * from './mockServices';
export * from './mockStorage';
export * from './renderUtils';
export * from './testHelpers';
export * from './customMatchers';

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Export custom render as default render
export { customRender as render } from './renderUtils';
