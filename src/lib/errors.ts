import { Elysia } from "elysia";
import { err } from "@/lib/response";

export class AppError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const errorPlugin = new Elysia().onError(({ error, set }) => {
  if (error instanceof AppError) {
    set.status = error.status;
    return err(error.code, error.message);
  }

  set.status = 500;
  return err("INTERNAL_ERROR", "Unexpected server error");
});
