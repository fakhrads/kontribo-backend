import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // WAJIB untuk S3-compatible (IDCloudHost)
});

export async function presignPutObject(input: {
  bucket: string;
  key: string;
  contentType: string;
  expiresSeconds?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: input.bucket,
    Key: input.key,
    ContentType: input.contentType,
  });

  return getSignedUrl(s3, command, {
    expiresIn: input.expiresSeconds ?? 900,
  });
}

export async function presignGetObject(input: {
  bucket: string;
  key: string;
  expiresSeconds?: number;
}) {
  const command = new GetObjectCommand({
    Bucket: input.bucket,
    Key: input.key,
  });

  return getSignedUrl(s3, command, {
    expiresIn: input.expiresSeconds ?? 900,
  });
}
