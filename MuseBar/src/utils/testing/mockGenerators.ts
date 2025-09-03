/**
 * Mock Data Generators
 * Provides type-safe mock data for testing
 */

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
    items: [mockGenerators.orderItem()],
    totalAmount: 15.00,
    taxAmount: 2.50,
    discountAmount: 0,
    finalAmount: 15.00,
    status: 'completed' as const,
    paymentMethod: 'card' as const,
    createdAt: new Date('2024-01-01'),
    subBills: [],
    notes: '',
    tips: 0,
    change: 0,
    ...overrides,
  }),

  /**
   * Generate mock order item
   */
  orderItem: (overrides: Partial<any> = {}) => ({
    id: 'item-1',
    productId: 'product-1',
    productName: 'Test Product',
    quantity: 1,
    unitPrice: 12.50,
    totalPrice: 12.50,
    taxRate: 0.20,
    taxAmount: 2.50,
    isHappyHourApplied: false,
    isManualHappyHour: false,
    isOffert: false,
    originalPrice: 12.50,
    ...overrides,
  }),

  /**
   * Generate mock user
   */
  user: (overrides: Partial<any> = {}) => ({
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'staff' as const,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  /**
   * Generate mock business info
   */
  businessInfo: (overrides: Partial<any> = {}) => ({
    name: 'Test Business',
    address: '123 Test Street',
    phone: '+33123456789',
    email: 'contact@testbusiness.com',
    siret: '12345678901234',
    taxIdentification: 'FR12345678901',
    ...overrides,
  }),
};
