import { TestimonialRepository } from "@/repositories/testimonial.repository";

export class TestimonialService {
  private repository = new TestimonialRepository();
  async getActive() { return this.repository.getActive(); }
}
