import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock3,
  Download,
  Edit3,
  Factory,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Plus,
  RefreshCcw,
  ReceiptText,
  Search,
  Save,
  Trash2,
  Truck,
  Upload,
  UserPlus,
  Users,
  Utensils,
  X
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeedbackModal } from "../components/FeedbackModal";
import { apiFetch } from "../services/api";
import { clearSession } from "../services/session";
import type { ClientCompany, MealRequest, MenuDay } from "../types/api";

type AdminView = "overview" | "companies" | "menu" | "monthlyTracking" | "reports";
type AccountType = "individual" | "corporate";
type MonthlyTrackingDay = {
  date: string;
  requests: MealRequest[];
  total: number;
};
type ReportCompanyTotal = {
  companyId: string;
  companyName: string;
  headcount: number;
  orderDays: number;
  unitPrice: number;
  vatEnabled: boolean;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
};

const VAT_RATE = 0.2;

const statusMeta = {
  submitted: {
    label: "Yeni bildirim",
    tone: "warning",
    icon: Clock3
  },
  eaten: {
    label: "Toplanabilir",
    tone: "ready",
    icon: BadgeCheck
  },
  collected: {
    label: "Toplandı",
    tone: "done",
    icon: PackageCheck
  }
};

const adminViews = [
  { id: "overview", label: "Günlük takip", icon: LayoutDashboard },
  { id: "companies", label: "Üye şirketler", icon: Building2 },
  { id: "menu", label: "Aylık menü", icon: ChefHat },
  { id: "monthlyTracking", label: "Aylik yemek takibi", icon: ClipboardList },
  { id: "reports", label: "Raporlar", icon: BarChart3 }
] satisfies { id: AdminView; label: string; icon: typeof LayoutDashboard }[];
const ADMIN_VIEW_STORAGE_KEY = "maharet-admin-view";
const adminViewIds = adminViews.map((view) => view.id) as AdminView[];

function getInitialAdminView(): AdminView {
  try {
    const savedView = window.localStorage.getItem(ADMIN_VIEW_STORAGE_KEY);

    return adminViewIds.includes(savedView as AdminView) ? (savedView as AdminView) : "overview";
  } catch {
    return "overview";
  }
}

const menuWeekDays = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  return todayKey().slice(0, 7);
}

