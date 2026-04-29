"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductCategory } from "@/lib/types";
import { categories } from "@/lib/mock-data";

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
    <main className="customer-shell">
      <section className="customer-top">
        <div>
          <span className="eyebrow">Masa {tableNo}</span>
          <h1>Kahve Durağı</h1>
          <p>Ürünlerini seç, siparişin kasaya otomatik düşsün.</p>
        </div>
        <div className="cart-summary">
          <span>{itemCount} ürün</span>
          <strong>{currency.format(total)}</strong>
        </div>
      </section>

      <section className="customer-grid">
        <aside className="menu-panel">
          <label className="search-box">
            <span>Ara</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kahve, tatlı, yemek..." />
          </label>
          <div className="category-tabs" role="tablist" aria-label="Kategori seçimi">
            {categories.map((item) => (
              <button
                className={item === category ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
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
                <span className="add-dot">+</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="detail-panel">
          {selectedProduct ? (
            <>
              <div className="detail-photo" style={{ backgroundImage: `url(${selectedProduct.imageUrl})` }} />
              <div className="detail-content">
                <div>
                  <h2>{selectedProduct.name}</h2>
                  <p>{selectedProduct.description}</p>
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
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="note-field">
                  Not
                  <input
                    value={productNote}
                    onChange={(event) => setProductNote(event.target.value)}
                    placeholder="Örn: Daha sıcak olsun, şekersiz olsun..."
                  />
                </label>
                <button className="button primary wide" onClick={addSelectedProduct} type="button">
                  Sepete ekle
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">Ürün seç.</div>
          )}
        </section>

        <aside className="cart-panel">
          <div className="panel-heading">
            <h2>Sepetim</h2>
            <span>Masa {tableNo}</span>
          </div>
          <div className="cart-lines">
            {cart.length === 0 ? (
              <div className="empty-state">Sepetin boş.</div>
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
                    <button onClick={() => updateQuantity(line.cartId, -1)} type="button">
                      -
                    </button>
                    <span>{line.quantity}</span>
                    <button onClick={() => updateQuantity(line.cartId, 1)} type="button">
                      +
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          <label className="note-field">
            Sipariş notu
            <input value={orderNote} onChange={(event) => setOrderNote(event.target.value)} placeholder="Örn: Peçete, çatal..." />
          </label>
          <div className="total-box">
            <span>Toplam</span>
            <strong>{currency.format(total)}</strong>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button primary wide" disabled={isSubmitting} onClick={submitOrder} type="button">
            {isSubmitting ? "Gönderiliyor..." : "Siparişi onayla"}
          </button>
        </aside>
      </section>
    </main>
  );
}
