import { Elysia } from "elysia";
import { ok } from "@/lib/response";

export const healthRoute = new Elysia({ prefix: "/api/v1" }).get("/health", () =>
  ok({ status: "ok" })
);
