import type React from 'react';

/** Select the whole value when an amount field gains focus so typing replaces it. */
export function selectOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select();
}
