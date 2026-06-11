/**
 * Unified S3/MinIO storage for debuga.ai
 * Supports both S3-compatible and MinIO endpoints.
 * Features:
 * - Auto-create bucket on first use
 * - Public URL generation (direct or proxy)
 * - Presigned URLs for private access
 * - Asset proxy route for when S3 is not publicly accessible
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Express, Request, Response } from "express";

// ─── Configuration ───────────────────────────────────────────────

interface StorageConfig {
  endpoint: string;
  publicEndpoint: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
}

function loadConfig(): StorageConfig {
  // Support both S3_* and MINIO_* env vars
  const endpoint =
    process.env.S3_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    "";

  const publicEndpoint =
    process.env.S3_PUBLIC_ENDPOINT ||
    process.env.MINIO_PUBLIC_ENDPOINT ||
    endpoint; // fallback to same endpoint

  const bucket =
    process.env.S3_BUCKET ||
    process.env.MINIO_BUCKET ||
    "debuga-assets";

  const region = process.env.S3_REGION || "us-east-1";

  const accessKey =
    process.env.S3_ACCESS_KEY ||
    process.env.MINIO_ROOT_USER ||
    process.env.AWS_ACCESS_KEY_ID ||
    "";

  const secretKey =
    process.env.S3_SECRET_KEY ||
    process.env.MINIO_ROOT_PASSWORD ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    "";

  const forcePathStyle =
    process.env.S3_FORCE_PATH_STYLE !== "false"; // default true for MinIO

  return { endpoint, publicEndpoint, bucket, region, accessKey, secretKey, forcePathStyle };
}

// ─── Client Singleton ────────────────────────────────────────────

let _client: S3Client | null = null;
let _config: StorageConfig | null = null;
let _bucketVerified = false;

function getConfig(): StorageConfig {
  if (!_config) _config = loadConfig();
  return _config;
}

function getClient(): S3Client {
  if (_client) return _client;
  const config = getConfig();

  if (!config.endpoint) {
    throw new Error(
      "[Storage] S3/MinIO not configured. Set S3_ENDPOINT or MINIO_ENDPOINT in .env"
    );
  }

  _client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: config.forcePathStyle,
  });

  return _client;
}

// ─── Bucket Auto-Create ──────────────────────────────────────────

async function ensureBucket(): Promise<void> {
  if (_bucketVerified) return;

  const client = getClient();
  const config = getConfig();

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    _bucketVerified = true;
  } catch (err: any) {
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      console.log(`[Storage] Bucket "${config.bucket}" not found, creating...`);
      try {
        await client.send(
          new CreateBucketCommand({ Bucket: config.bucket })
        );
        console.log(`[Storage] Bucket "${config.bucket}" created successfully`);
        _bucketVerified = true;
      } catch (createErr: any) {
        // BucketAlreadyOwnedByYou or BucketAlreadyExists = OK
        if (
          createErr?.name === "BucketAlreadyOwnedByYou" ||
          createErr?.name === "BucketAlreadyExists"
        ) {
          _bucketVerified = true;
        } else {
          console.error("[Storage] Failed to create bucket:", createErr);
          throw createErr;
        }
      }
    } else {
      // Other error (permissions, network) — try anyway
      console.warn("[Storage] HeadBucket failed, proceeding anyway:", err?.message);
      _bucketVerified = true;
    }
  }
}

// ─── Public Helpers ──────────────────────────────────────────────

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Check if storage is configured and available
 */
export function isStorageConfigured(): boolean {
  const config = getConfig();
  return !!(config.endpoint && config.accessKey && config.secretKey);
}

/**
 * Get the public URL for an asset.
 * If S3_PUBLIC_ENDPOINT is set, returns direct URL.
 * Otherwise returns proxy URL via /api/assets/:key
 */
export function getPublicUrl(key: string): string {
  const config = getConfig();

  if (config.publicEndpoint && config.publicEndpoint !== config.endpoint) {
    // Direct public URL (CDN or public MinIO)
    if (config.forcePathStyle) {
      return `${config.publicEndpoint}/${config.bucket}/${key}`;
    }
    return `${config.publicEndpoint}/${key}`;
  }

  // Proxy URL — served by our backend
  return `/api/assets/${encodeURIComponent(key)}`;
}

