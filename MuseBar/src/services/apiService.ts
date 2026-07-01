import { Category, Product, ProductOptionGroup, Order, OrderItem } from '../types';
import type { LiveMonthlyStats } from '../types/api';
import { apiCore, categoriesApi, productsApi, productOptionGroupsApi, ordersApi, legalApi } from './api';
import type { ProductOptionGroupFormInput } from './api/productOptionGroups';

export class ApiService {
  private static instance: ApiService;
  private static token: string | null = null;

  public static setToken(token: string | null) { 
    ApiService.token = token; 
    apiCore.setToken(token); 
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> { return apiCore.request<T>(endpoint, options); }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request('/health');
  }

  // Categories
  async getCategories(): Promise<Category[]> { return categoriesApi.getCategories(); }

  async getArchivedCategories(): Promise<Category[]> { return categoriesApi.getArchivedCategories(); }

  async getAllCategoriesIncludingArchived(): Promise<Category[]> { return categoriesApi.getAllCategoriesIncludingArchived(); }

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> { return categoriesApi.createCategory(category); }

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> { return categoriesApi.updateCategory(id, category); }

  async deleteCategory(id: string): Promise<{ message: string; action?: string; reason?: string }> { return categoriesApi.deleteCategory(id); }

  async restoreCategory(id: string): Promise<void> { return categoriesApi.restoreCategory(id); }

  // Products
  async getProducts(): Promise<Product[]> { return productsApi.getProducts(); }

  async getArchivedProducts(): Promise<Product[]> { return productsApi.getArchivedProducts(); }

  async getAllProductsIncludingArchived(): Promise<Product[]> { return productsApi.getAllProductsIncludingArchived(); }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> { return productsApi.createProduct(product); }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> { return productsApi.updateProduct(id, product); }

  async deleteProduct(id: string): Promise<{ message?: string; action?: string }> { return productsApi.deleteProduct(id); }

  async restoreProduct(id: string): Promise<void> { return productsApi.restoreProduct(id); }

  // Product option groups (menu parameters)
  async getProductOptionGroups(): Promise<ProductOptionGroup[]> {
    return productOptionGroupsApi.getProductOptionGroups();
  }

  async createProductOptionGroup(input: ProductOptionGroupFormInput): Promise<ProductOptionGroup> {
    return productOptionGroupsApi.createProductOptionGroup(input);
  }

  async updateProductOptionGroup(id: string, input: ProductOptionGroupFormInput): Promise<ProductOptionGroup> {
    return productOptionGroupsApi.updateProductOptionGroup(id, input);
  }

  async deleteProductOptionGroup(id: string): Promise<{ message?: string; action?: string }> {
    return productOptionGroupsApi.deleteProductOptionGroup(id);
  }

  // Orders
  async getOrders(params?: { limit?: number; offset?: number }): Promise<{ orders: Order[]; total: number }> {
    if (params) {
      return ordersApi.getOrdersPaginated(params);
    }
    const orders = await ordersApi.getOrders();
    return { orders, total: orders.length };
  }

  async createOrder(order: { items: OrderItem[]; totalAmount: number; taxAmount: number; paymentMethod: 'cash' | 'card' | 'split'; status?: string; notes?: string; tips?: number; change?: number; sub_bills?: Array<{ payment_method: 'cash' | 'card'; amount: number }>; }): Promise<Order> { return ordersApi.createOrder(order); }

  // Generic HTTP methods for other components
  async get<T>(endpoint: string): Promise<{ data: T }> { const data = await this.request<T>(endpoint); return { data }; }

  async post<T>(endpoint: string, data?: unknown): Promise<{ data: T }> { const res = await this.request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }); return { data: res }; }

  async put<T>(endpoint: string, data?: unknown): Promise<{ data: T }> { const res = await this.request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }); return { data: res }; }

  async delete<T>(endpoint: string): Promise<{ data: T }> { const res = await this.request<T>(endpoint, { method: 'DELETE' }); return { data: res }; }

  // Business Info
  async getBusinessInfo() { return legalApi.getBusinessInfo(); }

  async updateBusinessInfo(data: Record<string, unknown>) { return legalApi.updateBusinessInfo(data); }

  // Closure Bulletins
  async getLatestMonthlyClosureBulletin() { return legalApi.getLatestMonthlyClosureBulletin(); }

  // Live monthly stats (not based on closure)
  async getLiveMonthlyStats(): Promise<LiveMonthlyStats> { return legalApi.getLiveMonthlyStats(); }
}

// Export singleton instance
export const apiService = ApiService.getInstance();
