import { getUserProfileAction } from "@/actions/user";
import { getUserOrdersAction } from "@/actions/order";
import { getWishlistAction } from "@/actions/wishlist";
import { getUserReviewsAction } from "@/actions/review";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { ProfileDashboard } from "@/features/profile/ProfileDashboard";

export default async function ProfilePage() {
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
    />
  );
}
