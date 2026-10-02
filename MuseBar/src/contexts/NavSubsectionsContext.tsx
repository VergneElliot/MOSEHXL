/**
 * Lets the active main tab (Paramètres, Administration, Historique, …) publish
 * its sub-tabs into the hamburger drawer while that page is mounted.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type NavSubsectionItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

export type NavSubsectionRegistration = {
  /** Matches `AppNavTab.value` (e.g. `settings`). */
  mainTabValue: string;
  items: NavSubsectionItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

type NavSubsectionsContextValue = {
  registration: NavSubsectionRegistration | null;
  setRegistration: (next: NavSubsectionRegistration | null) => void;
};

const NavSubsectionsContext = createContext<NavSubsectionsContextValue | null>(null);

export function NavSubsectionsProvider({ children }: { children: React.ReactNode }) {
  const [registration, setRegistration] = useState<NavSubsectionRegistration | null>(null);
  const value = useMemo(
    () => ({ registration, setRegistration }),
    [registration]
  );
  return (
    <NavSubsectionsContext.Provider value={value}>{children}</NavSubsectionsContext.Provider>
  );
}

export function useNavSubsections(): NavSubsectionRegistration | null {
  return useContext(NavSubsectionsContext)?.registration ?? null;
}

/**
 * Register (and clear on unmount) the sub-tabs for the current main page.
 * Only one page should register at a time — inactive TabPanels unmount their trees.
 */
export function useRegisterNavSubsections(
  mainTabValue: string,
  items: NavSubsectionItem[],
  activeId: string,
  onSelect: (id: string) => void
): void {
  const ctx = useContext(NavSubsectionsContext);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const setRegistration = ctx?.setRegistration;
  const stableOnSelect = useCallback((id: string) => {
    onSelectRef.current(id);
  }, []);

  useEffect(() => {
    if (!setRegistration) return;
    setRegistration({
      mainTabValue,
      items,
      activeId,
      onSelect: stableOnSelect,
    });
    return () => setRegistration(null);
  }, [setRegistration, mainTabValue, items, activeId, stableOnSelect]);
}
