import { db } from "@/db";
import { supportTransactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const supportDao = {
  async findById(id: string) {
    const rows = await db.select().from(supportTransactions).where(eq(supportTransactions.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByIdempotencyKey(idempotencyKey: string) {
    const rows = await db
      .select()
      .from(supportTransactions)
      .where(eq(supportTransactions.idempotencyKey, idempotencyKey))
      .limit(1);
    return rows[0] ?? null;
  },

  async listByContributor(contributorId: string) {
    return db.select().from(supportTransactions).where(eq(supportTransactions.contributorId, contributorId));
  },

  async create(input: {
    contributorId: string;
    contextId?: string | null;
    amountGross: number;
    currency?: string;
    message?: string;
    isAnonymous?: boolean;
    supporterName?: string | null;
    supporterEmail?: string | null;
    status?: any;
    xenditInvoiceId?: string | null;
    xenditPaymentId?: string | null;
    idempotencyKey: string;
    expiredAt?: Date | null;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(supportTransactions)
      .values({
        contributorId: input.contributorId,
        contextId: input.contextId ?? null,
        amountGross: input.amountGross,
        currency: input.currency ?? "IDR",
        message: input.message ?? "",
        isAnonymous: input.isAnonymous ?? false,
        supporterName: input.supporterName ?? null,
        supporterEmail: input.supporterEmail ?? null,
        status: input.status ?? "PENDING",
        xenditInvoiceId: input.xenditInvoiceId ?? null,
        xenditPaymentId: input.xenditPaymentId ?? null,
        idempotencyKey: input.idempotencyKey,
        paidAt: null,
        expiredAt: input.expiredAt ?? null,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async markPaid(input: {
    supportId: string;
    xenditPaymentId?: string | null;
    paidAt?: Date | null;
    updatedBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .update(supportTransactions)
      .set({
        status: "PAID",
        xenditPaymentId: input.xenditPaymentId ?? null,
        paidAt: input.paidAt ?? new Date(),
        updatedAt: now,
        updatedBy: input.updatedBy ?? null,
      } as any)
      .where(eq(supportTransactions.id, input.supportId))
      .returning();
    return rows[0] ?? null;
  },

  async markFailed(supportId: string, updatedBy?: string | null) {
    const now = new Date();
    const rows = await db
      .update(supportTransactions)
      .set({ status: "FAILED", updatedAt: now, updatedBy: updatedBy ?? null } as any)
      .where(eq(supportTransactions.id, supportId))
      .returning();
    return rows[0] ?? null;
  },
};
