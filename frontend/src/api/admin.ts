import type { CafeMenu, MenuCategory, MenuItem } from "./types";
import { getApiBaseUrl } from "./baseUrl";

const adminBase = () => `${getApiBaseUrl()}/admin`;

export interface Cafe {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoPublicId: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  currencyCode: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  displayOrder: number;
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CafePayload {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoPublicId: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  currencyCode: string;
  active: boolean;
}

export interface CategoryPayload {
  name: string;
  displayOrder: number;
}

export interface ItemPayload {
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  halfPrice: number | null;
  fullPrice: number;
  available: boolean;
  displayOrder: number;
}

export interface ImageAsset {
  secureUrl: string;
  publicId: string;
}

export interface CafeMenuUrl {
  cafeName: string;
  slug: string;
  menuUrl: string;
  active: boolean;
}

export async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${adminBase()}${path}`, { ...options, headers });
  if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string; errors?: Record<string, string> } | null;
    const validation = body?.errors ? Object.values(body.errors).join(" ") : null;
    throw new Error(validation || body?.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<{ accessToken: string; expiresAt: string }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail || (response.status === 401 ? "Email or password is incorrect." : "Unable to sign in."));
  }
  return response.json() as Promise<{ accessToken: string; expiresAt: string }>;
}

export async function getCafes(token: string, page = 0): Promise<PageResult<Cafe>> {
  return apiRequest(`/cafes?page=${page}&size=100`, token);
}

export async function getCafe(token: string, cafeId: string): Promise<Cafe> {
  return apiRequest(`/cafes/${cafeId}`, token);
}

export async function getCafeMenu(token: string, cafeId: string): Promise<CafeMenu> {
  return apiRequest(`/cafes/${cafeId}/menu`, token);
}

export async function getCategories(token: string, cafeId: string): Promise<CategorySummary[]> {
  const result = await apiRequest<PageResult<CategorySummary>>(`/cafes/${cafeId}/categories?page=0&size=100`, token);
  return result.content;
}

export async function getCategory(token: string, categoryId: string): Promise<MenuCategory> {
  return apiRequest(`/categories/${categoryId}`, token);
}

export async function getItems(token: string, categoryId: string): Promise<MenuItem[]> {
  const result = await apiRequest<PageResult<MenuItem>>(`/categories/${categoryId}/items?page=0&size=100`, token);
  return result.content;
}

export function validateImageFile(file: File): void {
  const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose a PNG, JPEG, GIF, or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image must be 10 MB or smaller.");
  }
}

export async function uploadImage(
  token: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ImageAsset> {
  const formData = new FormData();
  formData.append("image", file);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${adminBase()}/images`);
    request.setRequestHeader("Accept", "application/json");
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Image upload failed. Check your connection and try again."));
    request.onabort = () => reject(new Error("Image upload was cancelled."));
    request.onload = () => {
      if (request.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
      let body: { secureUrl?: string; publicId?: string; detail?: string } = {};
      try { body = JSON.parse(request.responseText) as typeof body; } catch { /* use the status fallback */ }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(body.detail || `Image upload failed (${request.status}).`));
      } else if (!body.secureUrl || !body.publicId) {
        reject(new Error("Image upload response did not include its Cloudinary asset details."));
      } else {
        resolve({ secureUrl: body.secureUrl, publicId: body.publicId });
      }
    };
    request.send(formData);
  });
}

export async function deleteUploadedImage(token: string, publicId: string): Promise<void> {
  await apiRequest(`/images?publicId=${encodeURIComponent(publicId)}`, token, { method: "DELETE" });
}

export async function getQrCode(token: string, cafeId: string): Promise<Blob> {
  const response = await fetch(`${adminBase()}/cafes/${cafeId}/qr`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail || "Unable to generate QR code.");
  }
  return response.blob();
}

export async function getCafeMenuUrl(token: string, cafeId: string): Promise<CafeMenuUrl> {
  return apiRequest(`/cafes/${cafeId}/qr/url`, token);
}

export async function getQrPdf(token: string, cafeId: string): Promise<Blob> {
  const response = await fetch(`${adminBase()}/cafes/${cafeId}/qr.pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
  if (!response.ok) throw new Error("Unable to download the printable QR code.");
  return response.blob();
}
