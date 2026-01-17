import { db } from "@/db";
import { authIdentities } from "@/db/schema/users";
import { and, eq } from "drizzle-orm";

export const authIdentityDao = {
  async findByUserAndProvider(userId: string, provider: "PASSWORD" | "GOOGLE") {
    const [row] = await db
      .select()
      .from(authIdentities)
      .where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, provider)))
      .limit(1);

    return row ?? null;
  },

  async findByProviderUserId(provider: "PASSWORD" | "GOOGLE", providerUserId: string) {
    const [row] = await db
      .select()
      .from(authIdentities)
      .where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerUserId, providerUserId)))
      .limit(1);

    return row ?? null;
  },

  async createPasswordIdentity(input: {
    userId: string;
    passwordHash: string;
    createdBy: string | null;
  }) {
    const [row] = await db
      .insert(authIdentities)
      .values({
        userId: input.userId,
        provider: "PASSWORD",
        passwordHash: input.passwordHash,
        providerUserId: null,
        providerEmail: null,
        providerEmailVerified: false,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();

    return row!;
  },

  async createGoogleIdentity(input: {
    userId: string;
    providerUserId: string;
    providerEmail: string | null;
    providerEmailVerified: boolean;
    createdBy: string | null;
  }) {
    const [row] = await db
      .insert(authIdentities)
      .values({
        userId: input.userId,
        provider: "GOOGLE",
        passwordHash: null,
        providerUserId: input.providerUserId,
        providerEmail: input.providerEmail,
        providerEmailVerified: input.providerEmailVerified,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();

    return row!;
  },
};
