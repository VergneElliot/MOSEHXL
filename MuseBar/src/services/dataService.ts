import { Category, Product } from '../types';
import { ApiService } from './apiService';

export class DataService {
  private static instance: DataService;
  private categories: Category[] = [];
  private products: Product[] = [];

  private apiService: ApiService;

  private constructor() {
    this.apiService = ApiService.getInstance();
    this.loadData();
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

  public async deleteProduct(id: string): Promise<boolean> {
    await this.apiService.deleteProduct(id);
    await this.getProducts();
    return true;
  }

  public async restoreProduct(id: string): Promise<boolean> {
    await this.apiService.restoreProduct(id);
    await this.getProducts();
    return true;
  }

  public toggleProductActive(id: string): Product | null {
    const product = this.getProductById(id);
    if (!product) return null;
    return this.updateProduct(id, { isActive: !product.isActive }) as any;
  }

  // Données par défaut
  private initializeDefaultData(): void {
    if (this.categories.length === 0) {
      this.createCategory({
        name: 'Bières',
        description: 'Bières pression et bouteilles',
        color: '#FFD700',
      });

      this.createCategory({
        name: 'Cocktails',
        description: 'Cocktails et spiritueux',
        color: '#FF69B4',
      });

      this.createCategory({
        name: 'Softs',
        description: 'Boissons non alcoolisées',
        color: '#87CEEB',
      });

      this.createCategory({
        name: 'Snacks',
        description: 'Petites faims',
        color: '#98FB98',
      });
    }

    if (this.products.length === 0) {
      const biereCategory = this.categories.find(cat => cat.name === 'Bières');
      const cocktailCategory = this.categories.find(cat => cat.name === 'Cocktails');
      const softCategory = this.categories.find(cat => cat.name === 'Softs');

      if (biereCategory) {
        this.createProduct({
          name: 'Pression Blonde',
          description: 'Biere blonde pression 25cl',
          price: 6.5,
          taxRate: 0.2,
          categoryId: biereCategory.id,
          isHappyHourEligible: true,
          happyHourDiscountType: 'percentage',
          happyHourDiscountValue: 0.2,
          isActive: true,
        });

        this.createProduct({
          name: 'Pression Brune',
          description: 'Biere brune pression 25cl',
          price: 6.5,
          taxRate: 0.2,
          categoryId: biereCategory.id,
          isHappyHourEligible: true,
          happyHourDiscountType: 'fixed',
          happyHourDiscountValue: 1.0,
          isActive: true,
        });
      }

      if (cocktailCategory) {
        this.createProduct({
          name: 'Mojito',
          description: 'Mojito classique',
          price: 12.0,
          taxRate: 0.2,
          categoryId: cocktailCategory.id,
          isHappyHourEligible: true,
          happyHourDiscountType: 'percentage',
          happyHourDiscountValue: 0.25,
          isActive: true,
        });
      }

      if (softCategory) {
        this.createProduct({
          name: 'Coca-Cola',
          description: 'Coca-Cola 33cl',
          price: 4.5,
          taxRate: 0.1,
          categoryId: softCategory.id,
          isHappyHourEligible: false,
          happyHourDiscountType: 'percentage',
          happyHourDiscountValue: 0,
          isActive: true,
        });
      }
    }
  }

  // Persistance des données
  private saveData(): void {
    try {
      localStorage.setItem('musebar-categories', JSON.stringify(this.categories));
      localStorage.setItem('musebar-products', JSON.stringify(this.products));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données:', error);
    }
  }

  private async loadData(): Promise<void> {
    await this.getCategories();
    await this.getProducts();
  }
}
