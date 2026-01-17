import { Elysia } from "elysia";
import { env } from "@/env";
import { webhookService } from "@/services/webhook.service";

export const webhookRoutes = new Elysia({ prefix: "/webhooks" }).post("/xendit", async ({ request }) => {
  const rawText = await request.text();
  const body = rawText ? JSON.parse(rawText) : {};

  const res = await webhookService.handleXenditWebhook({
    headers: request.headers as any,
    body,
    rawText,
    expectedToken: env.XENDIT_CALLBACK_TOKEN,
  });

  return { ok: true, ...res };
});
