import type { Product, ProductCategory, TableInfo } from "@/lib/types";

export const categories: ProductCategory[] = ["Kahveler", "Tatlılar", "Yemekler", "İçecekler"];

export const menu: Product[] = [
  {
    id: "cappuccino",
    name: "Cappuccino",
    description: "Sütlü, köpüklü demleme kahve",
    category: "Kahveler",
    price: 75,
    imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=500&q=80",
    options: ["Sade", "Şekersiz", "Az şekerli", "Sütlü", "Badem sütü", "Yulaf sütü"],
    active: true
  },
  {
    id: "latte",
    name: "Latte",
    description: "Süt ve espresso dengesi",
    category: "Kahveler",
    price: 75,
    imageUrl: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=500&q=80",
    options: ["Sade", "Şekersiz", "Vanilya", "Karamel", "Buzlu"],
    active: true
  },
  {
    id: "americano",
    name: "Americano",
    description: "Espresso ve sıcak su",
    category: "Kahveler",
    price: 65,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80",
    options: ["Sade", "Şekersiz", "Buzlu"],
    active: true
  },
  {
    id: "mocha",
    name: "Mocha",
    description: "Çikolata ve espresso buluşması",
    category: "Kahveler",
    price: 80,
    imageUrl: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=500&q=80",
    options: ["Sade", "Şekersiz", "Ekstra çikolata", "Buzlu"],
    active: true
  },
  {
    id: "cheesecake",
    name: "Cheesecake",
    description: "Frambuaz soslu",
    category: "Tatlılar",
    price: 120,
    imageUrl: "https://images.unsplash.com/photo-1524351199678-941a58a3df50?auto=format&fit=crop&w=500&q=80",
    options: ["Frambuaz", "Limon", "Çikolata"],
    active: true
  },
  {
    id: "tiramisu",
    name: "Tiramisu",
    description: "Kahveli mascarpone tatlısı",
    category: "Tatlılar",
    price: 115,
    imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=500&q=80",
    options: ["Klasik", "Ekstra kakao"],
    active: true
  },
  {
    id: "burger",
    name: "Hamburger",
    description: "Dana köfte, özel sos",
    category: "Yemekler",
    price: 180,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
    options: ["Orta pişmiş", "İyi pişmiş", "Soğansız", "Mayonezsiz"],
    active: true
  },
  {
    id: "fries",
    name: "Patates Kızartması",
    description: "Baharatlı çıtır patates",
    category: "Yemekler",
    price: 85,
    imageUrl: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=500&q=80",
    options: ["Ketçap", "Mayonez", "Acı sos"],
    active: true
  },
  {
    id: "sprite",
    name: "Sprite",
    description: "33 cl",
    category: "İçecekler",
    price: 40,
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80",
    options: ["Bardaklı", "Buzlu", "Buzsuz"],
    active: true
  },
  {
    id: "water",
    name: "Su",
    description: "50 cl",
    category: "İçecekler",
    price: 20,
    imageUrl: "https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=500&q=80",
    options: ["Soğuk", "Oda sıcaklığı"],
    active: true
  }
];

export const tables: TableInfo[] = [
  { id: "1", label: "Masa 1", seats: "2-4 Kişi", active: true },
  { id: "2", label: "Masa 2", seats: "2-4 Kişi", active: true },
  { id: "3", label: "Masa 3", seats: "2-4 Kişi", active: true },
  { id: "4", label: "Masa 4", seats: "4-6 Kişi", active: true },
  { id: "5", label: "Masa 5", seats: "4-6 Kişi", active: true },
  { id: "7", label: "Masa 7", seats: "2-4 Kişi", active: true }
];
