import type { SupabaseClient } from "@supabase/supabase-js"

export async function getCurrentOrgId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("memberships").select("organization_id").limit(1).maybeSingle()
  return data?.organization_id ?? null
}

export async function getCurrentRole(supabase: SupabaseClient): Promise<{ key: string; name: string } | null> {
  const { data } = await supabase.from("memberships").select("roles(key, name)").limit(1).maybeSingle()
  const role = data?.roles ?? null
  return Array.isArray(role) ? role[0] ?? null : role
}
