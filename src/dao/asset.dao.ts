import { db } from "@/db";
import { assets } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const assetDao = {
  async findById(id: string) {
    const rows = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async listByContributor(contributorId: string) {
    return db.select().from(assets).where(eq(assets.contributorId, contributorId));
  },

  async listByContext(contextId: string) {
    return db.select().from(assets).where(eq(assets.contextId, contextId));
  },

  async create(input: {
    contributorId: string;
    contextId?: string | null;
    kind: any;
    provider?: any;
    bucket: string;
    region?: string | null;
    endpoint?: string | null;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    sizeBytes: number;
    checksumSha256?: string | null;
    visibility?: any;
    status?: any;
    width?: number | null;
    height?: number | null;
    durationMs?: number | null;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .insert(assets)
      .values({
        contributorId: input.contributorId,
        contextId: input.contextId ?? null,
        kind: input.kind,
        provider: input.provider ?? "IDCLOUDHOST_S3",
        bucket: input.bucket,
        region: input.region ?? null,
        endpoint: input.endpoint ?? null,
        objectKey: input.objectKey,
        originalFilename: input.originalFilename ?? null,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256 ?? null,
        visibility: input.visibility ?? "PRIVATE",
        status: input.status ?? "UPLOADING",
        width: input.width ?? null,
        height: input.height ?? null,
        durationMs: input.durationMs ?? null,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      } as any)
      .returning();
    return rows[0]!;
  },

  async markReady(input: {
    assetId: string;
    checksumSha256?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: number | null;
    updatedBy?: string | null;
  }) {
    const now = new Date();
    const rows = await db
      .update(assets)
      .set({
        status: "READY",
        ...(input.checksumSha256 !== undefined ? { checksumSha256: input.checksumSha256 } : {}),
        ...(input.width !== undefined ? { width: input.width } : {}),
        ...(input.height !== undefined ? { height: input.height } : {}),
        ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
        updatedAt: now,
        updatedBy: input.updatedBy ?? null,
      } as any)
      .where(eq(assets.id, input.assetId))
      .returning();
    return rows[0] ?? null;
  },

  async markFailed(assetId: string, updatedBy?: string | null) {
    const now = new Date();
    const rows = await db
      .update(assets)
      .set({ status: "FAILED", updatedAt: now, updatedBy: updatedBy ?? null } as any)
      .where(eq(assets.id, assetId))
      .returning();
    return rows[0] ?? null;
  },

  async findByObject(provider: any, bucket: string, objectKey: string) {
    const rows = await db
      .select()
      .from(assets)
      .where(and(eq(assets.provider, provider), eq(assets.bucket, bucket), eq(assets.objectKey, objectKey)))
      .limit(1);
    return rows[0] ?? null;
  },
};
