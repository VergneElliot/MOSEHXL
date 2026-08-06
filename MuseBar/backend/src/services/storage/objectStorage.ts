/**
 * DigitalOcean Spaces / S3-compatible object storage.
 * When env is not configured, operations throw a clear configuration error.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export class ObjectStorageNotConfiguredError extends Error {
  constructor() {
    super(
      'Object storage is not configured. Set SPACES_ENDPOINT, SPACES_REGION, SPACES_BUCKET, SPACES_KEY, SPACES_SECRET.'
    );
    this.name = 'ObjectStorageNotConfiguredError';
  }
}

function readConfig() {
  const endpoint = process.env.SPACES_ENDPOINT?.trim();
  const region = process.env.SPACES_REGION?.trim() || 'fra1';
  const bucket = process.env.SPACES_BUCKET?.trim();
  const accessKeyId = process.env.SPACES_KEY?.trim();
  const secretAccessKey = process.env.SPACES_SECRET?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

function getClient(): { client: S3Client; bucket: string } {
  const cfg = readConfig();
  if (!cfg) throw new ObjectStorageNotConfiguredError();
  if (!cachedClient || cachedBucket !== cfg.bucket) {
    cachedClient = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: false,
    });
    cachedBucket = cfg.bucket;
  }
  return { client: cachedClient, bucket: cfg.bucket };
}

export function isObjectStorageConfigured(): boolean {
  return readConfig() != null;
}

export function buildEstablishmentObjectKey(
  establishmentId: string,
  folder: 'documents' | 'inbox',
  fileName: string
): string {
  const safe = String(fileName || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120);
  return `establishments/${establishmentId}/${folder}/${randomUUID()}-${safe}`;
}

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ACL: 'private',
    })
  );
}

export async function getObjectBuffer(key: string): Promise<{ body: Buffer; contentType?: string }> {
  const { client, bucket } = getClient();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error('Empty object body');
  return {
    body: Buffer.from(bytes),
    contentType: result.ContentType,
  };
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  const { client, bucket } = getClient();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
