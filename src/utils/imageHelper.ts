/**
 * Utility to downscale and compress images on the client side before uploading.
 * This reduces massive mobile camera pictures (10MB+) to highly optimized web images (sub-200KB),
 * preventing network timeouts and accelerating AI/Gemini analysis response times.
 */
export function compressAndResizeImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If the file is not an image, resolve directly with reader fallback
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (err) => reject(err);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Apply aspect-ratio-aware resizing only if exceeding limits
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to reading raw file if canvas context is unavailable
          const base64String = (reader.result as string).split(",")[1];
          resolve(base64String);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with custom quality factor
        // If png, we keep png compression, otherwise default to jpeg for massive savings
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64String = dataUrl.split(",")[1];
        resolve(base64String);
      };
      img.onerror = (err) => {
        // Fallback to normal file reader if image loading fails
        const fallbackReader = new FileReader();
        fallbackReader.readAsDataURL(file);
        fallbackReader.onload = () => {
          const base64String = (fallbackReader.result as string).split(",")[1];
          resolve(base64String);
        };
        fallbackReader.onerror = (fallbackErr) => reject(fallbackErr);
      };
    };
    reader.onerror = (err) => reject(err);
  });
}
