import { redirect } from "next/navigation";
import { getWishlistAction } from "@/actions/wishlist";
import { WishlistClient } from "@/features/profile/WishlistClient";

export default async function WishlistPage() {
  let wishlist;
  try {
    wishlist = await getWishlistAction();
  } catch {
    redirect("/login?redirect=/wishlist");
  }
  return <WishlistClient initialWishlist={wishlist ?? []} />;
}
