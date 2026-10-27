export function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("VITE_API_BASE_URL must be configured before making API requests.");
  }
  return baseUrl.replace(/\/+$/, "");
}
