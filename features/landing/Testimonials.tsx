import { Star } from "lucide-react";

type Testimonial = { id: string; name: string; role?: string | null; content: string; rating?: number | null };

export function Testimonials({ testimonials = [], title = "What Our Customers Say", subtitle = "Hear from the people who love our products." }: { testimonials?: Testimonial[]; title?: string; subtitle?: string }) {
  if (!testimonials.length) return null;
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((testimonial) => {
          const rating = testimonial.rating ?? 5;
          return (
          <div key={testimonial.id} className="bg-card p-8 rounded-[32px] border border-border flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
            <div className="flex gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                />
              ))}
            </div>
            <p className="text-lg text-foreground mb-8 flex-1 italic font-light">
              &ldquo;{testimonial.content}&rdquo;
            </p>
            <div className="flex items-center gap-4 mt-auto">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary" aria-hidden="true">
                {testimonial.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
