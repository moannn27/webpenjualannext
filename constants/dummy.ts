export const HERO_SLIDES = [
  {
    id: 1,
    title: "The New Standard of Power.",
    subtitle: "MacBook Pro M3 Max",
    description: "Mind-blowing. Head-turning. Experience the ultimate performance with the all-new M3 chip architecture.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=2000&auto=format&fit=crop",
    cta: "Buy Now",
    href: "/product/macbook-pro-m3-max"
  },
  {
    id: 2,
    title: "Capture Beyond Limits.",
    subtitle: "Galaxy S24 Ultra",
    description: "Welcome to the era of Mobile AI. With Galaxy S24 Ultra in your hands, you can unleash whole new levels of creativity.",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=2000&auto=format&fit=crop",
    cta: "Pre-order",
    href: "/product/galaxy-s24-ultra"
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

export const PRODUCTS = [
  {
    id: "p1",
    name: "MacBook Pro 16\" M3 Max",
    brand: "Apple",
    category: "Laptops",
    price: 3499,
    originalPrice: 3699,
    rating: 4.9,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
    badges: ["New", "Best Seller"],
    stock: 15
  },
  {
    id: "p2",
    name: "Galaxy S24 Ultra 512GB",
    brand: "Samsung",
    category: "Smartphones",
    price: 1299,
    originalPrice: null,
    rating: 4.8,
    reviews: 256,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop",
    badges: ["Pre-order"],
    stock: 50
  },
  {
    id: "p3",
    name: "iPad Pro 12.9\" M2",
    brand: "Apple",
    category: "Tablets",
    price: 1099,
    originalPrice: 1199,
    rating: 4.9,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop",
    badges: ["Sale"],
    stock: 22
  },
  {
    id: "p4",
    name: "Sony WH-1000XM5",
    brand: "Sony",
    category: "Audio",
    price: 398,
    originalPrice: null,
    rating: 4.7,
    reviews: 412,
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop",
    badges: [],
    stock: 110
  }
];

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
