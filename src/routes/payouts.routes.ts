import { Elysia, t } from "elysia";
import { requireAuth } from "@/middlewares/auth";
import { contributorDao } from "@/dao/contributor.dao";
import { payoutDestinationDao } from "@/dao/payout_destination.dao";

export const payoutRoutes = new Elysia({ prefix: "/payout-destinations" })
  .use(requireAuth)
  .get("/", async ({ actorUserId }) => {
    const contributor = await contributorDao.findByUserId(actorUserId);
    if (!contributor) return { ok: true, destinations: [] };

    const destinations = await payoutDestinationDao.listByContributor(contributor.id);
    return { ok: true, destinations };
  })
  .post(
    "/",
    async ({ actorUserId, body }) => {
      const contributor = await contributorDao.findByUserId(actorUserId);
      if (!contributor) throw new Error("Contributor not found");

      const destination = await payoutDestinationDao.create({
        contributorId: contributor.id,
        channel: body.channel,
        label: body.label ?? "",
        isDefault: body.isDefault ?? false,
        bankCode: body.bankCode ?? null,
        bankAccountName: body.bankAccountName ?? null,
        bankAccountNumber: body.bankAccountNumber ?? null,
        ewalletType: body.ewalletType ?? null,
        ewalletNumber: body.ewalletNumber ?? null,
        isActive: true,
        createdBy: actorUserId,
      });

      return { ok: true, destination };
    },
    {
      body: t.Object({
        channel: t.Union([t.Literal("BANK"), t.Literal("EWALLET")]),
        label: t.Optional(t.String({ maxLength: 80 })),
        isDefault: t.Optional(t.Boolean()),

        bankCode: t.Optional(t.Union([t.String(), t.Null()])),
        bankAccountName: t.Optional(t.Union([t.String(), t.Null()])),
        bankAccountNumber: t.Optional(t.Union([t.String(), t.Null()])),

        ewalletType: t.Optional(t.Union([t.String(), t.Null()])),
        ewalletNumber: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .patch(
    "/:id",
    async ({ actorUserId, params, body }) => {
      const destination = await payoutDestinationDao.updateById(params.id, { ...body, updatedBy: actorUserId } as any);
      return { ok: true, destination };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        label: t.Optional(t.String({ maxLength: 80 })),
        isDefault: t.Optional(t.Boolean()),
        isActive: t.Optional(t.Boolean()),

        bankCode: t.Optional(t.Union([t.String(), t.Null()])),
        bankAccountName: t.Optional(t.Union([t.String(), t.Null()])),
        bankAccountNumber: t.Optional(t.Union([t.String(), t.Null()])),

        ewalletType: t.Optional(t.Union([t.String(), t.Null()])),
        ewalletNumber: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  );
