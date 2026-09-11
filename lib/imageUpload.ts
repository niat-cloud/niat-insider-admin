import api from "@/lib/axios";

export type PresignedUploadResponse = {
  upload_url: string;
  public_url: string;
  key: string;
};

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const MAX_ANSWER_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — matches the student-facing limit

export function validateAnswerImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Only JPG, PNG, GIF, or WebP images are allowed.";
  }
  if (file.size > MAX_ANSWER_IMAGE_BYTES) {
    return "Image must be 10MB or smaller.";
  }
  return null;
}

/** Same presigned-upload endpoint the student-facing app uses (IsAuthenticated only, no role check). */
export async function getPresignedImageUploadUrl(
  fileName: string,
  fileType: string
): Promise<PresignedUploadResponse> {
  const { data } = await api.post<PresignedUploadResponse>(
    "/api/articles/presigned-upload-url/",
    { file_name: fileName, file_type: fileType }
  );
  if (!data?.upload_url || !data?.public_url) {
    throw new Error("Invalid upload metadata returned by server.");
  }
  return data;
}

/** Direct-to-R2 PUT upload, with an XHR fallback for browsers/extensions that break cross-origin fetch PUTs. */
export async function uploadImageToR2(presignedUrl: string, file: File): Promise<void> {
  if (!presignedUrl) {
    throw new Error("Presigned upload URL is missing.");
  }
  try {
    const res = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!res.ok) {
      throw new Error(`Image upload failed with status ${res.status}`);
    }
    return;
  } catch {
    // Fall back to XHR for better compatibility while preserving direct-to-R2 upload.
  }

  if (typeof XMLHttpRequest === "undefined") {
    throw new Error("Image upload failed. Please check your connection and try again.");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Image upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      reject(new Error("Image upload failed. Please check your connection and try again."));
    };
    xhr.send(file);
  });
}
