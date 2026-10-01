import CryptoJS from "crypto-js";

const DEFAULT_API_KEY = "544868626174916";
const DEFAULT_API_SECRET = "TRxEGFevK0zg218ShM6YjWbtZCY";
const DEFAULT_CLOUD_NAME = "djghkklph";

export const CLOUDINARY_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || DEFAULT_API_KEY,
  apiSecret: process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET || DEFAULT_API_SECRET,
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD_NAME,
};

/**
 * Upload a raw document file (PDF, PPT, DOCX, TXT, etc.) to Cloudinary.
 * Returns the secure URL so it can be stored on the quiz record.
 */
export async function uploadDocumentToCloudinary(
  file: File,
  options?: { folder?: string }
): Promise<string> {
  const cloudName = (CLOUDINARY_CONFIG.cloudName || "").trim();
  const apiKey = (CLOUDINARY_CONFIG.apiKey || DEFAULT_API_KEY).trim();
  const apiSecret = (CLOUDINARY_CONFIG.apiSecret || DEFAULT_API_SECRET).trim();

  if (!cloudName) {
    throw new Error("Cloudinary Cloud Name is missing.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options?.folder || "smarty_documents";

  const paramsToSign = `folder=${folder}&resource_type=raw&timestamp=${timestamp}`;
  const signature = CryptoJS.SHA1(paramsToSign + apiSecret).toString();

  const formData = new FormData();
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);
  formData.append("resource_type", "raw");
  formData.append("file", file);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;

  const response = await fetch(uploadUrl, { method: "POST", body: formData });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `Cloudinary upload failed: ${response.status}`);
  }

  return data.secure_url || data.url;
}

/**
 * Upload an image (base64 data URI or image URI) to Cloudinary.
 */
export async function uploadToCloudinary(
  imageUriOrBase64: string,
  options?: { folder?: string }
): Promise<string> {
  const cloudName = (CLOUDINARY_CONFIG.cloudName || "").trim();
  const apiKey = (CLOUDINARY_CONFIG.apiKey || DEFAULT_API_KEY).trim();
  const apiSecret = (CLOUDINARY_CONFIG.apiSecret || DEFAULT_API_SECRET).trim();

  if (!cloudName) {
    throw new Error("Cloudinary Cloud Name is missing. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME in .env");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options?.folder || "smarty_profiles";

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = CryptoJS.SHA1(paramsToSign + apiSecret).toString();

  const formData = new FormData();
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  if (
    imageUriOrBase64.startsWith("data:") ||
    imageUriOrBase64.startsWith("http://") ||
    imageUriOrBase64.startsWith("https://")
  ) {
    formData.append("file", imageUriOrBase64);
  } else {
    const filename = imageUriOrBase64.split("/").pop() || "upload.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    formData.append("file", { uri: imageUriOrBase64, name: filename, type } as any);
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const response = await fetch(uploadUrl, { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || `Upload failed with status ${response.status}`);
    }
    return data.secure_url || data.url;
  } catch (err: any) {
    console.error("Cloudinary upload failed:", err);
    throw new Error(err.message || "Failed to upload image to Cloudinary.");
  }
}
