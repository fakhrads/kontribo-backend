export * from "./audit";
export * from "./users";
export * from "./contributions";
export * from "./assets";
export * from "./transactions";
export * from "./ledger";
export * from "./oauth_states";


import { pgEnum, pgTable, uuid, varchar, text, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";

export const webhookEventTypeEnum = pgEnum("webhook_event_type", ["XENDIT_SUPPORT", "XENDIT_WITHDRAWAL", "XENDIT_FOUNDER_PAYOUT"]);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: webhookEventTypeEnum("type").notNull(),

    externalId: varchar("external_id", { length: 100 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 100 }).notNull(),

    signatureValid: boolean("signature_valid").notNull().default(false),
    processed: boolean("processed").notNull().default(false),
    processingError: text("processing_error").notNull().default(""),
    payload: text("payload").notNull().default(""),

    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),

    ...auditColumns,
  },
  (t) => ({
    typeIdx: index("webhook_events_type_idx").on(t.type),
    externalIdx: index("webhook_events_external_idx").on(t.externalId),
    idemUq: uniqueIndex("webhook_events_idem_uq").on(t.type, t.idempotencyKey),
  })
);
