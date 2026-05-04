export type DemoCompany = {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  active: boolean;
  createdAt: string;
};

export type DemoMealRequest = {
  requestNo: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  serviceDate: string;
  headcount: number;
  note?: string;
  updatedAt: string;
  status: "submitted" | "eaten" | "collected";
};

export type DemoMenuDay = {
  date: string;
  items: string[];
  calories: number;
};

type DemoState = {
  companies: DemoCompany[];
  requests: DemoMealRequest[];
  nextRequest: number;
};

export type DemoUser = {
  username: string;
  password: string;
  role: "admin" | "customer";
  companyCode?: string;
  displayName: string;
};

const storageKey = "by-catering-frontend-demo";

const seedCompanies: DemoCompany[] = [
  {
    id: "company_aytek",
    code: "aytek",
    name: "Aytek Yazılım",
    contactName: "Elif Demir",
    active: true,
    createdAt: "2026-05-01T08:00:00.000Z"
  },
  {
    id: "company_kuzey",
    code: "kuzey-lojistik",
    name: "Kuzey Lojistik",
    contactName: "Mert Arslan",
    active: true,
    createdAt: "2026-05-02T08:00:00.000Z"
  },
  {
    id: "company_orion",
    code: "orion-tekstil",
    name: "Orion Tekstil",
    contactName: "Derya Koç",
    active: true,
    createdAt: "2026-05-03T08:00:00.000Z"
  }
];

const seedRequests: DemoMealRequest[] = [
  {
    requestNo: "Y0001",
    companyId: "company_aytek",
    companyCode: "aytek",
    companyName: "Aytek Yazılım",
    serviceDate: "2026-05-04",
    headcount: 42,
    note: "3 vejetaryen porsiyon",
    status: "submitted",
    updatedAt: "2026-05-04T08:32:00.000Z"
  },
  {
    requestNo: "Y0002",
    companyId: "company_kuzey",
    companyCode: "kuzey-lojistik",
    companyName: "Kuzey Lojistik",
    serviceDate: "2026-05-04",
    headcount: 68,
    status: "submitted",
    updatedAt: "2026-05-04T08:41:00.000Z"
  }
];

const demoUsers: DemoUser[] = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    displayName: "Maharet Catering"
  },
  {
    username: "aytek",
    password: "123456",
    role: "customer",
    companyCode: "aytek",
    displayName: "Aytek Yazılım"
  },
  {
    username: "kuzey",
    password: "123456",
    role: "customer",
    companyCode: "kuzey-lojistik",
    displayName: "Kuzey Lojistik"
  },
  {
    username: "orion",
    password: "123456",
    role: "customer",
    companyCode: "orion-tekstil",
    displayName: "Orion Tekstil"
  }
];

const soups = ["Mercimek çorbası", "Ezogelin çorbası", "Yayla çorbası", "Domates çorbası", "Sebze çorbası"];
const mains = ["Izgara köfte", "Tavuk sote", "Etli kuru fasulye", "Fırın tavuk", "Sebzeli dana kavurma", "Nohut yemeği"];
const sides = ["Pirinç pilavı", "Bulgur pilavı", "Fırın makarna", "Patates püresi", "Zeytinyağlı fasulye"];
const salads = ["Mevsim salata", "Çoban salata", "Yoğurtlu semizotu", "Gavurdağı salata"];
const desserts = ["Sütlaç", "Kemalpaşa", "Meyve tabağı", "Kazandibi", "Revani"];

