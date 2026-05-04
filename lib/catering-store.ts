import type {
  ClientCompany,
  CreateClientCompanyInput,
  MealRequest,
  MealRequestStatus,
  SubmitMealRequestInput
} from "@/lib/catering-types";

type CateringGlobal = typeof globalThis & {
  __byProjectClientCompanies?: ClientCompany[];
  __byProjectMealRequests?: MealRequest[];
  __byProjectNextMealRequest?: number;
};

const store = globalThis as CateringGlobal;

if (!store.__byProjectClientCompanies) {
  store.__byProjectClientCompanies = [];
}

if (!store.__byProjectMealRequests) {
  store.__byProjectMealRequests = [];
}

if (!store.__byProjectNextMealRequest) {
  store.__byProjectNextMealRequest = 1;
}

function getCompanies() {
  return store.__byProjectClientCompanies ?? [];
}

function getRequests() {
  return store.__byProjectMealRequests ?? [];
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildCompanyCode(name: string) {
  const base = normalizeCompanyCode(name) || "sirket";
  let code = base;
  let suffix = 2;

  while (getCompanyByCode(code)) {
    code = `${base}-${suffix}`;
    suffix += 1;
  }

  return code;
}

export function listClientCompanies() {
  return [...getCompanies()].sort((first, second) => first.name.localeCompare(second.name, "tr-TR"));
}

export function getCompanyByCode(code: string) {
  const normalizedCode = normalizeCompanyCode(code);
  return getCompanies().find((company) => company.code === normalizedCode) ?? null;
}

export function createClientCompany(input: CreateClientCompanyInput) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Şirket adı gerekli.");
  }

  const requestedCode = input.code?.trim() ? normalizeCompanyCode(input.code) : buildCompanyCode(name);

  if (!requestedCode) {
    throw new Error("Geçerli bir üyelik kodu gerekli.");
  }

  if (getCompanyByCode(requestedCode)) {
    throw new Error("Bu üyelik kodu zaten kullanılıyor.");
  }

  const now = new Date().toISOString();
  const company: ClientCompany = {
    id: makeId("company"),
    code: requestedCode,
    name,
    contactName: input.contactName?.trim() || undefined,
    active: true,
    createdAt: now,
    updatedAt: now
  };

  getCompanies().push(company);
  return company;
}

export function listMealRequests(filters?: { companyCode?: string; serviceDate?: string }) {
  let requests = [...getRequests()];

  if (filters?.companyCode) {
    const companyCode = normalizeCompanyCode(filters.companyCode);
    requests = requests.filter((request) => request.companyCode === companyCode);
  }

  if (filters?.serviceDate) {
    requests = requests.filter((request) => request.serviceDate === filters.serviceDate);
  }

  return requests.sort((first, second) => {
    return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
  });
}

export function getMealRequest(requestNo: string) {
  return getRequests().find((request) => request.requestNo.toLowerCase() === requestNo.toLowerCase()) ?? null;
}

export function submitMealRequest(input: SubmitMealRequestInput) {
  const company = getCompanyByCode(input.companyCode);

  if (!company || !company.active) {
    throw new Error("Aktif şirket üyeliği bulunamadı.");
  }

  const headcount = Number.isFinite(input.headcount) ? Math.max(1, Math.floor(input.headcount)) : 0;

  if (headcount < 1) {
    throw new Error("Kişi sayısı en az 1 olmalı.");
  }

  const serviceDate = input.serviceDate?.trim() || todayKey();
  const existingRequest = getRequests().find((request) => request.companyId === company.id && request.serviceDate === serviceDate);
  const now = new Date().toISOString();

  if (existingRequest) {
    if (existingRequest.status !== "submitted") {
      throw new Error("Yemek yenildi onaylandıktan sonra kişi sayısı değiştirilemez.");
    }

    existingRequest.headcount = headcount;
    existingRequest.note = input.note?.trim() || undefined;
    existingRequest.updatedAt = now;
    return existingRequest;
  }

  const nextRequest = store.__byProjectNextMealRequest ?? 1;
  store.__byProjectNextMealRequest = nextRequest + 1;

  const request: MealRequest = {
    requestNo: `Y${nextRequest.toString().padStart(4, "0")}`,
    companyId: company.id,
    companyCode: company.code,
    companyName: company.name,
    serviceDate,
    headcount,
    status: "submitted",
    note: input.note?.trim() || undefined,
    submittedAt: now,
    updatedAt: now
  };

  getRequests().unshift(request);
  return request;
}

export function updateMealRequestStatus(requestNo: string, status: Extract<MealRequestStatus, "eaten" | "collected">) {
  const request = getMealRequest(requestNo);

  if (!request) {
    return null;
  }

  const now = new Date().toISOString();

  if (status === "eaten") {
    request.status = "eaten";
    request.eatenAt = request.eatenAt ?? now;
  }

  if (status === "collected") {
    request.status = "collected";
    request.eatenAt = request.eatenAt ?? now;
    request.collectedAt = now;
  }

  request.updatedAt = now;
  return request;
}
