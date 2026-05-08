import { CalendarDays, CheckCircle2, ChefHat, ClipboardList, LogOut, Send, Soup, Table2, UsersRound, Utensils } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  getMonthlyDemoMenu,
} from "../data/demo-store";
import { apiFetch } from "../services/api";
import type { ClientCompany, MealRequest } from "../types/api";

type Props = {
  companyCode: string;
};

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

function buildMenuWeeks(menu: ReturnType<typeof getMonthlyDemoMenu>, referenceDate: string) {
  const reference = new Date(`${referenceDate}T12:00:00`);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const menuByDate = new Map(menu.map((menuDay) => [menuDay.date, menuDay]));
  const weeks: Array<Array<(typeof menu)[number] | null>> = [];
  let currentWeek: Array<(typeof menu)[number] | null> = Array(6).fill(null);

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
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [request, setRequest] = useState<MealRequest | null>(null);
  const [serviceDate, setServiceDate] = useState(todayKey());
  const [trackingMonth, setTrackingMonth] = useState(currentMonthKey());
  const [monthlyRequests, setMonthlyRequests] = useState<MealRequest[]>([]);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [headcount, setHeadcount] = useState("24");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const monthlyMenu = useMemo(() => getMonthlyDemoMenu(serviceDate), [serviceDate]);
  const menuWeeks = useMemo(() => buildMenuWeeks(monthlyMenu, serviceDate), [monthlyMenu, serviceDate]);
  const todaysMenu = monthlyMenu.find((menuDay) => menuDay.date === serviceDate) ?? null;
  const monthlyTotalHeadcount = monthlyRequests.reduce((sum, monthlyRequest) => sum + monthlyRequest.headcount, 0);

  async function loadPortalData() {
    setError("");

    try {
      const { company: currentCompany } = await apiFetch<{ company: ClientCompany }>(`/client-companies/${encodeURIComponent(companyCode)}`);
      setCompany(currentCompany);

      const { requests } = await apiFetch<{ requests: MealRequest[] }>(
        `/meal-requests?companyCode=${encodeURIComponent(currentCompany.code)}&serviceDate=${encodeURIComponent(serviceDate)}`
      );
      const currentRequest = requests[0] ?? null;
      setRequest(currentRequest);

      if (currentRequest) {
        setHeadcount(String(currentRequest.headcount));
        setNote(currentRequest.note ?? "");
      }

      loadMonthlyRequests(currentCompany);
    } catch (loadError) {
      setCompany(null);
      setRequest(null);
      setError(loadError instanceof Error ? loadError.message : "Sirket bilgisi yuklenemedi.");
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
      setError(loadError instanceof Error ? loadError.message : "Aylik yemek takibi yuklenemedi.");
    } finally {
      setIsMonthlyLoading(false);
    }
  }

  useEffect(() => {
    loadPortalData();
  }, [companyCode, serviceDate]);

  useEffect(() => {
    loadMonthlyRequests();
  }, [trackingMonth]);

  async function submitHeadcount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const { request: savedRequest } = await apiFetch<{ request: MealRequest }>("/meal-requests", {
        method: "POST",
        body: {
          companyCode,
          serviceDate,
          headcount: Number(headcount),
          note
        }
      });

      setRequest(savedRequest);
      setMonthlyRequests((current) => {
        const withoutSavedDay = current.filter((monthlyRequest) => monthlyRequest.serviceDate !== savedRequest.serviceDate);

        return [...withoutSavedDay, savedRequest].sort((first, second) => first.serviceDate.localeCompare(second.serviceDate));
      });
      setMessage("Bugünkü yemek adediniz catering paneline düştü.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Kişi sayısı kaydedilemedi.");
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
      setMessage("Yemek yenildi bilgisi catering paneline gonderildi.");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Durum guncellenemedi.");
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
          <span>{company.name.slice(0, 2).toLocaleUpperCase("tr-TR")}</span>
          <div>
            <strong>{company.name}</strong>
            <small>Müşteri paneli</small>
          </div>
        </a>

        <nav className="admin-nav-list" aria-label="Müşteri panel menüsü">
          <a className="active" href="#gunluk">
            <UsersRound size={18} />
            Günlük adet
          </a>
          <a href="#menu">
            <ClipboardList size={18} />
            Aylık menü
          </a>
          <a href="#aylik-takip">
            <Table2 size={18} />
            Aylik yemek takibi
          </a>
        </nav>

        <a className="customer-logout" href="/giris">
          <LogOut size={18} />
          Çıkış yap
        </a>
      </aside>

      <section className="customer-main">
        <header className="customer-hero">
          <div>
            <span className="catering-kicker">
              <ChefHat size={16} />
              {formatMonth(serviceDate)} yemek planı
            </span>
            <h1>Bugün kaç kişilik yemek yiyeceğinizi bildirin.</h1>
            <p>Girdiğiniz adet catering firmasının panelindeki günlük toplam ve müşteri satırına anında düşer.</p>
          </div>
          <label className="dashboard-date-filter">
            <CalendarDays size={17} />
            <input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
          </label>
        </header>

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
            <h2>Günlük yemek adedi</h2>
            <p>{request ? `Son bildirilen adet: ${request.headcount}` : "Bugün için henüz adet bildirilmedi."}</p>

            <form className="meal-request-form" onSubmit={submitHeadcount}>
              <label>
                <span>Bugün kaç kişilik yemek yenilecek?</span>
                <input min={1} type="number" value={headcount} onChange={(event) => setHeadcount(event.target.value)} />
              </label>
              <label>
                <span>Not</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Örn: 2 vejetaryen, 1 glutensiz, servis 12:30..." />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              {message ? <p className="form-success">{message}</p> : null}
              <button className="catering-primary-button" type="submit">
                <Send size={18} />
                Catering paneline gönder
              </button>
              {request && request.status === "submitted" ? (
                <button className="catering-secondary-button" type="button" onClick={markEaten}>
                  <CheckCircle2 size={18} />
                  Yemek yenildi
                </button>
              ) : null}
            </form>
          </article>
        </section>

        <section className="monthly-menu-section" id="menu">
          <div className="panel-title-row">
            <div>
              <h2>Aylık yemek listesi</h2>
              <p>Müşteri bu ay hangi gün hangi yemek olduğunu buradan görür.</p>
            </div>
            <span className="month-pill">{formatMonth(serviceDate)}</span>
          </div>

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
                    <small>{menuDay.calories} kcal</small>
                  </article>
                ) : (
                  <div className="monthly-menu-cell empty" key={`empty-${weekIndex}-${dayIndex}`} />
                )
              )
            )}
          </div>
        </section>

        <section className="monthly-menu-section customer-monthly-tracking" id="aylik-takip">
          <div className="panel-title-row">
            <div>
              <h2>Aylik yemek takibi</h2>
              <p>Bu ay hangi gun kac kisilik siparis verdiginizi tablo olarak gorun.</p>
            </div>
            <label className="dashboard-date-filter">
              <CalendarDays size={17} />
              <input type="month" value={trackingMonth} onChange={(event) => setTrackingMonth(event.target.value)} />
            </label>
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
          </div>

          <div className="customer-tracking-table">
            <div className="customer-tracking-head">
              <span>Tarih</span>
              <span>Sipariş adedi</span>
              <span>Açıklama</span>
            </div>

            {isMonthlyLoading ? (
              <p className="empty-state compact">Aylik yemek takibi yukleniyor.</p>
            ) : monthlyRequests.length === 0 ? (
              <p className="empty-state compact">Secili ay icin henuz yemek siparisi verilmedi.</p>
            ) : (
              monthlyRequests.map((monthlyRequest) => (
                <div className="customer-tracking-row" key={monthlyRequest.requestNo}>
                  <span>{formatDate(monthlyRequest.serviceDate)}</span>
                  <strong>{monthlyRequest.headcount} kişilik</strong>
                  <em>{monthlyRequest.serviceDate} tarihinde {monthlyRequest.headcount} kişilik sipariş verilmiştir.</em>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
