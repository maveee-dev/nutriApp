export interface OptimizedImage {
  readonly imageData: string;
  readonly mimeType: 'image/jpeg';
  readonly previewUrl: string;
}

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

/**
 * Converts a user-selected image into a bounded JPEG before it reaches the
 * recognition endpoint. The original file is never uploaded or persisted.
 */
export function optimizeImage(file: File): Promise<OptimizedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const sourceUrl = String(reader.result);
      const image = new Image();
      image.onerror = () => reject(new Error('That image could not be opened.'));
      image.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Image optimization is unavailable in this browser.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const optimizedUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        const separator = optimizedUrl.indexOf(',');
        if (separator < 0) {
          reject(new Error('Could not optimize that image.'));
          return;
        }
        resolve({
          imageData: optimizedUrl.slice(separator + 1),
          mimeType: 'image/jpeg',
          previewUrl: optimizedUrl,
        });
      };
      image.src = sourceUrl;
    };
    reader.readAsDataURL(file);
  });
}
