export type ProductCategory = "Kahveler" | "Tatlılar" | "Yemekler" | "İçecekler";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  imageUrl: string;
  options?: string[];
  active: boolean;
};

export type TableInfo = {
  id: string;
  label: string;
  seats: string;
  active: boolean;
};

export type OrderStatus = "new" | "preparing" | "ready" | "delivered";

export type OrderItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  options: string[];
  note?: string;
};

export type Order = {
  orderNo: string;
  tableNo: string;
  items: OrderItem[];
  status: OrderStatus;
  note?: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderInput = {
  tableNo: string;
  items: Array<{
    productId: string;
    quantity: number;
    options?: string[];
    note?: string;
  }>;
  note?: string;
};