const maharetApril2026Menu: DemoMenuDay[] = [
  { date: "2026-04-01", items: ["Etli Nohut Yemeği", "Pirinç Pilavı", "Mevsim Salata", "Sütlaç"], calories: 910 },
  { date: "2026-04-02", items: ["Tavuk Fajita", "Sebzeli Bulgur Pilavı", "Mercimek Çorba", "Ayran"], calories: 860 },
  { date: "2026-04-03", items: ["Patlıcanlı Şehzade Kebabı", "Üzümlü Pirinç Pilavı", "Yoğurt Çorba", "Red Velvet"], calories: 980 },
  { date: "2026-04-04", items: ["Kasap Köfte + Patates Kızartması Menü"], calories: 890 },
  { date: "2026-04-06", items: ["Kavurma Pilav", "Yoğurt Çorba", "Peynir Tatlısı", "Meyve Suyu"], calories: 930 },
  { date: "2026-04-07", items: ["Etli Kuru Fasulye", "Pirinç Pilavı", "Karışık Turşu", "Trileçe"], calories: 900 },
  { date: "2026-04-08", items: ["Sebzeli Misket Köfte", "Domatesli Arpa Şehriye Pilavı", "Lebeni Çorba", "Meyveli Gazoz"], calories: 880 },
  { date: "2026-04-09", items: ["Tavuk But", "Sebzeli Bulgur Pilavı", "Ezogelin Çorba", "Ayran"], calories: 850 },
  { date: "2026-04-10", items: ["Kıymalı Fırın Patates", "Peynirli Makarna", "Tarhana Çorba", "Kase Yoğurt"], calories: 870 },
  { date: "2026-04-11", items: ["Izgara Adana Menü"], calories: 920 },
  { date: "2026-04-13", items: ["Pilav Üstü Tavuk Tantuni", "Sebzeli Şehriye Çorba", "Ayran", "Lokma Tatlısı"], calories: 940 },
  { date: "2026-04-14", items: ["Şahan Köfte", "Kremalı Makarna", "Mercimek Çorba", "İçecek"], calories: 890 },
  { date: "2026-04-15", items: ["Etli Nohut Yemeği", "Pirinç Pilavı", "Mısırlı Kırmızı Lahana Salatası", "Profiterol"], calories: 910 },
  { date: "2026-04-16", items: ["Tas Kebabı", "Peynirli Rulo Börek", "Yoğurt Çorba", "Limonata"], calories: 960 },
  { date: "2026-04-17", items: ["Karnıyarık", "Nohutlu Üzümlü Pirinç Pilavı", "Ezogelin Çorba", "Cacık"], calories: 900 },
  { date: "2026-04-18", items: ["Kilis Tava Menü"], calories: 930 },
  { date: "2026-04-20", items: ["Tavuk Pizza + Sebzeli Bulgur Pilavı", "Mercimek Çorba", "Ayran", "Halka Tatlısı"], calories: 950 },
  { date: "2026-04-21", items: ["Etli Kuru Fasulye", "Pirinç Pilavı", "Karışık Turşu", "Terbiyeli Tavuk Çorba"], calories: 890 },
  { date: "2026-04-22", items: ["Parmak Köfte + Patates Kızartması", "Sebzeli Erişte", "Kremalı Domates Çorba", "İçecek"], calories: 920 },
  { date: "2026-04-23", items: ["Özbek Pilavı", "Ezogelin Çorba", "Çoban Salata", "Kıbrıs Tatlısı"], calories: 870 },
  { date: "2026-04-24", items: ["Etli Kabak Yemeği", "Tepsi Böreği", "Yoğurt Çorba", "Limonata"], calories: 860 },
  { date: "2026-04-25", items: ["Tavuk Kanat Menü"], calories: 900 },
  { date: "2026-04-27", items: ["Etli Bezelye Yemeği", "Pirinç Pilavı", "Ezogelin Çorba", "Browni"], calories: 880 },
  { date: "2026-04-28", items: ["Kadınbudu Köfte", "Sebzeli Bulgur Pilavı", "Kremalı Mantar Çorba", "İçecek"], calories: 900 },
  { date: "2026-04-29", items: ["Etli Nohut", "Pirinç Pilavı", "Cacık", "Sakızlı Muhallebi"], calories: 870 },
  { date: "2026-04-30", items: ["Pilav Üstü Tavuk Döner", "Köylü Çorba", "Ayran", "Kalburabastı Tatlısı"], calories: 940 }
];

const maharetMay2026Menu: DemoMenuDay[] = [
  { date: "2026-05-01", items: ["Mevsim Türlü", "Soslu Makarna", "Mercimek Çorba", "Kase Yoğurt"], calories: 840 },
  { date: "2026-05-02", items: ["Izgara Tavuk Pirzola Menü"], calories: 900 }
];

function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeCode(value: string) {
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

function getDefaultState(): DemoState {
  return {
    companies: seedCompanies,
    requests: seedRequests,
    nextRequest: 3
  };
}

export function getDemoState(): DemoState {
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    const defaultState = getDefaultState();
    window.localStorage.setItem(storageKey, JSON.stringify(defaultState));
    return defaultState;
  }

  try {
    return JSON.parse(stored) as DemoState;
  } catch {
    const defaultState = getDefaultState();
    window.localStorage.setItem(storageKey, JSON.stringify(defaultState));
    return defaultState;
  }
}

