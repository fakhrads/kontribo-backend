import { db } from "@/db";
import { founderPayouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const founderPayoutDao = {
  async findById(id: string) {
    const rows = await db.select().from(founderPayouts).where(eq(founderPayouts.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByXenditIdempotencyKey(xenditIdempotencyKey: string) {
    const rows = await db
      .select()
      .from(founderPayouts)
      .where(eq(founderPayouts.xenditIdempotencyKey, xenditIdempotencyKey))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(input: {
    amount: number;
    currency?: string;
    status?: any;
    xenditIdempotencyKey: string;
    xenditDisbursementId?: string | null;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(founderPayouts)
      .values({
        amount: input.amount,
        currency: input.currency ?? "IDR",
        status: input.status ?? "REQUESTED",
        xenditDisbursementId: input.xenditDisbursementId ?? null,
        xenditIdempotencyKey: input.xenditIdempotencyKey,
        requestedAt: now,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async setStatus(id: string, status: any, patch: Partial<{ xenditDisbursementId: string | null; completedAt: Date | null; updatedBy: string | null }>) {
    const now = new Date();
    const rows = await db
      .update(founderPayouts)
      .set({
        status,
        ...(patch.xenditDisbursementId !== undefined ? { xenditDisbursementId: patch.xenditDisbursementId } : {}),
        ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
        updatedAt: now,
        updatedBy: patch.updatedBy ?? null,
      } as any)
      .where(eq(founderPayouts.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
