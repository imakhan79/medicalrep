import type { SupabaseClient } from "@supabase/supabase-js"

export async function getCurrentOrgId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("memberships").select("organization_id").limit(1).maybeSingle()
  return data?.organization_id ?? null
}
