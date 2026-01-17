import { AppError } from "@/lib/errors";
import { ledgerDao } from "@/dao/ledger.dao";

export const ledgerService = {
  async getContributorBalances(contributorId: string) {
    return ledgerDao.getContributorBalances(contributorId);
  },

  async creditPendingFromSupport(input: {
    contributorId: string;
    supportId: string;
    amount: number;
    idempotencyKey: string;
    actorUserId?: string | null;
  }) {
    if (input.amount <= 0) throw new AppError("INVALID_AMOUNT", "Amount must be positive", 400);

    await ledgerDao.create({
      ownerType: "CONTRIBUTOR",
      contributorId: input.contributorId,
      bucket: "PENDING",
      direction: "CREDIT",
      amount: input.amount,
      referenceType: "SUPPORT",
      referenceId: input.supportId,
      idempotencyKey: input.idempotencyKey,
      createdBy: input.actorUserId ?? null,
    });
  },

  async releasePendingToAvailable(input: {
    contributorId: string;
    supportId: string;
    amount: number;
    idempotencyKey: string;
    actorUserId?: string | null;
  }) {
    if (input.amount <= 0) throw new AppError("INVALID_AMOUNT", "Amount must be positive", 400);

    await ledgerDao.create({
      ownerType: "CONTRIBUTOR",
      contributorId: input.contributorId,
      bucket: "PENDING",
      direction: "DEBIT",
      amount: input.amount,
      referenceType: "SUPPORT",
      referenceId: input.supportId,
      idempotencyKey: `${input.idempotencyKey}:DEBIT_PENDING`,
      createdBy: input.actorUserId ?? null,
    });

    await ledgerDao.create({
      ownerType: "CONTRIBUTOR",
      contributorId: input.contributorId,
      bucket: "AVAILABLE",
      direction: "CREDIT",
      amount: input.amount,
      referenceType: "SUPPORT",
      referenceId: input.supportId,
      idempotencyKey: `${input.idempotencyKey}:CREDIT_AVAILABLE`,
      createdBy: input.actorUserId ?? null,
    });
  },

  async reserveForWithdrawal(input: {
    contributorId: string;
    withdrawalId: string;
    totalDebit: number;
    idempotencyKey: string;
    actorUserId?: string | null;
  }) {
    if (input.totalDebit <= 0) throw new AppError("INVALID_AMOUNT", "Amount must be positive", 400);

    const balances = await ledgerDao.getContributorBalances(input.contributorId);
    if (balances.available < input.totalDebit) throw new AppError("INSUFFICIENT_BALANCE", "Insufficient available balance", 400);

    await ledgerDao.create({
      ownerType: "CONTRIBUTOR",
      contributorId: input.contributorId,
      bucket: "AVAILABLE",
      direction: "DEBIT",
      amount: input.totalDebit,
      referenceType: "WITHDRAWAL",
      referenceId: input.withdrawalId,
      idempotencyKey: `${input.idempotencyKey}:DEBIT_AVAILABLE`,
      createdBy: input.actorUserId ?? null,
    });

    await ledgerDao.create({
      ownerType: "CONTRIBUTOR",
      contributorId: input.contributorId,
      bucket: "RESERVED",
      direction: "CREDIT",
      amount: input.totalDebit,
      referenceType: "WITHDRAWAL",
      referenceId: input.withdrawalId,
      idempotencyKey: `${input.idempotencyKey}:CREDIT_RESERVED`,
      createdBy: input.actorUserId ?? null,
    });
  },

  async finalizeWithdrawalDebit(input: {
    contributorId: string;
    withdrawalId: string;
    totalDebit: number;
    idempotencyKey: string;
    actorUserId?: string | null;
  }) {
    await ledgerDao.create({
      ownerType: "CONTRIBUTOR",
      contributorId: input.contributorId,
      bucket: "RESERVED",
      direction: "DEBIT",
      amount: input.totalDebit,
      referenceType: "WITHDRAWAL",
      referenceId: input.withdrawalId,
      idempotencyKey: `${input.idempotencyKey}:DEBIT_RESERVED`,
      createdBy: input.actorUserId ?? null,
    });
  },

  async recognizeFounderRevenue(input: {
    withdrawalId: string;
    feeFlat: number;
    xenditFeeActual: number;
    idempotencyKey: string;
    actorUserId?: string | null;
  }) {
    if (input.feeFlat > 0) {
      await ledgerDao.create({
        ownerType: "FOUNDER",
        contributorId: null,
        bucket: "REVENUE",
        direction: "CREDIT",
        amount: input.feeFlat,
        referenceType: "FEE",
        referenceId: input.withdrawalId,
        idempotencyKey: `${input.idempotencyKey}:FOUNDER_FEE_CREDIT`,
        createdBy: input.actorUserId ?? null,
      });
    }

    if (input.xenditFeeActual > 0) {
      await ledgerDao.create({
        ownerType: "FOUNDER",
        contributorId: null,
        bucket: "REVENUE",
        direction: "DEBIT",
        amount: input.xenditFeeActual,
        referenceType: "FEE",
        referenceId: input.withdrawalId,
        idempotencyKey: `${input.idempotencyKey}:FOUNDER_GATEWAY_DEBIT`,
        createdBy: input.actorUserId ?? null,
      });
    }
  },
};
