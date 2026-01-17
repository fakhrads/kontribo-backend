import { pgEnum, pgTable, uuid, varchar, text, boolean, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { auditColumns } from "./audit";

export const contributorStatusEnum = pgEnum("contributor_status", ["ACTIVE", "SUSPENDED"]);

export const contextTypeEnum = pgEnum("context_type", [
  "SOFTWARE",
  "VIDEO",
  "PHOTO",
  "AUDIO",
  "GAME_SCRIPT",
  "GAME_ASSET",
  "DESIGN",
  "ARTICLE",
  "DATASET",
  "DOCUMENTATION",
  "TEMPLATE",
  "OTHER",
]);

export const contributorProfiles = pgTable(
  "contributor_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    username: varchar("username", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    bio: text("bio").notNull().default(""),
    category: varchar("category", { length: 64 }).notNull().default(""),
    status: contributorStatusEnum("status").notNull().default("ACTIVE"),

    avatarAssetId: uuid("avatar_asset_id"),
    bannerAssetId: uuid("banner_asset_id"),

    ...auditColumns,
  },
  (t) => ({
    userUq: uniqueIndex("contributor_profiles_user_uq").on(t.userId),
    usernameUq: uniqueIndex("contributor_profiles_username_uq").on(t.username),
    statusIdx: index("contributor_profiles_status_idx").on(t.status),
  })
);

export const contributorLinks = pgTable(
  "contributor_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contributorId: uuid("contributor_id").notNull().references(() => contributorProfiles.id, { onDelete: "cascade" }),

    label: varchar("label", { length: 40 }).notNull().default(""),
    url: text("url").notNull(),
    sortOrder: text("sort_order").notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),

    ...auditColumns,
  },
  (t) => ({
    contributorIdx: index("contributor_links_contributor_idx").on(t.contributorId),
    activeIdx: index("contributor_links_active_idx").on(t.isActive),
  })
);

export const contributionContexts = pgTable(
  "contribution_contexts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contributorId: uuid("contributor_id").notNull().references(() => contributorProfiles.id, { onDelete: "cascade" }),

    type: contextTypeEnum("type").notNull().default("OTHER"),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    externalUrl: text("external_url"),
    metadata: jsonb("metadata").notNull().default({}),

    thumbnailAssetId: uuid("thumbnail_asset_id"),
    isArchived: boolean("is_archived").notNull().default(false),

    ...auditColumns,
  },
  (t) => ({
    contributorIdx: index("contribution_contexts_contributor_idx").on(t.contributorId),
    typeIdx: index("contribution_contexts_type_idx").on(t.type),
    archivedIdx: index("contribution_contexts_archived_idx").on(t.isArchived),
  })
);
