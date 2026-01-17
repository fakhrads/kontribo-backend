import { AppError } from "@/lib/errors";
import { tx } from "@/lib/tx";
import { xenditRequest } from "@/lib/xendit";
import { contributorDao } from "@/dao/contributor.dao";
import { contextDao } from "@/dao/context.dao";
import { supportDao } from "@/dao/support.dao";
import { ledgerService } from "@/services/ledger.service";

type XenditInvoice = {
  id: string;
  invoice_url: string;
  status: string;
  expiry_date?: string;
};

export const supportService = {
  async createSupport(input: {
    contributorUsername: string;
    amount: number;
    message?: string;
    isAnonymous?: boolean;
    contextId?: string;
    supporterName?: string;
    supporterEmail?: string;
    idempotencyKey: string;
    successRedirectUrl?: string;
    failureRedirectUrl?: string;
  }) {
    if (input.amount < 1000) throw new AppError("INVALID_AMOUNT", "Minimum amount is 1000", 400);

    const contributor = await contributorDao.findByUsername(input.contributorUsername);
    if (!contributor || contributor.status !== "ACTIVE") throw new AppError("NOT_FOUND", "Contributor not found", 404);

    let ctxId: string | null = null;
    if (input.contextId) {
      const ctx = await contextDao.findById(input.contextId);
      if (!ctx || ctx.contributorId !== contributor.id) throw new AppError("INVALID_CONTEXT", "Invalid context", 400);
      if (ctx.isArchived) throw new AppError("INVALID_CONTEXT", "Context archived", 400);
      ctxId = ctx.id;
    }

    const existing = await supportDao.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return { support: existing, invoiceUrl: null as string | null };
    }

    const support = await tx(async () => {
      return supportDao.create({
        contributorId: contributor.id,
        contextId: ctxId,
        amountGross: input.amount,
        message: input.message ?? "",
        isAnonymous: input.isAnonymous ?? false,
        supporterName: input.supporterName ?? null,
        supporterEmail: input.supporterEmail ?? null,
        status: "PENDING",
        idempotencyKey: input.idempotencyKey,
        createdBy: null,
      });
    });

    const invoice = await xenditRequest<XenditInvoice>({
      method: "POST",
      path: "/v2/invoices",
      idempotencyKey: `support:${support.id}`,
      body: {
        external_id: support.id,
        amount: support.amountGross,
        payer_email: support.supporterEmail ?? undefined,
        description: `Kontribo support to @${contributor.username}`,
        success_redirect_url: input.successRedirectUrl,
        failure_redirect_url: input.failureRedirectUrl,
      },
    });

    const updated = await tx(async () => {
      return supportDao.create({
        contributorId: support.contributorId,
        contextId: support.contextId ?? null,
        amountGross: support.amountGross,
        currency: support.currency,
        message: support.message,
        isAnonymous: support.isAnonymous,
        supporterName: support.supporterName ?? null,
        supporterEmail: support.supporterEmail ?? null,
        status: "PENDING",
        xenditInvoiceId: invoice.id,
        xenditPaymentId: null,
        idempotencyKey: `${support.idempotencyKey}:INVOICE_LINKED`,
        expiredAt: invoice.expiry_date ? new Date(invoice.expiry_date) : null,
        createdBy: null,
      });
    });

    return { support: updated, invoiceUrl: invoice.invoice_url };
  },

  async handleInvoicePaid(input: {
    supportId: string;
    xenditPaymentId?: string | null;
    paidAt?: Date | null;
  }) {
    const s = await supportDao.findById(input.supportId);
    if (!s) throw new AppError("NOT_FOUND", "Support not found", 404);
    if (s.status === "PAID") return s;

    const updated = await tx(async () => {
      const paid = await supportDao.markPaid({
        supportId: s.id,
        xenditPaymentId: input.xenditPaymentId ?? null,
        paidAt: input.paidAt ?? new Date(),
        updatedBy: null,
      });

      await ledgerService.creditPendingFromSupport({
        contributorId: s.contributorId,
        supportId: s.id,
        amount: s.amountGross,
        idempotencyKey: `support_paid:${s.id}`,
        actorUserId: null,
      });

      return paid!;
    });

    return updated;
  },

  async releaseSupportToAvailable(input: { supportId: string }) {
    const s = await supportDao.findById(input.supportId);
    if (!s) throw new AppError("NOT_FOUND", "Support not found", 404);
    if (s.status !== "PAID") throw new AppError("INVALID_STATE", "Support not paid", 400);

    await ledgerService.releasePendingToAvailable({
      contributorId: s.contributorId,
      supportId: s.id,
      amount: s.amountGross,
      idempotencyKey: `support_release:${s.id}`,
      actorUserId: null,
    });

    return { released: true };
  },
};
