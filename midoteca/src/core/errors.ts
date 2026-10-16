/**
 * Framework-agnostic error hierarchy.
 *
 * The domain must not leak persistence driver errors (e.g. SQLite constraint
 * codes) to callers. Infrastructure maps those into these explicit types.
 */
export class MidotecaError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A requested entity does not exist. */
export class NotFoundError extends MidotecaError {}

/** Input failed domain validation (bad shape, missing required field, ...). */
export class ValidationError extends MidotecaError {}

/** A uniqueness/integrity rule was violated. */
export class ConflictError extends MidotecaError {}

/** Unexpected persistence/infrastructure failure. */
export class PersistenceError extends MidotecaError {}
