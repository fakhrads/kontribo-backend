import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/env";
import { AppError } from "@/lib/errors";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleIdTokenClaims = {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  nonce?: string;
};

export async function exchangeGoogleCode(input: {
  code: string;
  codeVerifier: string;
}) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.codeVerifier,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AppError("GOOGLE_OAUTH_ERROR", json?.error_description ?? "Google token exchange failed", 502);
  }

  return json as {
    access_token: string;
    id_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
    refresh_token?: string;
  };
}

export async function verifyGoogleIdToken(input: {
  idToken: string;
  expectedNonce: string;
}) {
  const { payload } = await jwtVerify<GoogleIdTokenClaims>(input.idToken, JWKS, {
    audience: env.GOOGLE_CLIENT_ID,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });

  if (payload.nonce !== input.expectedNonce) {
    throw new AppError("INVALID_GOOGLE_NONCE", "Invalid Google nonce", 401);
  }

  return payload;
}
