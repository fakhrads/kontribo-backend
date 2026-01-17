import { AppError } from "@/lib/errors";
import { tx } from "@/lib/tx";
import { xenditRequest } from "@/lib/xendit";
import { contributorDao } from "@/dao/contributor.dao";
import { payoutDestinationDao } from "@/dao/payout_destination.dao";
import { withdrawalDao } from "@/dao/withdrawal.dao";
import { ledgerService } from "@/services/ledger.service";

type XenditDisbursement = {
  id: string;
  status: string;
  amount: number;
  fee?: number;
};

const FEE_FLAT = 4500;

export const withdrawalService = {
  async requestWithdrawalGross(actorUserId: string, input: { amountToUser: number; destinationId: string }) {
    if (input.amountToUser < 1000) throw new AppError("INVALID_AMOUNT", "Minimum amount is 1000", 400);

    const contributor = await contributorDao.findByUserId(actorUserId);
    if (!contributor) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);
    if (contributor.status !== "ACTIVE") throw new AppError("FORBIDDEN", "Contributor suspended", 403);

    const dest = await payoutDestinationDao.findById(input.destinationId);
    if (!dest || dest.contributorId !== contributor.id) throw new AppError("NOT_FOUND", "Payout destination not found", 404);
    if (!dest.isActive) throw new AppError("INVALID_DESTINATION", "Destination inactive", 400);

    const totalDebit = input.amountToUser + FEE_FLAT;
    const idem = `withdraw_req:${contributor.id}:${crypto.randomUUID()}`;

    const created = await tx(async () => {
      const w = await withdrawalDao.create({
        contributorId: contributor.id,
        destinationId: dest.id,
        amountToUser: input.amountToUser,
        feeFlat: FEE_FLAT,
        totalDebit,
        status: "REQUESTED",
        xenditIdempotencyKey: idem,
        createdBy: actorUserId,
      });

      await ledgerService.reserveForWithdrawal({
        contributorId: contributor.id,
        withdrawalId: w.id,
        totalDebit,
        idempotencyKey: `reserve:${w.id}`,
        actorUserId,
      });

      return w;
    });

    const disbursement = await xenditRequest<XenditDisbursement>({
      method: "POST",
      path: "/disbursements",
      idempotencyKey: created.xenditIdempotencyKey,
      body: this.mapDisbursementPayload(created.id, input.amountToUser, dest),
    });

    const updated = await withdrawalDao.setStatus(created.id, "PROCESSING", {
      xenditDisbursementId: disbursement.id,
      processedAt: new Date(),
      updatedBy: actorUserId,
    });

    return updated!;
  },

  mapDisbursementPayload(withdrawalId: string, amountToUser: number, dest: any) {
    if (dest.channel === "BANK") {
      return {
        external_id: withdrawalId,
        amount: amountToUser,
        bank_code: dest.bankCode,
        account_holder_name: dest.bankAccountName,
        account_number: dest.bankAccountNumber,
        description: `Kontribo withdrawal ${withdrawalId}`,
      };
    }

    return {
      external_id: withdrawalId,
      amount: amountToUser,
      ewallet_type: dest.ewalletType,
      ewallet_number: dest.ewalletNumber,
      description: `Kontribo withdrawal ${withdrawalId}`,
    };
  },

  async handleDisbursementCompleted(input: {
    withdrawalId: string;
    xenditDisbursementId?: string | null;
    xenditFeeActual?: number;
  }) {
    const w = await withdrawalDao.findById(input.withdrawalId);
    if (!w) throw new AppError("NOT_FOUND", "Withdrawal not found", 404);
    if (w.status === "COMPLETED") return w;

    const updated = await tx(async () => {
      const done = await withdrawalDao.setStatus(w.id, "COMPLETED", {
        xenditDisbursementId: input.xenditDisbursementId ?? w.xenditDisbursementId ?? null,
        xenditFeeActual: input.xenditFeeActual ?? w.xenditFeeActual ?? 0,
        completedAt: new Date(),
        updatedBy: null,
      });

      await ledgerService.finalizeWithdrawalDebit({
        contributorId: w.contributorId,
        withdrawalId: w.id,
        totalDebit: w.totalDebit,
        idempotencyKey: `withdraw_finalize:${w.id}`,
        actorUserId: null,
      });

      await ledgerService.recognizeFounderRevenue({
        withdrawalId: w.id,
        feeFlat: w.feeFlat,
        xenditFeeActual: input.xenditFeeActual ?? w.xenditFeeActual ?? 0,
        idempotencyKey: `withdraw_revenue:${w.id}`,
        actorUserId: null,
      });

      return done!;
    });

    return updated;
  },

  async handleDisbursementFailed(input: { withdrawalId: string; reason?: string }) {
    const w = await withdrawalDao.findById(input.withdrawalId);
    if (!w) throw new AppError("NOT_FOUND", "Withdrawal not found", 404);
    if (w.status === "FAILED") return w;

    const updated = await withdrawalDao.setStatus(w.id, "FAILED", {
      completedAt: new Date(),
      updatedBy: null,
    });

    return updated!;
  },
};
