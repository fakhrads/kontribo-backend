import { Elysia } from "elysia";
import { requireAdmin } from "@/middlewares/auth";
import { adminService } from "@/services/admin.service";
import { ledgerDao } from "@/dao/ledger.dao";

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(requireAdmin)
  .get("/dashboard", async () => {
    const data = await adminService.dashboard();
    return { ok: true, ...data };
  })
  .get("/founder/revenue-balance", async () => {
    const revenue = await ledgerDao.sumFounderRevenue();
    return { ok: true, revenue };
  });
