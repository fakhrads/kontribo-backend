import { db } from "@/db";
import { ledgerEntries } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const ledgerDao = {
  async create(input: {
    ownerType: "CONTRIBUTOR" | "FOUNDER";
    contributorId?: string | null;
    bucket: "AVAILABLE" | "PENDING" | "RESERVED" | "REVENUE";
    direction: "CREDIT" | "DEBIT";
    amount: number;
    currency?: string;
    referenceType: any;
    referenceId: string;
    idempotencyKey?: string | null;
    occurredAt?: Date;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(ledgerEntries)
      .values({
        ownerType: input.ownerType,
        contributorId: input.contributorId ?? null,
        bucket: input.bucket,
        direction: input.direction,
        amount: input.amount,
        currency: input.currency ?? "IDR",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt: input.occurredAt ?? now,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async sumBucketForContributor(contributorId: string, bucket: "AVAILABLE" | "PENDING" | "RESERVED") {
    const rows = await db
      .select({
        credit: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerEntries.direction} = 'CREDIT' THEN ${ledgerEntries.amount} ELSE 0 END), 0)`,
        debit: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerEntries.direction} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE 0 END), 0)`,
      })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.ownerType, "CONTRIBUTOR"),
          eq(ledgerEntries.contributorId, contributorId),
          eq(ledgerEntries.bucket, bucket)
        )
      );

    const credit = Number(rows[0]?.credit ?? 0);
    const debit = Number(rows[0]?.debit ?? 0);
    return credit - debit;
  },

  async getContributorBalances(contributorId: string) {
    const available = await this.sumBucketForContributor(contributorId, "AVAILABLE");
    const pending = await this.sumBucketForContributor(contributorId, "PENDING");
    const reserved = await this.sumBucketForContributor(contributorId, "RESERVED");
    return { available, pending, reserved };
  },

  async sumFounderRevenue() {
    const rows = await db
      .select({
        credit: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerEntries.direction} = 'CREDIT' THEN ${ledgerEntries.amount} ELSE 0 END), 0)`,
        debit: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerEntries.direction} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE 0 END), 0)`,
      })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.ownerType, "FOUNDER"), eq(ledgerEntries.bucket, "REVENUE")));

    const credit = Number(rows[0]?.credit ?? 0);
    const debit = Number(rows[0]?.debit ?? 0);
    return credit - debit;
  },
};