function saveDemoState(state: DemoState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function listDemoCompanies() {
  return [...getDemoState().companies].sort((first, second) => first.name.localeCompare(second.name, "tr-TR"));
}

export function getDemoCompanyByCode(code: string) {
  const normalizedCode = normalizeCode(code);
  return getDemoState().companies.find((company) => company.code === normalizedCode && company.active) ?? null;
}

export function authenticateDemoUser(input: { username: string; password: string }) {
  const username = input.username.trim().toLocaleLowerCase("tr-TR");
  const password = input.password.trim();
  const user = demoUsers.find((item) => item.username === username && item.password === password) ?? null;

  if (!user) {
    return null;
  }

  if (user.role === "customer" && (!user.companyCode || !getDemoCompanyByCode(user.companyCode))) {
    return null;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem("by-catering-demo-session", JSON.stringify({ username: user.username, role: user.role, companyCode: user.companyCode }));
  }

  return user;
}

export function createDemoCompany(input: { name: string; code?: string; contactName?: string }) {
  const state = getDemoState();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Şirket adı gerekli.");
  }

  const baseCode = normalizeCode(input.code || name);

  if (!baseCode) {
    throw new Error("Geçerli bir üyelik kodu gerekli.");
  }

  if (state.companies.some((company) => company.code === baseCode)) {
    throw new Error("Bu üyelik kodu zaten kullanılıyor.");
  }

  const company: DemoCompany = {
    id: makeId("company"),
    code: baseCode,
    name,
    contactName: input.contactName?.trim() || undefined,
    active: true,
    createdAt: new Date().toISOString()
  };

  state.companies.unshift(company);
  saveDemoState(state);
  return company;
}

export function listDemoRequests(filters?: { serviceDate?: string; companyCode?: string }) {
  let requests = [...getDemoState().requests];

  if (filters?.serviceDate) {
    requests = requests.filter((request) => request.serviceDate === filters.serviceDate);
  }

  if (filters?.companyCode) {
    const companyCode = normalizeCode(filters.companyCode);
    requests = requests.filter((request) => request.companyCode === companyCode);
  }

  return requests.sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());
}

export function upsertDemoMealRequest(input: { companyCode: string; serviceDate: string; headcount: number; note?: string }) {
  const state = getDemoState();
  const company = state.companies.find((item) => item.code === normalizeCode(input.companyCode) && item.active);

  if (!company) {
    throw new Error("Bu üyelik koduyla kayıtlı şirket bulunamadı.");
  }

  const headcount = Number.isFinite(input.headcount) ? Math.max(1, Math.floor(input.headcount)) : 0;

  if (headcount < 1) {
    throw new Error("Kişi sayısı en az 1 olmalı.");
  }

  const existingRequest = state.requests.find((request) => request.companyId === company.id && request.serviceDate === input.serviceDate);
  const now = new Date().toISOString();

  if (existingRequest) {
    existingRequest.headcount = headcount;
    existingRequest.note = input.note?.trim() || undefined;
    existingRequest.status = "submitted";
    existingRequest.updatedAt = now;
    saveDemoState(state);
    return existingRequest;
  }

  const request: DemoMealRequest = {
    requestNo: `Y${state.nextRequest.toString().padStart(4, "0")}`,
    companyId: company.id,
    companyCode: company.code,
    companyName: company.name,
    serviceDate: input.serviceDate,
    headcount,
    note: input.note?.trim() || undefined,
    status: "submitted",
    updatedAt: now
  };

  state.requests.unshift(request);
  state.nextRequest += 1;
  saveDemoState(state);
  return request;
}

export function updateDemoRequestStatus(requestNo: string, status: DemoMealRequest["status"]) {
  const state = getDemoState();
  const request = state.requests.find((item) => item.requestNo === requestNo);

  if (!request) {
    return null;
  }

  request.status = status;
  request.updatedAt = new Date().toISOString();
  saveDemoState(state);
  return request;
}

export function getMonthlyDemoMenu(referenceDate: string) {
  const date = new Date(`${referenceDate}T12:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const fixedMenu = year === 2026 && month === 3 ? maharetApril2026Menu : year === 2026 && month === 4 ? maharetMay2026Menu : [];

  if (fixedMenu.length > 0) {
    return fixedMenu;
  }

  return Array.from({ length: daysInMonth }, (_, index) => index + 1)
    .filter((day) => new Date(year, month, day).getDay() !== 0)
    .map((day): DemoMenuDay => {
    const dateKey = makeDateKey(year, month, day);
    const key = day + month;

    return {
      date: dateKey,
      items: [soups[key % soups.length], mains[(key * 2) % mains.length], sides[(key * 3) % sides.length], salads[(key * 4) % salads.length], desserts[(key * 5) % desserts.length]],
      calories: 780 + ((key * 37) % 240)
    };
  });
}
