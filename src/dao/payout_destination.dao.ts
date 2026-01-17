import { db } from "@/db";
import { payoutDestinations } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const payoutDestinationDao = {
  async listByContributor(contributorId: string) {
    return db.select().from(payoutDestinations).where(eq(payoutDestinations.contributorId, contributorId));
  },

  async findById(id: string) {
    const rows = await db.select().from(payoutDestinations).where(eq(payoutDestinations.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findDefault(contributorId: string) {
    const rows = await db
      .select()
      .from(payoutDestinations)
      .where(and(eq(payoutDestinations.contributorId, contributorId), eq(payoutDestinations.isDefault, true)))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(input: {
    contributorId: string;
    channel: "BANK" | "EWALLET";
    label?: string;
    isDefault?: boolean;
    bankCode?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    ewalletType?: string | null;
    ewalletNumber?: string | null;
    isActive?: boolean;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(payoutDestinations)
      .values({
        contributorId: input.contributorId,
        channel: input.channel,
        label: input.label ?? "",
        isDefault: input.isDefault ?? false,
        bankCode: input.bankCode ?? null,
        bankAccountName: input.bankAccountName ?? null,
        bankAccountNumber: input.bankAccountNumber ?? null,
        ewalletType: input.ewalletType ?? null,
        ewalletNumber: input.ewalletNumber ?? null,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async updateById(id: string, patch: Partial<{
    label: string;
    isDefault: boolean;
    isActive: boolean;
    bankCode: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    ewalletType: string | null;
    ewalletNumber: string | null;
    updatedBy: string | null;
  }>) {
    const now = new Date();
    const rows = await db
      .update(payoutDestinations)
      .set({
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        ...(patch.bankCode !== undefined ? { bankCode: patch.bankCode } : {}),
        ...(patch.bankAccountName !== undefined ? { bankAccountName: patch.bankAccountName } : {}),
        ...(patch.bankAccountNumber !== undefined ? { bankAccountNumber: patch.bankAccountNumber } : {}),
        ...(patch.ewalletType !== undefined ? { ewalletType: patch.ewalletType } : {}),
        ...(patch.ewalletNumber !== undefined ? { ewalletNumber: patch.ewalletNumber } : {}),
        updatedAt: now,
        updatedBy: patch.updatedBy ?? null,
      } as any)
      .where(eq(payoutDestinations.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
