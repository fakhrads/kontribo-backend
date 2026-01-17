import { Elysia, t } from "elysia";
import { requireAuth } from "@/middlewares/auth";
import { contributorDao } from "@/dao/contributor.dao";
import { withdrawalDao } from "@/dao/withdrawal.dao";
import { ledgerService } from "@/services/ledger.service";
import { withdrawalService } from "@/services/withdrawal.service";

export const withdrawalRoutes = new Elysia({ prefix: "/withdrawals" })
  .use(requireAuth)
  .get("/balance", async ({ actorUserId }) => {
    const contributor = await contributorDao.findByUserId(actorUserId);
    if (!contributor) return { ok: true, balances: { available: 0, pending: 0, reserved: 0 } };

    const balances = await ledgerService.getContributorBalances(contributor.id);
    return { ok: true, balances };
  })
  .get("/", async ({ actorUserId }) => {
    const contributor = await contributorDao.findByUserId(actorUserId);
    if (!contributor) return { ok: true, withdrawals: [] };

    const withdrawals = await withdrawalDao.listByContributor(contributor.id);
    return { ok: true, withdrawals };
  })
  .post(
    "/",
    async ({ actorUserId, body }) => {
      const withdrawal = await withdrawalService.requestWithdrawalGross(actorUserId, body);
      return { ok: true, withdrawal };
    },
    {
      body: t.Object({
        amountToUser: t.Number({ minimum: 1000 }),
        destinationId: t.String(),
      }),
    }
  );
