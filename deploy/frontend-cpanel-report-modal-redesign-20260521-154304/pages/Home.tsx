import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  MapPin,
  PackageCheck,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  UsersRound,
} from "lucide-react";

const flow = [
  {
    icon: Building2,
    title: "Şirketleri tanımla",
    text: "Her müşteriye özel giriş kodu ver; kişi sayısı, adres, yetkili ve teslimat notu tek yerde toplansın.",
  },
  {
    icon: UsersRound,
    title: "Sabah adetini al",
    text: "Şirketler günlük yemek sayısını girer, mutfak toplam porsiyonu erken saatte net görür.",
  },
  {
    icon: BadgeCheck,
    title: "Yenildi bilgisini izle",
    text: "Yemekten sonra firmalar tek dokunuşla toplama hazır bilgisini gönderir.",
  },
  {
    icon: PackageCheck,
    title: "Toplama sırasını yönet",
    text: "Ekip hangi noktaya gideceğini, hangisinin beklediğini ve hangisinin bittiğini bilir.",
  },
];

const metrics = [
  { value: "42", label: "bugünkü porsiyon", hint: "Sabah bildirilen toplam adet" },
  { value: "8", label: "aktif şirket", hint: "Günlük sipariş veren müşteri" },
  { value: "5", label: "toplama bekliyor", hint: "Yenildi onayı gelen noktalar" },
  { value: "2 dk", label: "günlük giriş süresi", hint: "Şirketlerin ortalama bildirimi" },
];

const timeline = [
  { icon: CalendarCheck2, time: "08:30", title: "Kişi sayısı alındı", detail: "Beyaz Plaza 18 porsiyon", tone: "ready" },
  { icon: ClipboardList, time: "11:45", title: "Dağıtım planlandı", detail: "3 rota, 8 teslimat noktası", tone: "active" },
  { icon: CheckCircle2, time: "13:20", title: "Yenildi onayı geldi", detail: "5 şirket toplama bekliyor", tone: "done" },
];

const routes = [
  { company: "Beyaz Plaza", area: "Maslak", count: 18, status: "Toplama hazır" },
  { company: "Nova Yazılım", area: "Ataşehir", count: 12, status: "Yemek dağıtıldı" },
  { company: "Kuzey Lojistik", area: "İkitelli", count: 7, status: "Porsiyon bekliyor" },
];

const panels = [
  {
    icon: ShieldCheck,
    title: "Şirket girişleri kontrollü",
    text: "Her müşteriye özel kod verilir. Kim kaç porsiyon istedi, ne zaman onayladı, panelde kayıtlı kalır.",
  },
  {
    icon: Route,
    title: "Ekip için net sıra",
    text: "Toplama bekleyen şirketler ayrılır; ekip boş tabak için nereye gideceğini liste halinde görür.",
  },
  {
    icon: MapPin,
    title: "Adres ve notlar tek yerde",
    text: "Şirket adresi, yetkili kişi, telefon ve teslimat notu operasyon ekranından takip edilir.",
  },
];

const painPoints = [
  "WhatsApp mesajlarından kişi sayısı toplama",
  "Hangi şirket yedi, hangisi bekliyor karışıklığı",
  "Toplama ekibinin sahada yanlış sırayla ilerlemesi",
  "Gün sonunda porsiyon ve teslimat bilgisinin dağınık kalması",
];

const dailyChecklist = [
  { title: "Sabah bildirimleri", text: "Şirketlerden gelen adetler otomatik listelenir." },
  { title: "Dağıtım kontrolü", text: "Porsiyon planı ve teslimat noktaları aynı tabloda görünür." },
  { title: "Yemek sonrası", text: "Toplanabilir onayı gelen firmalar ayrı takip edilir." },
  { title: "Gün sonu kayıt", text: "Hangi şirkete kaç porsiyon gittiği geriye dönük izlenir." },
];

