import { db } from "@/db";
import { oauthStates } from "@/db/schema";
import { eq } from "drizzle-orm";

export const oauthStateDao = {
  async create(input: {
    state: string;
    codeVerifier: string;
    nonce: string;
    redirectTo: string;
    expiresAt: Date;
  }) {
    const [row] = await db
      .insert(oauthStates)
      .values({
        state: input.state,
        codeVerifier: input.codeVerifier,
        nonce: input.nonce,
        redirectTo: input.redirectTo,
        expiresAt: input.expiresAt,
      })
      .returning();

    return row!;
  },

  async findByState(state: string) {
    const [row] = await db.select().from(oauthStates).where(eq(oauthStates.state, state)).limit(1);
    return row ?? null;
  },

  async markUsed(id: string) {
    const [row] = await db
      .update(oauthStates)
      .set({ usedAt: new Date() })
      .where(eq(oauthStates.id, id))
      .returning();

    return row ?? null;
  },

  async deleteById(id: string) {
    const [row] = await db.delete(oauthStates).where(eq(oauthStates.id, id)).returning();
    return row ?? null;
  },
};
