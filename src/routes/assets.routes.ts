import { Elysia, t } from "elysia";
import { requireAuth } from "@/middlewares/auth";
import { assetService } from "@/services/asset.service";

export const assetRoutes = new Elysia({ prefix: "/assets" })
  .use(requireAuth)
  .post(
    "/init",
    async ({ actorUserId, body }) => {
      console.log("contextId raw:", body.contextId, typeof body.contextId);
      const res = await assetService.initUpload(actorUserId, body);
      return { ok: true, ...res };
    },
    {
      body: t.Object({
        kind: t.Union([
          t.Literal("AVATAR"),
          t.Literal("BANNER"),
          t.Literal("THUMBNAIL"),
          t.Literal("GALLERY"),
          t.Literal("ATTACHMENT"),
        ]),
        mimeType: t.String({ minLength: 3, maxLength: 120 }),
        sizeBytes: t.Number({ minimum: 1 }),
        contextId: t.Optional(t.Union([t.String(), t.Null()])),
        visibility: t.Optional(t.Union([t.Literal("PUBLIC"), t.Literal("PRIVATE")])),
        originalFilename: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .post(
    "/complete",
    async ({ actorUserId, body }) => {
      const { assetId } = body;

      if (!assetId || typeof assetId !== "string") {
        return { ok: false, message: "assetId is required" };
      }
      if (!isUuid(assetId)) {
        return { ok: false, message: "assetId must be a valid UUID" };
      }

      const asset = await assetService.completeUpload(actorUserId, body);
      return { ok: true, asset };
    },
    {
      body: t.Object({
        assetId: t.String(),
        checksumSha256: t.Optional(t.Union([t.String(), t.Null()])),
        width: t.Optional(t.Union([t.Number(), t.Null()])),
        height: t.Optional(t.Union([t.Number(), t.Null()])),
        durationMs: t.Optional(t.Union([t.Number(), t.Null()])),
      }),
    }
  )
  .get(
    "/:id/download",
    async ({ actorUserId, params }) => {
      const res = await assetService.getDownloadUrl(actorUserId, params.id);
      return { ok: true, ...res };
    },
    { params: t.Object({ id: t.String() }) }
  );

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}