export const HERO_SLIDES = [
  {
    id: 1,
    title: "Pusat Komputer & Laptop Terkurasi",
    subtitle: "Next Solution Store",
    description: "Temukan pilihan laptop kerja, laptop gaming, dan PC dengan spesifikasi teknis lengkap sesuai kebutuhan Anda.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
    cta: "Jelajahi Produk",
    href: "/products"
  },
  {
    id: 2,
    title: "Penawaran Produk & Aksesoris Pilihan",
    subtitle: "Katalog & Opsi Ambil di Toko",
    description: "Pilihan lengkap perangkat komputer dan periferal dengan opsi ambil langsung di toko atau pengiriman pesanan.",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=2000&auto=format&fit=crop",
    cta: "Lihat Promo",
    href: "/promo"
  },
  {
    id: 3,
    title: "Laptop Gaming & Performa Tinggi",
    subtitle: "Lenovo Legion & ASUS ROG",
    description: "Pengalaman gaming dan kreasi konten tanpa kompromi dengan prosesor generasi terbaru dan grafis RTX berdaya tinggi.",
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=2000&auto=format&fit=crop",
    cta: "Cek Laptop Gaming",
    href: "/products?category=gaming-laptops"
  },
  {
    id: 4,
    title: "PC Desktop & All-in-One Siap Pakai",
    subtitle: "Produktivitas Kantor & Bisnis",
    description: "Solusi komputasi handal, hemat ruang, dan efisien untuk kebutuhan perkantoran, kasir, belajar, dan multimedia harian.",
    image: "https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=2000&auto=format&fit=crop",
    cta: "Lihat PC Desktop",
    href: "/products?category=pc"
  },
  {
    id: 5,
    title: "Aksesoris & Periferal Lengkap",
    subtitle: "Periferal & Aksesoris Resmi",
    description: "Lengkapi setup komputermu dengan mechanical keyboard, mouse wireless presisi, monitor jernih, dan headset premium.",
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?q=80&w=2000&auto=format&fit=crop",
    cta: "Pilih Aksesoris",
    href: "/products?category=accessories"
  }
];

export const CATEGORIES = [
  {
    id: "laptops",
    name: "Laptops",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=500&auto=format&fit=crop",
    href: "/category/laptops"
  },
  {
    id: "smartphones",
    name: "Smartphones",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=500&auto=format&fit=crop",
    href: "/category/smartphones"
  },
  {
    id: "tablets",
    name: "Tablets",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=500&auto=format&fit=crop",
    href: "/category/tablets"
  },
  {
    id: "smartwatches",
    name: "Smartwatches",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=500&auto=format&fit=crop",
    href: "/category/smartwatches"
  },
  {
    id: "accessories",
    name: "Accessories",
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?q=80&w=500&auto=format&fit=crop",
    href: "/category/accessories"
  },
  {
    id: "audio",
    name: "Audio",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=500&auto=format&fit=crop",
    href: "/category/audio"
  }
];

import { MASTER_PRODUCTS } from "./products";

export const PRODUCTS = MASTER_PRODUCTS.map((p) => ({
  id: `p${p.id}`,
  name: p.name,
  brand: p.brand ?? "Brand",
  category: p.category,
  price: p.price,
  originalPrice: p.originalPrice ?? null,
  rating: p.rating ?? 4.8,
  reviews: p.reviews ?? 100,
  image: p.image,
  badges: p.badges ?? [],
  stock: p.stock,
}));

export const BRANDS = [
  { id: "b1", name: "Apple", logo: "🍎" },
  { id: "b2", name: "Samsung", logo: "📱" },
  { id: "b3", name: "Sony", logo: "🎧" },
  { id: "b4", name: "Asus", logo: "💻" },
  { id: "b5", name: "Logitech", logo: "🖱️" },
  { id: "b6", name: "Dell", logo: "🖥️" },
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: "Sarah Jenkins",
    role: "UX Designer",
    content: "The delivery was incredibly fast and the MacBook arrived in perfect condition. Next Solution Store is my go-to for all tech upgrades.",
    rating: 5,
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Software Engineer",
    content: "Excellent customer service. They helped me choose the right components for my custom PC build. Highly recommended!",
    rating: 5,
    avatar: "https://i.pravatar.cc/150?u=michael"
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Digital Creator",
    content: "The premium feel of the website matches the premium products they sell. Finding what I needed was a breeze.",
    rating: 4,
    avatar: "https://i.pravatar.cc/150?u=emily"
  }
];

export const FAQS = [
  {
    question: "What is your return policy?",
    answer: "We offer a 30-day return policy for all unused products in their original packaging. Simply contact our support team to initiate a return."
  },
  {
    question: "Do you offer international shipping?",
    answer: "Yes, we ship to over 50 countries worldwide. Shipping costs and delivery times vary depending on the destination."
  },
  {
    question: "Are your products authentic?",
    answer: "Absolutely. We are authorized resellers for all the brands we carry, guaranteeing 100% authentic and original products with official warranties."
  },
  {
    question: "How can I track my order?",
    answer: "Once your order ships, you'll receive a confirmation email with a tracking number. You can also view your order status in your account dashboard."
  }
];
