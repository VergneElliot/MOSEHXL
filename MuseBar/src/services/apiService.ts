import { Category, Product, Order, OrderItem } from '../types';
import { apiConfig } from '../config/api';
import { v4 as uuidv4 } from 'uuid';
import type { PaymentMethod } from '../types';

export class ApiService {
  private static instance: ApiService;
  private static token: string | null = null;

  public static setToken(token: string | null) {
    ApiService.token = token;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Ensure API config is initialized
    if (!apiConfig.isReady()) {
      await apiConfig.initialize();
    }
    
    const url = apiConfig.getEndpoint(`/api${endpoint}`);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (ApiService.token) {
      headers['Authorization'] = `Bearer ${ApiService.token}`;
    }
    if (options.headers && typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
      Object.assign(headers, options.headers);
    }
    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request('/health');
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const categories = await this.request<any[]>('/categories');
    return categories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      description: cat.description || '',
      color: cat.color || '#1976d2',
      isActive: cat.is_active !== false,
      createdAt: new Date(cat.created_at),
      updatedAt: new Date(cat.updated_at)
    }));
  }

  async getArchivedCategories(): Promise<Category[]> {
    const categories = await this.request<any[]>('/categories/archived');
    return categories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      description: cat.description || '',
      color: cat.color || '#1976d2',
      isActive: false,
      createdAt: new Date(cat.created_at),
      updatedAt: new Date(cat.updated_at)
    }));
  }

  async getAllCategoriesIncludingArchived(): Promise<Category[]> {
    const categories = await this.request<any[]>('/categories/all');
    return categories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      description: cat.description || '',
      color: cat.color || '#1976d2',
      isActive: cat.is_active !== false,
      createdAt: new Date(cat.created_at),
      updatedAt: new Date(cat.updated_at)
    }));
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const result = await this.request<any>('/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: category.name,
        default_tax_rate: 20.0
      }),
    });

    return {
      id: result.id.toString(),
      name: result.name,
      description: category.description,
      color: category.color,
      isActive: result.is_active !== false,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at)
    };
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    const result = await this.request<any>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: category.name,
        default_tax_rate: 20.0
      }),
    });

    return {
      id: result.id.toString(),
      name: result.name,
      description: category.description || '',
      color: category.color || '#1976d2',
      isActive: result.is_active !== false,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at)
    };
  }

  async deleteCategory(id: string): Promise<{ message: string; action?: string; reason?: string }> {
    const result = await this.request<{ message: string; action?: string; reason?: string }>(`/categories/${id}`, {
      method: 'DELETE',
    });
    return result;
  }

  async restoreCategory(id: string): Promise<void> {
    await this.request(`/categories/${id}/restore`, {
      method: 'POST',
    });
  }

  // Products
  async getProducts(): Promise<Product[]> {
    const products = await this.request<any[]>('/products');
    return products.map(prod => ({
      id: prod.id.toString(),
      name: prod.name,
      description: prod.description || '',
      price: parseFloat(prod.price),
      taxRate: parseFloat(prod.tax_rate) / 100, // Convert from percentage to decimal
      categoryId: prod.category_id.toString(),
      isHappyHourEligible: prod.is_happy_hour_eligible,
      happyHourDiscountType: prod.happy_hour_discount_percent ? 'percentage' : 'fixed',
      happyHourDiscountValue: parseFloat(prod.happy_hour_discount_percent || prod.happy_hour_discount_fixed || '0') / 100,
      isActive: true, // Default to active
      createdAt: new Date(prod.created_at),
      updatedAt: new Date(prod.updated_at)
    }));
  }

  async getArchivedProducts(): Promise<Product[]> {
    const products = await this.request<any[]>('/products/archived');
    return products.map(prod => ({
      id: prod.id.toString(),
      name: prod.name,
      description: prod.description || '',
      price: parseFloat(prod.price),
      taxRate: parseFloat(prod.tax_rate) / 100,
      categoryId: prod.category_id.toString(),
      isHappyHourEligible: prod.is_happy_hour_eligible,
      happyHourDiscountType: prod.happy_hour_discount_percent ? 'percentage' : 'fixed',
      happyHourDiscountValue: parseFloat(prod.happy_hour_discount_percent || prod.happy_hour_discount_fixed || '0') / 100,
      isActive: false, // Archived products
      createdAt: new Date(prod.created_at),
      updatedAt: new Date(prod.updated_at)
    }));
  }

  async getAllProductsIncludingArchived(): Promise<Product[]> {
    const products = await this.request<any[]>('/products/all');
    return products.map(prod => ({
      id: prod.id.toString(),
      name: prod.name,
      description: prod.description || '',
      price: parseFloat(prod.price),
      taxRate: parseFloat(prod.tax_rate) / 100,
      categoryId: prod.category_id.toString(),
      isHappyHourEligible: prod.is_happy_hour_eligible,
      happyHourDiscountType: prod.happy_hour_discount_percent ? 'percentage' : 'fixed',
      happyHourDiscountValue: parseFloat(prod.happy_hour_discount_percent || prod.happy_hour_discount_fixed || '0') / 100,
      isActive: prod.is_active !== false, // Handle archived products
      createdAt: new Date(prod.created_at),
      updatedAt: new Date(prod.updated_at)
    }));
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const result = await this.request<any>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: product.name,
        price: product.price,
        tax_rate: product.taxRate * 100, // Convert to percentage
        category_id: parseInt(product.categoryId),
        happy_hour_discount_percent: product.happyHourDiscountType === 'percentage' ? product.happyHourDiscountValue * 100 : null,
        happy_hour_discount_fixed: product.happyHourDiscountType === 'fixed' ? product.happyHourDiscountValue : null,
        is_happy_hour_eligible: product.isHappyHourEligible
      }),
    });

    return {
      id: result.id.toString(),
      name: result.name,
      description: product.description,
      price: parseFloat(result.price),
      taxRate: parseFloat(result.tax_rate) / 100,
      categoryId: result.category_id.toString(),
      isHappyHourEligible: result.is_happy_hour_eligible,
      happyHourDiscountType: product.happyHourDiscountType,
      happyHourDiscountValue: product.happyHourDiscountValue,
      isActive: true,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at)
    };
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const updateData: any = {};
    
    if (product.name !== undefined) updateData.name = product.name;
    if (product.price !== undefined) updateData.price = product.price;
    if (product.taxRate !== undefined) updateData.tax_rate = product.taxRate * 100;
    if (product.categoryId !== undefined) updateData.category_id = parseInt(product.categoryId);
    if (product.isHappyHourEligible !== undefined) updateData.is_happy_hour_eligible = product.isHappyHourEligible;
    
    if (product.happyHourDiscountType === 'percentage' && product.happyHourDiscountValue !== undefined) {
      updateData.happy_hour_discount_percent = product.happyHourDiscountValue * 100;
      updateData.happy_hour_discount_fixed = null;
    } else if (product.happyHourDiscountType === 'fixed' && product.happyHourDiscountValue !== undefined) {
      updateData.happy_hour_discount_fixed = product.happyHourDiscountValue;
      updateData.happy_hour_discount_percent = null;
    }

    const result = await this.request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    return {
      id: result.id.toString(),
      name: result.name,
      description: product.description || '',
      price: parseFloat(result.price),
      taxRate: parseFloat(result.tax_rate) / 100,
      categoryId: result.category_id.toString(),
      isHappyHourEligible: result.is_happy_hour_eligible,
      happyHourDiscountType: product.happyHourDiscountType || 'percentage',
      happyHourDiscountValue: product.happyHourDiscountValue || 0,
      isActive: true,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at)
    };
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async restoreProduct(id: string): Promise<void> {
    await this.request(`/products/${id}/restore`, {
      method: 'PUT',
    });
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const orders = await this.request<any[]>('/orders');
    return orders.map(order => ({
      id: order.id.toString(),
      items: (order.items || []).map((item: any) => ({
        id: item.id ? item.id.toString() : `${order.id}-${item.product_id || 'unknown'}`,
        productId: item.product_id ? item.product_id.toString() : 'unknown',
        productName: item.product_name || 'Unknown Product',
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.unit_price || '0'),
        totalPrice: parseFloat(item.total_price || '0'),
        taxRate: parseFloat(item.tax_rate || '20') / 100, // Convert from percentage to decimal
        isHappyHourApplied: item.happy_hour_applied || false,
        isManualHappyHour: item.happy_hour_applied || false,
        isOffert: parseFloat(item.total_price || '0') === 0,
        originalPrice: parseFloat(item.unit_price || '0')
      })),
      totalAmount: parseFloat(order.total_amount),
      taxAmount: parseFloat(order.total_tax),
      discountAmount: 0, // Calculate if needed
      finalAmount: parseFloat(order.total_amount),
      createdAt: new Date(order.created_at),
      status: order.status as 'pending' | 'completed' | 'cancelled',
      paymentMethod: order.payment_method as PaymentMethod,
      subBills: (order.sub_bills || []).map((subBill: any) => ({
        id: subBill.id.toString(),
        orderId: order.id.toString(),
        paymentMethod: subBill.payment_method as 'cash' | 'card',
        amount: parseFloat(subBill.amount),
        status: subBill.status as 'pending' | 'paid',
        createdAt: new Date(subBill.created_at)
      })),
      notes: order.notes,
      tips: order.tips || 0,
      change: order.change || 0
    }));
  }

  async createOrder(order: {
    items: OrderItem[];
    totalAmount: number;
    taxAmount: number;
    paymentMethod: 'cash' | 'card' | 'split';
    status?: string;
    notes?: string;
    tips?: number;
    change?: number;
    sub_bills?: Array<{ payment_method: 'cash' | 'card'; amount: number }>;
  }): Promise<Order> {
    const result = await this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        total_amount: order.totalAmount,
        total_tax: order.taxAmount,
        payment_method: order.paymentMethod,
        status: order.status || 'completed',
        notes: order.notes,
        tips: order.tips || 0,
        change: order.change || 0,
        items: order.items.map(item => ({
          product_id: parseInt(item.productId),
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          tax_rate: item.taxRate * 100,
          tax_amount: item.totalPrice * item.taxRate / (1 + item.taxRate),
          happy_hour_applied: item.isHappyHourApplied,
          happy_hour_discount_amount: item.isHappyHourApplied ? (item.quantity * (item.unitPrice / (1 - 0.2)) * 0.2) : 0
        })),
        ...(order.sub_bills ? { sub_bills: order.sub_bills } : {})
      }),
    });

    return {
      id: result.id.toString(),
      items: order.items,
      totalAmount: parseFloat(result.total_amount),
      taxAmount: parseFloat(result.total_tax),
      discountAmount: 0,
      finalAmount: parseFloat(result.total_amount),
      createdAt: new Date(result.created_at),
      status: result.status,
      paymentMethod: order.paymentMethod,
      subBills: []
    };
  }

  // Generic HTTP methods for other components
  async get<T>(endpoint: string): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint);
    return { data };
  }

  async post<T>(endpoint: string, data?: any): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: result };
  }

  async put<T>(endpoint: string, data?: any): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: result };
  }

  async delete<T>(endpoint: string): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      method: 'DELETE',
    });
    return { data: result };
  }

  // Business Info
  async getBusinessInfo(): Promise<any> {
    return this.request<any>('/legal/business-info');
  }

  async updateBusinessInfo(data: any): Promise<any> {
    return this.request<any>('/legal/business-info', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();