/**
 * Client-Side Image Compression Utility
 * Optimized for Camera-Captured Exam Paper Photos
 * 
 * Compresses multi-megapixel smartphone captures to high-clarity WebP/JPEG
 * suitable for Multimodal Vision OCR without sending giant payloads.
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  reductionPercentage: number;
}

const MAX_DIMENSION = 2048; // Preserves high text clarity for OCR while bounding resolution
const TARGET_QUALITY = 0.85;

export async function compressExamPhoto(file: File): Promise<CompressionResult> {
  const originalSizeBytes = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down proportionally if larger than MAX_DIMENSION
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context not available');
          }

          // Fill white background (avoids transparent PNG issues when converting)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Draw scaled image
          ctx.drawImage(img, 0, 0, width, height);

          // Determine preferred MIME type (WebP preferred, JPEG fallback)
          const targetMime = 'image/webp';
          const extension = 'webp';

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback to JPEG if WebP blob generation fails
                canvas.toBlob(
                  (jpegBlob) => {
                    if (!jpegBlob) {
                      reject(new Error('Canvas blob compression failed'));
                      return;
                    }
                    finalizeResult(jpegBlob, 'jpeg');
                  },
                  'image/jpeg',
                  TARGET_QUALITY
                );
                return;
              }
              finalizeResult(blob, extension);
            },
            targetMime,
            TARGET_QUALITY
          );

          function finalizeResult(blob: Blob, ext: string) {
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFileName = `${baseName}_compressed.${ext}`;
            const compressedFile = new File([blob], compressedFileName, {
              type: blob.type,
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(compressedFile);
            const compressedSizeBytes = compressedFile.size;
            const reductionPercentage = Math.max(
              0,
              Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100)
            );

            resolve({
              file: compressedFile,
              previewUrl,
              originalSizeBytes,
              compressedSizeBytes,
              reductionPercentage,
            });
          }
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Formats byte count into human readable KB / MB
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
