import { Elysia } from "elysia";
import { env } from "@/env";
import { AppError } from "@/lib/errors";
import { sessionDao } from "@/dao/session.dao";
import { userDao } from "@/dao/user.dao";
import { sha256 } from "@/lib/crypto";

function getCookieValue(cookie: any, name: string): string | null {
  const c = cookie?.[name];
  if (!c) return null;
  const v = typeof c === "string" ? c : c?.value;
  return typeof v === "string" && v.length > 0 ? v : null;
}

export const requireAuth = new Elysia({ name: "requireAuth" })
  .decorate("actorUserId", null as string | null)
  .decorate("actor", null as any)
  .derive({ as: "scoped" }, async ({ cookie }) => {
    const tokenPlain = getCookieValue(cookie, env.SESSION_COOKIE_NAME);
    if (!tokenPlain) throw new AppError("UNAUTHORIZED", "Login required", 401);

    const tokenHash = await sha256(tokenPlain);
    const session = await sessionDao.findActiveByTokenHash(tokenHash);
    if (!session) throw new AppError("UNAUTHORIZED", "Session expired", 401);

    const user = await userDao.findById(session.userId);
    if (!user) throw new AppError("UNAUTHORIZED", "User not found", 401);

    return { actorUserId: user.id, actor: user };
  });

export const requireAdmin = new Elysia({ name: "requireAdmin" })
  .use(requireAuth)
  .derive({ as: "scoped" }, (ctx) => {
    const actor = (ctx as any).actor;
    if (!actor || actor.role !== "ADMIN") throw new AppError("FORBIDDEN", "Admin only", 403);
    return {};
  });
