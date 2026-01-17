import { db } from "@/db";
import { contributorProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const contributorDao = {
  async findById(id: string) {
    const rows = await db.select().from(contributorProfiles).where(eq(contributorProfiles.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByUserId(userId: string) {
    const rows = await db.select().from(contributorProfiles).where(eq(contributorProfiles.userId, userId)).limit(1);
    return rows[0] ?? null;
  },

  async findByUsername(username: string) {
    const rows = await db.select().from(contributorProfiles).where(eq(contributorProfiles.username, username)).limit(1);
    return rows[0] ?? null;
  },

  async create(input: {
    userId: string;
    username: string;
    displayName: string;
    bio?: string;
    category?: string;
    status?: "ACTIVE" | "SUSPENDED";
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(contributorProfiles)
      .values({
        userId: input.userId,
        username: input.username,
        displayName: input.displayName,
        bio: input.bio ?? "",
        category: input.category ?? "",
        status: input.status ?? "ACTIVE",
        avatarAssetId: null,
        bannerAssetId: null,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async updateById(id: string, patch: Partial<{
    displayName: string;
    bio: string;
    category: string;
    status: "ACTIVE" | "SUSPENDED";
    avatarAssetId: string | null;
    bannerAssetId: string | null;
    updatedBy: string | null;
  }>) {
    const now = new Date();
    const rows = await db
      .update(contributorProfiles)
      .set({
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.avatarAssetId !== undefined ? { avatarAssetId: patch.avatarAssetId } : {}),
        ...(patch.bannerAssetId !== undefined ? { bannerAssetId: patch.bannerAssetId } : {}),
        updatedAt: now,
        updatedBy: patch.updatedBy ?? null,
      } as any)
      .where(eq(contributorProfiles.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
