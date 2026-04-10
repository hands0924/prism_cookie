import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getServiceSupabaseClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false }
    }
  );
}

export function getPublicStorageUrl(path: string): string {
  const base = requiredEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/share-images/${path}`;
}
