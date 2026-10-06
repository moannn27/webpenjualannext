import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string | string[] }>;
}) {
  const { order_id: queryOrderId } = await searchParams;
  const orderId = typeof queryOrderId === "string" ? queryOrderId : undefined;

  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center text-center max-w-xl">
      <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8">
        <CheckCircle2 className="h-12 w-12" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-4 text-foreground">Order Successful!</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Thank you for your purchase. We&apos;ve received your order and will begin processing it right away.
        {orderId && (
          <>
            <br />
            Your order reference is <span className="font-semibold text-foreground">#{orderId.substring(0, 8).toUpperCase()}</span>.
          </>
        )}
      </p>
      <Button render={<Link href="/" />} size="lg" className="rounded-full px-8">
        Back to Home
      </Button>
    </div>
  );
}
