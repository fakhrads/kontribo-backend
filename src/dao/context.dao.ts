import { db } from "@/db";
import { contributionContexts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const contextDao = {
  async findById(id: string) {
    const rows = await db.select().from(contributionContexts).where(eq(contributionContexts.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async listByContributor(contributorId: string, includeArchived = false) {
    if (includeArchived) {
      return db.select().from(contributionContexts).where(eq(contributionContexts.contributorId, contributorId));
    }
    return db
      .select()
      .from(contributionContexts)
      .where(and(eq(contributionContexts.contributorId, contributorId), eq(contributionContexts.isArchived, false)));
  },

  async create(input: {
    contributorId: string;
    type?: any;
    title: string;
    description?: string;
    externalUrl?: string | null;
    metadata?: any;
    thumbnailAssetId?: string | null;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(contributionContexts)
      .values({
        contributorId: input.contributorId,
        type: input.type ?? "OTHER",
        title: input.title,
        description: input.description ?? "",
        externalUrl: input.externalUrl ?? null,
        metadata: input.metadata ?? {},
        thumbnailAssetId: input.thumbnailAssetId ?? null,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async updateById(id: string, patch: Partial<{
    type: any;
    title: string;
    description: string;
    externalUrl: string | null;
    metadata: any;
    thumbnailAssetId: string | null;
    isArchived: boolean;
    updatedBy: string | null;
  }>) {
    const now = new Date();
    const rows = await db
      .update(contributionContexts)
      .set({
        ...(patch.type ? { type: patch.type } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.externalUrl !== undefined ? { externalUrl: patch.externalUrl } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
        ...(patch.thumbnailAssetId !== undefined ? { thumbnailAssetId: patch.thumbnailAssetId } : {}),
        ...(patch.isArchived !== undefined ? { isArchived: patch.isArchived } : {}),
        updatedAt: now,
        updatedBy: patch.updatedBy ?? null,
      } as any)
      .where(eq(contributionContexts.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
