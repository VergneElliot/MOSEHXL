// Centralized type exports - organized by domain

// Business domain types
export * from './business';

// Order and payment types
export * from './orders';

// Authentication and user types
export * from './auth';

// API related types
export * from './api';

// UI and component types
export * from './ui';

// System admin types
export * from './system';

// Setup wizard types
export * from './setup';

// Re-export commonly used types for convenience
export type { Category, Product, HappyHourSettings } from './business';
export type { Order, OrderItem, PaymentMethod } from './orders';
export type { User, AuthResponse } from './auth';
export type { ApiResponse, ClosureBulletin } from './api';
