import { Category, Product, ProductOptionGroup, KitchenPrinter } from '../types';
import type { ProductOptionGroupFormInput } from './api/productOptionGroups';
import type { KitchenPrinterFormInput } from './api/kitchenPrinters';
import { ApiService } from './apiService';

export class DataService {
  private static instance: DataService;
  private categories: Category[] = [];
  private products: Product[] = [];

  private apiService: ApiService;

  private constructor() {
    this.apiService = ApiService.getInstance();
    // Remove automatic data loading - let components control when to load data
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // Gestion des catégories
  public async getCategories(): Promise<Category[]> {
    this.categories = await this.apiService.getCategories();
    return [...this.categories];
  }

  public async getArchivedCategories(): Promise<Category[]> {
    return await this.apiService.getArchivedCategories();
  }

  public async getAllCategoriesIncludingArchived(): Promise<Category[]> {
    return await this.apiService.getAllCategoriesIncludingArchived();
  }

  public getCategoriesSync(): Category[] {
    return [...this.categories];
  }

  public getCategoryById(id: string): Category | undefined {
    return this.categories.find(cat => cat.id === id);
  }

  public async createCategory(
    categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Category> {
    const category = await this.apiService.createCategory(categoryData);
    await this.getCategories();
    return category;
  }

  public async updateCategory(
    id: string,
    updates: Partial<Omit<Category, 'id' | 'createdAt'>>
  ): Promise<Category | null> {
    const category = await this.apiService.updateCategory(id, updates);
    await this.getCategories();
    return category;
  }

  public async deleteCategory(
    id: string
  ): Promise<{ message: string; action?: string; reason?: string }> {
    const result = await this.apiService.deleteCategory(id);
    await this.getCategories();
    return result;
  }

  public async restoreCategory(id: string): Promise<boolean> {
    await this.apiService.restoreCategory(id);
    await this.getCategories();
    return true;
  }

  // Gestion des produits
  public async getProducts(): Promise<Product[]> {
    this.products = await this.apiService.getProducts();
    return [...this.products];
  }

  public async getArchivedProducts(): Promise<Product[]> {
    return await this.apiService.getArchivedProducts();
  }

  public async getAllProductsIncludingArchived(): Promise<Product[]> {
    return await this.apiService.getAllProductsIncludingArchived();
  }

  public getProductsSync(): Product[] {
    return [...this.products];
  }

  public getProductsByCategory(categoryId: string): Product[] {
    return this.products.filter(prod => prod.categoryId === categoryId && prod.isActive);
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find(prod => prod.id === id);
  }

  public async createProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    const product = await this.apiService.createProduct(productData);
    await this.getProducts();
    return product;
  }

  public async updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'createdAt'>>
  ): Promise<Product | null> {
    const product = await this.apiService.updateProduct(id, updates);
    await this.getProducts();
    return product;
  }

  public async deleteProduct(id: string): Promise<{ message?: string; action?: string }> {
    const result = await this.apiService.deleteProduct(id);
    await this.getProducts();
    return result;
  }

  public async restoreProduct(id: string): Promise<boolean> {
    await this.apiService.restoreProduct(id);
    await this.getProducts();
    return true;
  }

  public toggleProductActive(id: string): Product | null {
    const product = this.getProductById(id);
    if (!product) return null;
    // Fire and forget update; return optimistic value
    void this.updateProduct(id, { isActive: !product.isActive });
    return { ...product, isActive: !product.isActive };
  }

  public async getProductOptionGroups(): Promise<ProductOptionGroup[]> {
    return this.apiService.getProductOptionGroups();
  }

  public async createProductOptionGroup(input: ProductOptionGroupFormInput): Promise<ProductOptionGroup> {
    return this.apiService.createProductOptionGroup(input);
  }

  public async updateProductOptionGroup(
    id: string,
    input: ProductOptionGroupFormInput
  ): Promise<ProductOptionGroup> {
    return this.apiService.updateProductOptionGroup(id, input);
  }

  public async deleteProductOptionGroup(id: string): Promise<{ message?: string; action?: string }> {
    return this.apiService.deleteProductOptionGroup(id);
  }

  public async getKitchenPrinters(): Promise<KitchenPrinter[]> {
    return this.apiService.getKitchenPrinters();
  }

  public async createKitchenPrinter(input: KitchenPrinterFormInput): Promise<KitchenPrinter> {
    return this.apiService.createKitchenPrinter(input);
  }

  public async updateKitchenPrinter(id: string, input: KitchenPrinterFormInput): Promise<KitchenPrinter> {
    return this.apiService.updateKitchenPrinter(id, input);
  }

  public async deleteKitchenPrinter(id: string): Promise<{ message?: string; action?: string }> {
    return this.apiService.deleteKitchenPrinter(id);
  }

  public async testKitchenPrinter(id: string): Promise<{ message?: string; job_id?: string }> {
    return this.apiService.testKitchenPrinter(id);
  }
}
