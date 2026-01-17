import { Elysia, t } from "elysia";
import { env } from "@/env";
import { requireAuth } from "@/middlewares/auth";
import { authService } from "@/services/auth.service";

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

      const c: any = cookie;
      c[env.SESSION_COOKIE_NAME].set({
        value: sessionToken,
        httpOnly: true,
        secure: env.SESSION_COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
      });

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

      const c: any = cookie;
      c[env.SESSION_COOKIE_NAME].set({
        value: sessionToken,
        httpOnly: true,
        secure: env.SESSION_COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
      });

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
  .get("/me", async ({ actor }) => ({ ok: true, user: actor }));
