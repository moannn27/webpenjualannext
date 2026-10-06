import { createClient } from "@/lib/supabase/server";

export async function getAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, isAdmin: false };

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    isAdmin: !error && (profile?.role === "admin" || profile?.role === "super_admin"),
  };
}