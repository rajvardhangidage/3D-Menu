import type { CafeMenu } from "./types";
import { getApiBaseUrl } from "./baseUrl";

export async function fetchMenu(slug: string, signal?: AbortSignal): Promise<CafeMenu> {
  const response = await fetch(
    `${getApiBaseUrl()}/public/cafes/${encodeURIComponent(slug)}/menu`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(response.status === 404 ? "This menu is not available." : "We couldn't load this menu.");
  }
  return (await response.json()) as CafeMenu;
}
