export interface KitchenTicketOptionLine {
  group_name: string;
  choice_label?: string | null;
  free_text?: string | null;
}

export interface KitchenTicketLine {
  quantity: number;
  product_name: string;
  options: KitchenTicketOptionLine[];
}

export interface KitchenTicketPrinterGroup {
  printer: {
    id: number;
    name: string;
    slug: string;
  };
  lines: KitchenTicketLine[];
}
