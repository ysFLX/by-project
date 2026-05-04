import { ArrowRight, BadgeCheck, Building2, CalendarCheck2, ClipboardList, PackageCheck, Truck, UsersRound } from "lucide-react";

const flow = [
  {
    icon: Building2,
    title: "Şirket üyeliği ver",
    text: "Catering firması yemek verdiği her şirkete tek bir üyelik kodu oluşturur."
  },
  {
    icon: UsersRound,
    title: "Günlük kişi sayısı gelsin",
    text: "Şirket sabah siteye girip bugün kaç kişilik yemek alacağını bildirir."
  },
  {
    icon: BadgeCheck,
    title: "Yemek yenildi onayı",
    text: "Yemekten sonra şirket tek tuşla tabakların toplanabilir olduğunu işaretler."
  },
  {
    icon: PackageCheck,
    title: "Toplama operasyonu",
    text: "Catering ekibi hangi şirketten boş tabak toplanacağını panelden görür."
  }
];

const metrics = [
  { value: "B2B", label: "catering odağı" },
  { value: "1 kod", label: "şirket üyeliği" },
  { value: "2 adım", label: "adet + yenildi" },
  { value: "canlı", label: "operasyon paneli" }
];

export function Home() {
  return (
    <main className="catering-home-shell">
      <nav className="catering-home-nav" aria-label="Ana navigasyon">
        <a className="catering-brand" href="/">
          <span>BY</span>
          <div>
            <strong>BY Catering</strong>
            <small>Kurumsal yemek operasyonu</small>
          </div>
        </a>
        <div>
          <a href="/giris">Şirket girişi</a>
          <a className="catering-nav-button" href="/catering">
            Catering paneli
          </a>
        </div>
      </nav>

      <section className="catering-hero-section">
        <div className="catering-hero-copy">
          <span className="catering-kicker">
            <Truck size={16} />
            Şirketlere yemek dağıtan firmalar için
          </span>
          <h1>Her sabah kaç porsiyon çıkacağını net gör, yemekten sonra toplama sırasını kaçırma.</h1>
          <p>
            Şirket üyeliği üzerinden çalışan sade bir catering akışı: şirket kişi sayısını girer, catering porsiyonu
            planlar, yemek sonrası tabak toplama onayı düşer.
          </p>
          <div className="catering-hero-actions">
            <a className="catering-primary-button" href="/catering">
              Paneli aç
              <ArrowRight size={18} />
            </a>
            <a className="catering-secondary-button" href="/giris">
              Şirket girişini dene
            </a>
          </div>
        </div>

        <aside className="catering-live-card" aria-label="Catering operasyon özeti">
          <div className="live-card-top">
            <span>Bugünkü operasyon</span>
            <strong>Yemek dağıtımı</strong>
          </div>
          <div className="live-card-grid">
            <article>
              <CalendarCheck2 size={20} />
              <span>Sabah</span>
              <strong>Kişi sayısı</strong>
            </article>
            <article>
              <ClipboardList size={20} />
              <span>Öğlen</span>
              <strong>Porsiyon planı</strong>
            </article>
            <article>
              <PackageCheck size={20} />
              <span>Yemek sonrası</span>
              <strong>Toplanabilir</strong>
            </article>
          </div>
        </aside>
      </section>

      <section className="catering-metric-strip" aria-label="Ürün metrikleri">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="catering-flow-grid" aria-label="Catering iş akışı">
        {flow.map((item, index) => {
          const Icon = item.icon;

          return (
            <article key={item.title}>
              <span>0{index + 1}</span>
              <Icon size={24} />
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
