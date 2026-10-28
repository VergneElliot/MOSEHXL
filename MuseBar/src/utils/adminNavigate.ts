export type AdminNavigateDetail = {
  section: 'inbox' | 'reservations' | 'planning' | 'documents';
  reservationId?: number | null;
};

const EVENT = 'mosehxl:open-admin';

/** Ask the shell to open Administration on a given subsection. */
export function requestOpenAdmin(detail: AdminNavigateDetail): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

export function subscribeOpenAdmin(
  handler: (detail: AdminNavigateDetail) => void
): () => void {
  const listener = (ev: Event) => {
    const ce = ev as CustomEvent<AdminNavigateDetail>;
    if (ce.detail?.section) handler(ce.detail);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
