import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageCheck,
  Truck,
  UsersRound
} from "lucide-react";

const flow = [
  {
    icon: Building2,
    title: "Şirketleri tanımla",
    text: "Her müşteriye özel giriş kodu ver; kişi sayısı ve durumlar tek panelde toplansın."
  },
  {
    icon: UsersRound,
    title: "Sabah adetini al",
    text: "Şirketler günlük yemek sayısını girer, mutfak toplam porsiyonu net görür."
  },
  {
    icon: BadgeCheck,
    title: "Yenildi bilgisini izle",
    text: "Yemekten sonra firmalar tek dokunuşla toplama hazır bilgisini gönderir."
  },
  {
    icon: PackageCheck,
    title: "Toplama sırasını yönet",
    text: "Ekip hangi noktaya gideceğini, hangisinin beklediğini ve hangisinin bittiğini bilir."
  }
];

const metrics = [
  { value: "42", label: "bugünkü porsiyon" },
  { value: "8", label: "aktif şirket" },
  { value: "5", label: "toplama bekliyor" },
  { value: "2 dk", label: "günlük giriş süresi" }
];

const timeline = [
  { icon: CalendarCheck2, time: "08:30", title: "Kişi sayısı alındı", detail: "Beyaz Plaza 18 porsiyon" },
  { icon: ClipboardList, time: "11:45", title: "Dağıtım planlandı", detail: "3 rota, 8 teslimat noktası" },
  { icon: CheckCircle2, time: "13:20", title: "Yenildi onayı geldi", detail: "5 şirket toplama bekliyor" }
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
          <h1>Günlük porsiyon ve toplama takibini tek ekranda yönet.</h1>
          <p>
            Müşteri şirketler sabah kişi sayısını girer. Catering ekibi toplam porsiyonu, yenildi onaylarını ve toplama
            sırasını canlı panelden takip eder.
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
            <strong>Dağıtım durumu</strong>
          </div>
          <div className="live-card-grid">
            {timeline.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title}>
                  <Icon size={20} />
                  <div>
                    <span>{item.time}</span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="live-card-note">
            <Clock3 size={18} />
            <span>Son güncelleme: bugün 13:24</span>
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
