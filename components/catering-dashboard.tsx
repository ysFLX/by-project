"use client";

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
  Edit3,
  Factory,
  LayoutDashboard,
  Loader2,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Trash2,
  Truck,
  UserPlus,
  Users,
  Utensils,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createDemoCompany,
  deleteDemoCompany,
  listDemoCompanies,
  listDemoRequests,
  updateDemoCompany,
  updateDemoRequestStatus,
  type DemoCompany,
  type DemoMealRequest
} from "@/lib/catering-demo-store";

type AdminView = "overview" | "companies" | "menu" | "reports" | "settings";

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
  { id: "reports", label: "Raporlar", icon: BarChart3 },
  { id: "settings", label: "Ayarlar", icon: Settings }
] satisfies { id: AdminView; label: string; icon: typeof LayoutDashboard }[];

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

function getCompanyInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

export function CateringDashboard() {
  const [adminView, setAdminView] = useState<AdminView>("overview");
  const [companies, setCompanies] = useState<DemoCompany[]>([]);
  const [requests, setRequests] = useState<DemoMealRequest[]>([]);
  const [serviceDate, setServiceDate] = useState(todayKey());
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [editName, setEditName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? null;
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

  function selectCompany(company: DemoCompany | null) {
    if (!company) {
      setSelectedCompanyId("");
      setEditName("");
      setEditContactName("");
      setEditPhone("");
      setEditEmail("");
      setEditAddress("");
      setEditTaxNumber("");
      setEditNotes("");
      return;
    }

    setSelectedCompanyId(company.id);
    setEditName(company.name);
    setEditContactName(company.contactName ?? "");
    setEditPhone(company.phone ?? "");
    setEditEmail(company.email ?? "");
    setEditAddress(company.address ?? "");
    setEditTaxNumber(company.taxNumber ?? "");
    setEditNotes(company.notes ?? "");
  }

  function loadDashboard() {
    setIsLoading(true);
    const nextCompanies = listDemoCompanies();
    setCompanies(nextCompanies);
    setRequests(listDemoRequests({ serviceDate }));
    setLastUpdatedAt(formatTime(new Date().toISOString()));

    if (!selectedCompanyId && nextCompanies[0]) {
      selectCompany(nextCompanies[0]);
    }

    if (selectedCompanyId && !nextCompanies.some((company) => company.id === selectedCompanyId)) {
      selectCompany(nextCompanies[0] ?? null);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 5000);

    return () => window.clearInterval(interval);
  }, [serviceDate]);

  function resetCreateForm() {
    setCompanyName("");
    setUsername("");
    setPassword("");
    setContactName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setTaxNumber("");
    setNotes("");
  }

  function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const company = createDemoCompany({
        name: companyName,
        username,
        password,
        contactName,
        phone,
        email,
        address,
        taxNumber,
        notes
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

  function saveCompanyDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCompany) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const updatedCompany = updateDemoCompany(selectedCompany.id, {
        name: editName,
        contactName: editContactName,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
        taxNumber: editTaxNumber,
        notes: editNotes
      });

      setMessage(`${updatedCompany.name} bilgileri güncellendi.`);
      loadDashboard();
      selectCompany(updatedCompany);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Şirket bilgileri güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  function removeCompany(company: DemoCompany) {
    const confirmed = window.confirm(`${company.name} üyeliğini silmek istiyor musun? Bu demo panelde şirkete ait günlük bildirimler de kaldırılır.`);

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      deleteDemoCompany(company.id);
      setMessage(`${company.name} üyeliği silindi.`);
      selectCompany(null);
      loadDashboard();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Şirket silinemedi.");
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

  const pageTitle =
    adminView === "companies"
      ? "Üye şirket yönetimi"
      : adminView === "menu"
        ? "Aylık menü planı"
        : adminView === "reports"
          ? "Operasyon raporları"
          : adminView === "settings"
            ? "Panel ayarları"
            : "Catering yönetim paneli";

  const pageDescription =
    adminView === "companies"
      ? "Müşteri şirketleri, yetkili kişileri, adresleri ve iletişim bilgilerini tek yerden yönet."
      : adminView === "menu"
        ? "Müşterinin göreceği aylık yemek listesini kontrol et."
        : adminView === "reports"
          ? "Günlük adetler, bildirim oranı ve operasyon yükünü takip et."
          : adminView === "settings"
            ? "Demo panel görünümü ve operasyon tercihlerini düzenle."
            : "Üyelikleri oluştur, şirketlerin günlük yemek adetlerini takip et ve operasyonu tek ekrandan yönet.";

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
          {adminViews.map((view) => {
            const Icon = view.icon;

            return (
              <button className={adminView === view.id ? "active" : ""} type="button" key={view.id} onClick={() => setAdminView(view.id)}>
                <Icon size={18} />
                {view.label}
              </button>
            );
          })}
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

        {message ? <p className="form-success admin-flash">{message}</p> : null}
        {error ? <p className="form-error admin-flash">{error}</p> : null}

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
                      <button className="admin-danger-button" type="button" onClick={() => removeCompany(selectedCompany)} disabled={isSaving}>
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

        {adminView === "reports" ? (
          <section className="admin-section-panel admin-control-grid">
            <article>
              <Users size={24} />
              <span>Bildirim oranı</span>
              <strong>{activeCompanyCount ? Math.round((reportedCompanyCount / activeCompanyCount) * 100) : 0}%</strong>
              <small>seçili günde adet bildiren şirket</small>
            </article>
            <article>
              <Utensils size={24} />
              <span>Ortalama porsiyon</span>
              <strong>{reportedCompanyCount ? Math.round(totalHeadcount / reportedCompanyCount) : 0}</strong>
              <small>bildirim yapan firma başına</small>
            </article>
            <article>
              <AlertTriangle size={24} />
              <span>Takip gerektiren</span>
              <strong>{missingCompanyCount}</strong>
              <small>henüz adet bildirmeyen aktif firma</small>
            </article>
          </section>
        ) : null}

        {adminView === "settings" ? (
          <section className="admin-section-panel admin-settings-panel">
            <article>
              <Settings size={24} />
              <div>
                <strong>Frontend demo modu</strong>
                <small>Veriler tarayıcı localStorage alanında tutuluyor.</small>
              </div>
            </article>
            <article>
              <Factory size={24} />
              <div>
                <strong>Firma paneli</strong>
                <small>Admin kullanıcı: admin / admin123</small>
              </div>
            </article>
            <article>
              <Users size={24} />
              <div>
                <strong>Müşteri paneli</strong>
                <small>Örnek kullanıcı: aytek / 123456</small>
              </div>
            </article>
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
              <div className="detail-form-grid">
                <label>
                  <span>Şirket adı</span>
                  <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Örn: Kuzey Teknoloji" autoFocus />
                </label>
                <label>
                  <span>Kullanıcı adı</span>
                  <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Örn: kuzey" />
                </label>
                <label>
                  <span>Şifre</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="En az 4 karakter" />
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
                  <span>Vergi numarası</span>
                  <input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} placeholder="Vergi / cari no" />
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
