import { Elysia } from "elysia";

export const withRequestContext = new Elysia({ name: "withRequestContext" })
  .decorate("requestId", "" as string)
  .decorate("actorUserId", null as string | null)
  .derive(({ request }) => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    return { requestId, actorUserId: null as string | null };
  });
