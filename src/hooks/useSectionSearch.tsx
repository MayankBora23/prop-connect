import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface SectionSearchContextValue {
  search: string;
  setSearch: (value: string) => void;
}

const SectionSearchContext = createContext<SectionSearchContextValue>({
  search: '',
  setSearch: () => {},
});

export function SectionSearchProvider({
  children,
  activeTab,
}: {
  children: ReactNode;
  activeTab: string;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [activeTab]);

  return (
    <SectionSearchContext.Provider value={{ search, setSearch }}>
      {children}
    </SectionSearchContext.Provider>
  );
}

export function useSectionSearch() {
  return useContext(SectionSearchContext);
}
