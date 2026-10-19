import { describe, it, expect } from "vitest";
import {
  DEFAULT_ABOUT_US_CONTENT,
  normalizeAboutUsContent,
  type AboutUsContent,
} from "@/lib/about-us";

describe("About Us Data Normalizer & Config", () => {
  it("returns default content when empty object or null is provided", () => {
    const resFromNull = normalizeAboutUsContent(null as unknown as Partial<AboutUsContent>);
    expect(resFromNull.meta_title).toBe(DEFAULT_ABOUT_US_CONTENT.meta_title);
    expect(resFromNull.section_order).toEqual(DEFAULT_ABOUT_US_CONTENT.section_order);
    expect(resFromNull.hero.title).toBe(DEFAULT_ABOUT_US_CONTENT.hero.title);

    const resFromEmpty = normalizeAboutUsContent({});
    expect(resFromEmpty.hero.photo_layout.template).toBe("collage");
    expect(resFromEmpty.stats.items.length).toBeGreaterThan(0);
  });

  it("preserves custom titles, buttons, and section visibility", () => {
    const custom = normalizeAboutUsContent({
      meta_title: "Custom Title",
      section_visibility: {
        hero: true,
        team_gallery: false,
      },
      hero: {
        ...DEFAULT_ABOUT_US_CONTENT.hero,
        title: "Toko Laptop Terbaik",
        primary_button_label: "Beli Sekarang",
        primary_button_url: "/custom-url",
      },
    });

    expect(custom.meta_title).toBe("Custom Title");
    expect(custom.section_visibility.team_gallery).toBe(false);
    expect(custom.hero.title).toBe("Toko Laptop Terbaik");
    expect(custom.hero.primary_button_label).toBe("Beli Sekarang");
    expect(custom.hero.primary_button_url).toBe("/custom-url");
  });

  it("handles photo layout configs properly with custom templates, aspect ratios, and styles", () => {
    const custom = normalizeAboutUsContent({
      hero: {
        ...DEFAULT_ABOUT_US_CONTENT.hero,
        photo_layout: {
          template: "grid",
          columns: 4,
          badge_text: "Promo Menarik",
          images: [
            {
              id: "img-1",
              url: "https://example.com/test.jpg",
              alt: "Foto Toko",
              aspect_ratio: "square",
              size: "large",
              rounded: "full",
              object_fit: "contain",
              border: "accent",
              shadow: "xl",
            },
          ],
        },
      },
    });

    expect(custom.hero.photo_layout.template).toBe("grid");
    expect(custom.hero.photo_layout.columns).toBe(4);
    expect(custom.hero.photo_layout.badge_text).toBe("Promo Menarik");
    expect(custom.hero.photo_layout.images[0].aspect_ratio).toBe("square");
    expect(custom.hero.photo_layout.images[0].rounded).toBe("full");
    expect(custom.hero.photo_layout.images[0].border).toBe("accent");
  });

  it("filters out invalid items and keeps valid stats and values", () => {
    const custom = normalizeAboutUsContent({
      stats: {
        tag: "ANGKA",
        title: "Pencapaian",
        subtitle: "Sub",
        items: [
          {
            id: "s1",
            value: "5000",
            suffix: "+",
            label: "Unit Terjual",
            description: "Laptop bergaransi resmi",
            is_active: true,
          },
        ],
      },
      values: {
        tag: "NILAI",
        title: "Keunggulan",
        subtitle: "Sub",
        items: [
          {
            id: "v1",
            title: "Garansi Resmi",
            description: "100% asli",
            icon: "ShieldCheck",
            is_active: true,
          },
        ],
      },
    });

    expect(custom.stats.items).toHaveLength(1);
    expect(custom.stats.items[0].value).toBe("5000");
    expect(custom.values.items).toHaveLength(1);
    expect(custom.values.items[0].title).toBe("Garansi Resmi");
  });
});

