import { createClient } from "@/lib/supabase/server";

export async function getAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, isAdmin: false, role: null as string | null, adminName: "" };

  const { data: profile, error } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const adminName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Admin";

  return {
    user,
    isAdmin: !error && (profile?.role === "admin" || profile?.role === "super_admin"),
    role: error ? null : profile?.role ?? null,
    adminName,
  };
}
