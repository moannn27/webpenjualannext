import { getUserProfileAction } from "@/actions/user";
import { getUserOrdersAction } from "@/actions/order";
import { getWishlistAction } from "@/actions/wishlist";
import { ProfileDashboard } from "@/features/profile/ProfileDashboard";

export default async function ProfilePage() {
  const [profile, orders, wishlist] = await Promise.all([
    getUserProfileAction().catch(() => null),
    getUserOrdersAction().catch(() => []),
    getWishlistAction().catch(() => []),
  ]);
  return <ProfileDashboard profile={profile} orders={orders ?? []} wishlist={wishlist ?? []} />;
}
