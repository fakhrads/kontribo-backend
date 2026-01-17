import { pgEnum, pgTable, uuid, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { contributorProfiles, contributionContexts } from "./contributions";
import { auditColumns } from "./audit";

export const supportStatusEnum = pgEnum("support_status", ["PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED", "CHARGEBACK"]);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "REQUESTED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REVERSED",
  "CANCELED",
]);

export const payoutChannelEnum = pgEnum("payout_channel", ["BANK", "EWALLET"]);

export const payoutDestinations = pgTable(
  "payout_destinations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contributorId: uuid("contributor_id").notNull().references(() => contributorProfiles.id, { onDelete: "cascade" }),

    channel: payoutChannelEnum("channel").notNull(),
    label: varchar("label", { length: 80 }).notNull().default(""),
    isDefault: boolean("is_default").notNull().default(false),

    bankCode: varchar("bank_code", { length: 32 }),
    bankAccountName: varchar("bank_account_name", { length: 120 }),
    bankAccountNumber: varchar("bank_account_number", { length: 40 }),

    ewalletType: varchar("ewallet_type", { length: 32 }),
    ewalletNumber: varchar("ewallet_number", { length: 40 }),

    isActive: boolean("is_active").notNull().default(true),

    ...auditColumns,
  },
  (t) => ({
    contributorIdx: index("payout_destinations_contributor_idx").on(t.contributorId),
    defaultIdx: index("payout_destinations_default_idx").on(t.contributorId, t.isDefault),
    activeIdx: index("payout_destinations_active_idx").on(t.isActive),
  })
);

export const supportTransactions = pgTable(
  "support_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    contributorId: uuid("contributor_id").notNull().references(() => contributorProfiles.id, { onDelete: "restrict" }),
    contextId: uuid("context_id").references(() => contributionContexts.id, { onDelete: "set null" }),

    amountGross: integer("amount_gross").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("IDR"),

    message: text("message").notNull().default(""),
    isAnonymous: boolean("is_anonymous").notNull().default(false),

    supporterName: varchar("supporter_name", { length: 120 }),
    supporterEmail: varchar("supporter_email", { length: 320 }),

    status: supportStatusEnum("status").notNull().default("PENDING"),

    xenditInvoiceId: varchar("xendit_invoice_id", { length: 80 }),
    xenditPaymentId: varchar("xendit_payment_id", { length: 80 }),
    idempotencyKey: varchar("idempotency_key", { length: 80 }).notNull(),

    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),

    ...auditColumns,
  },
  (t) => ({
    contributorIdx: index("support_transactions_contributor_idx").on(t.contributorId),
    statusIdx: index("support_transactions_status_idx").on(t.status),
    invoiceIdx: index("support_transactions_xendit_invoice_idx").on(t.xenditInvoiceId),
    idemUq: uniqueIndex("support_transactions_idem_uq").on(t.idempotencyKey),
  })
);

export const withdrawalRequests = pgTable(
  "withdrawal_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    contributorId: uuid("contributor_id").notNull().references(() => contributorProfiles.id, { onDelete: "restrict" }),
    destinationId: uuid("destination_id").notNull().references(() => payoutDestinations.id, { onDelete: "restrict" }),

    amountToUser: integer("amount_to_user").notNull(),
    feeFlat: integer("fee_flat").notNull().default(4500),
    totalDebit: integer("total_debit").notNull(),

    currency: varchar("currency", { length: 8 }).notNull().default("IDR"),
    status: withdrawalStatusEnum("status").notNull().default("REQUESTED"),

    xenditDisbursementId: varchar("xendit_disbursement_id", { length: 80 }),
    xenditIdempotencyKey: varchar("xendit_idempotency_key", { length: 80 }).notNull(),

    xenditFeeActual: integer("xendit_fee_actual").notNull().default(0),

    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    ...auditColumns,
  },
  (t) => ({
    contributorIdx: index("withdrawal_requests_contributor_idx").on(t.contributorId),
    statusIdx: index("withdrawal_requests_status_idx").on(t.status),
    disbursementIdx: index("withdrawal_requests_xendit_disbursement_idx").on(t.xenditDisbursementId),
    idemUq: uniqueIndex("withdrawal_requests_xendit_idem_uq").on(t.xenditIdempotencyKey),
  })
);

export const founderPayouts = pgTable(
  "founder_payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("IDR"),
    status: withdrawalStatusEnum("status").notNull().default("REQUESTED"),

    xenditDisbursementId: varchar("xendit_disbursement_id", { length: 80 }),
    xenditIdempotencyKey: varchar("xendit_idempotency_key", { length: 80 }).notNull(),

    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    ...auditColumns,
  },
  (t) => ({
    statusIdx: index("founder_payouts_status_idx").on(t.status),
    disbursementIdx: index("founder_payouts_xendit_disbursement_idx").on(t.xenditDisbursementId),
    idemUq: uniqueIndex("founder_payouts_xendit_idem_uq").on(t.xenditIdempotencyKey),
  })
);
