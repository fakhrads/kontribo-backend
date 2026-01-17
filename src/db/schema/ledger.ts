import { pgEnum, pgTable, uuid, varchar, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { contributorProfiles } from "./contributions";
import { auditColumns } from "./audit";

export const ledgerOwnerTypeEnum = pgEnum("ledger_owner_type", ["CONTRIBUTOR", "FOUNDER"]);
export const ledgerBucketEnum = pgEnum("ledger_bucket", ["AVAILABLE", "PENDING", "RESERVED", "REVENUE"]);
export const ledgerDirectionEnum = pgEnum("ledger_direction", ["CREDIT", "DEBIT"]);
export const ledgerRefTypeEnum = pgEnum("ledger_ref_type", [
  "SUPPORT",
  "WITHDRAWAL",
  "FOUNDER_PAYOUT",
  "ADJUSTMENT",
  "REFUND",
  "CHARGEBACK",
  "FEE",
]);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    ownerType: ledgerOwnerTypeEnum("owner_type").notNull(),
    contributorId: uuid("contributor_id").references(() => contributorProfiles.id, { onDelete: "restrict" }),

    bucket: ledgerBucketEnum("bucket").notNull(),
    direction: ledgerDirectionEnum("direction").notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("IDR"),

    referenceType: ledgerRefTypeEnum("reference_type").notNull(),
    referenceId: uuid("reference_id").notNull(),

    idempotencyKey: varchar("idempotency_key", { length: 100 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),

    ...auditColumns,
  },
  (t) => ({
    ownerIdx: index("ledger_entries_owner_idx").on(t.ownerType, t.contributorId, t.bucket),
    refIdx: index("ledger_entries_ref_idx").on(t.referenceType, t.referenceId),
    occurredIdx: index("ledger_entries_occurred_at_idx").on(t.occurredAt),
    idemUq: uniqueIndex("ledger_entries_idem_uq").on(t.ownerType, t.idempotencyKey),
  })
);
