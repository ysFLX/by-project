"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Utensils
} from "lucide-react";
import type { Product, ProductCategory } from "@/lib/types";
import { categories } from "@/lib/catalog-data";

type CartLine = {
  cartId: string;
  product: Product;
  quantity: number;
  options: string[];
  note: string;
};

type Props = {
  tableNo: string;
  menu: Product[];
};

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const categoryIcons: Record<ProductCategory, ComponentType<{ size?: number }>> = {
  Kahveler: Coffee,
  Tatlılar: Sparkles,
  Yemekler: Utensils,
  İçecekler: ShoppingBag
};

function lineKey(productId: string, options: string[], note: string) {
  return `${productId}-${options.join("|")}-${note}`.toLowerCase();
}

export function CustomerOrderApp({ tableNo, menu }: Props) {
  const router = useRouter();
  const activeProducts = useMemo(() => menu.filter((product) => product.active), [menu]);
  const [category, setCategory] = useState<ProductCategory>("Kahveler");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product>(activeProducts[0]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [productNote, setProductNote] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return activeProducts.filter((product) => {
      const matchesCategory = product.category === category;
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery) ||
          product.description.toLocaleLowerCase("tr-TR").includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeProducts, category, query]);

  const featuredProducts = useMemo(() => activeProducts.slice(0, 3), [activeProducts]);
  const total = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setSelectedOptions([]);
    setProductNote("");
  }

  function toggleOption(option: string) {
    setSelectedOptions((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    );
  }

  function addSelectedProduct() {
    if (!selectedProduct) {
      return;
    }

    const note = productNote.trim();
    const key = lineKey(selectedProduct.id, selectedOptions, note);

    setCart((current) => {
      const existing = current.find((line) => line.cartId === key);

      if (existing) {
        return current.map((line) =>
          line.cartId === key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }

      return [
        ...current,
        {
          cartId: key,
          product: selectedProduct,
          quantity: 1,
          options: selectedOptions,
          note
        }
      ];
    });
  }

  function updateQuantity(cartId: string, direction: 1 | -1) {
    setCart((current) =>
      current
        .map((line) => (line.cartId === cartId ? { ...line, quantity: line.quantity + direction } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  async function submitOrder() {
    if (cart.length === 0) {
      setError("Sepete en az bir ürün eklemelisin.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableNo,
        note: orderNote,
        items: cart.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
          options: line.options,
          note: line.note
        }))
      })
    });

    const payload = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? "Sipariş gönderilemedi.");
      return;
    }

    router.push(`/takip/${payload.order.orderNo}`);
  }

  return (
    <main className="customer-experience">
      <section className="customer-hero">
        <div className="customer-brand-card">
          <span className="eyebrow">
            <Coffee size={14} />
            BY Project
          </span>
          <h1>Masa {tableNo}</h1>
          <p>Menüden seç, siparişin kasaya ve mutfağa otomatik düşsün.</p>
          <div className="customer-status-row">
            <span>
              <Clock3 size={15} />
              Canlı takip
            </span>
            <span>
              <ReceiptText size={15} />
              Kasadan teslim
            </span>
          </div>
        </div>
        <div className="floating-cart">
          <ShoppingCart size={20} />
          <div>
            <span>{itemCount} ürün</span>
            <strong>{currency.format(total)}</strong>
          </div>
        </div>
      </section>

      <section className="customer-flow-strip" aria-label="Sipariş akışı">
        <article>
          <span>01</span>
          <strong>Ürün seç</strong>
          <small>Menüden kişiselleştir</small>
        </article>
        <article>
          <span>02</span>
          <strong>Not ekle</strong>
          <small>Ürün ve sipariş notu</small>
        </article>
        <article>
          <span>03</span>
          <strong>Takip et</strong>
          <small>Hazır olunca ekranda</small>
        </article>
      </section>

      <section className="order-workspace">
        <aside className="menu-panel elevated-panel">
          <div className="panel-heading">
            <div>
              <span className="mini-label">Menü</span>
              <h2>Ürünler</h2>
            </div>
            <span className="item-count">{filteredProducts.length}</span>
          </div>

          <label className="search-box search-with-icon">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün ara..."
            />
          </label>

          <div className="quick-shelf">
            <span className="mini-label">Öne çıkanlar</span>
            {featuredProducts.map((product) => (
              <button
                className={selectedProduct?.id === product.id ? "quick-item active" : "quick-item"}
                key={product.id}
                onClick={() => selectProduct(product)}
                type="button"
              >
                <span style={{ backgroundImage: `url(${product.imageUrl})` }} />
                <strong>{product.name}</strong>
                <small>{currency.format(product.price)}</small>
              </button>
            ))}
          </div>

          <div className="category-tabs" role="tablist" aria-label="Kategori seçimi">
            {categories.map((item) => {
              const Icon = categoryIcons[item];

              return (
                <button
                  className={item === category ? "active" : ""}
                  key={item}
                  onClick={() => setCategory(item)}
                  type="button"
                >
                  <Icon size={15} />
                  {item}
                </button>
              );
            })}
          </div>

          <div className="product-list">
            {filteredProducts.map((product) => (
              <button
                className={selectedProduct?.id === product.id ? "product-card active" : "product-card"}
                key={product.id}
                onClick={() => selectProduct(product)}
                type="button"
              >
                <span className="product-photo" style={{ backgroundImage: `url(${product.imageUrl})` }} />
                <span className="product-info">
                  <strong>{product.name}</strong>
                  <small>{product.description}</small>
                  <b>{currency.format(product.price)}</b>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </aside>

        <section className="detail-panel product-spotlight">
          {selectedProduct ? (
            <>
              <div className="detail-photo" style={{ backgroundImage: `url(${selectedProduct.imageUrl})` }}>
                <span>{selectedProduct.category}</span>
              </div>
              <div className="detail-content">
                <div className="product-title-row">
                  <div>
                    <span className="mini-label">Seçili ürün</span>
                    <h2>{selectedProduct.name}</h2>
                    <p>{selectedProduct.description}</p>
                  </div>
                  <strong>{currency.format(selectedProduct.price)}</strong>
                </div>

                <div className="option-group">
                  <span>Seçenekler</span>
                  <div>
                    {(selectedProduct.options ?? []).map((option) => (
                      <button
                        className={selectedOptions.includes(option) ? "option-chip active" : "option-chip"}
                        key={option}
                        onClick={() => toggleOption(option)}
                        type="button"
                      >
                        {selectedOptions.includes(option) ? <Check size={14} /> : null}
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="note-field">
                  Ürün notu
                  <input
                    value={productNote}
                    onChange={(event) => setProductNote(event.target.value)}
                    placeholder="Örn: Şekersiz, ekstra sıcak..."
                  />
                </label>

                <button className="button button-primary wide" onClick={addSelectedProduct} type="button">
                  <Plus size={18} />
                  Sepete ekle
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">Ürün seçimi bekleniyor.</div>
          )}
        </section>

        <aside className="cart-panel elevated-panel">
          <div className="panel-heading">
            <div>
              <span className="mini-label">Masa {tableNo}</span>
              <h2>Sepet</h2>
            </div>
            <ShoppingCart size={22} />
          </div>

          <div className="cart-lines">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <ShoppingBag size={26} />
                <strong>Sepet boş</strong>
                <span>Ürün seçerek siparişe başlayabilirsin.</span>
              </div>
            ) : (
              cart.map((line) => (
                <article className="cart-line" key={line.cartId}>
                  <span className="mini-photo" style={{ backgroundImage: `url(${line.product.imageUrl})` }} />
                  <div>
                    <strong>{line.product.name}</strong>
                    <small>{[...line.options, line.note].filter(Boolean).join(", ") || line.product.description}</small>
                    <b>{currency.format(line.product.price * line.quantity)}</b>
                  </div>
                  <div className="quantity">
                    <button aria-label="Azalt" onClick={() => updateQuantity(line.cartId, -1)} type="button">
                      <Minus size={14} />
                    </button>
                    <span>{line.quantity}</span>
                    <button aria-label="Artır" onClick={() => updateQuantity(line.cartId, 1)} type="button">
                      <Plus size={14} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <label className="note-field">
            Sipariş notu
            <input
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value)}
              placeholder="Örn: Peçete, çatal..."
            />
          </label>

          <div className="receipt-box">
            <div>
              <span>Ara toplam</span>
              <strong>{currency.format(total)}</strong>
            </div>
            <div>
              <span>Servis</span>
              <strong>{currency.format(0)}</strong>
            </div>
            <div className="receipt-total">
              <span>Toplam</span>
              <strong>{currency.format(total)}</strong>
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}
          <button className="button button-primary wide" disabled={isSubmitting} onClick={submitOrder} type="button">
            <Send size={18} />
            {isSubmitting ? "Gönderiliyor..." : "Siparişi onayla"}
          </button>
        </aside>
      </section>
    </main>
  );
}
