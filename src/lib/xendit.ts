import { env } from "@/env";
import { AppError } from "@/lib/errors";

type XenditOpts = {
  method: "GET" | "POST";
  path: string;
  body?: any;
  idempotencyKey?: string;
};

export async function xenditRequest<T>(opts: XenditOpts): Promise<T> {
  if (!env.XENDIT_SECRET_KEY) throw new AppError("NOT_CONFIGURED", "XENDIT_SECRET_KEY is missing", 500);

  const url = `https://api.xendit.co${opts.path}`;
  const headers: Record<string, string> = {
    Authorization: `Basic ${btoa(env.XENDIT_SECRET_KEY + ":")}`,
    "Content-Type": "application/json",
  };

  if (opts.idempotencyKey) headers["X-IDEMPOTENCY-KEY"] = opts.idempotencyKey;

  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new AppError(
      "XENDIT_ERROR",
      json?.message ? `Xendit: ${json.message}` : `Xendit request failed (${res.status})`,
      502
    );
  }

  return json as T;
}
