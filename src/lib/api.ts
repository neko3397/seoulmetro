import { projectId, publicAnonKey } from "../utils/supabase/info";

export const apiBase = `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1`;

export const authHeaders = {
  Authorization: `Bearer ${publicAnonKey}`,
};

export async function apiRequest(path: string, init: RequestInit = {}) {
  const headers = {
    ...authHeaders,
    ...(init.headers || {}),
  };

  return fetch(`${apiBase}${path}`, {
    cache: "no-store",
    ...init,
    headers,
  });
}

const summarizeResponseBody = (body: string) => {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (!normalized) return "empty response body";
  return normalized.slice(0, 160);
};

export async function apiRequestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiRequest(path, init);
  const rawBody = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new Error(`API ${response.status} for ${path}: ${summarizeResponseBody(rawBody)}`);
  }

  if (!rawBody.trim()) {
    throw new Error(`API returned an empty response for ${path}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`API returned non-JSON for ${path}: ${summarizeResponseBody(rawBody)}`);
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch (error) {
    throw new Error(
      `API returned invalid JSON for ${path}: ${summarizeResponseBody(rawBody)} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}
