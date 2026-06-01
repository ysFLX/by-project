import { Bell, CalendarDays, CheckCircle2, ChefHat, ClipboardList, KeyRound, LogOut, Plus, Send, Soup, Table2, Trash2, UserCheck, UsersRound, Utensils } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMonthlyDemoMenu,
} from "../data/demo-store";
import { FeedbackModal } from "../components/FeedbackModal";
import { apiFetch } from "../services/api";
import { setPageTitle } from "../services/page-title";
import { clearSession, getStoredSession } from "../services/session";
import type { AppNotification, ClientCompany, CompanyPerson, MealRequest, MenuDay, OperationSettings } from "../types/api";

type Props = {
  companyCode: string;
};

type PersonStatusAction = {
  person: CompanyPerson;
  active: boolean;
  mode: "confirm" | "success" | "error";
  message?: string;
};

type CustomerView = "daily" | "menu" | "tracking" | "people" | "account";
const customerViewIds: CustomerView[] = ["daily", "menu", "tracking", "people", "account"];

function getInitialCustomerView(companyCode: string): CustomerView {
  try {
    const savedView = window.localStorage.getItem(`maharet-customer-view-${companyCode}`);

    return customerViewIds.includes(savedView as CustomerView) ? (savedView as CustomerView) : "daily";
  } catch {
    return "daily";
  }
}

type MenuEntry = {
  date: string;
  items: string[];
  calories?: number | null;
};
type PersonMealTotal = {
  id: string;
  name: string;
  dates: string[];
  mealCount: number;
  total: number;
};

function todayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long"
  }).format(new Date(`${value}T12:00:00`));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

const weekDays = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

const VAT_RATE = 0.2;
const defaultOperationSettings: OperationSettings = {
  eatenDeadline: "16:30",
  collectedDeadline: "18:00"
};

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

function canEditMealRequest(serviceDate: string, request: MealRequest | null) {
  if (!request) {
    return true;
  }

  if (request.status !== "submitted") {
    return false;
  }

  const today = todayKey();

  if (serviceDate < today) {
    return false;
  }

  if (serviceDate > today) {
    return true;
  }

  return new Date().getHours() < 9;
}

function buildMenuWeeks(menu: MenuEntry[], referenceDate: string) {
  const reference = new Date(`${referenceDate}T12:00:00`);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const menuByDate = new Map(menu.map((menuDay) => [menuDay.date, menuDay]));
  const weeks: Array<Array<MenuEntry | null>> = [];
  let currentWeek: Array<MenuEntry | null> = Array(6).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const weekDay = date.getDay();

    if (weekDay === 0) {
      if (currentWeek.some(Boolean)) {
        weeks.push(currentWeek);
        currentWeek = Array(6).fill(null);
      }
      continue;
    }

    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    currentWeek[weekDay - 1] = menuByDate.get(dateKey) ?? null;

    if (weekDay === 6) {
      weeks.push(currentWeek);
      currentWeek = Array(6).fill(null);
    }
  }

  if (currentWeek.some(Boolean)) {
    weeks.push(currentWeek);
  }

  return weeks;
}

