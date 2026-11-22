import { useCallback, useState } from 'react';

const STORAGE_KEY = 'midoteca.sidebar.collapsed';

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function write(collapsed: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    // Preferência visual apenas: sem armazenamento, vale só nesta sessão.
  }
}

/** Preferência de interface (não é dado de negócio): menu lateral recolhido ou não. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(read);
  const toggle = useCallback(() => {
    setCollapsed((value) => {
      write(!value);
      return !value;
    });
  }, []);
  return { collapsed, toggle };
}
