import { db } from "@/db";
import { ledgerService } from "@/services/ledger.service";
import { supportTransactions, withdrawalRequests } from "@/db/schema";
import { sql } from "drizzle-orm";

export const adminService = {
  async dashboard() {
    const [supportAgg] = await db
      .select({
        totalSupports: sql<number>`COUNT(*)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${supportTransactions.status}='PAID' THEN 1 ELSE 0 END),0)`,
        grossPaid: sql<number>`COALESCE(SUM(CASE WHEN ${supportTransactions.status}='PAID' THEN ${supportTransactions.amountGross} ELSE 0 END),0)`,
      })
      .from(supportTransactions);

    const [withdrawAgg] = await db
      .select({
        totalWithdrawals: sql<number>`COUNT(*)`,
        totalCompleted: sql<number>`COALESCE(SUM(CASE WHEN ${withdrawalRequests.status}='COMPLETED' THEN 1 ELSE 0 END),0)`,
        totalDebited: sql<number>`COALESCE(SUM(CASE WHEN ${withdrawalRequests.status}='COMPLETED' THEN ${withdrawalRequests.totalDebit} ELSE 0 END),0)`,
        totalFee: sql<number>`COALESCE(SUM(CASE WHEN ${withdrawalRequests.status}='COMPLETED' THEN ${withdrawalRequests.feeFlat} ELSE 0 END),0)`,
        totalGatewayFee: sql<number>`COALESCE(SUM(CASE WHEN ${withdrawalRequests.status}='COMPLETED' THEN ${withdrawalRequests.xenditFeeActual} ELSE 0 END),0)`,
      })
      .from(withdrawalRequests);

    const founderRevenue = await ledgerService.getContributorBalances as any;

    return {
      supports: {
        total: Number(supportAgg?.totalSupports ?? 0),
        paidCount: Number(supportAgg?.totalPaid ?? 0),
        grossPaid: Number(supportAgg?.grossPaid ?? 0),
      },
      withdrawals: {
        total: Number(withdrawAgg?.totalWithdrawals ?? 0),
        completedCount: Number(withdrawAgg?.totalCompleted ?? 0),
        totalDebited: Number(withdrawAgg?.totalDebited ?? 0),
        totalFee: Number(withdrawAgg?.totalFee ?? 0),
        totalGatewayFee: Number(withdrawAgg?.totalGatewayFee ?? 0),
      },
    };
  },
};
