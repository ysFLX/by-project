import { ArrowRight, Building2, LockKeyhole, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { apiFetch } from "../lib/api";

export function CompanyLogin() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { user } = await apiFetch<{
        user: {
          username: string;
          role: "admin" | "customer";
          companyCode?: string;
          displayName: string;
        };
      }>("/auth/login", {
        method: "POST",
        body: { username, password }
      });

      window.localStorage.setItem("maharet-yemek-session", JSON.stringify(user));

      if (user.role === "admin") {
        window.location.href = "/catering";
        return;
      }

      window.location.href = `/uye/${encodeURIComponent(user.companyCode ?? "")}`;
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Kullanici adi veya sifre hatali.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="catering-auth-shell portal-login-shell">
      <section className="portal-login-card">
        <div className="portal-login-visual">
          <span className="catering-kicker">
            <Sparkles size={16} />
            Tek giris ekrani
          </span>
          <h1>Rolune gore dogru panele gir.</h1>
          <p>Admin hesabi catering yonetim paneline, musteri hesabi kendi sirket paneline yonlendirilir.</p>

          <div className="login-proof-grid">
            <article>
              <ShieldCheck size={22} />
              <strong>Admin</strong>
              <span>Uyelik olusturur ve gunluk adetleri gorur</span>
            </article>
            <article>
              <Building2 size={22} />
              <strong>Musteri</strong>
              <span>Gunluk kisi sayisi ve aylik menu</span>
            </article>
          </div>
        </div>

        <form className="catering-auth-form portal-login-form" onSubmit={handleSubmit}>
          <span className="catering-kicker">Giris</span>
          <label>
            <span>Kullanici adi</span>
            <div>
              <UserRound size={18} />
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" />
            </div>
          </label>
          <label>
            <span>Sifre</span>
            <div>
              <LockKeyhole size={18} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="******" />
            </div>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="catering-primary-button" type="submit" disabled={isLoading}>
            {isLoading ? "Giris yapiliyor" : "Giris yap"}
            <ArrowRight size={18} />
          </button>
          <small>Admin: admin / belirlenen sifre. Musteri hesabi admin panelden olusur.</small>
        </form>
      </section>
    </main>
  );
}
