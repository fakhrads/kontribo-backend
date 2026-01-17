import { pgEnum, pgTable, uuid, varchar, text, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "CONTRIBUTOR"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);

export const authProviderEnum = pgEnum("auth_provider", ["PASSWORD", "GOOGLE"]);
export const sessionStatusEnum = pgEnum("session_status", ["ACTIVE", "REVOKED", "EXPIRED"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    role: userRoleEnum("role").notNull().default("CONTRIBUTOR"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),

    email: varchar("email", { length: 320 }).notNull(),
    username: varchar("username", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull().default(""),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),

    ...auditColumns,
  },
  (t) => ({
    emailUq: uniqueIndex("users_email_uq").on(t.email),
    usernameUq: uniqueIndex("users_username_uq").on(t.username),
    roleIdx: index("users_role_idx").on(t.role),
    statusIdx: index("users_status_idx").on(t.status),
  })
);

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    provider: authProviderEnum("provider").notNull(),

    passwordHash: text("password_hash"),

    providerUserId: varchar("provider_user_id", { length: 255 }),
    providerEmail: varchar("provider_email", { length: 320 }),
    providerEmailVerified: boolean("provider_email_verified").notNull().default(false),

    ...auditColumns,
  },
  (t) => ({
    userIdx: index("auth_identities_user_idx").on(t.userId),
    providerIdx: index("auth_identities_provider_idx").on(t.provider),
    providerUserUq: uniqueIndex("auth_identities_provider_user_uq").on(t.provider, t.providerUserId),
    userProviderUq: uniqueIndex("auth_identities_user_provider_uq").on(t.userId, t.provider),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    status: sessionStatusEnum("status").notNull().default("ACTIVE"),

    ip: varchar("ip", { length: 64 }).notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    ...auditColumns,
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
    tokenUq: uniqueIndex("sessions_token_uq").on(t.tokenHash),
    statusIdx: index("sessions_status_idx").on(t.status),
    expiresIdx: index("sessions_expires_idx").on(t.expiresAt),
  })
);
