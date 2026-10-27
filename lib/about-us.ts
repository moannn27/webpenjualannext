export type AspectRatioOption = "square" | "landscape" | "portrait" | "tall" | "wide" | "auto";
export type ImageSizeOption = "small" | "medium" | "large" | "full";
export type RoundedOption = "none" | "md" | "xl" | "2xl" | "3xl" | "full";
export type ObjectFitOption = "cover" | "contain";
export type ObjectPositionOption = "center" | "top" | "bottom" | "left" | "right";
export type BorderOption = "none" | "subtle" | "accent" | "white";
export type ShadowOption = "none" | "sm" | "md" | "lg" | "xl";

export type PhotoImageItem = {
  id: string;
  url: string;
  alt: string;
  caption?: string;
  aspect_ratio?: AspectRatioOption;
  size?: ImageSizeOption;
  rounded?: RoundedOption;
  object_fit?: ObjectFitOption;
  object_position?: ObjectPositionOption;
  border?: BorderOption;
  shadow?: ShadowOption;
};

export type PhotoLayoutTemplate = "single" | "split" | "grid" | "collage" | "banner" | "carousel";

export type PhotoLayoutConfig = {
  template: PhotoLayoutTemplate;
  placement?: "left" | "right";
  columns?: 2 | 3 | 4;
  badge_text?: string;
  badge_subtext?: string;
  images: PhotoImageItem[];
};

export type AboutStatItem = {
  id: string;
  value: string;
  suffix?: string;
  label: string;
  description: string;
  is_active: boolean;
};

export type AboutValueItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  is_active: boolean;
};

export type AboutBrandItem = {
  id: string;
  name: string;
  category: string;
  logo_url?: string;
  description?: string;
  is_active: boolean;
};

export type AboutProcessStep = {
  id: string;
  step_number: string;
  title: string;
  description: string;
  icon: string;
  is_active: boolean;
};

export type AboutTeamMember = {
  id: string;
  name: string;
  role: string;
  photo_url?: string;
  description?: string;
  is_active: boolean;
};

export type AboutHeroSection = {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  primary_button_label: string;
  primary_button_url: string;
  secondary_button_label: string;
  secondary_button_url: string;
  photo_layout: PhotoLayoutConfig;
};

export type AboutStorySection = {
  tag: string;
  title: string;
  story_paragraphs: string[];
  mission: string;
  vision: string;
  core_values: { id: string; title: string; description: string; icon: string }[];
  photo_layout: PhotoLayoutConfig;
};

export type AboutStatsSection = {
  tag: string;
  title: string;
  subtitle: string;
  items: AboutStatItem[];
};

export type AboutValuesSection = {
  tag: string;
  title: string;
  subtitle: string;
  items: AboutValueItem[];
};

export type AboutBrandsSection = {
  tag: string;
  title: string;
  subtitle: string;
  items: AboutBrandItem[];
};

export type AboutProcessSection = {
  tag: string;
  title: string;
  subtitle: string;
  steps: AboutProcessStep[];
};

export type AboutTeamGallerySection = {
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  members: AboutTeamMember[];
  photo_layout: PhotoLayoutConfig;
  is_active: boolean;
};

export type AboutCtaSection = {
  tag: string;
  title: string;
  description: string;
  image_url?: string;
  badge_1?: string;
  badge_2?: string;
  badge_3?: string;
  primary_button_label: string;
  primary_button_url: string;
  secondary_button_label: string;
  secondary_button_url: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_address: string;
};

export type AboutUsContent = {
  meta_title: string;
  meta_description: string;
  og_image: string;
  section_order: string[];
  section_visibility: Record<string, boolean>;
  hero: AboutHeroSection;
  story: AboutStorySection;
  stats: AboutStatsSection;
  values: AboutValuesSection;
  brands: AboutBrandsSection;
  process: AboutProcessSection;
  team_gallery: AboutTeamGallerySection;
  cta: AboutCtaSection;
};

