import { DefaultDataConfig } from '../types';

export function getDefaultDataConfig(): DefaultDataConfig {
  return {
    categories: [
      { name: 'Boissons', description: 'Boissons chaudes et froides', is_active: true },
      { name: 'Snacks', description: 'Collations et en-cas', is_active: true },
      { name: 'Desserts', description: 'Desserts et pâtisseries', is_active: true },
      { name: 'Plats', description: 'Plats principaux', is_active: true }
    ],
    products: [
      // Boissons
      { name: 'Café Expresso', description: 'Café expresso traditionnel', price: 2.50, tax_rate: 0.10, category_name: 'Boissons', is_active: true },
      { name: 'Cappuccino', description: 'Café expresso avec mousse de lait', price: 3.50, tax_rate: 0.10, category_name: 'Boissons', is_active: true },
      { name: 'Thé', description: 'Thé noir ou vert', price: 2.00, tax_rate: 0.10, category_name: 'Boissons', is_active: true },
      { name: 'Soda', description: 'Boisson gazeuse', price: 2.80, tax_rate: 0.20, category_name: 'Boissons', is_active: true },
      // Snacks
      { name: 'Croissant', description: 'Croissant au beurre', price: 1.50, tax_rate: 0.10, category_name: 'Snacks', is_active: true },
      { name: 'Pain au chocolat', description: 'Viennoiserie au chocolat', price: 1.80, tax_rate: 0.10, category_name: 'Snacks', is_active: true },
      { name: 'Sandwich', description: 'Sandwich jambon-beurre', price: 4.50, tax_rate: 0.10, category_name: 'Snacks', is_active: true },
      // Desserts
      { name: 'Éclair au chocolat', description: 'Pâtisserie à la crème et chocolat', price: 3.20, tax_rate: 0.10, category_name: 'Desserts', is_active: true },
      { name: 'Tarte aux fruits', description: 'Tarte saisonnière aux fruits', price: 4.00, tax_rate: 0.10, category_name: 'Desserts', is_active: true }
    ],
    settings: {
      business_hours_start: '08:00',
      business_hours_end: '18:00',
      currency: 'EUR',
      tax_included_in_prices: true,
      default_tax_rate: 0.20,
      // Happy hour settings
      happy_hour_enabled: false,
      happy_hour_start: '16:00',
      happy_hour_end: '18:00',
      happy_hour_discount: 0.10,
      // Receipt settings
      receipt_footer_message: 'Merci de votre visite !',
      print_receipts_by_default: true,
      receipt_language: 'fr',
      // System settings
      auto_backup_enabled: true,
      backup_frequency: 'daily',
      notification_email_enabled: true
    }
  };
}


