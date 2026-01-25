import { Elysia, t } from "elysia";
import { env } from "@/env";
import { requireAuth } from "@/middlewares/auth";
import { authService } from "@/services/auth.service";
import { userDao } from "@/dao/user.dao";
import { contributorDao } from "@/dao/contributor.dao";
import { AppError } from "@/lib/errors";
import { verifyPassword, hashPassword } from "@/lib/crypto";
import { authIdentityDao } from "@/dao";

function setSessionCookie(cookie: any, sessionToken: string) {
  const c: any = cookie;

  const sameSite = env.SESSION_COOKIE_SAMESITE;
  const secure = sameSite === "none" ? true : env.SESSION_COOKIE_SECURE;

  c[env.SESSION_COOKIE_NAME].set({
    value: sessionToken,
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/register",
    async ({ body }) => {
      const user = await authService.registerWithPassword(body);
      return { ok: true, user };
    },
    {
      body: t.Object({
        email: t.String({ minLength: 5, maxLength: 320 }),
        username: t.String({ minLength: 3, maxLength: 32 }),
        displayName: t.Optional(t.String({ maxLength: 120 })),
        password: t.String({ minLength: 8, maxLength: 200 }),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, cookie, request }) => {
      const ip = request.headers.get("x-forwarded-for") ?? "";
      const userAgent = request.headers.get("user-agent") ?? "";

      const { user, sessionToken } = await authService.loginWithPassword({
        emailOrUsername: body.emailOrUsername,
        password: body.password,
        ip,
        userAgent,
      });

      setSessionCookie(cookie, sessionToken);
      return { ok: true, user };
    },
    {
      body: t.Object({
        emailOrUsername: t.String({ minLength: 3, maxLength: 320 }),
        password: t.String({ minLength: 8, maxLength: 200 }),
      }),
    }
  )
  .get("/google/start", async ({ query }) => {
    const redirectTo = typeof (query as any)?.redirectTo === "string" ? (query as any).redirectTo : "/";
    const { authUrl } = await authService.googleAuthStart({ redirectTo });
    return { ok: true, authUrl };
  })
  .get(
    "/google/callback",
    async ({ query, cookie, request, set }) => {
      const code = String((query as any)?.code ?? "");
      const state = String((query as any)?.state ?? "");

      if (!code || !state) {
        set.status = 400;
        return { ok: false, code: "INVALID_CALLBACK", message: "Missing code/state" };
      }

      const ip = request.headers.get("x-forwarded-for") ?? "";
      const userAgent = request.headers.get("user-agent") ?? "";

      const { user, sessionToken, redirectTo } = await authService.googleAuthCallback({
        code,
        state,
        ip,
        userAgent,
      });

      setSessionCookie(cookie, sessionToken);

      const target = new URL(env.APP_URL);
      target.pathname = redirectTo || "/";
      set.redirect = target.toString();

      return { ok: true, user };
    },
    {
      query: t.Object({
        code: t.Optional(t.String()),
        state: t.Optional(t.String()),
        scope: t.Optional(t.String()),
        authuser: t.Optional(t.String()),
        prompt: t.Optional(t.String()),
      }),
    }
  )
  .post("/logout", async ({ cookie }) => {
    const c: any = cookie;
    const token = c?.[env.SESSION_COOKIE_NAME]?.value;

    if (token) await authService.logout(token, null);

    if (c?.[env.SESSION_COOKIE_NAME]?.remove) {
      c[env.SESSION_COOKIE_NAME].remove();
    } else {
      c[env.SESSION_COOKIE_NAME].set({ value: "", path: "/", maxAge: 0 });
    }

    return { ok: true };
  })
  .use(requireAuth)
  .post(
    "/change-password",
    async ({ body, actorUserId, set }) => {
      const userId = actorUserId!;
      const user = await userDao.findById(userId);
      const identity = await authIdentityDao.findByUserAndProvider(userId, "PASSWORD");
      if (!user || !identity) {
        set.status = 401;
        return { ok: false, message: "Unauthorized" };
      }

      const valid = await verifyPassword(body.currentPassword, identity?.passwordHash ?? "");
      if (!valid) {
        set.status = 400;
        return { ok: false, message: "Password lama salah" };
      }

      if (body.currentPassword === body.newPassword) {
        set.status = 400;
        return { ok: false, message: "Password baru tidak boleh sama" };
      }

      const newHash = await hashPassword(body.newPassword);
      await userDao.updatePassword(userId, newHash);

      return { ok: true };
    },
    {
      body: t.Object({
        currentPassword: t.String({ minLength: 8 }),
        newPassword: t.String({ minLength: 8 }),
      }),
    }
  )
  .get("/me", async ({ actor }) => ({ ok: true, user: actor }))
  .patch(
    "/me",
    async ({ body, actorUserId }) => {
      const userId = actorUserId!;
      const user = await userDao.findById(userId);
      if (!user) throw new AppError("UNAUTHORIZED", "User not found", 401);

      const patchDisplayName = body.displayName === undefined ? undefined : (body.displayName ?? "").trim();
      const patchAvatarAssetId = body.avatarAssetId === undefined ? undefined : body.avatarAssetId;

      if (patchDisplayName !== undefined) {
        await userDao.updateById(userId, {
          displayName: patchDisplayName,
          updatedBy: userId,
        });
      }

      if (patchDisplayName !== undefined || patchAvatarAssetId !== undefined) {
        let cp = await contributorDao.findByUserId(userId);

        if (!cp) {
          cp = await contributorDao.create({
            userId,
            username: user.username,
            displayName: (patchDisplayName ?? user.displayName ?? user.username) || user.username,
            createdBy: userId,
          });
        }

        await contributorDao.updateById(cp.id, {
          ...(patchDisplayName !== undefined ? { displayName: patchDisplayName || user.username } : {}),
          ...(patchAvatarAssetId !== undefined ? { avatarAssetId: patchAvatarAssetId } : {}),
          updatedBy: userId,
        });
      }

      const actor = await userDao.findActorById(userId);
      return { ok: true, user: actor };
    },
    {
      body: t.Object({
        displayName: t.Optional(t.Union([t.String({ maxLength: 120 }), t.Null()])),
        avatarAssetId: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
      }),
    }
  );
