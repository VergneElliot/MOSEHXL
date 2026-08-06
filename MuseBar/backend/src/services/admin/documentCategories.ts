/** Predefined French HORECA document categories for the admin document space. */

export const DOCUMENT_CATEGORIES = [
  { id: 'licences', label: 'Licences / autorisations' },
  { id: 'droits_exploitation', label: "Droits d'exploitation" },
  { id: 'droits_terrasse', label: 'Droits de terrasse' },
  { id: 'contrats_employes', label: 'Contrats employés' },
  { id: 'assurances', label: 'Assurances' },
  { id: 'hygiene_haccp', label: 'Hygiène / HACCP' },
  { id: 'fiscal', label: 'Fiscal / comptabilité' },
  { id: 'autre', label: 'Autre' },
] as const;

export type DocumentCategoryId = (typeof DOCUMENT_CATEGORIES)[number]['id'];

export function isKnownDocumentCategory(value: string): boolean {
  return DOCUMENT_CATEGORIES.some((c) => c.id === value);
}