export const DEFAULT_ABOUT_US_CONTENT: AboutUsContent = {
  meta_title: "Tentang Kami - Next Solution Store | Authorized Laptop & Tech Store",
  meta_description:
    "Profil resmi Next Solution Store. Pusat belanja laptop bisnis, gaming, PC all-in-one dan gadget bergaransi resmi dengan konsultasi spesifikasi terbaik.",
  og_image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=1200&auto=format&fit=crop",
  section_order: ["hero", "story", "stats", "values", "brands", "process", "team_gallery", "cta"],
  section_visibility: {
    homepage: true,
    hero: true,
    story: true,
    stats: true,
    values: true,
    brands: true,
    process: true,
    team_gallery: true,
    cta: true,
  },
  hero: {
    badge: "AUTHORIZED PARTNER & TECH SPECIALIST",
    title: "Solusi Terpercaya untuk Kebutuhan Laptop & Teknologi Anda",
    subtitle: "Next Solution Store",
    description:
      "Menyediakan laptop bisnis, gaming, all-in-one PC, dan perangkat komputasi 100% original bergaransi resmi. Kami hadir untuk membantu Anda mendapatkan perangkat paling tepat dengan konsultasi spesifikasi jujur dan layanan purna jual andal.",
    primary_button_label: "Jelajahi Produk Kami",
    primary_button_url: "/products",
    secondary_button_label: "Konsultasi WhatsApp",
    secondary_button_url: "https://wa.me/628112238310?text=Halo%20Next%20Solution%2C%20saya%20ingin%20konsultasi%20pilihan%20laptop.",
    photo_layout: {
      template: "collage",
      placement: "right",
      badge_text: "100% Original BNIB",
      badge_subtext: "Garansi Resmi Prinsipal",
      images: [
        {
          id: "hero-img-1",
          url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=1600&auto=format&fit=crop",
          alt: "Laptop modern display di Next Solution",
          aspect_ratio: "portrait",
          size: "large",
          rounded: "3xl",
          object_fit: "cover",
          object_position: "center",
          border: "subtle",
          shadow: "xl",
        },
        {
          id: "hero-img-2",
          url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop",
          alt: "Laptop bisnis ultra-tipis",
          aspect_ratio: "square",
          size: "medium",
          rounded: "2xl",
          object_fit: "cover",
          object_position: "center",
          border: "subtle",
          shadow: "md",
        },
        {
          id: "hero-img-3",
          url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop",
          alt: "Perangkat hardware dan aksesoris",
          aspect_ratio: "landscape",
          size: "medium",
          rounded: "2xl",
          object_fit: "cover",
          object_position: "center",
          border: "subtle",
          shadow: "md",
        },
      ],
    },
  },
  story: {
    tag: "PROFIL & CERITA KAMI",
    title: "Menghadirkan Perangkat Terbaik dengan Pelayanan Sepenuh Hati",
    story_paragraphs: [
      "Next Solution didirikan berawal dari keresahan banyak pengguna yang kesulitan memilih perangkat laptop yang benar-benar cocok dengan kebutuhan kerja, studi, maupun kreasi mereka di tengah maraknya barang non-resmi dan informasi spesifikasi yang membingungkan.",
      "Kami berkomitmen menjadi mitra teknologi tepercaya dengan hanya menyediakan unit 100% Brand New In Box (BNIB) bergaransi resmi dari distributor prinsipal utama di Indonesia seperti Lenovo, ASUS, Apple, Acer, dan brand global lainnya.",
      "Melalui kombinasi toko fisik yang dapat dikunjungi langsung, layanan konsultasi ramah, dan kemudahan transaksi digital, kami memastikan setiap pelanggan merasa tenang, aman, dan puas sejak sebelum membeli hingga masa pakai perangkat bertahun-tahun ke depan.",
    ],
    mission:
      "Membantu setiap individu, pelajar, kreator konten, dan pelaku bisnis mendapatkan laptop serta perangkat komputasi yang tepat sasaran, bergaransi resmi, dan berkualitas prima.",
    vision:
      "Menjadi destinasi ritel teknologi dan laptop paling tepercaya di Indonesia dengan standar transparansi, integritas produk, dan kepuasan pelanggan nomor satu.",
    core_values: [
      {
        id: "cv-1",
        title: "100% Produk Original & Segel Resmi",
        description: "Setiap barang berstatus resmi distributor Indonesia, nomor seri terdaftar, dan garansi dapat diklaim di service center resmi.",
        icon: "ShieldCheck",
      },
      {
        id: "cv-2",
        title: "Konsultasi Spesifikasi Jujur & Solutif",
        description: "Rekomendasi disesuaikan dengan software yang Anda gunakan dan anggaran yang realistis tanpa paksaan upsell.",
        icon: "MessagesSquare",
      },
      {
        id: "cv-3",
        title: "Pengecekan Fisik Bersama (Quality Check)",
        description: "Tersedia opsi unboxing dan inspeksi layar, engsel, serta kelengkapan bersama tim teknisi kami sebelum unit dibawa pulang.",
        icon: "ScanSearch",
      },
      {
        id: "cv-4",
        title: "Dukungan Purna Jual Tanggap",
        description: "Bantuan konsultasi pemakaian, instalasi driver dasar, hingga pendampingan klaim garansi servis apabila terjadi kendala teknis.",
        icon: "Headset",
      },
    ],
    photo_layout: {
      template: "split",
      placement: "left",
      badge_text: "Toko Resmi Terverifikasi",
      badge_subtext: "Kunjungi Cabang Kami",
      images: [
        {
          id: "story-img-1",
          url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1600&auto=format&fit=crop",
          alt: "Suasana ruang kerja dan display laptop Next Solution",
          aspect_ratio: "portrait",
          size: "large",
          rounded: "3xl",
          object_fit: "cover",
          object_position: "center",
          border: "subtle",
          shadow: "xl",
        },
      ],
    },
  },
  stats: {
    tag: "PENCAPAIAN KAMI",
    title: "Fakta & Statistik Next Solution",
    subtitle: "Bukti nyata komitmen kami dalam melayani ribuan pelanggan dan institusi di seluruh Indonesia.",
    items: [
      {
        id: "stat-1",
        value: "7+",
        suffix: "Tahun",
        label: "Pengalaman Ritel",
        description: "Telah beroperasi sejak 2018 melayani kebutuhan teknologi masyarakat.",
        is_active: true,
      },
      {
        id: "stat-2",
        value: "50.000+",
        suffix: "",
        label: "Pelanggan Terlayani",
        description: "Pelajar, mahasiswa, gamer, kreator, profesional, dan korporat.",
        is_active: true,
      },
      {
        id: "stat-3",
        value: "250+",
        suffix: "Unit",
        label: "Pilihan Produk Ready",
        description: "Laptop bisnis, gaming, All-in-One PC, tablet, hingga aksesori.",
        is_active: true,
      },
      {
        id: "stat-4",
        value: "100%",
        suffix: "",
        label: "Garansi Resmi",
        description: "Semua unit bergaransi prinsipal resmi distributor Indonesia.",
        is_active: true,
      },
      {
        id: "stat-5",
        value: "4.9/5",
        suffix: "★",
        label: "Tingkat Kepuasan",
        description: "Berdasarkan ulasan pembeli terverifikasi di berbagai channel resmi kami.",
        is_active: true,
      },
    ],
  },
  values: {
    tag: "NILAI UNGGULAN KAMI",
    title: "Mengapa Berbelanja di Next Solution?",
    subtitle: "Layanan yang membedakan kami dalam memberikan pengalaman berbelanja gadget terbaik.",
    items: [
      {
        id: "val-1",
        title: "Konsultasi Tepat Sasaran Gratis",
        description: "Konsultasikan kebutuhan software, multitasking, atau gaming Anda. Tim kami akan mencarikan laptop dengan efisiensi spek dan harga terbaik.",
        icon: "Cpu",
        badge: "Bebas Diskusi",
        is_active: true,
      },
      {
        id: "val-2",
        title: "Jaminan 100% Produk Original BNIB",
        description: "Seluruh produk baru, tersegel rapi dari pabrik, dan dilengkapi kartu garansi resmi distributor yang valid di seluruh service center Indonesia.",
        icon: "ShieldCheck",
        badge: "Resmi Prinsipal",
        is_active: true,
      },
      {
        id: "val-3",
        title: "Pengecekan Fisik & Layar Bersama",
        description: "Bagi Anda yang memilih store pickup, nikmati fasilitas unboxing bareng teknisi untuk memeriksa dead pixel, keyboard, dan fungsi awal.",
        icon: "Eye",
        badge: "Transparan",
        is_active: true,
      },
      {
        id: "val-4",
        title: "Pengiriman Super Aman Packing Kayu",
        description: "Pengiriman luar kota dilindungi lapisan bubble wrap tebal, asuransi ekspedisi penuh, dan opsi packing kayu untuk keamanan maksimal.",
        icon: "Truck",
        badge: "Asuransi Penuh",
        is_active: true,
      },
      {
        id: "val-5",
        title: "Pilihan Pembayaran Fleksibel & Resmi",
        description: "Mendukung transfer bank BCA/Mandiri/BRI/BNI, QRIS instan, debit/tunai di toko cabang, hingga verifikasi transaksi otomatis tanpa ribet.",
        icon: "CreditCard",
        badge: "Instan & Aman",
        is_active: true,
      },
      {
        id: "val-6",
        title: "Layanan Purna Jual & Bantuan Servis",
        description: "Tidak perlu panik jika ada kendala. Tim customer support kami siap mendampingi proses klaim garansi ke service center resmi terdekat.",
        icon: "Wrench",
        badge: "Dukungan Penuh",
        is_active: true,
      },
    ],
  },
  brands: {
    tag: "BRAND & TEKNOLOGI RESMI",
    title: "Bermitra dengan Merek Teknologi Terdepan Dunia",
    subtitle: "Kami menjamin produk orisinal langsung dari prinsipal dan distributor terpercaya.",
    items: [
      {
        id: "brand-1",
        name: "Lenovo",
        category: "Legion, Yoga, IdeaPad, LOQ",
        logo_url: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg",
        description: "Authorized dealer resmi lini laptop bisnis, convertible 2-in-1, dan gaming laptop.",
        is_active: true,
      },
      {
        id: "brand-2",
        name: "ASUS",
        category: "ROG, TUF, Zenbook, Vivobook",
        logo_url: "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg",
        description: "Katalog lengkap laptop gaming ROG/TUF dan laptop tipis premium Zenbook/Vivobook.",
        is_active: true,
      },
      {
        id: "brand-3",
        name: "Apple",
        category: "MacBook Pro, MacBook Air",
        logo_url: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
        description: "Jajaran laptop Apple silicon chip performa tinggi dan ekosistem profesional.",
        is_active: true,
      },
      {
        id: "brand-4",
        name: "Acer",
        category: "Predator, Nitro, Aspire Lite",
        logo_url: "https://upload.wikimedia.org/wikipedia/commons/0/00/Acer_2011.svg",
        description: "Pilihan laptop terjangkau berkinerja stabil dan laptop gaming seri Nitro.",
        is_active: true,
      },
      {
        id: "brand-5",
        name: "Intel",
        category: "Core Ultra & Core Generasi Terbaru",
        logo_url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Intel_logo_%282020%29.svg",
        description: "Dukungan prosesor berarsitektur NPU cerdas untuk multitasking dan produktivitas AI.",
        is_active: true,
      },
      {
        id: "brand-6",
        name: "AMD",
        category: "Ryzen AI & Radeon Graphics",
        logo_url: "https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg",
        description: "Kekuatan komputasi hemat daya dan akselerasi grafis terdepan untuk gamer & kreator.",
        is_active: true,
      },
      {
        id: "brand-7",
        name: "NVIDIA",
        category: "GeForce RTX 40 & 50 Series",
        logo_url: "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg",
        description: "Pengolah grafis ray-tracing bertenaga DLSS untuk grafis visual paling memukau.",
        is_active: true,
      },
      {
        id: "brand-8",
        name: "Microsoft",
        category: "Windows 11 & Office OHS",
        logo_url: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg",
        description: "Sistem operasi orisinal bawaan pabrik dan paket lisensi resmi siap pakai.",
        is_active: true,
      },
    ],
  },
  process: {
    tag: "ALUR PELAYANAN KAMI",
    title: "Proses Transparan, Nyaman, dan Tanpa Ribet",
    subtitle: "5 tahapan terstruktur yang kami terapkan untuk memastikan kepuasan setiap pelanggan.",
    steps: [
      {
        id: "step-1",
        step_number: "01",
        title: "Konsultasi Kebutuhan",
        description: "Sampaikan kebutuhan harian Anda—apakah untuk skripsi, coding, olah video 4K, desain arsitektur, atau gaming kompetitif—serta budget yang tersedia.",
        icon: "MessageSquareText",
        is_active: true,
      },
      {
        id: "step-2",
        step_number: "02",
        title: "Rekomendasi Spesifikasi",
        description: "Tim ahli kami menyusun pilihan unit terbaik yang sesuai kebutuhan tanpa merekomendasikan spek mubazir, lengkap dengan perbandingan harga.",
        icon: "Lightbulb",
        is_active: true,
      },
      {
        id: "step-3",
        step_number: "03",
        title: "Pengecekan Fisik & Quality Control",
        description: "Unit disiapkan dan dicek segel distributornya. Anda dapat meminta video unboxing atau melakukan tes unit langsung di toko cabang.",
        icon: "CheckCircle",
        is_active: true,
      },
      {
        id: "step-4",
        step_number: "04",
        title: "Transaksi Fleksibel & Pengiriman",
        description: "Pilih metode pembayaran aman (transfer/QRIS/tunai). Barang dikirim via kurir instant/kargo berasuransi atau diambil langsung di cabang.",
        icon: "Truck",
        is_active: true,
      },
      {
        id: "step-5",
        step_number: "05",
        title: "Dukungan Purna Jual & Garansi",
        description: "Kami mendampingi aktivasi garansi dan siap membantu jika di masa depan Anda membutuhkan konsultasi upgrade RAM/SSD atau klaim servis.",
        icon: "HeartHandshake",
        is_active: true,
      },
    ],
  },
  team_gallery: {
    tag: "SUASANA & DOKUMENTASI",
    title: "Aktivitas Toko & Tim Next Solution",
    subtitle: "Dedikasi kami tercermin dari aktivitas pelayanan harian, ketelitian QC, dan fasilitas toko yang nyaman.",
    description: "Kami percaya teknologi terbaik harus didukung oleh interaksi manusia yang hangat dan berpengetahuan. Kunjungi cabang kami untuk merasakan pengalaman belanja teknologi yang ramah.",
    is_active: true,
    members: [
      {
        id: "member-1",
        name: "Tim Konsultan Produk",
        role: "Product Specialists",
        description: "Siap membantu Anda menemukan kecocokan spesifikasi laptop yang paling ideal.",
        photo_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop",
        is_active: true,
      },
      {
        id: "member-2",
        name: "Tim Teknisi & Quality Check",
        role: "Hardware Specialists",
        description: "Memastikan setiap unit dalam kondisi prima sebelum diserahkan ke pelanggan.",
        photo_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop",
        is_active: true,
      },
      {
        id: "member-3",
        name: "Tim Pengiriman & Logistik",
        role: "Fulfillment & Packing",
        description: "Menjaga keamanan packing kayu dan ketepatan pengiriman ke seluruh Nusantara.",
        photo_url: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=800&auto=format&fit=crop",
        is_active: true,
      },
    ],
    photo_layout: {
      template: "grid",
      columns: 3,
      badge_text: "Dokumentasi Resmi",
      images: [
        {
          id: "gallery-1",
          url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1200&auto=format&fit=crop",
          alt: "Konsultasi produk bersama pelanggan",
          aspect_ratio: "portrait",
          rounded: "2xl",
          object_fit: "cover",
          object_position: "center",
          border: "subtle",
          shadow: "md",
        },
        {
          id: "gallery-2",
          url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1200&auto=format&fit=crop",
          alt: "Teknisi melakukan pengecekan unit laptop",
          aspect_ratio: "portrait",
          rounded: "2xl",
          object_fit: "cover",
          object_position: "center",
          border: "subtle",
          shadow: "md",
        },
        {
          id: "gallery-3",
          url: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=1200&auto=format&fit=crop",
          alt: "Display laptop dan aksesoris di toko",
          aspect_ratio: "portrait",
          rounded: "2xl",
          object_fit: "cover",
          object_position: "center",
          border: "subtle",
          shadow: "md",
        },
      ],
    },
  },
  cta: {
    tag: "KONSULTASI SEKARANG",
    title: "Siap Menemukan Laptop & Perangkat yang Paling Tepat?",
    description: "Diskusikan kebutuhan komputasi Anda bersama tim Next Solution atau langsung telusuri koleksi lengkap laptop bergaransi resmi kami hari ini.",
    image_url: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=1200&auto=format&fit=crop",
    badge_1: "Rekomendasi Spesifikasi Tepat Sesuai Budget",
    badge_2: "100% Unit Baru, Segel & Bergaransi Resmi",
    badge_3: "Konsultasi Gratis & Layanan Purna Jual Terpercaya",
    primary_button_label: "Tanya Kami via WhatsApp",
    primary_button_url: "https://wa.me/628112238310?text=Halo%20Next%20Solution%2C%20saya%20tertarik%20ingin%20tanya%20pilihan%20laptop%20yang%20ready.",
    secondary_button_label: "Jelajahi Katalog Produk",
    secondary_button_url: "/products",
    contact_email: "support@nextsolution.id",
    contact_phone: "+62 811-2238-310",
    contact_whatsapp: "628112238310",
    contact_address: "Jl. Kartini No. 9, Bandung (Toko Pusat Next Solution)",
  },
};

