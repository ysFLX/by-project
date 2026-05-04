import { BadgeCheck, Building2, CalendarDays, ClipboardCheck, Loader2, PackageCheck, Plus, Truck, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import type { ClientCompany, MealRequest } from "../lib/types";

const statusLabels = {
  submitted: "Kişi sayısı geldi",
  eaten: "Toplanabilir",
  collected: "Toplandı"
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function CateringDashboard() {
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [serviceDate, setServiceDate] = useState(todayKey());
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalHeadcount = requests.reduce((sum, request) => sum + request.headcount, 0);
  const collectableCount = requests.filter((request) => request.status === "eaten").length;
  const collectedCount = requests.filter((request) => request.status === "collected").length;
  const missingCompanyCount = Math.max(0, companies.filter((company) => company.active).length - new Set(requests.map((request) => request.companyId)).size);

  const requestRows = useMemo(() => {
    return [...requests].sort((first, second) => {
      if (first.status === "eaten" && second.status !== "eaten") {
        return -1;
      }

      if (first.status !== "eaten" && second.status === "eaten") {
        return 1;
      }

      return first.companyName.localeCompare(second.companyName, "tr-TR");
    });
  }, [requests]);

  async function loadDashboard() {
    setIsLoading(true);
    const [companiesPayload, requestsPayload] = await Promise.all([
      apiFetch<{ companies: ClientCompany[] }>("/client-companies"),
      apiFetch<{ requests: MealRequest[] }>(`/meal-requests?serviceDate=${serviceDate}`)
    ]);

    setCompanies(companiesPayload.companies);
    setRequests(requestsPayload.requests);
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
    <main className="catering-dashboard-shell">
      <section className="catering-dashboard-hero">
        <div>
          <span className="catering-kicker">
            <Truck size={16} />
            Catering operasyon paneli
          </span>
          <h1>Şirketlerden gelen günlük porsiyon sayıları tek ekranda.</h1>
          <p>Üyelik oluştur, sabah kişi sayılarını takip et, yemek sonrası toplanabilir tabakları işaretle.</p>
        </div>
        <label className="dashboard-date-filter">
          <CalendarDays size={17} />
          <input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
        </label>
      </section>

      <section className="catering-metric-grid">
        <article>
          <UsersRound size={24} />
          <span>Bugünkü porsiyon</span>
          <strong>{totalHeadcount}</strong>
        </article>
        <article>
          <Building2 size={24} />
          <span>Üye şirket</span>
          <strong>{companies.length}</strong>
        </article>
        <article>
          <BadgeCheck size={24} />
          <span>Toplanabilir</span>
          <strong>{collectableCount}</strong>
        </article>
        <article>
          <PackageCheck size={24} />
          <span>Toplandı</span>
          <strong>{collectedCount}</strong>
        </article>
      </section>

      <section className="catering-dashboard-grid">
        <article className="catering-panel">
          <div className="panel-title-row">
            <div>
              <h2>Şirket Üyeliği Oluştur</h2>
              <p>Bu kodu yemek alan şirkete ver; şirket bu kodla giriş yapacak.</p>
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
              <input value={companyCode} onChange={(event) => setCompanyCode(event.target.value)} placeholder="Boş bırakırsan otomatik oluşur" />
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

        <article className="catering-panel">
          <div className="panel-title-row">
            <div>
              <h2>Bugünkü Yemek Talepleri</h2>
              <p>{missingCompanyCount} şirket henüz kişi sayısı bildirmedi.</p>
            </div>
            {isLoading ? <Loader2 size={20} /> : <ClipboardCheck size={20} />}
          </div>

          <div className="meal-request-list">
            {requestRows.length === 0 ? (
              <p className="empty-state">Bugün için henüz yemek adedi girilmedi.</p>
            ) : (
              requestRows.map((request) => (
                <div className={`meal-request-row status-${request.status}`} key={request.requestNo}>
                  <div>
                    <strong>{request.companyName}</strong>
                    <small>
                      {request.requestNo} · {request.headcount} kişi
                    </small>
                    {request.note ? <em>{request.note}</em> : null}
                  </div>
                  <span>{statusLabels[request.status]}</span>
                  <button className="catering-secondary-button" type="button" onClick={() => markCollected(request.requestNo)} disabled={isSaving || request.status !== "eaten"}>
                    Toplandı
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
