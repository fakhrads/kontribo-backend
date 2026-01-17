import { db } from "@/db";
import { withdrawalRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

export const withdrawalDao = {
  async findById(id: string) {
    const rows = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByXenditIdempotencyKey(xenditIdempotencyKey: string) {
    const rows = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.xenditIdempotencyKey, xenditIdempotencyKey))
      .limit(1);
    return rows[0] ?? null;
  },

  async listByContributor(contributorId: string) {
    return db.select().from(withdrawalRequests).where(eq(withdrawalRequests.contributorId, contributorId));
  },

  async create(input: {
    contributorId: string;
    destinationId: string;
    amountToUser: number;
    feeFlat: number;
    totalDebit: number;
    currency?: string;
    status?: any;
    xenditIdempotencyKey: string;
    xenditDisbursementId?: string | null;
    xenditFeeActual?: number;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(withdrawalRequests)
      .values({
        contributorId: input.contributorId,
        destinationId: input.destinationId,
        amountToUser: input.amountToUser,
        feeFlat: input.feeFlat,
        totalDebit: input.totalDebit,
        currency: input.currency ?? "IDR",
        status: input.status ?? "REQUESTED",
        xenditDisbursementId: input.xenditDisbursementId ?? null,
        xenditIdempotencyKey: input.xenditIdempotencyKey,
        xenditFeeActual: input.xenditFeeActual ?? 0,
        requestedAt: now,
        processedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async setStatus(id: string, status: any, patch: Partial<{ xenditDisbursementId: string | null; xenditFeeActual: number; processedAt: Date | null; completedAt: Date | null; updatedBy: string | null }>) {
    const now = new Date();
    const rows = await db
      .update(withdrawalRequests)
      .set({
        status,
        ...(patch.xenditDisbursementId !== undefined ? { xenditDisbursementId: patch.xenditDisbursementId } : {}),
        ...(patch.xenditFeeActual !== undefined ? { xenditFeeActual: patch.xenditFeeActual } : {}),
        ...(patch.processedAt !== undefined ? { processedAt: patch.processedAt } : {}),
        ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
        updatedAt: now,
        updatedBy: patch.updatedBy ?? null,
      } as any)
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
