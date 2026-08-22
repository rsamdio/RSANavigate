import { callGetPresignedUploadUrl } from '../services/firebase';

export interface ProcessedWebP {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

/**
 * Convert and compress an image file to a high-efficiency WebP image using client-side Canvas
 */
export async function convertImageToWebP(
  file: File,
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.85
): Promise<ProcessedWebP> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data'));
      img.onload = () => {
        let { width, height } = img;

        // Maintain aspect ratio while bounding within maxWidth/maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not available'));
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        const dataUrl = canvas.toDataURL('image/webp', quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('WebP blob generation failed'));
            }
            resolve({
              blob,
              dataUrl,
              width,
              height,
              originalSize: file.size,
              compressedSize: blob.size
            });
          },
          'image/webp',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload cover image to Cloudflare R2 Edge / Storage, with fallback to optimized Data URL
 */
export async function uploadCoverImage(
  demoId: string,
  file: File
): Promise<string> {
  // 1. Convert to high-performance WebP
  const { blob, dataUrl } = await convertImageToWebP(file);

  try {
    // 2. Request presigned upload URL for cover.webp
    const presigned = await callGetPresignedUploadUrl(demoId, 'cover');
    if (presigned?.uploadUrl && presigned?.publicUrl) {
      const putRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable'
        },
        body: blob
      });

      if (putRes.ok) {
        return presigned.publicUrl;
      }
    }
  } catch (err) {
    console.warn('R2 presigned cover upload note, falling back to data URL:', err);
  }

  // Fallback: return WebP data URL for instant zero-config rendering
  return dataUrl;
}
