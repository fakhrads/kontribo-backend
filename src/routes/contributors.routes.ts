import { Elysia, t } from "elysia";
import { requireAuth } from "@/middlewares/auth";
import { contributorService } from "@/services/contributor.service";
import { contextDao } from "@/dao/context.dao";

export const contributorRoutes = new Elysia()
  .get(
    "/c/:username",
    async ({ params }) => {
      const data = await contributorService.getPublicProfile(params.username);
      return { ok: true, ...data };
    },
    { params: t.Object({ username: t.String({ minLength: 3, maxLength: 32 }) }) }
  )
  .use(requireAuth)
  .get("/me/profile", async ({ actorUserId }) => {
    const profile = await contributorService.getMyProfile(actorUserId);
    return { ok: true, profile };
  })
  .patch(
    "/me/profile",
    async ({ actorUserId, body }) => {
      const profile = await contributorService.updateMyProfile(actorUserId, body);
      return { ok: true, profile };
    },
    {
      body: t.Object({
        displayName: t.Optional(t.String({ maxLength: 120 })),
        bio: t.Optional(t.String({ maxLength: 5000 })),
        category: t.Optional(t.String({ maxLength: 64 })),
      }),
    }
  )
  .post(
    "/me/links",
    async ({ actorUserId, body }) => {
      const link = await contributorService.addLink(actorUserId, body);
      return { ok: true, link };
    },
    {
      body: t.Object({
        label: t.Optional(t.String({ maxLength: 40 })),
        url: t.String({ minLength: 5 }),
        sortOrder: t.Optional(t.Union([t.String(), t.Number()])),
      }),
    }
  )
  .patch(
    "/me/links/:id",
    async ({ actorUserId, params, body }) => {
      const link = await contributorService.updateLink(actorUserId, params.id, body);
      return { ok: true, link };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        label: t.Optional(t.String({ maxLength: 40 })),
        url: t.Optional(t.String({ minLength: 5 })),
        sortOrder: t.Optional(t.Union([t.String(), t.Number()])),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/me/links/:id",
    async ({ actorUserId, params }) => {
      const link = await contributorService.deleteLink(actorUserId, params.id);
      return { ok: true, link };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .get("/me/contexts", async ({ actorUserId }) => {
    const profile = await contributorService.getMyProfile(actorUserId);
    const contexts = await contextDao.listByContributor(profile.id, true);
    return { ok: true, contexts };
  })
  .post(
    "/me/contexts",
    async ({ actorUserId, body }) => {
      const profile = await contributorService.getMyProfile(actorUserId);
      const ctx = await contextDao.create({
        contributorId: profile.id,
        type: body.type,
        title: body.title,
        description: body.description ?? "",
        externalUrl: body.externalUrl ?? null,
        metadata: body.metadata ?? {},
        thumbnailAssetId: body.thumbnailAssetId ?? null,
        createdBy: actorUserId,
      });
      return { ok: true, context: ctx };
    },
    {
      body: t.Object({
        type: t.Optional(
          t.Union([
            t.Literal("SOFTWARE"),
            t.Literal("VIDEO"),
            t.Literal("PHOTO"),
            t.Literal("AUDIO"),
            t.Literal("GAME_SCRIPT"),
            t.Literal("GAME_ASSET"),
            t.Literal("DESIGN"),
            t.Literal("ARTICLE"),
            t.Literal("DATASET"),
            t.Literal("DOCUMENTATION"),
            t.Literal("TEMPLATE"),
            t.Literal("AVATAR"),
            t.Literal("BANNER"),
            t.Literal("OTHER"),
          ])
        ),
        title: t.String({ minLength: 1, maxLength: 160 }),
        description: t.Optional(t.String({ maxLength: 5000 })),
        externalUrl: t.Optional(t.Union([t.String(), t.Null()])),
        metadata: t.Optional(t.Any()),
        thumbnailAssetId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .patch(
    "/me/contexts/:id",
    async ({ actorUserId, params, body }) => {
      const ctx = await contextDao.updateById(params.id, { ...body, updatedBy: actorUserId } as any);
      return { ok: true, context: ctx };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        type: t.Optional(
          t.Union([
            t.Literal("SOFTWARE"),
            t.Literal("VIDEO"),
            t.Literal("PHOTO"),
            t.Literal("AUDIO"),
            t.Literal("GAME_SCRIPT"),
            t.Literal("GAME_ASSET"),
            t.Literal("DESIGN"),
            t.Literal("ARTICLE"),
            t.Literal("DATASET"),
            t.Literal("DOCUMENTATION"),
            t.Literal("TEMPLATE"),
            t.Literal("OTHER"),
          ])
        ),
        title: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
        description: t.Optional(t.String({ maxLength: 5000 })),
        externalUrl: t.Optional(t.Union([t.String(), t.Null()])),
        metadata: t.Optional(t.Any()),
        thumbnailAssetId: t.Optional(t.Union([t.String(), t.Null()])),
        isArchived: t.Optional(t.Boolean()),
      }),
    }
  );
