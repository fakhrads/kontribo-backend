import { db } from "@/db";
import { sessions } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

export const sessionDao = {
  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ip?: string;
    userAgent?: string;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(sessions)
      .values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        status: "ACTIVE",
        ip: input.ip ?? "",
        userAgent: input.userAgent ?? "",
        expiresAt: input.expiresAt,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? input.userId,
        updatedBy: input.createdBy ?? input.userId,
      } as any)
      .returning();
    return rows[0]!;
  },

  async findActiveByTokenHash(tokenHash: string) {
    const now = new Date();
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), eq(sessions.status, "ACTIVE"), gt(sessions.expiresAt, now)))
      .limit(1);
    return rows[0] ?? null;
  },

  async revokeByTokenHash(tokenHash: string, updatedBy?: string | null) {
    const now = new Date();
    await db
      .update(sessions)
      .set({ status: "REVOKED", updatedAt: now, updatedBy: updatedBy ?? null } as any)
      .where(eq(sessions.tokenHash, tokenHash));
  },
};
