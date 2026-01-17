import { Elysia } from "elysia";

import { authRoutes } from "@/routes/auth.routes";
import { contributorRoutes } from "@/routes/contributors.routes";
import { supportRoutes } from "@/routes/supports.routes";
import { assetRoutes } from "@/routes/assets.routes";
import { payoutRoutes } from "@/routes/payouts.routes";
import { withdrawalRoutes } from "@/routes/withdrawals.routes";
import { webhookRoutes } from "@/routes/webhooks.routes";
import { adminRoutes } from "@/routes/admin.routes";

export const routes = new Elysia()
  .use(authRoutes)
  .use(contributorRoutes)
  .use(supportRoutes)
  .use(assetRoutes)
  .use(payoutRoutes)
  .use(withdrawalRoutes)
  .use(webhookRoutes)
  .use(adminRoutes);
