export type Env = {
  NODE_ENV: "development" | "production" | "test";
  APP_URL: string;
  API_PORT: number;
  COOKIE_SECURE: boolean;

  CORS_ORIGIN: string;

  DATABASE_URL: string;

  SESSION_COOKIE_NAME: string;
  SESSION_TTL_DAYS: number;
  SESSION_COOKIE_SECURE: boolean;

  PASSWORD_PEPPER: string;

  S3_PROVIDER: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;

  XENDIT_WEBHOOK_TOKEN: string;
  XENDIT_SECRET_KEY: string;
  XENDIT_CALLBACK_TOKEN: string;

  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  GOOGLE_OAUTH_SCOPES: string;
};

function must(k: string, v: string | undefined): string {
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}

export const env: Env = {
  NODE_ENV: (process.env.NODE_ENV as any) ?? "development",
  APP_URL: must("APP_URL", process.env.APP_URL),
  API_PORT: Number(process.env.API_PORT ?? "4000"),
  COOKIE_SECURE: (process.env.COOKIE_SECURE ?? "false") === "true",

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",

  DATABASE_URL: must("DATABASE_URL", process.env.DATABASE_URL),

  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? "kontribo_session",
  SESSION_TTL_DAYS: Number(process.env.SESSION_TTL_DAYS ?? "30"),
  SESSION_COOKIE_SECURE: (process.env.SESSION_COOKIE_SECURE ?? "false") === "true",

  PASSWORD_PEPPER: must("PASSWORD_PEPPER", process.env.PASSWORD_PEPPER),

  S3_PROVIDER: process.env.S3_PROVIDER ?? "IDCLOUDHOST_S3",
  S3_ENDPOINT: must("S3_ENDPOINT", process.env.S3_ENDPOINT),
  S3_REGION: process.env.S3_REGION ?? "us-east-1",
  S3_BUCKET: must("S3_BUCKET", process.env.S3_BUCKET),
  S3_ACCESS_KEY: must("S3_ACCESS_KEY", process.env.S3_ACCESS_KEY),
  S3_SECRET_KEY: must("S3_SECRET_KEY", process.env.S3_SECRET_KEY),

  XENDIT_WEBHOOK_TOKEN: must("XENDIT_WEBHOOK_TOKEN", process.env.XENDIT_WEBHOOK_TOKEN),
  XENDIT_SECRET_KEY: must("XENDIT_SECRET_KEY", process.env.XENDIT_SECRET_KEY),
  XENDIT_CALLBACK_TOKEN: must("XENDIT_CALLBACK_TOKEN", process.env.XENDIT_CALLBACK_TOKEN),

  GOOGLE_CLIENT_ID: must("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: must("GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET),
  GOOGLE_REDIRECT_URI: must("GOOGLE_REDIRECT_URI", process.env.GOOGLE_REDIRECT_URI),
  GOOGLE_OAUTH_SCOPES: process.env.GOOGLE_OAUTH_SCOPES ?? "openid email profile",
  
};
