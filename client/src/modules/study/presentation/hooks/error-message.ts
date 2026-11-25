/** Mensagem legível de um erro vindo do núcleo (as validações já chegam em português). */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
