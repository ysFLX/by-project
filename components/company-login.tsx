"use client";

import { ArrowRight, Building2, LockKeyhole, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authenticateDemoUser } from "@/lib/catering-demo-store";

export function CompanyLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const user = authenticateDemoUser({ username, password });

    if (!user) {
      setError("Kullanıcı adı veya şifre hatalı.");
      return;
    }

    if (user.role === "admin") {
      router.push("/catering");
      return;
    }

    router.push(`/uye/${encodeURIComponent(user.companyCode ?? "")}`);
  }

  return (
    <main className="catering-auth-shell portal-login-shell">
      <section className="portal-login-card">
        <div className="portal-login-visual">
          <span className="catering-kicker">
            <Sparkles size={16} />
            Tek giriş ekranı
          </span>
          <h1>Rolüne göre doğru panele gir.</h1>
          <p>Admin hesabı catering yönetim paneline, müşteri hesabı kendi şirket paneline yönlendirilir.</p>

          <div className="login-proof-grid">
            <article>
              <ShieldCheck size={22} />
              <strong>Admin</strong>
              <span>Üyelik oluşturur ve günlük adetleri görür</span>
            </article>
            <article>
              <Building2 size={22} />
              <strong>Müşteri</strong>
              <span>Günlük kişi sayısı ve aylık menü</span>
            </article>
          </div>
        </div>

        <form className="catering-auth-form portal-login-form" onSubmit={handleSubmit}>
          <span className="catering-kicker">Giriş</span>
          <label>
            <span>Kullanıcı adı</span>
            <div>
              <UserRound size={18} />
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" />
            </div>
          </label>
          <label>
            <span>Şifre</span>
            <div>
              <LockKeyhole size={18} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••" />
            </div>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="catering-primary-button" type="submit">
            Giriş yap
            <ArrowRight size={18} />
          </button>
          <small>Demo: admin/admin123 veya aytek/123456 · Canlı deploy testi aktif</small>
        </form>
      </section>
    </main>
  );
}
