export type DemoCompany = {
  id: string;
  code: string;
  username?: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
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

export type DemoUser = {
  username: string;
  password: string;
  role: "admin" | "customer";
  companyCode?: string;
  displayName: string;
};

type DemoState = {
  companies: DemoCompany[];
  requests: DemoMealRequest[];
  users: DemoUser[];
  nextRequest: number;
};

const storageKey = "maharet-yemek-frontend-demo";

const seedCompanies: DemoCompany[] = [
  {
    id: "company_aytek",
    code: "aytek",
    username: "aytek",
    name: "Aytek Yazilim",
    contactName: "Elif Demir",
    phone: "0332 245 19 29",
    email: "operasyon@aytek.test",
    address: "Karatay, Konya",
    taxNumber: "1234567890",
    notes: "Hafta ici ogle servisi.",
    active: true,
    createdAt: "2026-05-01T08:00:00.000Z"
  },
  {
    id: "company_kuzey",
    code: "kuzey-lojistik",
    username: "kuzey",
    name: "Kuzey Lojistik",
    contactName: "Mert Arslan",
    phone: "0332 444 10 42",
    email: "mert@kuzeylojistik.test",
    address: "Selcuklu, Konya",
    taxNumber: "2345678901",
    notes: "Servis saati 12:30.",
    active: true,
    createdAt: "2026-05-02T08:00:00.000Z"
  },
  {
    id: "company_orion",
    code: "orion-tekstil",
    username: "orion",
    name: "Orion Tekstil",
    contactName: "Derya Koc",
    phone: "0332 500 40 10",
    email: "derya@oriontekstil.test",
    address: "Meram, Konya",
    taxNumber: "3456789012",
    notes: "Vejetaryen porsiyon talebi olabilir.",
    active: true,
    createdAt: "2026-05-03T08:00:00.000Z"
  }
];

const seedRequests: DemoMealRequest[] = [
  {
    requestNo: "Y0001",
    companyId: "company_aytek",
    companyCode: "aytek",
    companyName: "Aytek Yazilim",
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
    status: "eaten",
    updatedAt: "2026-05-04T08:41:00.000Z"
  }
];

const seedUsers: DemoUser[] = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    displayName: "Maharet Yemek"
  },
  {
    username: "aytek",
    password: "123456",
    role: "customer",
    companyCode: "aytek",
    displayName: "Aytek Yazilim"
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

const soups = ["Mercimek corbasi", "Ezogelin corbasi", "Yayla corbasi", "Domates corbasi", "Sebze corbasi"];
const mains = ["Izgara kofte", "Tavuk sote", "Etli kuru fasulye", "Firin tavuk", "Sebzeli dana kavurma", "Nohut yemegi"];
const sides = ["Pirinc pilavi", "Bulgur pilavi", "Firin makarna", "Patates puresi", "Zeytinyagli fasulye"];
const salads = ["Mevsim salata", "Coban salata", "Yogurtlu semizotu", "Gavurdagi salata"];
const desserts = ["Sutlac", "Kemalpasa", "Meyve tabagi", "Kazandibi", "Revani"];

const april2026Menu: DemoMenuDay[] = [
  { date: "2026-04-01", items: ["Etli nohut yemegi", "Pirinc pilavi", "Mevsim salata", "Sutlac"], calories: 910 },
  { date: "2026-04-02", items: ["Tavuk fajita", "Sebzeli bulgur pilavi", "Mercimek corbasi", "Ayran"], calories: 860 },
  { date: "2026-04-03", items: ["Patlicanli kebap", "Pirinc pilavi", "Yogurt corbasi", "Tatli"], calories: 980 },
  { date: "2026-04-04", items: ["Kasap kofte menu"], calories: 890 },
  { date: "2026-04-06", items: ["Kavurma pilav", "Yogurt corbasi", "Peynir tatlisi", "Meyve suyu"], calories: 930 },
  { date: "2026-04-07", items: ["Etli kuru fasulye", "Pirinc pilavi", "Karisik tursu", "Trilece"], calories: 900 },
  { date: "2026-04-08", items: ["Sebzeli misket kofte", "Arpa sehriye pilavi", "Lebeni corbasi", "Gazoz"], calories: 880 },
  { date: "2026-04-09", items: ["Tavuk but", "Sebzeli bulgur pilavi", "Ezogelin corbasi", "Ayran"], calories: 850 },
  { date: "2026-04-10", items: ["Kiymali firin patates", "Peynirli makarna", "Tarhana corbasi", "Yogurt"], calories: 870 },
  { date: "2026-04-11", items: ["Izgara adana menu"], calories: 920 },
  { date: "2026-04-13", items: ["Tavuk tantuni", "Sebzeli sehriye corbasi", "Ayran", "Lokma"], calories: 940 },
  { date: "2026-04-14", items: ["Kofte", "Kremali makarna", "Mercimek corbasi", "Icecek"], calories: 890 },
  { date: "2026-04-15", items: ["Etli nohut yemegi", "Pirinc pilavi", "Lahana salatasi", "Profiterol"], calories: 910 },
  { date: "2026-04-16", items: ["Tas kebabi", "Peynirli borek", "Yogurt corbasi", "Limonata"], calories: 960 },
  { date: "2026-04-17", items: ["Karniyarik", "Pirinc pilavi", "Ezogelin corbasi", "Cacik"], calories: 900 },
  { date: "2026-04-18", items: ["Kilis tava menu"], calories: 930 },
  { date: "2026-04-20", items: ["Tavuk pizza", "Mercimek corbasi", "Ayran", "Halka tatlisi"], calories: 950 },
  { date: "2026-04-21", items: ["Etli kuru fasulye", "Pirinc pilavi", "Karisik tursu", "Tavuk corbasi"], calories: 890 },
  { date: "2026-04-22", items: ["Parmak kofte", "Sebzeli eriste", "Domates corbasi", "Icecek"], calories: 920 },
  { date: "2026-04-23", items: ["Ozbek pilavi", "Ezogelin corbasi", "Coban salata", "Tatli"], calories: 870 },
  { date: "2026-04-24", items: ["Etli kabak yemegi", "Tepsi boregi", "Yogurt corbasi", "Limonata"], calories: 860 },
  { date: "2026-04-25", items: ["Tavuk kanat menu"], calories: 900 },
  { date: "2026-04-27", items: ["Etli bezelye", "Pirinc pilavi", "Ezogelin corbasi", "Browni"], calories: 880 },
  { date: "2026-04-28", items: ["Kadinbudu kofte", "Sebzeli bulgur pilavi", "Mantar corbasi", "Icecek"], calories: 900 },
  { date: "2026-04-29", items: ["Etli nohut", "Pirinc pilavi", "Cacik", "Muhallebi"], calories: 870 },
  { date: "2026-04-30", items: ["Tavuk doner", "Koylu corbasi", "Ayran", "Tatli"], calories: 940 }
];

const may2026Menu: DemoMenuDay[] = [
  { date: "2026-05-01", items: ["Mevsim turlu", "Soslu makarna", "Mercimek corbasi", "Yogurt"], calories: 840 },
  { date: "2026-05-02", items: ["Izgara tavuk pirzola menu"], calories: 900 },
  { date: "2026-05-04", items: ["Izgara kofte", "Pirinc pilavi", "Coban salata", "Sutlac"], calories: 920 }
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
    users: seedUsers,
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
    const parsedState = JSON.parse(stored) as Partial<DemoState>;

    return {
      companies: parsedState.companies ?? seedCompanies,
      requests: parsedState.requests ?? seedRequests,
      users: parsedState.users ?? seedUsers,
      nextRequest: parsedState.nextRequest ?? 3
    };
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
  const user = getDemoState().users.find((item) => item.username === username && item.password === password) ?? null;

  if (!user) {
    return null;
  }

  if (user.role === "customer" && (!user.companyCode || !getDemoCompanyByCode(user.companyCode))) {
    return null;
  }

  window.localStorage.setItem("maharet-yemek-demo-session", JSON.stringify({ username: user.username, role: user.role, companyCode: user.companyCode }));
  return user;
}

export function createDemoCompany(input: {
  name: string;
  username: string;
  password: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
}) {
  const state = getDemoState();
  const name = input.name.trim();
  const username = normalizeCode(input.username);
  const password = input.password.trim();

  if (!name) {
    throw new Error("Sirket adi gerekli.");
  }

  if (!username) {
    throw new Error("Kullanici adi gerekli.");
  }

  if (password.length < 4) {
    throw new Error("Sifre en az 4 karakter olmali.");
  }

  if (state.users.some((user) => user.username === username) || state.companies.some((company) => company.code === username)) {
    throw new Error("Bu kullanici adi zaten kullaniliyor.");
  }

  const company: DemoCompany = {
    id: makeId("company"),
    code: username,
    username,
    name,
    contactName: input.contactName?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || undefined,
    taxNumber: input.taxNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    active: true,
    createdAt: new Date().toISOString()
  };

  state.companies.unshift(company);
  state.users.unshift({
    username,
    password,
    role: "customer",
    companyCode: company.code,
    displayName: company.name
  });
  saveDemoState(state);
  return company;
}

export function updateDemoCompany(
  companyId: string,
  input: {
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxNumber?: string;
    notes?: string;
  }
) {
  const state = getDemoState();
  const company = state.companies.find((item) => item.id === companyId);

  if (!company) {
    throw new Error("Sirket bulunamadi.");
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error("Sirket adi gerekli.");
  }

  company.name = name;
  company.contactName = input.contactName?.trim() || undefined;
  company.phone = input.phone?.trim() || undefined;
  company.email = input.email?.trim() || undefined;
  company.address = input.address?.trim() || undefined;
  company.taxNumber = input.taxNumber?.trim() || undefined;
  company.notes = input.notes?.trim() || undefined;

  state.requests.forEach((request) => {
    if (request.companyId === company.id) {
      request.companyName = company.name;
    }
  });

  state.users.forEach((user) => {
    if (user.companyCode === company.code) {
      user.displayName = company.name;
    }
  });

  saveDemoState(state);
  return company;
}

export function deleteDemoCompany(companyId: string) {
  const state = getDemoState();
  const company = state.companies.find((item) => item.id === companyId);

  if (!company) {
    throw new Error("Sirket bulunamadi.");
  }

  state.companies = state.companies.filter((item) => item.id !== companyId);
  state.requests = state.requests.filter((request) => request.companyId !== companyId);
  state.users = state.users.filter((user) => user.companyCode !== company.code);
  saveDemoState(state);
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
    throw new Error("Bu uyelik koduyla kayitli sirket bulunamadi.");
  }

  const headcount = Number.isFinite(input.headcount) ? Math.max(1, Math.floor(input.headcount)) : 0;

  if (headcount < 1) {
    throw new Error("Kisi sayisi en az 1 olmali.");
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
  const fixedMenu = year === 2026 && month === 3 ? april2026Menu : year === 2026 && month === 4 ? may2026Menu : [];

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
