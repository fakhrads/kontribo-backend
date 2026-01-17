import { AppError } from "@/lib/errors";
import { webhookEventDao } from "@/dao/webhook_event.dao";
import { supportService } from "@/services/support.service";
import { withdrawalService } from "@/services/withdrawal.service";

function getHeader(headers: Headers, key: string) {
  return headers.get(key) ?? headers.get(key.toLowerCase());
}

export const webhookService = {
  verifyXenditCallback(headers: Headers, expectedToken: string) {
    const token = getHeader(headers, "x-callback-token");
    return token === expectedToken;
  },

  async handleXenditWebhook(input: { headers: Headers; body: any; rawText: string; expectedToken: string }) {
    const signatureValid = this.verifyXenditCallback(input.headers, input.expectedToken);

    const eventType = this.detectEventType(input.body);
    const externalId = this.extractExternalId(input.body);
    const idemKey = `${eventType}:${externalId}`;

    const existing = await webhookEventDao.findByTypeAndIdempotency(eventType, idemKey);
    if (existing?.processed) return { processed: true, deduped: true };

    const evt = existing
      ? existing
      : await webhookEventDao.create({
          type: eventType,
          externalId,
          idempotencyKey: idemKey,
          signatureValid,
          payload: input.rawText,
          createdBy: null,
        });

    if (!signatureValid) {
      await webhookEventDao.markProcessed(evt.id, { error: "Invalid callback token", updatedBy: null });
      throw new AppError("INVALID_WEBHOOK", "Invalid webhook token", 401);
    }

    try {
      await this.processEvent(eventType, input.body);
      await webhookEventDao.markProcessed(evt.id, { updatedBy: null });
      return { processed: true, deduped: false };
    } catch (e: any) {
      await webhookEventDao.markProcessed(evt.id, { error: e?.message ?? "Processing error", updatedBy: null });
      throw e;
    }
  },

  detectEventType(body: any) {
    const hasInvoice = body?.id && (body?.status || body?.paid_at || body?.expiry_date) && body?.external_id;
    if (hasInvoice) return "XENDIT_SUPPORT";

    const hasDisb = body?.id && body?.external_id && body?.status && (body?.amount || body?.amount === 0);
    return "XENDIT_WITHDRAWAL";
  },

  extractExternalId(body: any) {
    const ext = body?.external_id;
    if (!ext) throw new AppError("INVALID_WEBHOOK", "Missing external_id", 400);
    return String(ext);
  },

  async processEvent(type: any, body: any) {
    if (type === "XENDIT_SUPPORT") {
      const status = String(body?.status ?? "").toUpperCase();
      const supportId = String(body.external_id);

      if (status === "PAID" || status === "SETTLED") {
        await supportService.handleInvoicePaid({
          supportId,
          xenditPaymentId: body?.payment_id ?? null,
          paidAt: body?.paid_at ? new Date(body.paid_at) : new Date(),
        });
      }

      return;
    }

    if (type === "XENDIT_WITHDRAWAL") {
      const withdrawalId = String(body.external_id);
      const status = String(body?.status ?? "").toUpperCase();

      if (status === "COMPLETED" || status === "PAID") {
        await withdrawalService.handleDisbursementCompleted({
          withdrawalId,
          xenditDisbursementId: body?.id ?? null,
          xenditFeeActual: body?.fee ? Number(body.fee) : undefined,
        });
      } else if (status === "FAILED") {
        await withdrawalService.handleDisbursementFailed({ withdrawalId, reason: body?.failure_code ?? "" });
      }

      return;
    }
  },
};
