import { Elysia, t } from "elysia";
import { supportService } from "@/services/support.service";

export const supportRoutes = new Elysia({ prefix: "/supports" })
  .post(
    "/",
    async ({ body }) => {
      const res = await supportService.createSupport(body);
      return { ok: true, ...res };
    },
    {
      body: t.Object({
        contributorUsername: t.String({ minLength: 3, maxLength: 32 }),
        amount: t.Number({ minimum: 1000 }),
        message: t.Optional(t.String({ maxLength: 5000 })),
        isAnonymous: t.Optional(t.Boolean()),
        contextId: t.Optional(t.String()),
        supporterName: t.Optional(t.String({ maxLength: 120 })),
        supporterEmail: t.Optional(t.String({ maxLength: 320 })),
        idempotencyKey: t.String({ minLength: 10, maxLength: 80 }),
        successRedirectUrl: t.Optional(t.String()),
        failureRedirectUrl: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/release",
    async ({ params }) => {
      const res = await supportService.releaseSupportToAvailable({ supportId: params.id });
      return { ok: true, ...res };
    },
    { params: t.Object({ id: t.String() }) }
  );
