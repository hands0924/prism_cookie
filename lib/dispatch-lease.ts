import { getServiceSupabaseClient } from "@/lib/supabase";

export async function acquireDispatchLease(holder: string, ttlSeconds: number): Promise<boolean> {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase.rpc("acquire_dispatch_lease", {
    p_holder: holder,
    p_ttl_seconds: Math.max(5, Math.min(120, Math.floor(ttlSeconds)))
  });
  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function releaseDispatchLease(holder: string): Promise<void> {
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.rpc("release_dispatch_lease", {
    p_holder: holder
  });
  if (error) {
    throw error;
  }
}
