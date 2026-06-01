import { ArrowRight, Building2, LockKeyhole, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { FeedbackModal } from "../components/FeedbackModal";
import { apiFetch } from "../services/api";
import { setPageTitle } from "../services/page-title";
import { saveSession } from "../services/session";

export function CompanyLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPageTitle();
  }, []);

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

      saveSession(user);

      if (user.role === "admin") {
        window.location.href = "/catering";
        return;
      }

      window.location.href = `/uye/${encodeURIComponent(user.companyCode ?? "")}`;
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Kullanıcı adı veya şifre hatalı.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="catering-auth-shell portal-login-shell">
      <section className="portal-login-card">
        <div className="portal-login-visual">
          <span className="portal-login-logo">
            <img src="/maharet-yemek.png" alt="" />
          </span>
          <span className="catering-kicker">
            <Sparkles size={16} />
            Maharet Yemek paneli
          </span>
          <h1>Maharet Yemek’e hoş geldiniz.</h1>
          <p>Günlük yemek adetleri, aylık takip ve tahsilat raporları tek panelden yönetilir.</p>

          <div className="login-proof-grid">
            <article>
              <ShieldCheck size={22} />
              <strong>Yönetim</strong>
              <span>Firmaları, bildirimleri ve raporları takip eder</span>
            </article>
            <article>
              <Building2 size={22} />
              <strong>Üye firma</strong>
              <span>Günlük kişi sayısını ve aylık yemeklerini görür</span>
            </article>
          </div>
        </div>

        <form className="catering-auth-form portal-login-form" onSubmit={handleSubmit}>
          <span className="catering-kicker">Güvenli giriş</span>
          <label>
            <span>Kullanıcı adı</span>
            <div>
              <UserRound size={18} />
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Kullanıcı adınız" />
            </div>
          </label>
          <label>
            <span>Şifre</span>
            <div>
              <LockKeyhole size={18} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="******" />
            </div>
          </label>
          <button className="catering-primary-button" type="submit" disabled={isLoading}>
            {isLoading ? "Giriş yapılıyor" : "Giriş yap"}
            <ArrowRight size={18} />
          </button>
          <small>Maharet Yemek yönetimi ve üye firmalar aynı ekrandan giriş yapar.</small>
        </form>
      </section>
      {error ? <FeedbackModal tone="error" message={error} onClose={() => setError("")} /> : null}
    </main>
  );
}
