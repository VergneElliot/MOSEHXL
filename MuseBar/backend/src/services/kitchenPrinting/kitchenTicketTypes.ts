export interface KitchenTicketOptionLine {
  group_name: string;
  choice_label?: string | null;
  free_text?: string | null;
}

export interface KitchenTicketLineVariant {
  quantity: number;
  options: KitchenTicketOptionLine[];
}

export interface KitchenTicketLine {
  quantity: number;
  product_name: string;
  options: KitchenTicketOptionLine[];
  /** Present when the same product has different option/note combinations. */
  option_variants?: KitchenTicketLineVariant[];
}

export interface KitchenTicketPrinterGroup {
  printer: {
    id: number;
    name: string;
    slug: string;
  };
  lines: KitchenTicketLine[];
}
