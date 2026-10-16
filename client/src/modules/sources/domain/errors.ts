/** Erros do contexto `sources`. */

export class DuplicateSourceError extends Error {
  constructor(path: string) {
    super(`A fonte "${path}" já está cadastrada na biblioteca.`);
    this.name = 'DuplicateSourceError';
  }
}

export class InvalidSourceError extends Error {
  constructor() {
    super('Informe um caminho válido para a fonte.');
    this.name = 'InvalidSourceError';
  }
}
