import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSidebarCollapsed } from '@/modules/home/presentation/hooks/useSidebarCollapsed';

describe('home/presentation — useSidebarCollapsed', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('começa expandida e lembra a escolha entre aberturas do app', () => {
    const first = renderHook(() => useSidebarCollapsed());
    expect(first.result.current.collapsed).toBe(false);
    act(() => first.result.current.toggle());
    expect(first.result.current.collapsed).toBe(true);
    first.unmount();

    const second = renderHook(() => useSidebarCollapsed());
    expect(second.result.current.collapsed).toBe(true);
  });

  it('funciona mesmo sem acesso ao armazenamento local', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
  });
});
