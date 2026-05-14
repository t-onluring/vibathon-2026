export function Masthead() {
  return (
    <header className="border-b border-[var(--g300)] bg-[var(--ivory)]">
      <div className="mx-auto max-w-[1180px] px-8 pt-16 pb-10 sm:pt-20 sm:pb-12">
        <p className="eyebrow">Vibathon 2026 · HSI IT Division</p>
        <h1
          className="font-serif text-[clamp(34px,5vw,56px)] leading-[1.06] tracking-[-0.018em] text-[var(--slate)] mt-5 mb-2 max-w-[18ch]"
          style={{ fontWeight: 500 }}
        >
          Source List Kajian Sunnah <em className="italic text-[var(--clay)]">Indonesia</em>
        </h1>
        <p className="text-[16.5px] text-[var(--g700)] mt-5 max-w-[640px]">
          Open registry sumber kajian (Telegram, Instagram, Facebook, WhatsApp, Web) dengan
          automated reliability monitoring. Layer&nbsp;1 infrastructure agar siapapun bisa
          membangun aggregator atau aplikasi konsumen di atasnya — bukan kompetitor existing
          player, tapi data supplier.
        </p>
      </div>
    </header>
  );
}
