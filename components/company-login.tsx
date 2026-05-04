"use client";

import { ArrowRight, Building2, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getDemoCompanyByCode, normalizeCode } from "@/lib/catering-demo-store";

export function CompanyLogin() {
  const router = useRouter();
  const [code, setCode] = useState("aytek");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = normalizeCode(code);
    const company = getDemoCompanyByCode(normalizedCode);

    if (!normalizedCode) {
      setError("Üyelik kodunu girmen gerekiyor.");
      return;
    }

    if (!company) {
      setError("Bu kodla kayıtlı aktif şirket bulunamadı. Demo için aytek kodunu deneyebilirsin.");
      return;
    }

    router.push(`/uye/${encodeURIComponent(company.code)}`);
  }

  return (
    <main className="catering-auth-shell portal-login-shell">
      <section className="portal-login-card">
        <div className="portal-login-visual">
          <span className="catering-kicker">
            <Sparkles size={16} />
            Şirket müşteri portalı
          </span>
          <h1>Günlük yemek bildirimi için giriş yap.</h1>
          <p>Size verilen üyelik koduyla girin; bugünkü kişi sayısını ve aylık yemek listesini kendi panelinizden yönetin.</p>

          <div className="login-proof-grid">
            <article>
              <ShieldCheck size={22} />
              <strong>Üyelik kodu</strong>
              <span>Catering panelinden oluşturulur</span>
            </article>
            <article>
              <Building2 size={22} />
              <strong>Müşteri paneli</strong>
              <span>Günlük adet ve aylık menü</span>
            </article>
          </div>
        </div>

        <form className="catering-auth-form portal-login-form" onSubmit={handleSubmit}>
          <span className="catering-kicker">Giriş</span>
          <label>
            <span>Üyelik kodu</span>
            <div>
              <KeyRound size={18} />
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="ornek-sirket-kodu" />
            </div>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="catering-primary-button" type="submit">
            Müşteri paneline gir
            <ArrowRight size={18} />
          </button>
          <small>Demo kodları: aytek, kuzey-lojistik, orion-tekstil</small>
        </form>
      </section>
    </main>
  );
}
