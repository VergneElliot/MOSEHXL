export interface UserProfileDto {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  calendar_color: string;
  available_colors: string[];
  used_colors: string[];
}

export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return null;
  return trimmed.toUpperCase();
}
