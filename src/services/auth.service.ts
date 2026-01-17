import { AppError } from "@/lib/errors";
import { env } from "@/env";
import { sha256, hashPassword, verifyPassword, randomToken } from "@/lib/crypto";
import { userDao } from "@/dao/user.dao";
import { authIdentityDao } from "@/dao/auth_identity.dao";
import { sessionDao } from "@/dao/session.dao";
import { contributorDao } from "@/dao/contributor.dao";
import { oauthStateDao } from "@/dao/oauth_state.dao";
import { randomUrlSafeString, pkceChallenge, buildUrl } from "@/lib/oauth";
import { exchangeGoogleCode, verifyGoogleIdToken } from "@/lib/google_oauth";

function normalizeUsernameBase(email: string) {
  const base = email.split("@")[0] ?? "user";
  return base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "user";
}

async function pickAvailableUsername(email: string) {
  const base = normalizeUsernameBase(email);
  let candidate = base;

  for (let i = 0; i < 20; i++) {
    const exist = await userDao.findByUsername(candidate);
    if (!exist) return candidate;
    candidate = `${base}${i + 1}`;
  }

  return `${base}_${crypto.randomUUID().slice(0, 6)}`;
}

export const authService = {
  async registerWithPassword(input: {
    email: string;
    username: string;
    displayName?: string;
    password: string;
  }) {
    const existEmail = await userDao.findByEmail(input.email);
    if (existEmail) throw new AppError("EMAIL_EXISTS", "Email already registered", 409);

    const existUsername = await userDao.findByUsername(input.username);
    if (existUsername) throw new AppError("USERNAME_EXISTS", "Username already taken", 409);

    const user = await userDao.create({
      email: input.email,
      username: input.username,
      displayName: input.displayName ?? "",
      isEmailVerified: false,
      role: "CONTRIBUTOR",
      createdBy: null,
    });

    const pwHash = await hashPassword(input.password);
    await authIdentityDao.createPasswordIdentity({ userId: user.id, passwordHash: pwHash, createdBy: user.id });

    await contributorDao.create({
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      createdBy: user.id,
    });

    return user;
  },

  async loginWithPassword(input: { emailOrUsername: string; password: string; ip?: string; userAgent?: string }) {
    const user =
      (await userDao.findByEmail(input.emailOrUsername)) ??
      (await userDao.findByUsername(input.emailOrUsername));

    if (!user) throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
    if (user.status !== "ACTIVE") throw new AppError("ACCOUNT_SUSPENDED", "Account suspended", 403);

    const identity = await authIdentityDao.findByUserAndProvider(user.id, "PASSWORD");
    if (!identity?.passwordHash) throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);

    const ok = await verifyPassword(input.password, identity.passwordHash);
    if (!ok) throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);

    const tokenPlain = randomToken(32);
    const tokenHash = await sha256(tokenPlain);

    const now = new Date();
    const ttlMs = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + ttlMs);

    await sessionDao.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
      createdBy: user.id,
    });

    return { user, sessionToken: tokenPlain };
  },

  async logout(tokenPlain: string, actorUserId?: string | null) {
    const tokenHash = await sha256(tokenPlain);
    await sessionDao.revokeByTokenHash(tokenHash, actorUserId ?? null);
  },

  async googleAuthStart(input: { redirectTo?: string | null }) {
    const state = randomUrlSafeString(24);
    const nonce = randomUrlSafeString(24);
    const codeVerifier = randomUrlSafeString(48);
    const codeChallenge = await pkceChallenge(codeVerifier);

    const redirectTo = input.redirectTo && input.redirectTo.startsWith("/") ? input.redirectTo : "/";

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await oauthStateDao.create({
      state,
      nonce,
      codeVerifier,
      redirectTo,
      expiresAt,
    });

    const authUrl = buildUrl("https://accounts.google.com/o/oauth2/v2/auth", {
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: env.GOOGLE_OAUTH_SCOPES,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
      access_type: "online",
      include_granted_scopes: "true",
    });

    return { authUrl };
  },

  async googleAuthCallback(input: { code: string; state: string; ip?: string; userAgent?: string }) {
    const st = await oauthStateDao.findByState(input.state);
    if (!st) throw new AppError("INVALID_OAUTH_STATE", "Invalid state", 401);
    if (st.usedAt) throw new AppError("OAUTH_STATE_USED", "State already used", 401);
    if (new Date(st.expiresAt).getTime() < Date.now()) throw new AppError("OAUTH_STATE_EXPIRED", "State expired", 401);

    await oauthStateDao.markUsed(st.id);

    const tokens = await exchangeGoogleCode({ code: input.code, codeVerifier: st.codeVerifier });
    const claims = await verifyGoogleIdToken({ idToken: tokens.id_token, expectedNonce: st.nonce });

    const googleSub = claims.sub;
    const email = claims.email ?? null;
    const emailVerified = claims.email_verified ?? false;
    const displayName = claims.name ?? (email ? email.split("@")[0] : "User");

    if (!googleSub) throw new AppError("INVALID_GOOGLE_TOKEN", "Missing sub", 401);
    if (!email) throw new AppError("GOOGLE_EMAIL_REQUIRED", "Google email is required", 400);

    let user = null as any;

    const existingIdentity = await authIdentityDao.findByProviderUserId("GOOGLE", googleSub);
    if (existingIdentity) {
      user = await userDao.findById(existingIdentity.userId);
    }

    if (!user) {
      const byEmail = await userDao.findByEmail(email);
      if (byEmail) {
        user = byEmail;

        const hasGoogle = await authIdentityDao.findByUserAndProvider(user.id, "GOOGLE");
        if (!hasGoogle) {
          await authIdentityDao.createGoogleIdentity({
            userId: user.id,
            providerUserId: googleSub,
            providerEmail: email,
            providerEmailVerified: emailVerified,
            createdBy: user.id,
          });
        }
      }
    }

    if (!user) {
      const username = await pickAvailableUsername(email);

      user = await userDao.create({
        email,
        username,
        displayName,
        isEmailVerified: emailVerified,
        role: "CONTRIBUTOR",
        createdBy: null,
      });

      await authIdentityDao.createGoogleIdentity({
        userId: user.id,
        providerUserId: googleSub,
        providerEmail: email,
        providerEmailVerified: emailVerified,
        createdBy: user.id,
      });

      await contributorDao.create({
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        createdBy: user.id,
      });
    }

    if (user.status !== "ACTIVE") throw new AppError("ACCOUNT_SUSPENDED", "Account suspended", 403);

    const tokenPlain = randomToken(32);
    const tokenHash = await sha256(tokenPlain);

    const now = new Date();
    const ttlMs = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + ttlMs);

    await sessionDao.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
      createdBy: user.id,
    });

    return { user, sessionToken: tokenPlain, redirectTo: st.redirectTo };
  },
};