/**
 * Alias for getPublicUrl — resolves a storage key to an accessible URL.
 * Used by streamRoute for image attachments.
 */
export function getInternalUrl(key: string): string {
  return getPublicUrl(key);
}

/**
 * Upload data to S3/MinIO.
 * Returns { key, url, publicUrl } where:
 * - key: the storage key
 * - url: direct S3 URL (may not be publicly accessible)
 * - publicUrl: publicly accessible URL (direct or proxy)
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string; publicUrl: string }> {
  await ensureBucket();

  const client = getClient();
  const config = getConfig();
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Make object publicly readable if bucket policy allows
      ACL: "public-read",
    })
  );

  const url = `${config.endpoint}/${config.bucket}/${key}`;
  const publicUrl = getPublicUrl(key);

  return { key, url, publicUrl };
}

/**
 * Get a presigned URL for private access (download).
 */
export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  await ensureBucket();

  const client = getClient();
  const config = getConfig();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    { expiresIn }
  );

  return { key, url };
}

/**
 * Get object as buffer (for proxy serving)
 */
export async function storageGetBuffer(
  relKey: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const client = getClient();
    const config = getConfig();
    const key = normalizeKey(relKey);

    const response = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key })
    );

    if (!response.Body) return null;

    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;

    if (typeof stream[Symbol.asyncIterator] === "function") {
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    } else if (stream.transformToByteArray) {
      const bytes = await stream.transformToByteArray();
      chunks.push(bytes);
    } else {
      return null;
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: response.ContentType || "application/octet-stream",
    };
  } catch (err: any) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

// ─── Asset Proxy Route ───────────────────────────────────────────

/**
 * Register /api/assets/:key route to serve assets when S3 is not publicly accessible.
 * Also serves as fallback when S3_PUBLIC_ENDPOINT is not set.
 */
export function registerAssetProxy(app: Express): void {
  app.get("/api/assets/:key(*)", async (req: Request, res: Response) => {
    const key = req.params.key;
    if (!key) {
      res.status(400).json({ error: "Missing asset key" });
      return;
    }

    if (!isStorageConfigured()) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }

    try {
      const result = await storageGetBuffer(key);
      if (!result) {
        res.status(404).json({ error: "Asset not found" });
        return;
      }

      // Cache for 1 hour, immutable assets
      res.set("Cache-Control", "public, max-age=3600, immutable");
      res.set("Content-Type", result.contentType);
      res.set("Content-Length", String(result.buffer.length));
      res.send(result.buffer);
    } catch (err: any) {
      console.error("[AssetProxy] Error serving asset:", key, err?.message);
      res.status(500).json({ error: "Failed to retrieve asset" });
    }
  });

  console.log("[Storage] Asset proxy registered at /api/assets/:key");
}

// ─── Storage Health Check ────────────────────────────────────────

export interface StorageHealthResult {
  configured: boolean;
  endpoint: string;
  publicEndpoint: string;
  bucket: string;
  bucketExists: boolean;
  canUpload: boolean;
  canDownload: boolean;
  error?: string;
}

export async function checkStorageHealth(): Promise<StorageHealthResult> {
  const config = getConfig();
  const result: StorageHealthResult = {
    configured: isStorageConfigured(),
    endpoint: config.endpoint ? config.endpoint.replace(/\/\/.*:.*@/, "//***:***@") : "",
    publicEndpoint: config.publicEndpoint || "(proxy mode)",
    bucket: config.bucket,
    bucketExists: false,
    canUpload: false,
    canDownload: false,
  };

  if (!result.configured) {
    result.error = "S3/MinIO not configured";
    return result;
  }

  try {
    await ensureBucket();
    result.bucketExists = true;

    // Test upload
    const testKey = `_health-check/${Date.now()}.txt`;
    await storagePut(testKey, "health-check", "text/plain");
    result.canUpload = true;

    // Test download
    const downloaded = await storageGetBuffer(testKey);
    result.canDownload = !!downloaded;
  } catch (err: any) {
    result.error = err?.message || "Unknown error";
  }

  return result;
}
