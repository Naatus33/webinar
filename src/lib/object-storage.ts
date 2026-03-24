import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/** S3 compatível (AWS, Cloudflare R2, MinIO). Opcional: se não configurado, uploads usam disco local. */
export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_PUBLIC_BASE_URL &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

function getS3Client(): S3Client | null {
  if (!isObjectStorageConfigured()) return null;
  const endpoint = process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadPublicObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<{ url: string }> {
  const client = getS3Client();
  if (!client) {
    throw new Error("Object storage não configurado");
  }
  const bucket = process.env.S3_BUCKET!;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  const base = process.env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "");
  return { url: `${base}/${key}` };
}
