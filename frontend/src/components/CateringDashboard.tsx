import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Factory,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCcw,
  Search,
  Truck,
  UsersRound,
  Utensils
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import type { ClientCompany, MealRequest } from "../lib/types";

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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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

export function CateringDashboard() {
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [serviceDate, setServiceDate] = useState(todayKey());
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCompanyCount = companies.filter((company) => company.active).length;
  const totalHeadcount = requests.reduce((sum, request) => sum + request.headcount, 0);
  const submittedCount = requests.filter((request) => request.status === "submitted").length;
  const collectableCount = requests.filter((request) => request.status === "eaten").length;
  const reportedCompanyCount = new Set(requests.map((request) => request.companyId)).size;
  const missingCompanyCount = Math.max(0, activeCompanyCount - reportedCompanyCount);

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

  async function loadDashboard() {
    setIsLoading(true);
    const [companiesPayload, requestsPayload] = await Promise.all([
      apiFetch<{ companies: ClientCompany[] }>("/client-companies"),
      apiFetch<{ requests: MealRequest[] }>(`/meal-requests?serviceDate=${serviceDate}`)
    ]);

    setCompanies(companiesPayload.companies);
    setRequests(requestsPayload.requests);
    setLastUpdatedAt(formatTime(new Date().toISOString()));
    setIsLoading(false);
  }

  useEffect(() => {
    loadDashboard().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Panel yüklenemedi."));
    const interval = window.setInterval(() => {
      loadDashboard().catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [serviceDate]);

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = await apiFetch<{ company: ClientCompany }>("/client-companies", {
        method: "POST",
        body: {
          name: companyName,
          code: companyCode,
          contactName
        }
      });

      setMessage(`${payload.company.name} üyeliği oluşturuldu. Kod: ${payload.company.code}`);
      setCompanyName("");
      setCompanyCode("");
      setContactName("");
      await loadDashboard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Şirket üyeliği oluşturulamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  async function markCollected(requestNo: string) {
    setIsSaving(true);
    setError("");

    try {
      const payload = await apiFetch<{ request: MealRequest }>(`/meal-requests/${requestNo}`, {
        method: "PATCH",
        body: { status: "collected" }
      });

      setRequests((current) => current.map((request) => (request.requestNo === requestNo ? payload.request : request)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Toplama durumu güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="catering-dashboard-shell admin-dashboard-shell">
      <aside className="admin-sidebar">
        <a className="catering-brand admin-brand" href="/">
          <span>BY</span>
          <div>
            <strong>Catering</strong>
            <small>Admin panel</small>
          </div>
        </a>

        <nav className="admin-nav-list" aria-label="Catering panel menüsü">
          <a className="active" href="/catering">
            <ClipboardList size={18} />
            Günlük talepler
          </a>
          <a href="/giris">
            <Factory size={18} />
            Müşteri girişi
          </a>
        </nav>

        <div className="admin-sidebar-summary">
          <span>Bugünkü toplam</span>
          <strong>{totalHeadcount}</strong>
          <small>yemek / porsiyon</small>
        </div>
      </aside>

      <section className="admin-main-panel">
        <header className="admin-topbar">
          <div>
            <span className="catering-kicker">
              <Truck size={16} />
              Catering operasyon paneli
            </span>
            <h1>Günlük yemek adetleri</h1>
            <p>Müşteri portaldan kaç kişilik yemek alacağını girince bu ekrana otomatik düşer.</p>
          </div>

          <div className="admin-toolbar">
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
            <UsersRound size={24} />
            <span>Yeni gelen</span>
            <strong>{submittedCount}</strong>
            <small>kişi sayısı geldi</small>
          </article>
          <article>
            <BadgeCheck size={24} />
            <span>Toplanabilir</span>
            <strong>{collectableCount}</strong>
            <small>tabak bekliyor</small>
          </article>
          <article>
            <AlertTriangle size={24} />
            <span>Bildirmeyen</span>
            <strong>{missingCompanyCount}</strong>
            <small>aktif müşteri</small>
          </article>
        </section>

        <section className="catering-dashboard-grid admin-content-grid">
          <article className="catering-panel company-admin-card">
            <div className="panel-title-row">
              <div>
                <h2>Şirket Üyeliği</h2>
                <p>Müşteri için giriş kodu oluştur.</p>
              </div>
              <Plus size={20} />
            </div>

            <form className="company-create-form" onSubmit={createCompany}>
              <label>
                <span>Şirket adı</span>
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Örn: Kuzey Teknoloji" />
              </label>
              <label>
                <span>Üyelik kodu</span>
                <input value={companyCode} onChange={(event) => setCompanyCode(event.target.value)} placeholder="Boş bırakılırsa otomatik oluşur" />
              </label>
              <label>
                <span>Yetkili kişi</span>
                <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Opsiyonel" />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              {message ? <p className="form-success">{message}</p> : null}
              <button className="catering-primary-button" type="submit" disabled={isSaving}>
                <Plus size={18} />
                Üyelik oluştur
              </button>
            </form>
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

                      <small className="order-time-cell">{formatTime(request.submittedAt)}</small>

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
      </section>
    </main>
  );
}
