import { db } from "@/db";
import { users, contributorProfiles, authIdentities } from "@/db/schema";
import { eq } from "drizzle-orm";

export const userDao = {
  async findActorById(userId: string) {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        status: users.status,

        contributorId: contributorProfiles.id,
        avatarAssetId: contributorProfiles.avatarAssetId,
        bannerAssetId: contributorProfiles.bannerAssetId,
        contributorDisplayName: contributorProfiles.displayName,
        contributorUsername: contributorProfiles.username,
      })
      .from(users)
      .leftJoin(contributorProfiles, eq(contributorProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    const r = rows[0];
    if (!r) return null;

    const displayName =
      (r.displayName && r.displayName.trim()) ||
      (r.contributorDisplayName && r.contributorDisplayName.trim()) ||
      r.username;

    return {
      id: r.id,
      email: r.email,
      username: r.username,
      displayName,
      role: r.role,
      status: r.status,

      contributorId: r.contributorId ?? null,
      avatarAssetId: r.avatarAssetId ?? null,
      bannerAssetId: r.bannerAssetId ?? null,

      contributorProfile: r.contributorId
        ? {
            id: r.contributorId,
            username: r.contributorUsername ?? null,
            displayName: r.contributorDisplayName ?? null,
            avatarAssetId: r.avatarAssetId ?? null,
            bannerAssetId: r.bannerAssetId ?? null,
          }
        : null,
    };
  },

  async findById(id: string) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByEmail(email: string) {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  },

  async findByUsername(username: string) {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0] ?? null;
  },

  async updatePassword(userId: string, newPasswordHash: string) {
    const now = new Date();
    const rows = await db
      .update(authIdentities)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(authIdentities.userId, userId))
      .returning();
    return rows[0] ?? null;
  },

  async create(input: {
    role?: "ADMIN" | "CONTRIBUTOR";
    status?: "ACTIVE" | "SUSPENDED";
    email: string;
    username: string;
    displayName?: string;
    isEmailVerified?: boolean;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(users)
      .values({
        role: input.role ?? "CONTRIBUTOR",
        status: input.status ?? "ACTIVE",
        email: input.email,
        username: input.username,
        displayName: input.displayName ?? "",
        isEmailVerified: input.isEmailVerified ?? false,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      })
      .returning();
    return rows[0]!;
  },

  async updateById(
    id: string,
    patch: Partial<{
      role: "ADMIN" | "CONTRIBUTOR";
      status: "ACTIVE" | "SUSPENDED";
      displayName: string;
      isEmailVerified: boolean;
      updatedBy: string | null;
    }>
  ) {
    const now = new Date();
    const rows = await db
      .update(users)
      .set({
        ...(patch.role ? { role: patch.role } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.isEmailVerified !== undefined ? { isEmailVerified: patch.isEmailVerified } : {}),
        updatedAt: now,
        updatedBy: patch.updatedBy ?? null,
      } as any)
      .where(eq(users.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
