import { getUserProfileAction } from "@/actions/user";
import { getUserOrdersAction } from "@/actions/order";
import { getWishlistAction } from "@/actions/wishlist";
import { getUserReviewsAction } from "@/actions/review";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { ProfileDashboard } from "@/features/profile/ProfileDashboard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/profile&notice=profile");
  }

  const params = await searchParams;
  const initialTab = params.tab === "settings" ? "settings" : "orders";
  const [profile, orders, wishlist, reviews, rawSettings] = await Promise.all([
    getUserProfileAction().catch(() => null),
    getUserOrdersAction().catch(() => []),
    getWishlistAction().catch(() => []),
    getUserReviewsAction().catch(() => []),
    getStorefrontSettingsAction().catch(() => null),
  ]);
  const settings = normalizeStorefrontSettings(rawSettings);

  return (
    <ProfileDashboard
      profile={profile}
      orders={orders ?? []}
      wishlist={wishlist ?? []}
      reviews={reviews ?? []}
      storeWhatsapp={settings.store.whatsapp}
      initialTab={initialTab}
    />
  );
}
