import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "./info";

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseKey = publicAnonKey;

declare global {
  interface Window {
    __SEOULMETRO_SUPABASE__?: ReturnType<typeof createClient>;
  }
}

const createSupabaseClient = () => createClient(supabaseUrl, supabaseKey);

export const supabase =
  typeof window === "undefined"
    ? createSupabaseClient()
    : (window.__SEOULMETRO_SUPABASE__ ??= createSupabaseClient());
