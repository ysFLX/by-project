CREATE TABLE "orders" (
  "id" TEXT NOT NULL,
  "orderNo" TEXT NOT NULL,
  "tableNo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "note" TEXT,
  "subtotal" INTEGER NOT NULL,
  "serviceFee" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "estimatedMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "note" TEXT,

  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_counters" (
  "key" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL,

  CONSTRAINT "order_counters_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "orders_orderNo_key" ON "orders"("orderNo");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_tableNo_idx" ON "orders"("tableNo");
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
