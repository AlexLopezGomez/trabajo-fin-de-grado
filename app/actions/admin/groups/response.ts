import type { ApiResponse } from "@/types/rbac";
import { ZodError, ZodIssue } from "zod";
import { AuthError } from "@/lib/auth/guards";

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail<T = never>(message: string): ApiResponse<T> {
  return { success: false, error: message };
}

export function fromError<T = never>(err: unknown, fallback = "Unexpected error"): ApiResponse<T> {
  if (err instanceof AuthError) {
    return fail(`${err.code}: ${err.message}`);
  }
  if (err instanceof ZodError) {
    const messages = (err.issues as ZodIssue[]).map((i: ZodIssue) => i.message).join(", ");
    return fail(`validation_error: ${messages}`);
  }
  if (err instanceof Error) {
    return fail(err.message);
  }
  return fail(fallback);
}
