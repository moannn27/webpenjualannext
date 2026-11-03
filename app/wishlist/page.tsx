import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWishlistAction } from "@/actions/wishlist";
import { WishlistClient } from "@/features/profile/WishlistClient";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/wishlist&notice=wishlist");
  }

  const wishlist = await getWishlistAction();
  return <WishlistClient initialWishlist={wishlist ?? []} />;
}
