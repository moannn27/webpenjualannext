export const ADMIN_STATS = {
  totalRevenue: 124500,
  revenueChange: "+12.5%",
  totalOrders: 1245,
  ordersChange: "+8.2%",
  activeProducts: 45,
  productsChange: "+2.1%",
  activeUsers: 842,
  usersChange: "+5.4%",
};

export const RECENT_ORDERS = [
  {
    id: "ORD-001",
    customer: "John Doe",
    email: "john@example.com",
    date: "2026-07-24",
    total: 2499,
    status: "Completed",
  },
  {
    id: "ORD-002",
    customer: "Jane Smith",
    email: "jane@example.com",
    date: "2026-07-24",
    total: 899,
    status: "Processing",
  },
  {
    id: "ORD-003",
    customer: "Michael Brown",
    email: "michael@example.com",
    date: "2026-07-23",
    total: 3450,
    status: "Shipped",
  },
  {
    id: "ORD-004",
    customer: "Sarah Johnson",
    email: "sarah@example.com",
    date: "2026-07-23",
    total: 129,
    status: "Completed",
  },
  {
    id: "ORD-005",
    customer: "Emily Davis",
    email: "emily@example.com",
    date: "2026-07-22",
    total: 599,
    status: "Cancelled",
  },
];

import { MASTER_PRODUCTS } from "./products";

export const ADMIN_PRODUCTS = MASTER_PRODUCTS.map((p) => ({
  id: p.id,
  name: p.name,
  sku: p.sku ?? `SKU-${p.id}`,
  price: p.price,
  stock: p.stock,
  status: p.status ?? "Active",
  category: p.category,
  image: p.image,
}));
