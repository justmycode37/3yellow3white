export class NarrationError extends Error {
  constructor(public code: string, message: string, public status = 422, public retryable = false) {
    super(message); this.name = "NarrationError";
  }
}
export function publicError(error: unknown): NarrationError {
  return error instanceof NarrationError ? error : new NarrationError("INTERNAL", "Narration could not be completed. Check the server configuration and retry.", 500);
}
