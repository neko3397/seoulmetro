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
