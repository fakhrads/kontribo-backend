import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import cookie from "@elysiajs/cookie";

import { env } from "@/env";
import { routes } from "@/routes";
import { AppError } from "@/lib/errors";

export function createApp() {
  const app = new Elysia({ name: "kontribo-backend" })
    .use(
      cors({
        origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((s) => s.trim()),
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      })
    )
    .use(
      cookie({
        httpOnly: true,
        sameSite: env.SESSION_COOKIE_SAMESITE,
        secure: env.SESSION_COOKIE_SAMESITE === "none" ? true : env.SESSION_COOKIE_SECURE,
        path: "/",
      })
    )
    .onError(({ error, set }) => {
      console.error("[ERROR]", error);

      if (error instanceof AppError) {
        set.status = error.status;
        return { ok: false, code: error.code, message: error.message };
      }

      set.status = 500;

      if (env.NODE_ENV === "development") {
        return {
          ok: false,
          code: "INTERNAL_ERROR",
          message: (error as any)?.message ?? "Internal server error",
          stack: (error as any)?.stack ?? null,
        };
      }

      return { ok: false, code: "INTERNAL_ERROR", message: "Internal server error" };
    })
    .get("/health", () => ({ ok: true, name: "kontribo-backend" }))
    .use(routes);

  return app;
}
