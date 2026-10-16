import type { SourcesDependencies } from '@/modules/sources/application/dependencies';

/**
 * Abre o seletor nativo de pasta e devolve o caminho escolhido.
 *
 * Sem runtime desktop não há seletor disponível: resolve `null` e a interface
 * mantém apenas a entrada manual. Nunca toca no filesystem — apenas devolve o
 * caminho para que `addSource` registre a referência.
 */
export async function pickSourceDirectory(deps: SourcesDependencies): Promise<string | null> {
  if (!deps.picker) return null;
  return deps.picker.pickDirectory();
}
