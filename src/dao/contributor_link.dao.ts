import { db } from "@/db";
import { contributorLinks } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const contributorLinkDao = {
  async listByContributor(contributorId: string) {
    return db.select().from(contributorLinks).where(eq(contributorLinks.contributorId, contributorId));
  },

  async create(input: {
    contributorId: string;
    label?: string;
    url: string;
    sortOrder?: any;
    isActive?: boolean;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(contributorLinks)
      .values({
        contributorId: input.contributorId,
        label: input.label ?? "",
        url: input.url,
        sortOrder: input.sortOrder ?? "0",
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async updateById(id: string, patch: Partial<{ label: string; url: string; sortOrder: any; isActive: boolean; updatedBy: string | null }>) {
    const now = new Date();
    const rows = await db
      .update(contributorLinks)
      .set({
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.url !== undefined ? { url: patch.url } : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        updatedAt: now,
        updatedBy: patch.updatedBy ?? null,
      } as any)
      .where(eq(contributorLinks.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async deleteById(id: string) {
    const rows = await db.delete(contributorLinks).where(eq(contributorLinks.id, id)).returning();
    return rows[0] ?? null;
  },

  async findActiveByContributorAndUrl(contributorId: string, url: string) {
    const rows = await db
      .select()
      .from(contributorLinks)
      .where(and(eq(contributorLinks.contributorId, contributorId), eq(contributorLinks.url, url), eq(contributorLinks.isActive, true)))
      .limit(1);
    return rows[0] ?? null;
  },
};
