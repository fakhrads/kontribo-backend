import { pgEnum, pgTable, uuid, varchar, text, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { contributorProfiles, contributionContexts } from "./contributions";
import { auditColumns } from "./audit";

export const assetProviderEnum = pgEnum("asset_provider", ["IDCLOUDHOST_S3", "AWS_S3", "OTHER_S3"]);
export const assetVisibilityEnum = pgEnum("asset_visibility", ["PUBLIC", "PRIVATE"]);
export const assetStatusEnum = pgEnum("asset_status", ["UPLOADING", "READY", "FAILED", "DELETED"]);
export const assetKindEnum = pgEnum("asset_kind", ["AVATAR", "BANNER", "THUMBNAIL", "GALLERY", "ATTACHMENT"]);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    contributorId: uuid("contributor_id").notNull().references(() => contributorProfiles.id, { onDelete: "cascade" }),
    contextId: uuid("context_id").references(() => contributionContexts.id, { onDelete: "cascade" }),

    kind: assetKindEnum("kind").notNull(),

    provider: assetProviderEnum("provider").notNull().default("IDCLOUDHOST_S3"),
    bucket: varchar("bucket", { length: 128 }).notNull(),
    region: varchar("region", { length: 64 }),
    endpoint: text("endpoint"),
    objectKey: text("object_key").notNull(),

    originalFilename: varchar("original_filename", { length: 255 }),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),

    visibility: assetVisibilityEnum("visibility").notNull().default("PRIVATE"),
    status: assetStatusEnum("status").notNull().default("UPLOADING"),

    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),

    ...auditColumns,
  },
  (t) => ({
    contributorIdx: index("assets_contributor_idx").on(t.contributorId),
    contextIdx: index("assets_context_idx").on(t.contextId),
    statusIdx: index("assets_status_idx").on(t.status),
    kindIdx: index("assets_kind_idx").on(t.kind),
    objectUq: uniqueIndex("assets_object_uq").on(t.provider, t.bucket, t.objectKey),
  })
);
