import { BaseRepository } from "./base";

export class TestimonialRepository extends BaseRepository {
  async getActive() {
    const supabase = await this.getClient();
    const { data, error } = await supabase.from("testimonials").select("*").eq("is_active", true).order("display_order");
    if (error) throw error;
    return data ?? [];
  }
}
