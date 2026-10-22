export type DiningTablePatch = Partial<{
  label: string;
  capacity: number | null;
  shape: string;
  width: number;
  height: number;
  is_active: boolean;
}>;
