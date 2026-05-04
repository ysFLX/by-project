"use client";

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
  UserPlus,
  Utensils,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createDemoCompany,
  listDemoCompanies,
  listDemoRequests,
  updateDemoRequestStatus,
  type DemoCompany,
  type DemoMealRequest
} from "@/lib/catering-demo-store";

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

function formatTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function CateringDashboard() {
  const [companies, setCompanies] = useState<DemoCompany[]>([]);
  const [requests, setRequests] = useState<DemoMealRequest[]>([]);
  const [serviceDate, setServiceDate] = useState(todayKey());
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCompanyCount = companies.filter((company) => company.active).length;
  const totalHeadcount = requests.reduce((sum, request) => sum + request.headcount, 0);
  const submittedCount = requests.filter((request) => request.status === "submitted").length;
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

  function loadDashboard() {
    setIsLoading(true);
    setCompanies(listDemoCompanies());
    setRequests(listDemoRequests({ serviceDate }));
    setLastUpdatedAt(formatTime(new Date().toISOString()));
    setIsLoading(false);
  }

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 5000);

    return () => window.clearInterval(interval);
  }, [serviceDate]);

  function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const company = createDemoCompany({
        name: companyName,
        code: companyCode,
        contactName
      });

      setMessage(`${company.name} üyeliği oluşturuldu. Kod: ${company.code}`);
      setCompanyName("");
      setCompanyCode("");
      setContactName("");
      setIsCreateOpen(false);
      loadDashboard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Şirket üyeliği oluşturulamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  function markCollected(requestNo: string) {
    setIsSaving(true);
    setError("");
    const updatedRequest = updateDemoRequestStatus(requestNo, "collected");
    setRequests((current) => current.map((request) => (request.requestNo === requestNo && updatedRequest ? updatedRequest : request)));
    setIsSaving(false);
  }

  function openCreateModal() {
    setError("");
    setMessage("");
    setIsCreateOpen(true);
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
            <h1>Catering yönetim paneli</h1>
            <p>Üyelikleri oluştur, şirketlerin günlük yemek adetlerini takip et ve operasyonu tek ekrandan yönet.</p>
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

        <section className="catering-dashboard-grid admin-content-grid">
          <article className="catering-panel company-admin-card">
            <div className="company-admin-hero">
              <div>
                <span className="catering-kicker">
                  <UserPlus size={16} />
                  Kullanıcı yönetimi
                </span>
                <h2>Şirket üyelikleri</h2>
                <p>Yeni müşteri hesabı oluştur, giriş kodunu ver ve aktif üyeleri takip et.</p>
              </div>
              <strong>{activeCompanyCount}</strong>
            </div>

            {message ? <p className="form-success">{message}</p> : null}

            <button className="create-user-button" type="button" onClick={openCreateModal}>
              <span>
                <Plus size={18} />
              </span>
              Yeni kullanıcı oluştur
            </button>

            <div className="company-mini-list">
              <span>Aktif üyeler</span>
              {companies.slice(0, 6).map((company) => (
                <div key={company.id}>
                  <span className="company-avatar">{company.name.slice(0, 2).toLocaleUpperCase("tr-TR")}</span>
                  <strong>{company.name}</strong>
                  <small>{company.code}</small>
                </div>
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
      </section>

      {isCreateOpen ? (
        <div className="admin-modal-backdrop" role="presentation">
          <section className="admin-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-company-title">
            <button className="modal-close-button" type="button" onClick={() => setIsCreateOpen(false)} aria-label="Kapat">
              <X size={20} />
            </button>

            <div className="create-modal-visual">
              <span className="catering-kicker">
                <UserPlus size={16} />
                Yeni müşteri hesabı
              </span>
              <h2 id="create-company-title">Şirket için giriş hesabı oluştur.</h2>
              <p>Bu ekrandan oluşan kod müşterinin giriş ekranında kullanacağı demo üyelik kodudur.</p>

              <div className="create-modal-steps">
                <span>1</span>
                <strong>Bilgileri yaz</strong>
                <span>2</span>
                <strong>Kodu müşteriye ver</strong>
                <span>3</span>
                <strong>Panelde günlük adetleri izle</strong>
              </div>
            </div>

            <form className="company-create-form modal-company-form" onSubmit={createCompany}>
              <label>
                <span>Şirket adı</span>
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Örn: Kuzey Teknoloji" autoFocus />
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
              <button className="catering-primary-button" type="submit" disabled={isSaving}>
                <Plus size={18} />
                Kullanıcıyı oluştur
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
