CREATE TABLE "client_companies" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "client_companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meal_requests" (
  "id" TEXT NOT NULL,
  "requestNo" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "headcount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "note" TEXT,
  "eatenAt" TIMESTAMP(3),
  "collectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "meal_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meal_request_counters" (
  "key" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL,

  CONSTRAINT "meal_request_counters_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "client_companies_code_key" ON "client_companies"("code");
CREATE INDEX "client_companies_active_idx" ON "client_companies"("active");
CREATE UNIQUE INDEX "meal_requests_requestNo_key" ON "meal_requests"("requestNo");
CREATE UNIQUE INDEX "meal_requests_companyId_serviceDate_key" ON "meal_requests"("companyId", "serviceDate");
CREATE INDEX "meal_requests_serviceDate_idx" ON "meal_requests"("serviceDate");
CREATE INDEX "meal_requests_status_idx" ON "meal_requests"("status");

ALTER TABLE "meal_requests"
  ADD CONSTRAINT "meal_requests_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "client_companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
