import Image from "next/image";
import { Star } from "lucide-react";
import { TESTIMONIALS } from "@/constants/dummy";

export function Testimonials() {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
          What Our Customers Say
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Don&apos;t just take our word for it. Hear from the people who love our products.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TESTIMONIALS.map((testimonial) => (
          <div key={testimonial.id} className="bg-card p-8 rounded-[32px] border border-border flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
            <div className="flex gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${i < testimonial.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                />
              ))}
            </div>
            <p className="text-lg text-foreground mb-8 flex-1 italic font-light">
              &ldquo;{testimonial.content}&rdquo;
            </p>
            <div className="flex items-center gap-4 mt-auto">
              <div className="relative h-12 w-12 rounded-full overflow-hidden">
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
