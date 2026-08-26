export function validateMongoQuery(query: Record<string, unknown>): void {
  const dangerousOperators = [
    "$where",
    "$function",
    "$accumulator",
    "mapReduce",
  ];

  function checkObject(obj: unknown): void {
    if (typeof obj !== "object" || obj === null) return;

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (dangerousOperators.includes(key)) {
        throw new Error(`Dangerous operator detected: ${key}`);
      }
      if (typeof value === "object") {
        checkObject(value);
      }
    }
  }

  checkObject(query);
}
