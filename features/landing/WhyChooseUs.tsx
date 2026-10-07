import { Truck, ShieldCheck, Headphones, CreditCard } from "lucide-react";

export function WhyChooseUs({ title = "Why Choose Next Solution?", subtitle = "We provide more than just premium products. We deliver a premium shopping experience from start to finish." }: { title?: string; subtitle?: string }) {
  const reasons = [
    {
      icon: <Truck className="h-8 w-8 text-primary" />,
      title: "Free Express Shipping",
      description: "Get your orders delivered to your doorstep quickly and for free on orders over $50.",
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: "100% Secure Payments",
      description: "Your payment information is encrypted and securely processed by trusted gateways.",
    },
    {
      icon: <Headphones className="h-8 w-8 text-primary" />,
      title: "24/7 Expert Support",
      description: "Our team of tech experts is available around the clock to help you with any questions.",
    },
    {
      icon: <CreditCard className="h-8 w-8 text-primary" />,
      title: "Easy Returns",
      description: "Not satisfied? Return your product within 30 days for a full refund, no questions asked.",
    },
  ];

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
          {title}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {reasons.map((reason, index) => (
          <div key={index} className="flex flex-col items-center text-center p-6 bg-card rounded-[24px] border border-border hover:shadow-lg transition-all duration-300">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              {reason.icon}
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">{reason.title}</h3>
            <p className="text-muted-foreground">{reason.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
