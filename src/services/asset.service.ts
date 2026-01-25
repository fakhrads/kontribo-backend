import { AppError } from "@/lib/errors";
import { env } from "@/env";
import { presignPutObject, presignGetObject } from "@/lib/s3";
import { contributorDao } from "@/dao/contributor.dao";
import { contextDao } from "@/dao/context.dao";
import { assetDao } from "@/dao/asset.dao";

function keyFor(input: { contributorId: string; kind: string; originalFilename?: string | null }) {
  const safeName = (input.originalFilename ?? "file").replaceAll("/", "_");
  return `contributors/${input.contributorId}/${input.kind.toLowerCase()}/${crypto.randomUUID()}-${safeName}`;
}

export const assetService = {
  async initUpload(actorUserId: string, input: {
    kind: "AVATAR" | "BANNER" | "THUMBNAIL" | "GALLERY" | "ATTACHMENT";
    mimeType: string;
    sizeBytes: number;
    contextId?: string | null;
    visibility?: "PUBLIC" | "PRIVATE";
    originalFilename?: string | null;
  }) {
    const contributor = await contributorDao.findByUserId(actorUserId);
    if (!contributor) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);

    let ctxId: string | null = null;
    if (input.contextId) {
      const ctx = await contextDao.findById(input.contextId);
      if (!ctx || ctx.contributorId !== contributor.id) throw new AppError("INVALID_CONTEXT", "Invalid context", 400);
      ctxId = ctx.id;
    }

    if (input.sizeBytes <= 0) throw new AppError("INVALID_FILE", "Invalid file size", 400);

    const objectKey = keyFor({ contributorId: contributor.id, kind: input.kind, originalFilename: input.originalFilename ?? null });

    const asset = await assetDao.create({
      contributorId: contributor.id,
      contextId: ctxId,
      kind: input.kind,
      provider: env.S3_PROVIDER as any,
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      objectKey,
      originalFilename: input.originalFilename ?? null,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: (input.visibility ?? "PRIVATE") as any,
      status: "UPLOADING",
      createdBy: actorUserId,
    });

    const uploadUrl = await presignPutObject({
      bucket: env.S3_BUCKET,
      key: objectKey,
      contentType: input.mimeType,
      expiresSeconds: 900,
    });

    return { asset, uploadUrl };
  },

  async completeUpload(actorUserId: string, input: {
    assetId: string;
    checksumSha256?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: number | null;
  }) {

    
    const contributor = await contributorDao.findByUserId(actorUserId);
    if (!contributor) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);

    const asset = await assetDao.findById(input.assetId);
    if (!asset || asset.contributorId !== contributor.id) throw new AppError("NOT_FOUND", "Asset not found", 404);
    if (asset.status !== "UPLOADING") return asset;

    const updated = await assetDao.markReady({
      assetId: asset.id,
      checksumSha256: input.checksumSha256 ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      durationMs: input.durationMs ?? null,
      updatedBy: actorUserId,
    });

    return updated!;
  },

  async getDownloadUrl(actorUserId: string, assetId: string) {
    const contributor = await contributorDao.findByUserId(actorUserId);
    if (!contributor) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);

    const asset = await assetDao.findById(assetId);
    if (!asset || asset.contributorId !== contributor.id) throw new AppError("NOT_FOUND", "Asset not found", 404);
    if (asset.status !== "READY") throw new AppError("INVALID_STATE", "Asset not ready", 400);

    const url = await presignGetObject({ bucket: asset.bucket, key: asset.objectKey, expiresSeconds: 900 });
    return { asset, url };
  },
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
