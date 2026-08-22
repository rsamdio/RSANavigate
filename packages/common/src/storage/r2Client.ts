import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { R2Config, TourManifest } from '../types/demo';
import { DOMSnapshot } from '../types/snapshot';

/**
 * Initialize an AWS S3 Client configured for Cloudflare R2 endpoint
 */
export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

/**
 * Upload DOM Snapshot JSON to Cloudflare R2
 * Path: demos/{demoId}/snapshots/{stepId}.json
 */
export async function uploadDOMSnapshotToR2(
  config: R2Config,
  demoId: string,
  stepId: string,
  snapshot: DOMSnapshot
): Promise<string> {
  const client = createR2Client(config);
  const key = `demos/${demoId}/snapshots/${stepId}.json`;
  const body = JSON.stringify(snapshot);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: 'application/json',
    CacheControl: 'public, max-age=31536000, immutable'
  });

  await client.send(command);

  // Return public URL
  const baseUrl = config.publicUrl.replace(/\/$/, '');
  return `${baseUrl}/${key}`;
}

/**
 * Upload compiled static manifest.json to Cloudflare R2
 * Path: demos/{demoId}/manifest.json
 */
export async function uploadManifestToR2(
  config: R2Config,
  demoId: string,
  manifest: TourManifest
): Promise<string> {
  const client = createR2Client(config);
  const key = `demos/${demoId}/manifest.json`;
  const body = JSON.stringify(manifest, null, 2);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: 'application/json',
    CacheControl: 'public, max-age=300, s-maxage=3600' // Short client cache, longer edge cache
  });

  await client.send(command);

  const baseUrl = config.publicUrl.replace(/\/$/, '');
  return `${baseUrl}/${key}`;
}

/**
 * Public Viewer Engine: Fetch static manifest.json directly from R2/CDN
 * Zero database connections / zero Firestore reads!
 */
export async function fetchManifestFromR2(manifestUrl: string): Promise<TourManifest> {
  const response = await fetch(manifestUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load demo manifest (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as TourManifest;
}

/**
 * Public Viewer Engine: Fetch snapshot JSON directly from R2/CDN
 */
export async function fetchSnapshotFromR2(snapshotUrl: string): Promise<DOMSnapshot> {
  const response = await fetch(snapshotUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load step snapshot (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as DOMSnapshot;
}