function getMonthDays(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month) {
    return [];
  }

  const dayCount = new Date(year, month, 0).getDate();

  return Array.from({ length: dayCount }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`);
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    weekday: "long"
  }).format(new Date(`${value}T12:00:00`));
}

function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getCompanyInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

function createLoginSlug(value: string) {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2
  }).format(value);
}

function calculateMealAmount(headcount: number, unitPrice: number, vatEnabled: boolean) {
  const netTotal = headcount * unitPrice;
  const vatTotal = vatEnabled ? netTotal * VAT_RATE : 0;

  return {
    netTotal,
    vatTotal,
    grossTotal: netTotal + vatTotal
  };
}

type ExtractedMenuDay = {
  date: string;
  items: string[];
};

type SheetMenuDay = {
  date: string;
  items: string[];
};

function excelSerialToDate(value: number) {
  const utcDays = Math.floor(value - 25569);
  const utcValue = utcDays * 86400;

  return new Date(utcValue * 1000);
}

function parseDateFromLine(text: string, monthKey: string) {
  const [, monthValue] = monthKey.split("-").map(Number);
  const monthNames: Record<number, string[]> = {
    1: ["ocak"],
    2: ["subat", "şubat"],
    3: ["mart"],
    4: ["nisan"],
    5: ["mayis", "mayıs"],
    6: ["haziran"],
    7: ["temmuz"],
    8: ["agustos", "ağustos"],
    9: ["eylul", "eylül"],
    10: ["ekim"],
    11: ["kasim", "kasım"],
    12: ["aralik", "aralık"]
  };
  const normalized = text.toLocaleLowerCase("tr-TR");
  const numericMatch = normalized.match(/\b([0-3]?\d)[./-]([0-1]?\d)(?:[./-]\d{2,4})?\b/);

  if (numericMatch && Number(numericMatch[2]) === monthValue) {
    return Number(numericMatch[1]);
  }

  const names = monthNames[monthValue] ?? [];
  const namePattern = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

  if (!namePattern) {
    return null;
  }

  const namedMatch = normalized.match(new RegExp(`\\b([0-3]?\\d)\\s*(?:${namePattern})\\b`, "iu"));

  return namedMatch ? Number(namedMatch[1]) : null;
}

function parseDateFromCell(value: unknown, monthKey: string) {
  const [yearValue, monthValue] = monthKey.split("-").map(Number);

  if (value instanceof Date && value.getFullYear() === yearValue && value.getMonth() + 1 === monthValue) {
    return value.getDate();
  }

  if (typeof value === "number" && value > 20000) {
    const date = excelSerialToDate(value);

    if (date.getFullYear() === yearValue && date.getMonth() + 1 === monthValue) {
      return date.getDate();
    }
  }

  const text = String(value ?? "").trim();
  const numericMatch = text.match(/\b([0-3]?\d)[./-]([0-1]?\d)(?:[./-](\d{2,4}))?\b/);

  if (numericMatch && Number(numericMatch[2]) === monthValue) {
    return Number(numericMatch[1]);
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);

  if (isoMatch && Number(isoMatch[1]) === yearValue && Number(isoMatch[2]) === monthValue) {
    return Number(isoMatch[3]);
  }

  return parseDateFromLine(text, monthKey);
}

function splitMenuLine(text: string) {
  return text
    .replace(/\b[0-3]?\d[./-][0-1]?\d(?:[./-]\d{2,4})?\b/g, " ")
    .replace(/\b[0-3]?\d\s*(ocak|subat|şubat|mart|nisan|mayis|mayıs|haziran|temmuz|agustos|ağustos|eylul|eylül|ekim|kasim|kasım|aralik|aralık)\b/giu, " ")
    .replace(/\b(pazartesi|sali|salı|carsamba|çarşamba|persembe|perşembe|cuma|cumartesi|pazar)\b/giu, " ")
    .split(/•|·|\s+-\s+|,\s*/u)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 2 && !/^\d+$/.test(item) && !/^\d+\s*kcal$/i.test(item));
}

function splitSheetMenuCell(value: unknown, monthKey: string) {
  return String(value ?? "")
    .split(/\r?\n|•|·|,\s*/u)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => {
      const normalized = item.toLocaleLowerCase("tr-TR");

      return item.length > 2
        && !/^\d+$/.test(item)
        && !/^\d+\s*kcal$/i.test(item)
        && !/^(tarih|gun|gün|yemek|menu|menü|kahvalti|kahvaltı|ogle|öğle|aksam|akşam)$/i.test(normalized)
        && !parseDateFromLine(item, monthKey);
    });
}

async function extractSpreadsheetMenu(file: File, monthKey: string) {
  const loadXlsx = new Function("return import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm')") as () => Promise<any>;
  const XLSX = await loadXlsx();
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" }) as unknown[][];
  const dayItems = new Map<string, string[]>();

  rows.forEach((row) => {
    const dateColumn = row.findIndex((cell) => parseDateFromCell(cell, monthKey));

    if (dateColumn === -1) {
      return;
    }

    const day = parseDateFromCell(row[dateColumn], monthKey);

    if (!day) {
      return;
    }

    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    const items = row
      .flatMap((cell, index) => (index === dateColumn ? [] : splitSheetMenuCell(cell, monthKey)))
      .filter((item) => !parseDateFromCell(item, monthKey));

    if (items.length > 0) {
      dayItems.set(date, [...(dayItems.get(date) ?? []), ...items]);
    }
  });

  return [...dayItems.entries()]
    .map(([date, items]): SheetMenuDay => ({
      date,
      items: [...new Set(items)].slice(0, 8)
    }))
    .sort((first, second) => first.date.localeCompare(second.date));
}

async function extractPdfMenu(file: File, monthKey: string) {
  const loadPdfJs = new Function("return import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs')") as () => Promise<any>;
  const pdfjs = await loadPdfJs();
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  const lines: Array<{ page: number; text: string; x: number; y: number }> = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lineGroups: Array<{ y: number; items: Array<{ str: string; x: number }> }> = [];

    content.items.forEach((item: { str?: string; transform?: number[] }) => {
      const str = (item.str ?? "").trim();

      if (!str || !item.transform) {
        return;
      }

      const x = item.transform[4] ?? 0;
      const y = item.transform[5] ?? 0;
      const group = lineGroups.find((line) => Math.abs(line.y - y) < 3);

      if (group) {
        group.items.push({ str, x });
      } else {
        lineGroups.push({ y, items: [{ str, x }] });
      }
    });

    lineGroups
      .sort((first, second) => second.y - first.y)
      .forEach((line) => {
        const sortedItems = line.items.sort((first, second) => first.x - second.x);
        const text = sortedItems.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();

        if (text) {
          pages.push(text);
          lines.push({ page: pageNumber, text, x: sortedItems[0].x, y: line.y });
        }
      });
  }

  const markers = lines
    .map((line) => ({ ...line, day: parseDateFromLine(line.text, monthKey) }))
    .filter((line): line is { page: number; text: string; x: number; y: number; day: number } => line.day !== null && line.day >= 1 && line.day <= 31);
  const columnXs = [...new Set(markers.map((marker) => Math.round(marker.x / 20) * 20))].sort((first, second) => first - second);
  const columnWidth = columnXs.length > 1 ? Math.max(80, Math.min(...columnXs.slice(1).map((x, index) => x - columnXs[index])) * 0.9) : 160;
  const days = new Map<string, string[]>();

  markers.forEach((marker) => {
    const date = `${monthKey}-${String(marker.day).padStart(2, "0")}`;
    const sameLineItems = splitMenuLine(marker.text);

    if (sameLineItems.length > 0) {
      days.set(date, [...(days.get(date) ?? []), ...sameLineItems]);
    }
  });

  lines.forEach((line) => {
    if (parseDateFromLine(line.text, monthKey)) {
      return;
    }

    const candidates = markers
      .filter((marker) => marker.page === line.page && marker.y > line.y - 2 && Math.abs(marker.x - line.x) <= columnWidth)
      .sort((first, second) => (first.y - line.y) - (second.y - line.y));
    const marker = candidates[0];

    if (!marker) {
      return;
    }

    const normalized = line.text.toLocaleLowerCase("tr-TR");

    if (/yemek listesi|diyetisyen|hazirlayan|onaylayan|telefon|adres|maharet/.test(normalized)) {
      return;
    }

    const date = `${monthKey}-${String(marker.day).padStart(2, "0")}`;
    const items = splitMenuLine(line.text);

    if (items.length > 0) {
      days.set(date, [...(days.get(date) ?? []), ...items]);
    }
  });

  const parsedDays: ExtractedMenuDay[] = [...days.entries()]
    .map(([date, items]) => ({
      date,
      items: [...new Set(items)].slice(0, 8)
    }))
    .filter((day) => day.items.length > 0)
    .sort((first, second) => first.date.localeCompare(second.date));

  return {
    text: pages.join("\n"),
    days: parsedDays
  };
}

export function CateringDashboard() {
  const [adminView, setAdminView] = useState<AdminView>(getInitialAdminView);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [serviceDate, setServiceDate] = useState(todayKey());
  const [trackingDate, setTrackingDate] = useState(todayKey());
  const [reportMonth, setReportMonth] = useState(currentMonthKey());
  const [reportRequests, setReportRequests] = useState<MealRequest[]>([]);
  const [menuMonth, setMenuMonth] = useState(currentMonthKey());
  const [menuDays, setMenuDays] = useState<Record<string, string>>({});
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [trackingRequests, setTrackingRequests] = useState<MealRequest[]>([]);
  const [accountType, setAccountType] = useState<AccountType>("corporate");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [editName, setEditName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [companyToRemove, setCompanyToRemove] = useState<ClientCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [isMenuUploading, setIsMenuUploading] = useState(false);
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingPricingCompanyId, setSavingPricingCompanyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedCompanyIdRef = useRef("");
  const generatedUsername = createLoginSlug(companyName);
  const generatedPassword = generatedUsername ? `${generatedUsername}!` : "";
  const newCompanyPassword = createPassword || generatedPassword;

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? null;
  const activeCompanyCount = companies.filter((company) => company.active).length;
  const totalHeadcount = requests.reduce((sum, request) => sum + request.headcount, 0);
  const submittedCount = requests.filter((request) => request.status === "submitted").length;
  const reportedCompanyCount = new Set(requests.map((request) => request.companyId)).size;
  const missingCompanyCount = Math.max(0, activeCompanyCount - reportedCompanyCount);
  const trackingTotalHeadcount = trackingRequests.reduce((sum, request) => sum + request.headcount, 0);
  const trackingSubmittedCount = trackingRequests.filter((request) => request.status === "submitted").length;
  const trackingReportedCompanyCount = new Set(trackingRequests.map((request) => request.companyId)).size;
  const trackingMissingCompanyCount = Math.max(0, activeCompanyCount - trackingReportedCompanyCount);
  const trackingMonth = trackingDate.slice(0, 7);
  const setTrackingMonth = (value: string) => setTrackingDate(`${value}-01`);
  const monthlyTrackingDays: MonthlyTrackingDay[] = [];
  const monthlyTotalHeadcount = 0;
  const monthlyReportedDayCount = 0;
  const menuCalendarCells = useMemo(() => getMenuCalendarCells(menuMonth), [menuMonth]);
  const reportTotalHeadcount = reportRequests.reduce((sum, request) => sum + request.headcount, 0);
  const reportCompanyTotals = useMemo<ReportCompanyTotal[]>(() => {
    const totals = new Map<string, { companyId: string; companyName: string; headcount: number; dates: Set<string> }>();

    reportRequests.forEach((request) => {
      const current = totals.get(request.companyId) ?? {
        companyId: request.companyId,
        companyName: request.companyName,
        headcount: 0,
        dates: new Set<string>()
      };

      current.headcount += request.headcount;
      current.dates.add(request.serviceDate);
      totals.set(request.companyId, current);
    });

    return [...totals.values()]
      .map((total) => {
        const company = companies.find((item) => item.id === total.companyId);
        const amounts = calculateMealAmount(total.headcount, company?.mealUnitPrice ?? 170, company?.mealVatEnabled ?? false);

        return {
          companyId: total.companyId,
          companyName: total.companyName,
          headcount: total.headcount,
          orderDays: total.dates.size,
          unitPrice: company?.mealUnitPrice ?? 170,
          vatEnabled: company?.mealVatEnabled ?? false,
          ...amounts
        };
      })
      .sort((first, second) => second.grossTotal - first.grossTotal);
  }, [reportRequests, companies]);
  const reportAmounts = reportCompanyTotals.reduce((amounts, total) => ({
    netTotal: amounts.netTotal + total.netTotal,
    vatTotal: amounts.vatTotal + total.vatTotal,
    grossTotal: amounts.grossTotal + total.grossTotal
  }), { netTotal: 0, vatTotal: 0, grossTotal: 0 });
  const reportTotalsByCompany = useMemo(
    () => new Map(reportCompanyTotals.map((companyTotal) => [companyTotal.companyId, companyTotal])),
    [reportCompanyTotals]
  );
  const reportPricingCompanies = useMemo(
    () => [...companies]
      .filter((company) => company.active)
      .sort((first, second) => {
        const firstTotal = reportTotalsByCompany.get(first.id)?.grossTotal ?? 0;
        const secondTotal = reportTotalsByCompany.get(second.id)?.grossTotal ?? 0;

        if (firstTotal !== secondTotal) {
          return secondTotal - firstTotal;
        }

        return first.name.localeCompare(second.name, "tr-TR");
      }),
    [companies, reportTotalsByCompany]
  );
  const reportInvoiceCompanyCount = reportPricingCompanies.filter((company) => company.mealVatEnabled).length;

  const requestRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");

    return [...requests]
      .filter((request) => {
        if (!normalizedSearch) {
          return true;
        }

        return `${request.companyName} ${request.companyCode} ${request.requestNo}`.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
      })
      .sort((first, second) => {
        const statusOrder = { submitted: 0, eaten: 1, collected: 2 };
        const statusDifference = statusOrder[first.status] - statusOrder[second.status];

        if (statusDifference !== 0) {
          return statusDifference;
        }

        return first.companyName.localeCompare(second.companyName, "tr-TR");
      });
  }, [requests, searchTerm]);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = companySearchTerm.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedSearch) {
      return companies;
    }

    return companies.filter((company) =>
      `${company.name} ${company.code} ${company.username ?? ""} ${company.contactName ?? ""} ${company.phone ?? ""} ${company.email ?? ""}`
        .toLocaleLowerCase("tr-TR")
        .includes(normalizedSearch)
    );
  }, [companies, companySearchTerm]);

  function selectCompany(company: ClientCompany | null) {
    if (!company) {
      selectedCompanyIdRef.current = "";
      setSelectedCompanyId("");
      setEditName("");
      setEditContactName("");
      setEditPhone("");
      setEditEmail("");
      setEditAddress("");
      setEditTaxNumber("");
      setEditNotes("");
      setEditPassword("");
      return;
    }

    selectedCompanyIdRef.current = company.id;
    setSelectedCompanyId(company.id);
    setEditName(company.name);
    setEditContactName(company.contactName ?? "");
    setEditPhone(company.phone ?? "");
    setEditEmail(company.email ?? "");
    setEditAddress(company.address ?? "");
    setEditTaxNumber(company.taxNumber ?? "");
    setEditNotes(company.notes ?? "");
    setEditPassword("");
  }

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      const [companiesPayload, requestsPayload] = await Promise.all([
        apiFetch<{ companies: ClientCompany[] }>("/client-companies"),
        apiFetch<{ requests: MealRequest[] }>(`/meal-requests?serviceDate=${encodeURIComponent(serviceDate)}`)
      ]);

      const nextCompanies = companiesPayload.companies;
      setCompanies(nextCompanies);
      setRequests(requestsPayload.requests);
      setLastUpdatedAt(formatTime(new Date().toISOString()));

      const currentSelectedCompanyId = selectedCompanyIdRef.current;

      if (!currentSelectedCompanyId && nextCompanies[0]) {
        selectCompany(nextCompanies[0]);
      }

      if (currentSelectedCompanyId && !nextCompanies.some((company) => company.id === currentSelectedCompanyId)) {
        selectCompany(nextCompanies[0] ?? null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Panel verileri yuklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMonthlyTracking() {
    setIsMonthlyLoading(true);
    setError("");

    try {
      const payload = await apiFetch<{ requests: MealRequest[] }>(`/meal-requests?serviceDate=${encodeURIComponent(trackingDate)}`);
      setTrackingRequests(payload.requests);
    } catch (monthlyError) {
      setError(monthlyError instanceof Error ? monthlyError.message : "Gunluk yemek takibi yuklenemedi.");
    } finally {
      setIsMonthlyLoading(false);
    }
  }

  async function loadReports() {
    setIsReportLoading(true);
    setError("");

    try {
      const payloads = await Promise.all(
        getMonthDays(reportMonth).map((day) =>
          apiFetch<{ requests: MealRequest[] }>(`/meal-requests?serviceDate=${encodeURIComponent(day)}`)
        )
      );

      setReportRequests(payloads.flatMap((payload) => payload.requests));
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Rapor verileri yuklenemedi.");
    } finally {
      setIsReportLoading(false);
    }
  }

  async function loadMenus() {
    setIsMenuLoading(true);
    setError("");

    try {
      const daysPayload = await apiFetch<{ days: MenuDay[] }>(`/menu-days?month=${encodeURIComponent(menuMonth)}`);
      setMenuDays(
        Object.fromEntries(
          daysPayload.days.map((day) => [day.date, day.items.join("\n")])
        )
      );
    } catch (menuError) {
      setError(menuError instanceof Error ? menuError.message : "Menu listesi yuklenemedi.");
    } finally {
      setIsMenuLoading(false);
    }
  }

  async function saveMenuDays() {
    setMessage("");
    setError("");
    setIsMenuUploading(true);

    try {
      const payload = await apiFetch<{ days: MenuDay[] }>("/menu-days", {
        method: "POST",
        body: {
          month: menuMonth,
          days: getMonthDays(menuMonth).map((day) => ({
            date: day,
            items: (menuDays[day] ?? "")
              .split(/\r?\n|,/)
              .map((item) => item.trim())
              .filter(Boolean)
          }))
        }
      });

      setMenuDays(Object.fromEntries(payload.days.map((day) => [day.date, day.items.join("\n")])));
      setMessage("Aylik yemek tablosu musteri paneline kaydedildi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Aylik yemek tablosu kaydedilemedi.");
    } finally {
      setIsMenuUploading(false);
    }
  }

  async function uploadMenuPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!menuFile) {
      setError("Yuklenecek Excel veya CSV dosyasini sec.");
      return;
    }

    setIsMenuUploading(true);

    try {
      const days = await extractSpreadsheetMenu(menuFile, menuMonth);

      if (days.length === 0) {
        setError("Excel icinde bu aya ait tarihli yemek satiri bulunamadi.");
        return;
      }

      const payload = await apiFetch<{ days: MenuDay[] }>("/menu-days", {
        method: "POST",
        body: {
          month: menuMonth,
          days
        }
      });

      setMenuDays(Object.fromEntries(payload.days.map((day) => [day.date, day.items.join("\n")])));
      setMenuFile(null);
      setMessage("Excel menusu okundu ve musteri paneline tablo olarak aktarildi.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Excel menusu tabloya aktarilamadi.");
    } finally {
      setIsMenuUploading(false);
    }
  }

  async function downloadMenuTemplate() {
    setMessage("");
    setError("");
    setIsTemplateDownloading(true);

    try {
      const loadXlsx = new Function("return import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm')") as () => Promise<any>;
      const XLSX = await loadXlsx();
      const templateRows = [
        ["Tarih", "Yemek 1", "Yemek 2", "Yemek 3", "Yemek 4", "Yemek 5"],
        ...getMonthDays(menuMonth)
          .filter((day) => new Date(`${day}T12:00:00`).getDay() !== 0)
          .map((day) => [day, "", "", "", "", ""])
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(templateRows);
      const workbook = XLSX.utils.book_new();

      worksheet["!cols"] = [
        { wch: 14 },
        { wch: 28 },
        { wch: 28 },
        { wch: 28 },
        { wch: 28 },
        { wch: 28 }
      ];
      worksheet["!autofilter"] = { ref: worksheet["!ref"] };
      XLSX.utils.book_append_sheet(workbook, worksheet, "Yemek Listesi");
      XLSX.writeFile(workbook, `yemek-listesi-sablonu-${menuMonth}.xlsx`);
      setMessage("Excel sablonu indirildi. Yemekleri doldurup ayni ekrandan yukleyebilirsiniz.");
    } catch (templateError) {
      setError(templateError instanceof Error ? templateError.message : "Excel sablonu indirilemedi.");
    } finally {
      setIsTemplateDownloading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 5000);

    return () => window.clearInterval(interval);
  }, [serviceDate]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, adminView);
    } catch {
      // Keeping the panel usable is more important than persisting the tab.
    }
  }, [adminView]);

  useEffect(() => {
    if (adminView === "monthlyTracking") {
      loadMonthlyTracking();
    }
  }, [adminView, trackingDate]);

  useEffect(() => {
    if (adminView === "menu") {
      loadMenus();
    }
  }, [adminView, menuMonth]);

  useEffect(() => {
    if (adminView === "reports") {
      loadReports();
    }
  }, [adminView, reportMonth]);

  function resetCreateForm() {
    setAccountType("corporate");
    setCompanyName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setTaxNumber("");
    setNotes("");
    setCreatePassword("");
  }

  async function logout() {
    try {
      await apiFetch<{ message: string }>("/auth/logout", {
        method: "POST"
      });
    } catch {
      // The local session should still be cleared even if the network request fails.
    } finally {
      clearSession();
      window.location.href = "/giris";
    }
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const { company } = await apiFetch<{ company: ClientCompany }>("/client-companies", {
        method: "POST",
        body: {
          accountType,
          name: companyName,
          username: generatedUsername,
          password: newCompanyPassword,
          contactName,
          phone,
          email,
          address,
          taxNumber,
          notes
        }
      });

      setMessage(`${company.name} hesabı oluşturuldu. Kullanıcı adı: ${company.username ?? company.code}`);
      resetCreateForm();
      setIsCreateOpen(false);
      setAdminView("companies");
      selectCompany(company);
      loadDashboard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Şirket üyeliği oluşturulamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveCompanyDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCompany) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const { company: updatedCompany } = await apiFetch<{ company: ClientCompany }>(`/client-companies/${selectedCompany.id}`, {
        method: "PUT",
        body: {
          name: editName,
          contactName: editContactName,
          phone: editPhone,
          email: editEmail,
          address: editAddress,
          taxNumber: editTaxNumber,
          notes: editNotes,
          password: editPassword || undefined
        }
      });

      setMessage(`${updatedCompany.name} bilgileri güncellendi.`);
      setEditPassword("");
      loadDashboard();
      selectCompany(updatedCompany);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Şirket bilgileri güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveReportPricing(event: FormEvent<HTMLFormElement>, company: ClientCompany) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const mealUnitPrice = Number(formData.get("mealUnitPrice") ?? company.mealUnitPrice ?? 170);
    const mealVatEnabled = formData.get("mealVatEnabled") === "on";

    if (!Number.isFinite(mealUnitPrice) || mealUnitPrice < 0) {
      setError("Birim fiyat sifirdan kucuk olamaz.");
      return;
    }

    setIsSaving(true);
    setSavingPricingCompanyId(company.id);
    setMessage("");
    setError("");

    try {
      const { company: updatedCompany } = await apiFetch<{ company: ClientCompany }>(`/client-companies/${company.id}`, {
        method: "PUT",
        body: {
          name: company.name,
          contactName: company.contactName,
          phone: company.phone,
          email: company.email,
          address: company.address,
          taxNumber: company.taxNumber,
          notes: company.notes,
          mealUnitPrice,
          mealVatEnabled
        }
      });

      setCompanies((currentCompanies) =>
        currentCompanies.map((currentCompany) => currentCompany.id === updatedCompany.id ? updatedCompany : currentCompany)
      );
      setMessage(`${updatedCompany.name} fiyatlandirmasi guncellendi.`);
    } catch (pricingError) {
      setError(pricingError instanceof Error ? pricingError.message : "Firma fiyatlandirmasi guncellenemedi.");
    } finally {
      setIsSaving(false);
      setSavingPricingCompanyId("");
    }
  }

  async function removeCompany(company = companyToRemove) {
    if (!company) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      await apiFetch<{ message: string }>(`/client-companies/${company.id}`, {
        method: "DELETE"
      });
      setMessage(`${company.name} üyeliği silindi.`);
      setCompanyToRemove(null);
      selectCompany(null);
      loadDashboard();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Şirket silinemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function markCollected(requestNo: string) {
    setIsSaving(true);
    setError("");

    try {
      const { request: updatedRequest } = await apiFetch<{ request: MealRequest }>(`/meal-requests/${requestNo}`, {
        method: "PATCH",
        body: { status: "collected" }
      });

      setRequests((current) => current.map((request) => (request.requestNo === requestNo ? updatedRequest : request)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Talep durumu guncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  function openCreateModal() {
    setError("");
    setMessage("");
    setIsCreateOpen(true);
  }

  const pageTitle =
    adminView === "companies"
      ? "Üye şirket yönetimi"
      : adminView === "menu"
        ? "Aylık menü planı"
        : adminView === "monthlyTracking"
          ? "Gunluk siparis takibi"
          : adminView === "reports"
          ? "Fatura raporları"
          : "Catering yönetim paneli";

  const pageDescription =
    adminView === "companies"
      ? "Müşteri şirketleri, yetkili kişileri, adresleri ve iletişim bilgilerini tek yerden yönet."
      : adminView === "menu"
        ? "Müşterinin göreceği aylık yemek listesini kontrol et."
        : adminView === "monthlyTracking"
          ? "Secilen tarihte siparis veren firmalari ve gunun durumunu incele."
          : adminView === "reports"
          ? "Firma fiyatlarini, fatura secimini ve aylik tahsilat toplamlarini yonet."
          : "Üyelikleri oluştur, şirketlerin günlük yemek adetlerini takip et ve operasyonu tek ekrandan yönet.";

  return (
    <main className="catering-dashboard-shell admin-dashboard-shell">
      <aside className="admin-sidebar">
        <a
          className="catering-brand admin-brand"
          href="/catering"
          onClick={(event) => {
            event.preventDefault();
            setAdminView("overview");
          }}
        >
          <span>MY</span>
          <div>
            <strong>Maharet Yemek</strong>
          </div>
        </a>

        <nav className="admin-nav-list" aria-label="Catering panel menüsü">
          {adminViews.map((view) => {
            const Icon = view.icon;

            return (
              <button className={adminView === view.id ? "active" : ""} type="button" key={view.id} onClick={() => setAdminView(view.id)}>
                <Icon size={18} />
                {view.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom-actions">
          <div className="admin-sidebar-summary">
            <span>Bugünkü toplam</span>
            <strong>{totalHeadcount}</strong>
            <small>yemek / porsiyon</small>
          </div>
          <button className="sidebar-logout-button" type="button" onClick={logout}>
            <LogOut size={18} />
            Çıkış yap
          </button>
        </div>
      </aside>

      <section className="admin-main-panel">
        <header className="admin-topbar">
          <div>
            <span className="catering-kicker">
              <Truck size={16} />
              Catering operasyon paneli
            </span>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>

          <div className="admin-toolbar">
            <button className="create-user-button compact" type="button" onClick={openCreateModal}>
              <Plus size={18} />
              Yeni kullanıcı
            </button>
            <label className="dashboard-date-filter">
              <CalendarDays size={17} />
              <input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
            </label>
            <button className="admin-icon-button" type="button" onClick={loadDashboard} aria-label="Paneli yenile">
              {isLoading ? <Loader2 size={18} /> : <RefreshCcw size={18} />}
            </button>
          </div>
        </header>

        <section className="catering-metric-grid admin-metric-grid">
          <article className="highlight">
            <Utensils size={24} />
            <span>Günlük yemek adedi</span>
            <strong>{totalHeadcount}</strong>
            <small>{reportedCompanyCount} müşteri bildirdi</small>
          </article>
          <article>
            <Factory size={24} />
            <span>Üye şirket</span>
            <strong>{activeCompanyCount}</strong>
            <small>aktif müşteri hesabı</small>
          </article>
          <article>
            <BadgeCheck size={24} />
            <span>Bugün bildiren</span>
            <strong>{submittedCount}</strong>
            <small>şirketten adet geldi</small>
          </article>
          <article>
            <AlertTriangle size={24} />
            <span>Bildirmeyen</span>
            <strong>{missingCompanyCount}</strong>
            <small>aktif müşteri</small>
          </article>
        </section>

        {adminView === "overview" ? (
          <section className="catering-dashboard-grid admin-content-grid">
            <article className="catering-panel company-admin-card">
              <div className="company-admin-hero">
                <div>
                  <span className="catering-kicker">
                    <UserPlus size={16} />
                    Kullanıcı yönetimi
                  </span>
                  <h2>Şirket üyelikleri</h2>
                  <p>Yeni müşteri hesabı oluştur, kullanıcı bilgilerini ver ve aktif üyeleri takip et.</p>
                </div>
                <strong>{activeCompanyCount}</strong>
              </div>

              <button className="create-user-button" type="button" onClick={openCreateModal}>
                <span>
                  <Plus size={18} />
                </span>
                Yeni kullanıcı oluştur
              </button>

              <div className="company-mini-list">
                <span>Aktif üyeler</span>
                {companies.slice(0, 6).map((company) => (
                  <button type="button" key={company.id} onClick={() => {
                    selectCompany(company);
                    setAdminView("companies");
                  }}>
                    <span className="company-avatar">{getCompanyInitials(company.name)}</span>
                    <strong>{company.name}</strong>
                    <small>{company.username ?? company.code}</small>
                  </button>
                ))}
              </div>
            </article>

            <article className="catering-panel daily-orders-panel">
              <div className="panel-title-row orders-panel-title">
                <div>
                  <h2>Müşteriden Düşen Günlük Adetler</h2>
                  <p>{lastUpdatedAt ? `Son güncelleme ${lastUpdatedAt}` : "Canlı takip hazırlanıyor."}</p>
                </div>
                <div className="admin-search">
                  <Search size={17} />
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Şirket veya fiş ara" />
                </div>
              </div>

              <div className="meal-request-table">
                <div className="meal-request-table-head">
                  <span>Müşteri</span>
                  <span>Yemek adedi</span>
                  <span>Durum</span>
                  <span>Saat</span>
                  <span>İşlem</span>
                </div>

                {requestRows.length === 0 ? (
                  <p className="empty-state">Seçili gün için henüz müşteriden yemek adedi gelmedi.</p>
                ) : (
                  requestRows.map((request) => {
                    const StatusIcon = statusMeta[request.status].icon;

                    return (
                      <div className={`meal-request-row admin-order-row status-${request.status}`} key={request.requestNo}>
                        <div className="order-company-cell">
                          <strong>{request.companyName}</strong>
                          <small>
                            {request.requestNo} · {request.companyCode}
                          </small>
                          {request.note ? <em>{request.note}</em> : null}
                        </div>

                        <div className="order-count-cell">
                          <strong>{request.headcount}</strong>
                          <span>yemek</span>
                        </div>

                        <span className={`order-status-pill tone-${statusMeta[request.status].tone}`}>
                          <StatusIcon size={15} />
                          {statusMeta[request.status].label}
                        </span>

                        <small className="order-time-cell">{formatTime(request.updatedAt)}</small>

                        <button className="catering-secondary-button" type="button" onClick={() => markCollected(request.requestNo)} disabled={isSaving || request.status !== "eaten"}>
                          <CheckCircle2 size={17} />
                          Toplandı
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          </section>
        ) : null}

        {adminView === "companies" ? (
          <section className="admin-section-panel company-management-layout">
            <article className="company-directory">
              <div className="panel-title-row orders-panel-title">
                <div>
                  <h2>Üye şirketler</h2>
                  <p>{companies.length} kayıtlı firma</p>
                </div>
                <div className="admin-search">
                  <Search size={17} />
                  <input value={companySearchTerm} onChange={(event) => setCompanySearchTerm(event.target.value)} placeholder="Firma ara" />
                </div>
              </div>

              <div className="company-directory-list">
                {filteredCompanies.map((company) => (
                  <button className={selectedCompany?.id === company.id ? "active" : ""} type="button" key={company.id} onClick={() => selectCompany(company)}>
                    <span className="company-avatar">{getCompanyInitials(company.name)}</span>
                    <div>
                      <strong>{company.name}</strong>
                      <small>{company.username ?? company.code}</small>
                    </div>
                    <em>{company.active ? "Aktif" : "Pasif"}</em>
                  </button>
                ))}
              </div>
            </article>

            <article className="company-detail-panel">
              {selectedCompany ? (
                <>
                  <div className="company-detail-head">
                    <span className="company-avatar large">{getCompanyInitials(selectedCompany.name)}</span>
                    <div>
                      <span className="catering-kicker">
                        <Edit3 size={16} />
                        Firma kartı
                      </span>
                      <h2>{selectedCompany.name}</h2>
                      <p>Kullanıcı adı: {selectedCompany.username ?? selectedCompany.code}</p>
                    </div>
                  </div>

                  <div className="company-contact-strip">
                    <span>
                      <Phone size={16} />
                      {selectedCompany.phone ?? "Telefon yok"}
                    </span>
                    <span>
                      <Mail size={16} />
                      {selectedCompany.email ?? "E-posta yok"}
                    </span>
                    <span>
                      <MapPin size={16} />
                      {selectedCompany.address ?? "Adres yok"}
                    </span>
                  </div>

                  <form className="company-edit-form" onSubmit={saveCompanyDetails}>
                    <div className="detail-form-grid">
                      <label>
                        <span>Şirket adı</span>
                        <input value={editName} onChange={(event) => setEditName(event.target.value)} />
                      </label>
                      <label>
                        <span>Yetkili kişi</span>
                        <input value={editContactName} onChange={(event) => setEditContactName(event.target.value)} placeholder="Örn: Elif Demir" />
                      </label>
                      <label>
                        <span>Telefon</span>
                        <input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} placeholder="0332 000 00 00" />
                      </label>
                      <label>
                        <span>E-posta</span>
                        <input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} placeholder="operasyon@firma.com" />
                      </label>
                      <label>
                        <span>Vergi numarası</span>
                        <input value={editTaxNumber} onChange={(event) => setEditTaxNumber(event.target.value)} placeholder="Vergi / cari no" />
                      </label>
                      <label>
                        <span>Yeni şifre</span>
                        <input type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} placeholder="Değiştirmek için yaz" minLength={4} />
                      </label>
                      <label>
                        <span>Adres</span>
                        <input value={editAddress} onChange={(event) => setEditAddress(event.target.value)} placeholder="Servis adresi" />
                      </label>
                    </div>
                    <label>
                      <span>Operasyon notu</span>
                      <textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="Teslimat, özel porsiyon veya ödeme notu" />
                    </label>

                    <div className="company-form-actions">
                      <button className="catering-primary-button" type="submit" disabled={isSaving}>
                        <CheckCircle2 size={17} />
                        Bilgileri kaydet
                      </button>
                      <button className="admin-danger-button" type="button" onClick={() => setCompanyToRemove(selectedCompany)} disabled={isSaving}>
                        <Trash2 size={17} />
                        Üyeliği sil
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <p className="empty-state">Düzenlemek için bir şirket seç.</p>
              )}
            </article>
          </section>
        ) : null}

        {adminView === "menu" ? (
          <section className="admin-section-panel menu-upload-panel">
            <div className="panel-title-row orders-panel-title">
              <div>
                <h2>Excel'den yemek tablosu</h2>
                <p>Excel veya CSV menuyu yukle; sistem tarih satirlarini okuyup tabloya aktarir.</p>
              </div>
              <div className="admin-toolbar monthly-toolbar">
                <label className="dashboard-date-filter">
                  <CalendarDays size={17} />
                  <input type="month" value={menuMonth} onChange={(event) => setMenuMonth(event.target.value)} />
                </label>
                <button className="admin-icon-button" type="button" onClick={loadMenus} aria-label="Menuleri yenile">
                  {isMenuLoading ? <Loader2 size={18} /> : <RefreshCcw size={18} />}
                </button>
              </div>
            </div>

            <form className="menu-upload-form" onSubmit={uploadMenuPdf}>
              <button className="catering-secondary-button menu-template-button" type="button" onClick={downloadMenuTemplate} disabled={isTemplateDownloading}>
                {isTemplateDownloading ? <Loader2 size={18} /> : <Download size={18} />}
                Excel sablonunu indir
              </button>
              <label>
                <span>Excel / CSV dosyasi</span>
                <input key={menuFile?.name ?? "empty"} accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" type="file" onChange={(event) => setMenuFile(event.target.files?.[0] ?? null)} />
              </label>
              <button className="catering-primary-button" type="submit" disabled={isMenuUploading}>
                {isMenuUploading ? <Loader2 size={18} /> : <Upload size={18} />}
                Excel'den tabloya aktar
              </button>
            </form>

            <div className="menu-table-editor">
              <div className="panel-title-row">
                <div>
                  <h2>Yemek listesi tablosu</h2>
                  <p>Her gune bir satira bir yemek olacak sekilde yaz. Bu tablo musteri panelinde bugunun yemegi alanini besler.</p>
                </div>
                <button className="catering-primary-button" type="button" onClick={saveMenuDays} disabled={isMenuUploading}>
                  {isMenuUploading ? <Loader2 size={18} /> : <CheckCircle2 size={18} />}
                  Tabloyu kaydet
                </button>
              </div>

              <div className="menu-edit-table">
                {menuWeekDays.map((weekDay) => (
                  <div className="monthly-menu-head" key={weekDay}>{weekDay}</div>
                ))}

                {menuCalendarCells.map((day, index) =>
                  day ? (
                    <label className="menu-edit-cell" key={day}>
                      <span>{formatDateLabel(day)}</span>
                      <textarea
                        value={menuDays[day] ?? ""}
                        onChange={(event) => setMenuDays((current) => ({ ...current, [day]: event.target.value }))}
                        placeholder="Orn: Mercimek corbasi&#10;Izgara kofte&#10;Pilav"
                      />
                    </label>
                  ) : (
                    <div className="menu-edit-cell empty" key={`empty-${index}`} />
                  )
                )}
              </div>
            </div>
          </section>
        ) : null}

        {false ? (
          <section className="admin-section-panel admin-control-grid">
            <article>
              <ChefHat size={24} />
              <span>Nisan 2026</span>
              <strong>26 gün</strong>
              <small>müşteri panelinde yayınlanan yemek günü</small>
            </article>
            <article>
              <ClipboardList size={24} />
              <span>Liste durumu</span>
              <strong>Yayında</strong>
              <small>Pazar ve boş günler müşteriye gösterilmiyor</small>
            </article>
            <article>
              <Plus size={24} />
              <span>Sonraki adım</span>
              <strong>Görselden aktarım</strong>
              <small>Aylık liste yükleme ekranı için hazır alan</small>
            </article>
          </section>
        ) : null}

        {adminView === "monthlyTracking" ? (
          <section className="admin-section-panel monthly-tracking-panel">
            <div className="panel-title-row orders-panel-title">
              <div>
                <h2>Gunluk siparis takibi</h2>
                <p>
                  {isMonthlyLoading
                    ? "Secili gunun yemek bildirimleri yukleniyor."
                    : `${formatDateLabel(trackingDate)} icin ${trackingReportedCompanyCount} firma ${trackingTotalHeadcount} porsiyon bildirdi.`}
                </p>
              </div>
              <div className="admin-toolbar monthly-toolbar">
                <label className="dashboard-date-filter">
                  <CalendarDays size={17} />
                  <input type="date" value={trackingDate} onChange={(event) => setTrackingDate(event.target.value)} />
                </label>
                <button className="admin-icon-button" type="button" onClick={loadMonthlyTracking} aria-label="Gunluk takibi yenile">
                  {isMonthlyLoading ? <Loader2 size={18} /> : <RefreshCcw size={18} />}
                </button>
              </div>
            </div>

            <div className="monthly-summary-grid">
              <article>
                <span>Gun toplami</span>
                <strong>{trackingTotalHeadcount}</strong>
                <small>porsiyon</small>
              </article>
              <article>
                <span>Siparis veren</span>
                <strong>{trackingReportedCompanyCount}</strong>
                <small>{activeCompanyCount} aktif firma icinde</small>
              </article>
              <article>
                <span>Beklenen</span>
                <strong>{trackingMissingCompanyCount}</strong>
                <small>firma henuz bildirmedi</small>
              </article>
            </div>

            <div className="daily-status-grid">
              <article>
                <span>Gunun durumu</span>
                <strong>{trackingMissingCompanyCount === 0 && activeCompanyCount > 0 ? "Tamamlandi" : trackingReportedCompanyCount > 0 ? "Bildirim bekleniyor" : "Henuz bildirim yok"}</strong>
                <small>{trackingSubmittedCount} yeni bildirim, {trackingRequests.filter((request) => request.status === "eaten").length} yenildi</small>
              </article>
            </div>

            <div className="daily-company-orders">
              <div className="meal-request-table-head">
                <span>Firma</span>
                <span>Yemek adedi</span>
                <span>Durum</span>
                <span>Saat</span>
              </div>

              {trackingRequests.length === 0 ? (
                <p className="empty-state compact">Secili tarihte siparis veren firma yok.</p>
              ) : (
                trackingRequests.map((request) => {
                  const StatusIcon = statusMeta[request.status].icon;

                  return (
                    <div className={`meal-request-row admin-order-row status-${request.status}`} key={request.requestNo}>
                      <div className="order-company-cell">
                        <strong>{request.companyName}</strong>
                        <small>{request.requestNo} · {request.companyCode}</small>
                        {request.note ? <em>{request.note}</em> : null}
                      </div>
                      <div className="order-count-cell">
                        <strong>{request.headcount}</strong>
                        <span>yemek</span>
                      </div>
                      <span className={`order-status-pill tone-${statusMeta[request.status].tone}`}>
                        <StatusIcon size={15} />
                        {statusMeta[request.status].label}
                      </span>
                      <small className="order-time-cell">{formatTime(request.updatedAt)}</small>
                    </div>
                  );
                })
              )}
            </div>

            {trackingMissingCompanyCount > 0 ? (
              <div className="missing-company-list">
                <h3>Bildirmeyen firmalar</h3>
                <div>
                  {companies
                    .filter((company) => company.active && !trackingRequests.some((request) => request.companyId === company.id))
                    .map((company) => (
                      <span key={company.id}>{company.name}</span>
                    ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {false ? (
          <section className="admin-section-panel monthly-tracking-panel">
            <div className="panel-title-row orders-panel-title">
              <div>
                <h2>Aylik yemek takibi</h2>
                <p>
                  {isMonthlyLoading
                    ? "Ay icindeki yemek bildirimleri yukleniyor."
                    : `${monthlyReportedDayCount} gunde toplam ${monthlyTotalHeadcount} porsiyon bildirildi.`}
                </p>
              </div>
              <div className="admin-toolbar monthly-toolbar">
                <label className="dashboard-date-filter">
                  <CalendarDays size={17} />
                  <input type="month" value={trackingMonth} onChange={(event) => setTrackingMonth(event.target.value)} />
                </label>
                <button className="admin-icon-button" type="button" onClick={loadMonthlyTracking} aria-label="Aylik takibi yenile">
                  {isMonthlyLoading ? <Loader2 size={18} /> : <RefreshCcw size={18} />}
                </button>
              </div>
            </div>

            <div className="monthly-summary-grid">
              <article>
                <span>Ay toplamı</span>
                <strong>{monthlyTotalHeadcount}</strong>
                <small>porsiyon</small>
              </article>
              <article>
                <span>Bildirim olan gün</span>
                <strong>{monthlyReportedDayCount}</strong>
                <small>{getMonthDays(trackingMonth).length} gün içinde</small>
              </article>
              <article>
                <span>Aktif üye</span>
                <strong>{activeCompanyCount}</strong>
                <small>müşteri hesabı</small>
              </article>
            </div>

            <div className="monthly-tracking-list">
              {monthlyTrackingDays.map((day) => (
                <article className={day.total > 0 ? "has-orders" : ""} key={day.date}>
                  <div className="monthly-day-head">
                    <div>
                      <strong>{formatDateLabel(day.date)}</strong>
                      <small>{day.date}</small>
                    </div>
                    <span>{day.total} porsiyon</span>
                  </div>

                  {day.requests.length === 0 ? (
                    <p className="empty-state compact">Bu gün için yemek adedi bildirilmedi.</p>
                  ) : (
                    <div className="monthly-company-orders">
                      {day.requests.map((request) => (
                        <div key={request.requestNo}>
                          <span>{request.companyName}</span>
                          <strong>{request.headcount}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {adminView === "reports" ? (
          <section className="admin-section-panel billing-report-panel">
            <div className="billing-report-command">
              <div className="billing-report-intro">
                <span className="catering-kicker">
                  <ReceiptText size={16} />
                  Finans kontrol merkezi
                </span>
                <h2>Fatura ve tahsilat raporu</h2>
                <p>Firma fiyatlarini, KDV secimini ve ay sonu tahsilatini ayni ekrandan yonet.</p>
              </div>
              <div className="admin-toolbar monthly-toolbar">
                <label className="dashboard-date-filter">
                  <CalendarDays size={17} />
                  <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
                </label>
                <button className="admin-icon-button" type="button" onClick={loadReports} aria-label="Raporu yenile">
                  {isReportLoading ? <Loader2 size={18} /> : <RefreshCcw size={18} />}
                </button>
              </div>
            </div>

            <div className="billing-summary-grid">
              <article>
                <span>Ay toplam porsiyon</span>
                <strong>{reportTotalHeadcount}</strong>
                <small>{formatMonthLabel(`${reportMonth}-01`)}</small>
              </article>
              <article>
                <span>Ara toplam</span>
                <strong>{formatCurrency(reportAmounts.netTotal)}</strong>
                <small>Firma bazlı birim fiyat</small>
              </article>
              <article>
                <span>KDV</span>
                <strong>{formatCurrency(reportAmounts.vatTotal)}</strong>
                <small>{reportInvoiceCompanyCount} firmada %{VAT_RATE * 100}</small>
              </article>
              <article className="highlight">
                <span>Tahsil edilecek</span>
                <strong>{formatCurrency(reportAmounts.grossTotal)}</strong>
                <small>KDV ayarlarına göre toplam</small>
              </article>
            </div>

            <div className="billing-workspace">
              <article className="billing-ledger-panel">
                <div className="billing-subhead">
                  <div>
                    <h3>Aylik firma ozeti</h3>
                    <p>Secili ayda bildirim yapan firmalar ve hesaplanan tahsilat.</p>
                  </div>
                  <strong>{reportCompanyTotals.length} firma</strong>
                </div>

                <div className="billing-company-table">
                  <div className="billing-company-head">
                    <span>Firma</span>
                    <span>Gun</span>
                    <span>Porsiyon</span>
                    <span>Birim</span>
                    <span>Ara toplam</span>
                    <span>KDV</span>
                    <span>Toplam</span>
                  </div>

                  {isReportLoading ? (
                    <p className="empty-state compact">Rapor verileri yukleniyor.</p>
                  ) : reportCompanyTotals.length === 0 ? (
                    <p className="empty-state compact">Secili ay icin henuz yemek bildirimi yok.</p>
                  ) : (
                    reportCompanyTotals.map((companyTotal) => (
                      <div className="billing-company-row" key={companyTotal.companyId}>
                        <strong>{companyTotal.companyName}</strong>
                        <span>{companyTotal.orderDays}</span>
                        <span>{companyTotal.headcount}</span>
                        <span>{formatCurrency(companyTotal.unitPrice)}</span>
                        <span>{formatCurrency(companyTotal.netTotal)}</span>
                        <span className={companyTotal.vatEnabled ? "invoice-active" : ""}>
                          {companyTotal.vatEnabled ? formatCurrency(companyTotal.vatTotal) : "KDV yok"}
                        </span>
                        <strong>{formatCurrency(companyTotal.grossTotal)}</strong>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="billing-pricing-panel">
                <div className="billing-subhead">
                  <div>
                    <h3>Firma fiyatlandirma</h3>
                    <p>Birim fiyati gir, fatura kesilecek firmada KDV'yi ac.</p>
                  </div>
                  <strong>{reportPricingCompanies.length} aktif</strong>
                </div>

                <div className="billing-pricing-list">
                  {reportPricingCompanies.length === 0 ? (
                    <p className="empty-state compact">Fiyatlandirma icin aktif firma bulunamadi.</p>
                  ) : reportPricingCompanies.map((company) => {
                    const companyTotal = reportTotalsByCompany.get(company.id);

                    return (
                      <form className="billing-pricing-card" key={`${company.id}-${company.mealUnitPrice ?? 170}-${Boolean(company.mealVatEnabled)}`} onSubmit={(event) => saveReportPricing(event, company)}>
                        <div className="billing-pricing-company">
                          <span className="company-avatar">{getCompanyInitials(company.name)}</span>
                          <div>
                            <strong>{company.name}</strong>
                            <small>{companyTotal ? `${companyTotal.headcount} porsiyon / ${companyTotal.orderDays} gun` : "Bu ay bildirim yok"}</small>
                          </div>
                        </div>

                        <label className="billing-price-field">
                          <span>Birim fiyat</span>
                          <input name="mealUnitPrice" min={0} step="0.01" type="number" defaultValue={company.mealUnitPrice ?? 170} />
                        </label>

                        <label className="billing-invoice-switch">
                          <input name="mealVatEnabled" type="checkbox" defaultChecked={Boolean(company.mealVatEnabled)} />
                          <span>
                            <strong>Faturali</strong>
                            <small>KDV ekle</small>
                          </span>
                        </label>

                        <div className="billing-price-total">
                          <span>Ay toplam</span>
                          <strong>{formatCurrency(companyTotal?.grossTotal ?? 0)}</strong>
                        </div>

                        <button className="billing-save-button" type="submit" disabled={isSaving}>
                          {savingPricingCompanyId === company.id ? <Loader2 size={17} /> : <Save size={17} />}
                          Kaydet
                        </button>
                      </form>
                    );
                  })}
                </div>
              </article>
            </div>
          </section>
        ) : null}

      </section>

      {isCreateOpen ? (
        <div className="admin-modal-backdrop" role="presentation">
          <section className="admin-create-modal wide" role="dialog" aria-modal="true" aria-labelledby="create-company-title">
            <button className="modal-close-button" type="button" onClick={() => setIsCreateOpen(false)} aria-label="Kapat">
              <X size={20} />
            </button>

            <div className="create-modal-visual">
              <span className="catering-kicker">
                <UserPlus size={16} />
                Yeni müşteri hesabı
              </span>
              <h2 id="create-company-title">Şirket için giriş hesabı oluştur.</h2>
              <p>Bu ekrandan oluşturulan kullanıcı adı ve şifreyle müşteri kendi paneline giriş yapar.</p>

              <div className="create-modal-steps">
                <span>1</span>
                <strong>Giriş bilgilerini oluştur</strong>
                <span>2</span>
                <strong>Firma kartını tamamla</strong>
                <span>3</span>
                <strong>Günlük adetleri panelden izle</strong>
              </div>
            </div>

            <form className="company-create-form modal-company-form" onSubmit={createCompany}>
              <div className="membership-type-control" role="radiogroup" aria-label="Üyelik türü">
                <button className={accountType === "individual" ? "active" : ""} type="button" onClick={() => setAccountType("individual")}>
                  Bireysel
                </button>
                <button className={accountType === "corporate" ? "active" : ""} type="button" onClick={() => setAccountType("corporate")}>
                  Kurumsal
                </button>
              </div>
              <div className="detail-form-grid">
                <label>
                  <span>Şirket adı</span>
                  <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Örn: Kuzey Teknoloji" autoFocus />
                </label>
                <label>
                  <span>Kullanıcı adı</span>
                  <input value={generatedUsername} readOnly placeholder="Şirket adından oluşur" />
                </label>
                <label>
                  <span>Şifre</span>
                  <input value={newCompanyPassword} onChange={(event) => setCreatePassword(event.target.value)} placeholder="Kullanıcı adının sonuna ! eklenir" minLength={4} />
                </label>
                <label>
                  <span>Yetkili kişi</span>
                  <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Opsiyonel" />
                </label>
                <label>
                  <span>Telefon</span>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0332 000 00 00" />
                </label>
                <label>
                  <span>E-posta</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operasyon@firma.com" />
                </label>
                <label>
                  <span>{accountType === "individual" ? "TC kimlik numarası" : "Vergi kimlik numarası"}</span>
                  <input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} placeholder={accountType === "individual" ? "Opsiyonel" : "Vergi / cari no"} />
                </label>
                <label>
                  <span>Adres</span>
                  <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Servis adresi" />
                </label>
              </div>
              <label>
                <span>Operasyon notu</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Teslimat, özel porsiyon veya ödeme notu" />
              </label>
              <button className="catering-primary-button" type="submit" disabled={isSaving}>
                <Plus size={18} />
                Kullanıcıyı oluştur
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {companyToRemove ? (
        <div className="admin-modal-backdrop person-status-backdrop" role="presentation">
          <section className="person-status-modal" role="dialog" aria-modal="true" aria-labelledby="remove-company-title">
            <div className="person-status-icon error">
              <Trash2 size={22} />
            </div>
            <h2 id="remove-company-title">Üyelik kalıcı olarak silinsin mi?</h2>
            <p>
              {companyToRemove.name} müşteri kaydı, kişi listesi ve bu şirkete bağlı yemek bildirimleri kalıcı olarak silinir.
            </p>
            <div className="person-status-actions">
              <button className="catering-secondary-button" type="button" onClick={() => setCompanyToRemove(null)} disabled={isSaving}>
                Vazgeç
              </button>
              <button className="admin-danger-button" type="button" onClick={() => removeCompany()} disabled={isSaving}>
                <Trash2 size={17} />
                Kalıcı sil
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {error ? <FeedbackModal tone="error" message={error} onClose={() => setError("")} /> : null}
      {!error && message ? <FeedbackModal tone="success" message={message} onClose={() => setMessage("")} /> : null}
    </main>
  );
}

function getMenuCalendarCells(monthKey: string) {
  const days = getMonthDays(monthKey);
  const cells: Array<string | null> = [];

  days.forEach((day) => {
    const date = new Date(`${day}T12:00:00`);
    const weekDay = date.getDay();

    if (weekDay === 0) {
      return;
    }

    if (cells.length === 0) {
      for (let index = 1; index < weekDay; index += 1) {
        cells.push(null);
      }
    }

    cells.push(day);
  });

  while (cells.length % 6 !== 0) {
    cells.push(null);
  }

  return cells;
}