export function CompanyMealPortal({ companyCode }: Props) {
  const [customerView, setCustomerView] = useState<CustomerView>(() => getInitialCustomerView(companyCode));
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [people, setPeople] = useState<CompanyPerson[]>([]);
  const [request, setRequest] = useState<MealRequest | null>(null);
  const [serviceDate, setServiceDate] = useState(todayKey());
  const [trackingMonth, setTrackingMonth] = useState(currentMonthKey());
  const [menuDays, setMenuDays] = useState<MenuDay[]>([]);
  const [operationSettings, setOperationSettings] = useState<OperationSettings>(defaultOperationSettings);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [monthlyRequests, setMonthlyRequests] = useState<MealRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [headcount, setHeadcount] = useState("24");
  const [note, setNote] = useState("");
  const [personName, setPersonName] = useState("");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [personStatusAction, setPersonStatusAction] = useState<PersonStatusAction | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isNotificationTrayOpen, setIsNotificationTrayOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const notificationTrayRef = useRef<HTMLDivElement | null>(null);

  const monthlyMenu = useMemo<MenuEntry[]>(
    () => (menuDays.length > 0 ? menuDays : getMonthlyDemoMenu(serviceDate)),
    [menuDays, serviceDate]
  );
  const menuWeeks = useMemo(() => buildMenuWeeks(monthlyMenu, serviceDate), [monthlyMenu, serviceDate]);
  const todaysMenu = monthlyMenu.find((menuDay) => menuDay.date === serviceDate) ?? null;
  const monthlyTotalHeadcount = monthlyRequests.reduce((sum, monthlyRequest) => sum + monthlyRequest.headcount, 0);
  const mealUnitPrice = company?.mealUnitPrice ?? 170;
  const mealVatEnabled = company?.mealVatEnabled ?? false;
  const monthlyAmounts = calculateMealAmount(monthlyTotalHeadcount, mealUnitPrice, mealVatEnabled);
  const personMealTotals = useMemo<PersonMealTotal[]>(() => {
    const totals = new Map<string, { id: string; name: string; dates: Set<string> }>();

    monthlyRequests.forEach((monthlyRequest) => {
      (monthlyRequest.people ?? []).forEach((person) => {
        const current = totals.get(person.id) ?? {
          id: person.id,
          name: person.name,
          dates: new Set<string>()
        };

        current.dates.add(monthlyRequest.serviceDate);
        totals.set(person.id, current);
      });
    });

    return [...totals.values()]
      .map((total) => {
        const dates = [...total.dates].sort((first, second) => first.localeCompare(second));

        return {
          id: total.id,
          name: total.name,
          dates,
          mealCount: dates.length,
          total: calculateMealAmount(dates.length, mealUnitPrice, mealVatEnabled).grossTotal
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name, "tr-TR"));
  }, [monthlyRequests, mealUnitPrice, mealVatEnabled]);
  const activePeople = people.filter((person) => person.active);
  const selectedActivePeople = activePeople.filter((person) => selectedPersonIds.includes(person.id));
  const activeNotifications = notifications.filter((notification) => !notification.readAt);
  const activeNotification = activeNotifications[0] ?? null;
  const unreadNotificationCount = activeNotifications.length;
  const requestedHeadcount = activePeople.length > 0 ? selectedActivePeople.length : Number(headcount);
  const canEditHeadcount = canEditMealRequest(serviceDate, request);
  const nowIstanbulTime = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul"
  });
  const canMarkEaten =
    Boolean(request && request.status === "submitted" && request.headcount > 0)
    && serviceDate === todayKey()
    && nowIstanbulTime <= operationSettings.eatenDeadline;
  const headcountLockMessage =
    request && request.status !== "submitted"
      ? "Yemek yenildi onayindan sonra kişi sayısı değiştirilemez."
      : request && !canEditHeadcount
        ? "Saat 09:00'dan sonra bugünün yemek adedi güncellenemez."
        : request
          ? "Saat 09:00'a kadar kişi ekleyip çıkararak bildirimi güncelleyebilirsiniz."
          : "İlk bildiriminizi catering paneline gönderebilirsiniz.";
  const eatenDeadlineMessage =
    serviceDate !== todayKey()
      ? "Yemek yenildi sadece bugünün kaydı için işaretlenebilir."
      : `Yemek yenildi en gec ${operationSettings.eatenDeadline} saatine kadar isaretlenebilir.`;
  const pageTitle =
    customerView === "account"
      ? "Hesap şifrenizi değiştirin."
      : customerView === "people"
      ? "Şirket kişi listesini yönet."
      : customerView === "menu"
        ? "Aylık yemek listesini gör."
        : customerView === "tracking"
          ? "Aylık yemek takibini incele."
          : "Bugün kaç kişilik yemek yiyeceğinizi bildirin.";
  const pageDescription =
    customerView === "account"
      ? "Yeni şifre kaydedilmeden önce mevcut şifreniz doğrulanır."
      : customerView === "people"
      ? "Yemek yiyebilecek kişileri ekleyin, pasife alin veya tekrar aktife alin."
      : customerView === "menu"
        ? "Bu ay hangi gün hangi yemek oldugunu tek ekrandan takip edin."
        : customerView === "tracking"
          ? "Bu ay hangi gün kaç kişilik sipariş verdiğinizi tablo olarak görün."
          : "Sectiginiz kişiler catering firmasinin paneline kişi sayisi ve isim listesiyle duser.";

  useEffect(() => {
    const session = getStoredSession();
    setPageTitle(company?.name ?? session?.displayName);
  }, [company?.name]);

  useEffect(() => {
    setCustomerView(getInitialCustomerView(companyCode));
  }, [companyCode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`maharet-customer-view-${companyCode}`, customerView);
    } catch {
      // Keeping the portal usable is more important than persisting the tab.
    }
  }, [companyCode, customerView]);

  async function loadPortalData() {
    setError("");

    try {
      const { company: currentCompany } = await apiFetch<{ company: ClientCompany }>(
        `/client-companies/${encodeURIComponent(companyCode)}`
      );

      if (!currentCompany) {
        throw new Error("Şirket bilgisi bulunamadi.");
      }

      setCompany(currentCompany);

      try {
        const { people: currentPeople } = await apiFetch<{ people: CompanyPerson[] }>(
          `/client-companies/${encodeURIComponent(currentCompany.code)}/people`
        );
        setPeople(currentPeople);
      } catch {
        setPeople([]);
      }

      const { requests } = await apiFetch<{ requests: MealRequest[] }>(
        `/meal-requests?companyCode=${encodeURIComponent(currentCompany.code)}&serviceDate=${encodeURIComponent(serviceDate)}`
      );
      const { notifications: currentNotifications } = await apiFetch<{ notifications: AppNotification[] }>(
        `/notifications?companyCode=${encodeURIComponent(currentCompany.code)}`
      );
      const currentRequest = requests[0] ?? null;
      setRequest(currentRequest);
      setNotifications(currentNotifications);

      if (currentRequest) {
        setHeadcount(String(currentRequest.headcount));
        setNote(currentRequest.note ?? "");
        setSelectedPersonIds((currentRequest.people ?? []).map((person) => person.id));
      } else {
        setSelectedPersonIds([]);
      }

      loadMonthlyRequests(currentCompany);
    } catch (loadError) {
      setCompany(null);
      setRequest(null);
      setError(loadError instanceof Error ? loadError.message : "Şirket bilgisi yüklenemedi.");
    }
  }

  async function loadNotifications(currentCompany = company) {
    if (!currentCompany) {
      return;
    }

    try {
      const { notifications: currentNotifications } = await apiFetch<{ notifications: AppNotification[] }>(
        `/notifications?companyCode=${encodeURIComponent(currentCompany.code)}`
      );

      setNotifications(currentNotifications);
    } catch {
      // Notification polling should not interrupt the customer's current work.
    }
  }

  async function loadMonthlyRequests(currentCompany = company) {
    if (!currentCompany) {
      return;
    }

    setIsMonthlyLoading(true);
    setError("");

    try {
      const days = getMonthDays(trackingMonth);
      const payloads = await Promise.all(
        days.map((day) =>
          apiFetch<{ requests: MealRequest[] }>(
            `/meal-requests?companyCode=${encodeURIComponent(currentCompany.code)}&serviceDate=${encodeURIComponent(day)}`
          )
        )
      );

      setMonthlyRequests(payloads.flatMap((payload) => payload.requests).sort((first, second) => first.serviceDate.localeCompare(second.serviceDate)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Aylık yemek takibi yüklenemedi.");
    } finally {
      setIsMonthlyLoading(false);
    }
  }

  async function loadMenuDocuments() {
    setIsMenuLoading(true);

    try {
      const month = serviceDate.slice(0, 7);
      const daysPayload = await apiFetch<{ days: MenuDay[] }>(`/menu-days?month=${encodeURIComponent(month)}`);
      setMenuDays(daysPayload.days);
    } catch {
      setMenuDays([]);
    } finally {
      setIsMenuLoading(false);
    }
  }

  async function loadOperationSettings() {
    try {
      const { settings } = await apiFetch<{ settings: OperationSettings }>("/operation-settings");
      setOperationSettings(settings);
    } catch {
      setOperationSettings(defaultOperationSettings);
    }
  }

  useEffect(() => {
    loadPortalData();
    loadMenuDocuments();
    loadOperationSettings();
  }, [companyCode, serviceDate]);

  useEffect(() => {
    loadMonthlyRequests();
  }, [trackingMonth]);

  useEffect(() => {
    if (!company) {
      return;
    }

    loadNotifications(company);
    const interval = window.setInterval(() => loadNotifications(company), 3000);

    return () => window.clearInterval(interval);
  }, [company?.code]);

  useEffect(() => {
    function closeTrayOnOutsideClick(event: MouseEvent) {
      if (!notificationTrayRef.current?.contains(event.target as Node)) {
        setIsNotificationTrayOpen(false);
      }
    }

    document.addEventListener("mousedown", closeTrayOnOutsideClick);

    return () => document.removeEventListener("mousedown", closeTrayOnOutsideClick);
  }, []);

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

  async function submitHeadcount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!canEditHeadcount) {
      setError(headcountLockMessage);
      return;
    }

    if (activePeople.length > 0 && selectedActivePeople.length === 0) {
      setError("Yemek yiyecek en az bir kişi seç.");
      return;
    }

    try {
      const { request: savedRequest } = await apiFetch<{ request: MealRequest }>("/meal-requests", {
        method: "POST",
        body: {
          companyCode: company?.code ?? companyCode,
          serviceDate,
          headcount: requestedHeadcount,
          personIds: selectedActivePeople.map((person) => Number(person.id)),
          note
        }
      });

      setRequest(savedRequest);
      setMonthlyRequests((current) => {
        const withoutSavedDay = current.filter((monthlyRequest) => monthlyRequest.serviceDate !== savedRequest.serviceDate);

        return [...withoutSavedDay, savedRequest].sort((first, second) => first.serviceDate.localeCompare(second.serviceDate));
      });
      setNotifications((current) => current.filter((notification) => notification.serviceDate !== savedRequest.serviceDate || !["meal_missing", "meal_eaten_missing"].includes(notification.type)));
      setMessage("Bugünkü yemek adediniz catering paneline düştü.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Kişi sayısı kaydedilemedi.");
    }
  }

  async function submitNoMeal() {
    setMessage("");
    setError("");

    if (!canEditHeadcount) {
      setError(headcountLockMessage);
      return;
    }

    try {
      const { request: savedRequest } = await apiFetch<{ request: MealRequest }>("/meal-requests", {
        method: "POST",
        body: {
          companyCode: company?.code ?? companyCode,
          serviceDate,
          headcount: 0,
          personIds: [],
          note: "Bugün yemek yenmeyecek."
        }
      });

      setRequest(savedRequest);
      setHeadcount("0");
      setNote(savedRequest.note ?? "");
      setSelectedPersonIds([]);
      setMonthlyRequests((current) => {
        const withoutSavedDay = current.filter((monthlyRequest) => monthlyRequest.serviceDate !== savedRequest.serviceDate);

        return [...withoutSavedDay, savedRequest].sort((first, second) => first.serviceDate.localeCompare(second.serviceDate));
      });
      setNotifications((current) => current.filter((notification) => notification.serviceDate !== savedRequest.serviceDate || !["meal_missing", "meal_eaten_missing"].includes(notification.type)));
      setMessage("Bugün yemek yenmeyecek bildirimi catering paneline düştü.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Yemek yok bildirimi kaydedilemedi.");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!company) {
      return;
    }

    if (newPassword !== newPasswordAgain) {
      setError("Yeni şifreler aynı olmalı.");
      return;
    }

    setIsPasswordSaving(true);

    try {
      const payload = await apiFetch<{ message: string }>(`/client-companies/${encodeURIComponent(company.code)}/password`, {
        method: "PATCH",
        body: {
          currentPassword,
          password: newPassword
        }
      });

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordAgain("");
      setMessage(payload.message);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Şifre güncellenemedi.");
    } finally {
      setIsPasswordSaving(false);
    }
  }

  async function createPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!company) {
      return;
    }

    try {
      const { person } = await apiFetch<{ person: CompanyPerson }>(`/client-companies/${encodeURIComponent(company.code)}/people`, {
        method: "POST",
        body: {
          name: personName
        }
      });

      setPeople((current) => [...current, person].sort((first, second) => first.name.localeCompare(second.name, "tr-TR")));
      setPersonName("");
      setMessage(`${person.name} kişi listesine eklendi.`);
    } catch (personError) {
      setError(personError instanceof Error ? personError.message : "Kişi eklenemedi.");
    }
  }

  async function updatePersonStatus(person: CompanyPerson, active: boolean) {
    if (!company) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const { person: updatedPerson } = await apiFetch<{ person: CompanyPerson }>(
        `/client-companies/${encodeURIComponent(company.code)}/people/${person.id}`,
        {
          method: "PATCH",
          body: { active }
        }
      );

      setPeople((current) => current.map((item) => (item.id === updatedPerson.id ? updatedPerson : item)));
      setSelectedPersonIds((current) => (active ? current : current.filter((id) => id !== person.id)));
      setPersonStatusAction({
        person: updatedPerson,
        active,
        mode: "success",
        message: active ? `${updatedPerson.name} tekrar aktif edildi.` : `${updatedPerson.name} pasife alındı.`
      });
    } catch (personError) {
      setPersonStatusAction({
        person,
        active,
        mode: "error",
        message: personError instanceof Error ? personError.message : "Kişi durumu güncellenemedi."
      });
    }
  }

  function openPersonStatusModal(person: CompanyPerson, active: boolean) {
    setPersonStatusAction({ person, active, mode: "confirm" });
  }

  function togglePerson(personId: string) {
    if (!canEditHeadcount) {
      setError(headcountLockMessage);
      return;
    }

    setSelectedPersonIds((current) => (current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]));
  }

  async function acknowledgeNotification(notification: AppNotification) {
    if (!company) {
      return;
    }

    try {
      const { notification: updatedNotification } = await apiFetch<{ notification: AppNotification }>(`/notifications/${notification.id}`, {
        method: "PATCH",
        body: {
          companyCode: company.code,
          read: true
        }
      });

      setNotifications((current) => current.map((item) => (item.id === updatedNotification.id ? updatedNotification : item)));
      setIsNotificationTrayOpen(true);
    } catch (notificationError) {
      setError(notificationError instanceof Error ? notificationError.message : "Bildirim kapatılamadı.");
    }
  }

  async function markEaten() {
    if (!request) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const { request: updatedRequest } = await apiFetch<{ request: MealRequest }>(`/meal-requests/${request.requestNo}`, {
        method: "PATCH",
        body: { status: "eaten" }
      });

      setRequest(updatedRequest);
      setNotifications((current) => current.filter((notification) => notification.serviceDate !== updatedRequest.serviceDate || notification.type !== "meal_eaten_missing"));
      setMessage("Yemek yenildi bilgisi catering paneline gönderildi.");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Durum güncellenemedi.");
    }
  }

  if (!company) {
    return (
      <main className="customer-dashboard-shell">
        <section className="customer-empty-card">
          <span className="catering-kicker">Üyelik bulunamadı</span>
          <h1>Bu kodla kayıtlı şirket yok.</h1>
          <p>Catering firmanızın oluşturduğu üyelik koduyla giriş yapmanız gerekiyor.</p>
          <a className="catering-primary-button" href="/giris">
            Giriş ekranına dön
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="customer-dashboard-shell">
      <aside className="customer-sidebar">
        <a className="catering-brand admin-brand" href="/giris">
          <span className="brand-logo-mark">
            <img src="/maharet-yemek.png" alt="" />
          </span>
          <div>
            <strong>{company.name}</strong>
            <small>Müşteri paneli</small>
          </div>
        </a>

        <nav className="admin-nav-list" aria-label="Müşteri panel menüsü">
          <button className={customerView === "daily" ? "active" : ""} type="button" onClick={() => setCustomerView("daily")}>
            <UsersRound size={18} />
            Günlük adet
          </button>
          <button className={customerView === "menu" ? "active" : ""} type="button" onClick={() => setCustomerView("menu")}>
            <ClipboardList size={18} />
            Aylık menü
          </button>
          <button className={customerView === "tracking" ? "active" : ""} type="button" onClick={() => setCustomerView("tracking")}>
            <Table2 size={18} />
            Aylık yemek takibi
          </button>
          <button className={customerView === "people" ? "active" : ""} type="button" onClick={() => setCustomerView("people")}>
            <UserCheck size={18} />
            Kişi listesi
          </button>
          <button className={customerView === "account" ? "active" : ""} type="button" onClick={() => setCustomerView("account")}>
            <KeyRound size={18} />
            Hesap
          </button>
        </nav>

        <button className="customer-logout" type="button" onClick={logout}>
          <LogOut size={18} />
          Çıkış yap
        </button>
      </aside>

      <section className="customer-main">
        {activeNotification ? (
          <div className="customer-notification-modal-backdrop" role="presentation">
            <section className="customer-notification-modal" role="dialog" aria-modal="true" aria-labelledby="customer-notification-title">
              <span className="catering-kicker">
                <Bell size={16} />
                Catering bildirimi
              </span>
              <h2 id="customer-notification-title">{activeNotification.title}</h2>
              <p>{activeNotification.message}</p>
              <div className="person-status-actions">
                {activeNotification.type === "meal_eaten_missing" ? (
                  <button className="catering-secondary-button" type="button" onClick={() => setCustomerView("daily")}>
                    Günlük ekrana git
                  </button>
                ) : null}
                <button className="catering-primary-button" type="button" onClick={() => acknowledgeNotification(activeNotification)}>
                  Tamam
                </button>
              </div>
            </section>
          </div>
        ) : null}

        <header className="customer-hero">
          <div>
            <span className="catering-kicker">
              <ChefHat size={16} />
              {formatMonth(serviceDate)} yemek planı
            </span>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>
          <div className="customer-notification-tray" ref={notificationTrayRef}>
            <button className="customer-notification-button" type="button" onClick={() => setIsNotificationTrayOpen((current) => !current)} aria-label="Bildirimleri ac">
              <Bell size={20} />
              {unreadNotificationCount > 0 ? <span>{unreadNotificationCount}</span> : null}
            </button>
            {isNotificationTrayOpen ? (
              <div className="customer-notification-menu">
                <div className="customer-notification-menu-head">
                  <strong>Bildirimler</strong>
                  <small>Son {operationSettings.notificationRetentionHours ?? 24} saat</small>
                </div>
                {notifications.length === 0 ? (
                  <p className="empty-state compact">Yeni bildirim yok.</p>
                ) : (
                  <div className="customer-notification-items">
                    {notifications.map((notification) => (
                      <article className={notification.readAt ? "read" : ""} key={notification.id}>
                        <div>
                          <strong>{notification.title}</strong>
                          <small>{formatNotificationTime(notification.createdAt)}</small>
                        </div>
                        <p>{notification.message}</p>
                        {!notification.readAt ? (
                          <button type="button" onClick={() => acknowledgeNotification(notification)}>
                            Okundu yap
                          </button>
                        ) : (
                          <span>Okundu</span>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </header>

        {customerView === "daily" ? (
        <>
        <section className="customer-grid" id="gunluk">
          <article className="today-menu-panel">
            <span className="catering-kicker">
              <Utensils size={16} />
              {formatDate(serviceDate)}
            </span>
            <h2>Bugünün yemeği</h2>
            <div className="today-menu-list">
              {todaysMenu ? (
                todaysMenu.items.map((item, index) => {
                const icons = [Soup, Utensils, CheckCircle2, ChefHat];
                const MenuIcon = icons[index % icons.length];

                return (
                  <div key={`${item}-${index}`}>
                    <MenuIcon size={22} />
                    <span>{index + 1}. çeşit</span>
                    <strong>{item}</strong>
                  </div>
                );
              })
              ) : (
                <div className="no-menu-day">
                  <CalendarDays size={22} />
                  <span>Plan yok</span>
                  <strong>Bu tarih için yemek listesi bulunmuyor.</strong>
                </div>
              )}
            </div>
          </article>

          <article className="headcount-panel">
            <div className="headcount-panel-head">
              <h2>Günlük yemek adedi</h2>
              <label className="dashboard-date-filter">
                <CalendarDays size={17} />
                <input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
              </label>
            </div>
            <p>{request ? (request.headcount === 0 ? "Bugün yemek yenmeyecek olarak bildirildi." : `Son bildirilen adet: ${request.headcount}`) : "Bugün için henüz adet bildirilmedi."}</p>
            <p className={canEditHeadcount ? "cutoff-note" : "cutoff-note locked"}>{headcountLockMessage}</p>

            {activePeople.length > 0 ? (
              <div className="person-picker">
                <div className="person-picker-head">
                  <strong>Yemek yiyecek kişiler</strong>
                  <span>{selectedActivePeople.length} seçili</span>
                </div>
                <div className="person-check-grid">
                  {activePeople.map((person) => (
                    <button
                      className={selectedPersonIds.includes(person.id) ? "active" : ""}
                      type="button"
                      key={person.id}
                      disabled={!canEditHeadcount}
                      onClick={() => togglePerson(person.id)}
                    >
                      <CheckCircle2 size={17} />
                      <span>{person.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <form className="meal-request-form" onSubmit={submitHeadcount}>
              <label>
                <span>Bugün kaç kişilik yemek yenilecek?</span>
                <input min={1} type="number" value={activePeople.length > 0 ? String(selectedActivePeople.length) : headcount} onChange={(event) => setHeadcount(event.target.value)} readOnly={activePeople.length > 0} disabled={!canEditHeadcount} />
              </label>
              <label>
                <span>Not</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Örn: 2 vejetaryen, 1 glutensiz, servis 12:30..." disabled={!canEditHeadcount} />
              </label>
              <button className="catering-primary-button" type="submit" disabled={!canEditHeadcount}>
                <Send size={18} />
                {request ? "Bildirimi güncelle" : "Catering paneline gönder"}
              </button>
              <button className="no-meal-button" type="button" onClick={submitNoMeal} disabled={!canEditHeadcount}>
                <Soup size={18} />
                Bugün yemek yenmeyecek
              </button>
              {request && request.status === "submitted" && request.headcount > 0 ? (
                <button className="catering-secondary-button" type="button" onClick={markEaten} disabled={!canMarkEaten}>
                  <CheckCircle2 size={18} />
                  Yemek yenildi
                </button>
              ) : null}
              {request && request.status === "submitted" && request.headcount > 0 ? (
                <p className={canMarkEaten ? "cutoff-note" : "cutoff-note locked"}>{eatenDeadlineMessage}</p>
              ) : null}
            </form>
          </article>
        </section>
        </>
        ) : null}

        {customerView === "menu" ? (
        <section className="monthly-menu-section" id="menu">
          <div className="panel-title-row">
            <div>
              <h2>Aylık yemek listesi</h2>
              <p>Müşteri bu ay hangi gün hangi yemek olduğunu buradan görür.</p>
            </div>
            <span className="month-pill">{formatMonth(serviceDate)}</span>
          </div>

          {isMenuLoading ? <p className="empty-state compact">Yemek tablosu yükleniyor.</p> : null}

          <div className="monthly-menu-table">
            {weekDays.map((weekDay) => (
              <div className="monthly-menu-head" key={weekDay}>
                {weekDay}
              </div>
            ))}

            {menuWeeks.map((week, weekIndex) =>
              week.map((menuDay, dayIndex) =>
                menuDay ? (
                  <article className={menuDay.date === serviceDate ? "active monthly-menu-cell" : "monthly-menu-cell"} key={menuDay.date}>
                    <time>{formatDate(menuDay.date)}</time>
                    <strong>{menuDay.items[0]}</strong>
                    <span>{menuDay.items.slice(1).join(" · ")}</span>
                    {menuDay.calories ? <small>{menuDay.calories} kcal</small> : null}
                  </article>
                ) : (
                  <div className="monthly-menu-cell empty" key={`empty-${weekIndex}-${dayIndex}`} />
                )
              )
            )}
          </div>
        </section>
        ) : null}

        {customerView === "tracking" ? (
        <section className="monthly-menu-section customer-monthly-tracking" id="aylik-takip">
          <div className="panel-title-row">
            <div>
              <h2>Aylık yemek takibi</h2>
              <p>Bu ay hangi gün kaç kişilik sipariş verdiğinizi tablo olarak görün.</p>
            </div>
            <div className="customer-billing-actions">
              <label className="dashboard-date-filter">
                <CalendarDays size={17} />
                <input type="month" value={trackingMonth} onChange={(event) => setTrackingMonth(event.target.value)} />
              </label>
            </div>
          </div>

          <div className="customer-tracking-summary">
            <article>
              <span>Ay toplamı</span>
              <strong>{monthlyTotalHeadcount}</strong>
              <small>kişilik sipariş</small>
            </article>
            <article>
              <span>Sipariş verilen gün</span>
              <strong>{monthlyRequests.length}</strong>
              <small>{formatMonth(`${trackingMonth}-01`)}</small>
            </article>
            <article>
              <span>Ara toplam</span>
              <strong>{formatCurrency(monthlyAmounts.netTotal)}</strong>
              <small>{formatCurrency(mealUnitPrice)} x kişi</small>
            </article>
            <article>
              <span>KDV</span>
              <strong>{formatCurrency(monthlyAmounts.vatTotal)}</strong>
              <small>{mealVatEnabled ? `Catering tarafından %${VAT_RATE * 100}` : "KDV eklenmedi"}</small>
            </article>
            <article className="highlight">
              <span>Ay sonu tutar</span>
              <strong>{formatCurrency(monthlyAmounts.grossTotal)}</strong>
              <small>{mealVatEnabled ? "KDV dahil toplam" : "KDV hariç toplam"}</small>
            </article>
          </div>

          <div className="customer-tracking-table">
            <div className="customer-tracking-head">
              <span>Tarih</span>
              <span>Sipariş adedi</span>
              <span>Tutar</span>
              <span>Açıklama</span>
            </div>

            {isMonthlyLoading ? (
              <p className="empty-state compact">Aylık yemek takibi yükleniyor.</p>
            ) : monthlyRequests.length === 0 ? (
              <p className="empty-state compact">Seçili ay için henüz yemek siparişi verilmedi.</p>
            ) : (
              monthlyRequests.map((monthlyRequest) => (
                <div className="customer-tracking-row" key={monthlyRequest.requestNo}>
                  <span>{formatDate(monthlyRequest.serviceDate)}</span>
                  <strong>{monthlyRequest.headcount} kişilik</strong>
                  <strong>{formatCurrency(calculateMealAmount(monthlyRequest.headcount, mealUnitPrice, mealVatEnabled).grossTotal)}</strong>
                  <em>
                    {(monthlyRequest.people ?? []).length > 0
                      ? (monthlyRequest.people ?? []).map((person) => person.name).join(", ")
                      : `${monthlyRequest.serviceDate} tarihinde ${monthlyRequest.headcount} kişilik sipariş verilmiştir.`}
                  </em>
                </div>
              ))
            )}
          </div>
        </section>
        ) : null}

        {customerView === "people" ? (
        <section className="monthly-menu-section company-people-section" id="kişiler">
          <div className="panel-title-row">
            <div>
              <h2>Kişi listesi</h2>
              <p>Şirket içinde yemek yiyebilecek kişileri buradan yönetin.</p>
            </div>
            <span className="month-pill">{activePeople.length} aktif kişi</span>
          </div>

          <form className="company-person-form" onSubmit={createPerson}>
            <label>
              <span>Ad soyad</span>
              <input value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Örn: Ayşe Yılmaz" />
            </label>
            <button className="catering-primary-button" type="submit">
              <Plus size={18} />
              Kişi ekle
            </button>
          </form>

          <div className="company-people-list">
            {people.length === 0 ? (
              <p className="empty-state compact">Henüz kişi eklenmedi.</p>
            ) : (
              people.map((person) => (
                <article className={person.active ? "" : "inactive"} key={person.id}>
                  <div>
                    <strong>{person.name}</strong>
                  </div>
                  <span>{person.active ? "Aktif" : "Pasif"}</span>
                  {person.active ? (
                    <button className="admin-danger-button" type="button" onClick={() => openPersonStatusModal(person, false)}>
                      <Trash2 size={16} />
                      Pasife al
                    </button>
                  ) : (
                    <button className="catering-secondary-button" type="button" onClick={() => openPersonStatusModal(person, true)}>
                      <CheckCircle2 size={16} />
                      Aktife al
                    </button>
                  )}
                </article>
              ))
            )}
          </div>

          <div className="person-billing-panel">
            <div className="panel-title-row">
              <div>
                <h2>Kişi bazlı aylık hesap</h2>
                <p>Seçilen kişi listesine göre her kişinin hangi günler yemek yediğini ve tutarını gör.</p>
              </div>
              <span className="month-pill">{formatCurrency(mealUnitPrice)} / kişi</span>
            </div>

            {personMealTotals.length === 0 ? (
              <p className="empty-state compact">Bu ay kişi seçilerek kaydedilmiş yemek bildirimi yok.</p>
            ) : (
              <div className="person-billing-table">
                <div className="person-billing-head">
                  <span>Kişi</span>
                  <span>Yediği gün</span>
                  <span>Tutar</span>
                  <span>Tarihler</span>
                </div>

                {personMealTotals.map((personTotal) => (
                  <div className="person-billing-row" key={personTotal.id}>
                    <strong>{personTotal.name}</strong>
                    <span>{personTotal.mealCount} gün</span>
                    <strong>{formatCurrency(personTotal.total)}</strong>
                    <em>{personTotal.dates.map(formatDate).join(", ")}</em>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        ) : null}

        {customerView === "account" ? (
        <section className="monthly-menu-section customer-account-section" id="hesap">
          <div className="panel-title-row">
            <div>
              <h2>Şifre değiştir</h2>
              <p>Bu hesaba girerken kullanacağınız şifreyi yenileyin.</p>
            </div>
            <span className="month-pill">{company.username ?? company.code}</span>
          </div>

          <form className="customer-password-form" onSubmit={changePassword}>
            <label>
              <span>Mevcut şifre</span>
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </label>
            <label>
              <span>Yeni şifre</span>
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
            </label>
            <label>
              <span>Yeni şifre tekrar</span>
              <input type="password" value={newPasswordAgain} onChange={(event) => setNewPasswordAgain(event.target.value)} minLength={8} required />
            </label>
            <button className="catering-primary-button" type="submit" disabled={isPasswordSaving}>
              <KeyRound size={18} />
              Şifreyi kaydet
            </button>
          </form>
        </section>
        ) : null}
      </section>

      {personStatusAction ? (
        <div className="admin-modal-backdrop person-status-backdrop" role="presentation">
          <section className="person-status-modal" role="dialog" aria-modal="true" aria-labelledby="person-status-title">
            <div className={personStatusAction.mode === "error" ? "person-status-icon error" : "person-status-icon"}>
              {personStatusAction.mode === "error" ? <Trash2 size={22} /> : <CheckCircle2 size={22} />}
            </div>
            <h2 id="person-status-title">
              {personStatusAction.mode === "confirm"
                ? personStatusAction.active
                  ? "Kişi aktife alınsın mı?"
                  : "Kişi pasife alınsın mı?"
                : personStatusAction.mode === "success"
                  ? "İşlem tamamlandı"
                  : "İşlem tamamlanamadı"}
            </h2>
            <p>
              {personStatusAction.message ??
                (personStatusAction.active
                  ? `${personStatusAction.person.name} tekrar yemek listesinde seçilebilir olacak.`
                  : `${personStatusAction.person.name} pasife alınır, geçmiş kayıtları korunur.`)}
            </p>
            <div className="person-status-actions">
              {personStatusAction.mode === "confirm" ? (
                <>
                  <button className="catering-secondary-button" type="button" onClick={() => setPersonStatusAction(null)}>
                    Vazgeç
                  </button>
                  <button
                    className={personStatusAction.active ? "catering-primary-button" : "admin-danger-button"}
                    type="button"
                    onClick={() => updatePersonStatus(personStatusAction.person, personStatusAction.active)}
                  >
                    {personStatusAction.active ? <CheckCircle2 size={17} /> : <Trash2 size={17} />}
                    {personStatusAction.active ? "Aktife al" : "Pasife al"}
                  </button>
                </>
              ) : (
                <button className="catering-primary-button" type="button" onClick={() => setPersonStatusAction(null)}>
                  Tamam
                </button>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {error ? <FeedbackModal tone="error" message={error} onClose={() => setError("")} /> : null}
      {!error && message ? <FeedbackModal tone="success" message={message} onClose={() => setMessage("")} /> : null}
    </main>
  );
}
