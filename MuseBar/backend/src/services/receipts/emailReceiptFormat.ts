export function formatPaymentMethod(method: string): string {
  const methods: { [key: string]: string } = {
    'cash': 'Espèces',
    'card': 'Carte',
    'split': 'Mixte',
    'check': 'Chèque',
    'transfer': 'Virement'
  };
  return methods[method] || method;
}

export function formatClosureType(type: string): string {
  const types: { [key: string]: string } = {
    'DAILY': 'Journalière',
    'WEEKLY': 'Hebdomadaire',
    'MONTHLY': 'Mensuelle',
    'ANNUAL': 'Annuelle'
  };
  return types[type] || type;
}
