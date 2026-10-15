/**
 * Narrow JSON value model used for unstructured columns (`metadata`, `payload`,
 * `checkpoint`, `value`). Repositories serialize with `JSON.stringify` and parse
 * defensively, so unknown shapes are tolerated at the edges.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
