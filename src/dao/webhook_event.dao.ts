import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const webhookEventDao = {
  async findByTypeAndIdempotency(type: any, idempotencyKey: string) {
    const rows = await db
      .select()
      .from(webhookEvents)
      .where(and(eq(webhookEvents.type, type), eq(webhookEvents.idempotencyKey, idempotencyKey)))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(input: {
    type: any;
    externalId: string;
    idempotencyKey: string;
    signatureValid?: boolean;
    payload: string;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(webhookEvents)
      .values({
        type: input.type,
        externalId: input.externalId,
        idempotencyKey: input.idempotencyKey,
        signatureValid: input.signatureValid ?? false,
        processed: false,
        processingError: "",
        payload: input.payload,
        receivedAt: now,
        processedAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async markProcessed(id: string, patch: { processedAt?: Date; error?: string; updatedBy?: string | null }) {
    const now = new Date();
    const rows = await db
      .update(webhookEvents)
      .set({
        processed: patch.error ? false : true,
        processingError: patch.error ?? "",
        processedAt: patch.processedAt ?? new Date(),
        updatedAt: now,
        updatedBy: patch.updatedBy ?? null,
      } as any)
      .where(eq(webhookEvents.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