export function normalizeAboutUsContent(raw: unknown): AboutUsContent {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_ABOUT_US_CONTENT;
  }
  const input = raw as Partial<AboutUsContent>;

  const section_order = Array.isArray(input.section_order) && input.section_order.length > 0
    ? input.section_order.filter((s) => typeof s === "string")
    : DEFAULT_ABOUT_US_CONTENT.section_order;

  const section_visibility = {
    ...DEFAULT_ABOUT_US_CONTENT.section_visibility,
    ...(typeof input.section_visibility === "object" && input.section_visibility !== null
      ? input.section_visibility
      : {}),
  };

  const normalizePhotoLayout = (layoutRaw: unknown, fallback: PhotoLayoutConfig): PhotoLayoutConfig => {
    if (!layoutRaw || typeof layoutRaw !== "object") return fallback;
    const l = layoutRaw as Partial<PhotoLayoutConfig>;
    const template: PhotoLayoutTemplate = ["single", "split", "grid", "collage", "banner", "carousel"].includes(
      l.template as PhotoLayoutTemplate
    )
      ? (l.template as PhotoLayoutTemplate)
      : fallback.template;

    const images: PhotoImageItem[] = Array.isArray(l.images)
      ? l.images
          .filter((img) => img && typeof img === "object" && typeof (img as PhotoImageItem).url === "string")
          .map((img, idx) => {
            const item = img as Partial<PhotoImageItem>;
            return {
              id: String(item.id || `img-${idx + 1}`),
              url: String(item.url || "").trim(),
              alt: String(item.alt || "Foto Next Solution").trim(),
              caption: item.caption ? String(item.caption).trim() : undefined,
              aspect_ratio: item.aspect_ratio || "landscape",
              size: item.size || "medium",
              rounded: item.rounded || "2xl",
              object_fit: item.object_fit || "cover",
              object_position: item.object_position || "center",
              border: item.border || "subtle",
              shadow: item.shadow || "md",
            };
          })
      : fallback.images;

    return {
      template,
      placement: l.placement === "left" || l.placement === "right" ? l.placement : fallback.placement,
      columns: l.columns === 2 || l.columns === 3 || l.columns === 4 ? l.columns : fallback.columns,
      badge_text: l.badge_text !== undefined ? String(l.badge_text) : fallback.badge_text,
      badge_subtext: l.badge_subtext !== undefined ? String(l.badge_subtext) : fallback.badge_subtext,
      images: images.length > 0 ? images : fallback.images,
    };
  };

  return {
    meta_title: String(input.meta_title || DEFAULT_ABOUT_US_CONTENT.meta_title).trim(),
    meta_description: String(input.meta_description || DEFAULT_ABOUT_US_CONTENT.meta_description).trim(),
    og_image: String(input.og_image || DEFAULT_ABOUT_US_CONTENT.og_image).trim(),
    section_order,
    section_visibility,
    hero: {
      badge: String(input.hero?.badge ?? DEFAULT_ABOUT_US_CONTENT.hero.badge).trim(),
      title: String(input.hero?.title ?? DEFAULT_ABOUT_US_CONTENT.hero.title).trim(),
      subtitle: String(input.hero?.subtitle ?? DEFAULT_ABOUT_US_CONTENT.hero.subtitle).trim(),
      description: String(input.hero?.description ?? DEFAULT_ABOUT_US_CONTENT.hero.description).trim(),
      primary_button_label: String(input.hero?.primary_button_label ?? DEFAULT_ABOUT_US_CONTENT.hero.primary_button_label).trim(),
      primary_button_url: String(input.hero?.primary_button_url ?? DEFAULT_ABOUT_US_CONTENT.hero.primary_button_url).trim(),
      secondary_button_label: String(input.hero?.secondary_button_label ?? DEFAULT_ABOUT_US_CONTENT.hero.secondary_button_label).trim(),
      secondary_button_url: String(input.hero?.secondary_button_url ?? DEFAULT_ABOUT_US_CONTENT.hero.secondary_button_url).trim(),
      photo_layout: normalizePhotoLayout(input.hero?.photo_layout, DEFAULT_ABOUT_US_CONTENT.hero.photo_layout),
    },
    story: {
      tag: String(input.story?.tag ?? DEFAULT_ABOUT_US_CONTENT.story.tag).trim(),
      title: String(input.story?.title ?? DEFAULT_ABOUT_US_CONTENT.story.title).trim(),
      story_paragraphs:
        Array.isArray(input.story?.story_paragraphs) && input.story.story_paragraphs.length > 0
          ? input.story.story_paragraphs.map((p) => String(p).trim()).filter(Boolean)
          : DEFAULT_ABOUT_US_CONTENT.story.story_paragraphs,
      mission: String(input.story?.mission ?? DEFAULT_ABOUT_US_CONTENT.story.mission).trim(),
      vision: String(input.story?.vision ?? DEFAULT_ABOUT_US_CONTENT.story.vision).trim(),
      core_values:
        Array.isArray(input.story?.core_values) && input.story.core_values.length > 0
          ? input.story.core_values.map((v, i) => ({
              id: String(v.id || `cv-${i + 1}`),
              title: String(v.title || "").trim(),
              description: String(v.description || "").trim(),
              icon: String(v.icon || "ShieldCheck").trim(),
            }))
          : DEFAULT_ABOUT_US_CONTENT.story.core_values,
      photo_layout: normalizePhotoLayout(input.story?.photo_layout, DEFAULT_ABOUT_US_CONTENT.story.photo_layout),
    },
    stats: {
      tag: String(input.stats?.tag ?? DEFAULT_ABOUT_US_CONTENT.stats.tag).trim(),
      title: String(input.stats?.title ?? DEFAULT_ABOUT_US_CONTENT.stats.title).trim(),
      subtitle: String(input.stats?.subtitle ?? DEFAULT_ABOUT_US_CONTENT.stats.subtitle).trim(),
      items:
        Array.isArray(input.stats?.items) && input.stats.items.length > 0
          ? input.stats.items.map((s, i) => ({
              id: String(s.id || `stat-${i + 1}`),
              value: String(s.value || "").trim(),
              suffix: s.suffix !== undefined ? String(s.suffix) : "",
              label: String(s.label || "").trim(),
              description: String(s.description || "").trim(),
              is_active: s.is_active !== false,
            }))
          : DEFAULT_ABOUT_US_CONTENT.stats.items,
    },
    values: {
      tag: String(input.values?.tag ?? DEFAULT_ABOUT_US_CONTENT.values.tag).trim(),
      title: String(input.values?.title ?? DEFAULT_ABOUT_US_CONTENT.values.title).trim(),
      subtitle: String(input.values?.subtitle ?? DEFAULT_ABOUT_US_CONTENT.values.subtitle).trim(),
      items:
        Array.isArray(input.values?.items) && input.values.items.length > 0
          ? input.values.items.map((v, i) => ({
              id: String(v.id || `val-${i + 1}`),
              title: String(v.title || "").trim(),
              description: String(v.description || "").trim(),
              icon: String(v.icon || "Sparkles").trim(),
              badge: v.badge ? String(v.badge).trim() : undefined,
              is_active: v.is_active !== false,
            }))
          : DEFAULT_ABOUT_US_CONTENT.values.items,
    },
    brands: {
      tag: String(input.brands?.tag ?? DEFAULT_ABOUT_US_CONTENT.brands.tag).trim(),
      title: String(input.brands?.title ?? DEFAULT_ABOUT_US_CONTENT.brands.title).trim(),
      subtitle: String(input.brands?.subtitle ?? DEFAULT_ABOUT_US_CONTENT.brands.subtitle).trim(),
      items:
        Array.isArray(input.brands?.items) && input.brands.items.length > 0
          ? input.brands.items.map((b, i) => ({
              id: String(b.id || `brand-${i + 1}`),
              name: String(b.name || "").trim(),
              category: String(b.category || "").trim(),
              logo_url: b.logo_url ? String(b.logo_url).trim() : undefined,
              description: b.description ? String(b.description).trim() : undefined,
              is_active: b.is_active !== false,
            }))
          : DEFAULT_ABOUT_US_CONTENT.brands.items,
    },
    process: {
      tag: String(input.process?.tag ?? DEFAULT_ABOUT_US_CONTENT.process.tag).trim(),
      title: String(input.process?.title ?? DEFAULT_ABOUT_US_CONTENT.process.title).trim(),
      subtitle: String(input.process?.subtitle ?? DEFAULT_ABOUT_US_CONTENT.process.subtitle).trim(),
      steps:
        Array.isArray(input.process?.steps) && input.process.steps.length > 0
          ? input.process.steps.map((st, i) => ({
              id: String(st.id || `step-${i + 1}`),
              step_number: String(st.step_number || `0${i + 1}`).trim(),
              title: String(st.title || "").trim(),
              description: String(st.description || "").trim(),
              icon: String(st.icon || "CheckCircle").trim(),
              is_active: st.is_active !== false,
            }))
          : DEFAULT_ABOUT_US_CONTENT.process.steps,
    },
    team_gallery: {
      tag: String(input.team_gallery?.tag ?? DEFAULT_ABOUT_US_CONTENT.team_gallery.tag).trim(),
      title: String(input.team_gallery?.title ?? DEFAULT_ABOUT_US_CONTENT.team_gallery.title).trim(),
      subtitle: String(input.team_gallery?.subtitle ?? DEFAULT_ABOUT_US_CONTENT.team_gallery.subtitle).trim(),
      description: String(input.team_gallery?.description ?? DEFAULT_ABOUT_US_CONTENT.team_gallery.description).trim(),
      is_active: input.team_gallery?.is_active !== false,
      members:
        Array.isArray(input.team_gallery?.members) && input.team_gallery.members.length > 0
          ? input.team_gallery.members.map((m, i) => ({
              id: String(m.id || `member-${i + 1}`),
              name: String(m.name || "").trim(),
              role: String(m.role || "").trim(),
              photo_url: m.photo_url ? String(m.photo_url).trim() : undefined,
              description: m.description ? String(m.description).trim() : undefined,
              is_active: m.is_active !== false,
            }))
          : DEFAULT_ABOUT_US_CONTENT.team_gallery.members,
      photo_layout: normalizePhotoLayout(input.team_gallery?.photo_layout, DEFAULT_ABOUT_US_CONTENT.team_gallery.photo_layout),
    },
    cta: {
      tag: String(input.cta?.tag ?? DEFAULT_ABOUT_US_CONTENT.cta.tag).trim(),
      title: String(input.cta?.title ?? DEFAULT_ABOUT_US_CONTENT.cta.title).trim(),
      description: String(input.cta?.description ?? DEFAULT_ABOUT_US_CONTENT.cta.description).trim(),
      image_url: typeof input.cta?.image_url === "string" && input.cta.image_url.trim() ? input.cta.image_url.trim() : DEFAULT_ABOUT_US_CONTENT.cta.image_url,
      badge_1: typeof input.cta?.badge_1 === "string" && input.cta.badge_1.trim() ? input.cta.badge_1.trim() : DEFAULT_ABOUT_US_CONTENT.cta.badge_1,
      badge_2: typeof input.cta?.badge_2 === "string" && input.cta.badge_2.trim() ? input.cta.badge_2.trim() : DEFAULT_ABOUT_US_CONTENT.cta.badge_2,
      badge_3: typeof input.cta?.badge_3 === "string" && input.cta.badge_3.trim() ? input.cta.badge_3.trim() : DEFAULT_ABOUT_US_CONTENT.cta.badge_3,
      primary_button_label: String(input.cta?.primary_button_label ?? DEFAULT_ABOUT_US_CONTENT.cta.primary_button_label).trim(),
      primary_button_url: String(input.cta?.primary_button_url ?? DEFAULT_ABOUT_US_CONTENT.cta.primary_button_url).trim(),
      secondary_button_label: String(input.cta?.secondary_button_label ?? DEFAULT_ABOUT_US_CONTENT.cta.secondary_button_label).trim(),
      secondary_button_url: String(input.cta?.secondary_button_url ?? DEFAULT_ABOUT_US_CONTENT.cta.secondary_button_url).trim(),
      contact_email: String(input.cta?.contact_email ?? DEFAULT_ABOUT_US_CONTENT.cta.contact_email).trim(),
      contact_phone: String(input.cta?.contact_phone ?? DEFAULT_ABOUT_US_CONTENT.cta.contact_phone).trim(),
      contact_whatsapp: String(input.cta?.contact_whatsapp ?? DEFAULT_ABOUT_US_CONTENT.cta.contact_whatsapp).trim(),
      contact_address: String(input.cta?.contact_address ?? DEFAULT_ABOUT_US_CONTENT.cta.contact_address).trim(),
    },
  };
}