export function Home() {
  return (
    <main className="catering-home-shell">
      <nav className="catering-home-nav" aria-label="Ana navigasyon">
        <a className="catering-brand" href="/">
          <span>MY</span>
          <div>
            <strong>Maharet Yemek</strong>
            <small>Kurumsal yemek operasyonu</small>
          </div>
        </a>
        <div>
          <a href="/giris">Şirket girişi</a>
          <a className="catering-nav-button" href="/giris">
            <Sparkles size={17} />
            Catering Paneli
          </a>
        </div>
      </nav>

      <section className="catering-hero-section">
        <div className="catering-hero-copy">
          <span className="catering-kicker">
            <Truck size={16} />
            Şirketlere yemek dağıtan firmalar için
          </span>
          <h1>Catering operasyonunu sabah adetinden tabak toplamaya kadar yönet.</h1>
          <p>
            Müşteri şirketler günlük kişi sayısını girer. Sen porsiyonu planlar, teslimat durumunu izler, yemek sonrası
            toplama listesini aynı ekrandan yönetirsin.
          </p>
          <div className="hero-proof-row" aria-label="Operasyon kapsamı">
            <span>Günlük porsiyon</span>
            <span>Şirket üyeliği</span>
            <span>Toplama listesi</span>
          </div>
          <div className="catering-hero-actions">
            <a className="catering-primary-button" href="/giris">
              Paneli aç
              <ArrowRight size={18} />
            </a>
            <a className="catering-secondary-button" href="/giris">
              Şirket girişini dene
            </a>
          </div>
        </div>

        <aside className="catering-live-card" aria-label="Catering operasyon özeti">
          <div className="live-card-top live-dashboard-head">
            <div>
              <span>Bugünkü operasyon</span>
              <strong>Dağıtım durumu</strong>
            </div>
            <em>Canlı</em>
          </div>
          <div className="live-dashboard-stats">
            <article>
              <strong>42</strong>
              <span>Porsiyon</span>
            </article>
            <article>
              <strong>8</strong>
              <span>Şirket</span>
            </article>
            <article>
              <strong>5</strong>
              <span>Toplama</span>
            </article>
          </div>
          <div className="live-card-grid">
            {timeline.map((item) => {
              const Icon = item.icon;

              return (
                <article className={`timeline-${item.tone}`} key={item.title}>
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
          <div className="route-preview-list">
            {routes.slice(0, 2).map((route) => (
              <article key={route.company}>
                <span>{route.company}</span>
                <strong>{route.count} kişi</strong>
                <em>{route.status}</em>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="catering-metric-strip" aria-label="Ürün metrikleri">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
            <small>{metric.hint}</small>
          </article>
        ))}
      </section>

      <section className="catering-ops-section" id="takip" aria-label="Canlı operasyon görünümü">
        <div className="catering-ops-table">
          <div className="section-title-row">
            <div>
              <span className="catering-kicker">Canlı takip</span>
              <h2>Bugünün şirket listesi</h2>
            </div>
            <a className="catering-secondary-button" href="/giris">
              Tümünü gör
            </a>
          </div>
          <div className="ops-table-head">
            <span>Şirket</span>
            <span>Bölge</span>
            <span>Porsiyon</span>
            <span>Durum</span>
          </div>
          {routes.map((route) => (
            <article className="ops-table-row" key={route.company}>
              <strong>{route.company}</strong>
              <span>{route.area}</span>
              <span>{route.count} kişi</span>
              <em>{route.status}</em>
            </article>
          ))}
        </div>

        <div className="catering-feature-stack">
          {panels.map((panel) => {
            const Icon = panel.icon;

            return (
              <article key={panel.title}>
                <Icon size={22} />
                <div>
                  <strong>{panel.title}</strong>
                  <p>{panel.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="catering-detail-section" aria-label="Catering operasyon detayları">
        <div className="catering-detail-copy">
          <span className="catering-kicker">
            <FileSpreadsheet size={16} />
            Dağınık takibi toparla
          </span>
          <h2>Telefon, mesaj ve defter arasında kalan günlük operasyonu tek düzene indir.</h2>
          <p>
            Maharet Yemek, şirket yemek hizmetinde en çok kaçan dört noktayı sade bir akışa bağlar: adet bildirimi,
            dağıtım planı, yenildi onayı ve tabak toplama.
          </p>
        </div>
        <div className="catering-pain-list">
          {painPoints.map((item) => (
            <article key={item}>
              <CheckCircle2 size={20} />
              <span>{item}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="daily-checklist-grid" aria-label="Günlük kullanım planı">
        {dailyChecklist.map((item, index) => (
          <article key={item.title}>
            <span>{index + 1}</span>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="catering-flow-grid" id="akis" aria-label="Catering iş akışı">
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
