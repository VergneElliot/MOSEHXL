export interface ProductOptionChoice {
  id: number;
  group_id: number;
  establishment_id: string;
  label: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductOptionGroup {
  id: number;
  establishment_id: string;
  name: string;
  is_required: boolean;
  allow_free_text: boolean;
  free_text_label: string | null;
  free_text_max_length: number;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  choices: ProductOptionChoice[];
}

export interface CreateProductOptionGroupInput {
  name: string;
  is_required?: boolean;
  allow_free_text?: boolean;
  free_text_label?: string | null;
  free_text_max_length?: number;
  display_order?: number;
  choices?: Array<{ label: string; display_order?: number }>;
}

export interface UpdateProductOptionGroupInput {
  name?: string;
  is_required?: boolean;
  allow_free_text?: boolean;
  free_text_label?: string | null;
  free_text_max_length?: number;
  display_order?: number;
  is_active?: boolean;
  choices?: Array<{ id?: number; label: string; display_order?: number; is_active?: boolean }>;
}
