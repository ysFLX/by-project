"use client";

import { ArrowRight, Building2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function normalizeCode(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, "-");
}

export function CompanyLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = normalizeCode(code);

    if (!normalizedCode) {
      setError("Üyelik kodunu girmen gerekiyor.");
      return;
    }

    router.push(`/uye/${encodeURIComponent(normalizedCode)}`);
  }

  return (
    <main className="catering-auth-shell">
      <section className="catering-auth-card">
        <span className="catering-kicker">
          <Building2 size={16} />
          Şirket üyelik girişi
        </span>
        <h1>Bugünkü yemek kişi sayınızı bildirin.</h1>
        <p>Catering firmanızın size verdiği üyelik koduyla girin, kişi sayısını gönderin ve yemek sonrası toplama onayı verin.</p>

        <form className="catering-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Üyelik kodu</span>
            <div>
              <KeyRound size={18} />
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="ornek-sirket-kodu" />
            </div>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="catering-primary-button" type="submit">
            Giriş yap
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
