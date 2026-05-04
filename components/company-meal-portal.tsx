"use client";

import { BadgeCheck, CalendarDays, CheckCircle2, Clock3, Loader2, PackageCheck, Send, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ClientCompany, MealRequest } from "@/lib/catering-types";

type Props = {
  companyCode: string;
};

const statusCopy = {
  submitted: {
    label: "Kişi sayısı gönderildi",
    text: "Catering firması bugünkü porsiyon sayınızı görüyor.",
    icon: Clock3
  },
  eaten: {
    label: "Yemek yenildi",
    text: "Boş tabaklar toplanabilir olarak işaretlendi.",
    icon: BadgeCheck
  },
  collected: {
    label: "Tabaklar toplandı",
    text: "Catering firması toplama işlemini tamamladı.",
    icon: PackageCheck
  }
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function CompanyMealPortal({ companyCode }: Props) {
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [request, setRequest] = useState<MealRequest | null>(null);
  const [serviceDate, setServiceDate] = useState(todayKey());
  const [headcount, setHeadcount] = useState("1");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const status = request ? statusCopy[request.status] : null;
  const StatusIcon = status?.icon ?? UsersRound;
  const canEditHeadcount = !request || request.status === "submitted";

  const helperText = useMemo(() => {
    if (!request) {
      return "Sabah servis başlamadan önce bugünkü yemek alacak kişi sayısını gönderin.";
    }

    if (request.status === "submitted") {
      return "Yemek yenene kadar kişi sayısını güncelleyebilirsiniz.";
    }

    return "Yemek yenildi onayından sonra kişi sayısı kilitlenir.";
  }, [request]);

  async function loadPortalData() {
    setIsLoading(true);
    setError("");

    const companyResponse = await fetch(`/api/client-companies/${companyCode}`, { cache: "no-store" });
    const companyPayload = await companyResponse.json();

    if (!companyResponse.ok) {
      setCompany(null);
      setRequest(null);
      setError(companyPayload.message ?? "Şirket üyeliği bulunamadı.");
      setIsLoading(false);
      return;
    }

    setCompany(companyPayload.company);

    const requestResponse = await fetch(`/api/meal-requests?companyCode=${companyCode}&serviceDate=${serviceDate}`, { cache: "no-store" });
    const requestPayload = await requestResponse.json();
    const currentRequest = requestPayload.requests?.[0] ?? null;

    setRequest(currentRequest);

    if (currentRequest) {
      setHeadcount(String(currentRequest.headcount));
      setNote(currentRequest.note ?? "");
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadPortalData();
  }, [companyCode, serviceDate]);

  async function submitHeadcount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const response = await fetch("/api/meal-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyCode,
        serviceDate,
        headcount: Number(headcount),
        note
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.message ?? "Kişi sayısı gönderilemedi.");
      setIsSaving(false);
      return;
    }

    setRequest(payload.request);
    setIsSaving(false);
  }

  async function markEaten() {
    if (!request) {
      return;
    }

    setIsSaving(true);
    setError("");

    const response = await fetch(`/api/meal-requests/${request.requestNo}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "eaten" })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.message ?? "Yemek yenildi onayı verilemedi.");
      setIsSaving(false);
      return;
    }

    setRequest(payload.request);
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="catering-member-shell">
        <div className="catering-loading-card">
          <Loader2 size={22} />
          Üyelik bilgisi yükleniyor...
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="catering-member-shell">
        <section className="catering-member-card">
          <span className="catering-kicker">Üyelik bulunamadı</span>
          <h1>Bu kodla kayıtlı şirket yok.</h1>
          <p>{error || "Catering firmanızdan doğru üyelik kodunu isteyin."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="catering-member-shell">
      <section className="catering-member-card">
        <div className="member-card-head">
          <div>
            <span className="catering-kicker">
              <CalendarDays size={16} />
              Günlük yemek bildirimi
            </span>
            <h1>{company.name}</h1>
            <p>{helperText}</p>
          </div>
          <div className="member-code-pill">Kod: {company.code}</div>
        </div>

        <div className={`meal-status-card status-${request?.status ?? "empty"}`}>
          <span>
            <StatusIcon size={28} />
          </span>
          <div>
            <strong>{status?.label ?? "Bugün için kayıt yok"}</strong>
            <small>{status?.text ?? "Kişi sayısını gönderdiğinizde catering paneline düşecek."}</small>
          </div>
        </div>

        <form className="meal-request-form" onSubmit={submitHeadcount}>
          <label>
            <span>Servis tarihi</span>
            <input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
          </label>
          <label>
            <span>Bugün kaç kişilik yemek alınacak?</span>
            <input min={1} type="number" value={headcount} onChange={(event) => setHeadcount(event.target.value)} disabled={!canEditHeadcount} />
          </label>
          <label className="meal-note-field">
            <span>Not</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Örn: 2 vejetaryen porsiyon, teslimat 12:30..." disabled={!canEditHeadcount} />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="meal-form-actions">
            <button className="catering-primary-button" type="submit" disabled={isSaving || !canEditHeadcount}>
              <Send size={18} />
              {request ? "Kişi sayısını güncelle" : "Kişi sayısını gönder"}
            </button>
            <button className="catering-secondary-button" type="button" onClick={markEaten} disabled={isSaving || !request || request.status !== "submitted"}>
              <CheckCircle2 size={18} />
              Yemek yenildi, tabaklar toplanabilir
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
