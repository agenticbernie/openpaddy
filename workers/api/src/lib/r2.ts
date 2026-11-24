import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ERROR_MESSAGES_VI } from '@openpaddy/shared';
import { AppError } from '../middleware/error-handler.js';
import type { Env } from '../types.js';

const PRESIGNED_EXPIRY_SECONDS = 86_400; // 24 hours per FR-05

function createS3Client(env: Env): S3Client {
  return new S3Client({
    region: env.R2_REGION || 'auto',
    endpoint: env.R2_ENDPOINT || 'https://example.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID || 'openpaddy-dev-access-key',
      secretAccessKey: env.R2_SECRET_ACCESS_KEY || 'openpaddy-dev-secret-key',
    },
  });
}

// NFR: Vendor-neutral R2 upload via @aws-sdk/client-s3 v3
export async function uploadObjectToR2(
  env: Env,
  key: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const bucket = env.R2_BUCKET_NAME || 'openpaddy-media';

  if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT) {
    try {
      const client = createS3Client(env);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body instanceof Uint8Array ? body : new Uint8Array(body),
          ContentType: contentType,
        }),
      );
      return;
    } catch (err) {
      throw new AppError(500, ERROR_MESSAGES_VI.R2_UPLOAD_FAILED, err);
    }
  }

  if (env.R2_BUCKET) {
    try {
      await env.R2_BUCKET.put(key, body, {
        httpMetadata: { contentType },
      });
      return;
    } catch (err) {
      throw new AppError(500, ERROR_MESSAGES_VI.R2_UPLOAD_FAILED, err);
    }
  }
}

// FR-05: Generate 24h presigned URL via S3-compatible API
export async function createPresignedR2Url(
  env: Env,
  key: string,
  expiresIn = PRESIGNED_EXPIRY_SECONDS,
): Promise<string> {
  const bucket = env.R2_BUCKET_NAME || 'openpaddy-media';
  const client = createS3Client(env);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}
