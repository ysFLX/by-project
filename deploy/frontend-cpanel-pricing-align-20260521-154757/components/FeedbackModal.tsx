import { AlertTriangle, CheckCircle2, X } from "lucide-react";

type Props = {
  message: string;
  tone: "success" | "error";
  onClose: () => void;
};

export function FeedbackModal({ message, tone, onClose }: Props) {
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div className="admin-modal-backdrop feedback-modal-backdrop" role="presentation">
      <section className={`feedback-modal ${tone}`} role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title">
        <button className="feedback-modal-close" type="button" onClick={onClose} aria-label="Kapat">
          <X size={18} />
        </button>
        <span className="feedback-modal-icon">
          <Icon size={26} />
        </span>
        <h2 id="feedback-modal-title">{tone === "success" ? "Islem tamamlandi" : "Islem tamamlanamadi"}</h2>
        <p>{message}</p>
        <button className="catering-primary-button" type="button" onClick={onClose}>
          Tamam
        </button>
      </section>
    </div>
  );
}
