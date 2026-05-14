export function OpenContributionTab() {
  return (
    <section className="mx-auto max-w-[1180px] px-8 py-10">
      <div className="max-w-3xl rounded-2xl border border-[var(--g300)] bg-white p-6 md:p-8 shadow-sm">
        <p className="eyebrow mb-3">Phase 3</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--slate)] mb-3">
          Open Contribution (Git PR-based)
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--g700)] mb-6">
          Kontributor bisa mengusulkan source baru atau update source lewat issue template dan PR,
          lalu otomatis divalidasi oleh CI sebelum merge.
        </p>

        <ol className="list-decimal pl-5 space-y-2 text-[15px] text-[var(--g700)] mb-6">
          <li>Buat issue: <code>Source Add</code> atau <code>Source Update</code>.</li>
          <li>Fork repo, edit <code>data/sources.json</code>, lalu buka PR.</li>
          <li>Jalankan validasi lokal: <code>npm run validate:sources</code>.</li>
          <li>CI menjalankan schema/duplicate check + link check warning-only.</li>
        </ol>

        <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4 text-[14px] text-[var(--g700)]">
          Detail lengkap ada di <code>CONTRIBUTING.md</code>, <code>docs/CONTRIBUTOR_GUIDE.md</code>,
          dan <code>data/docs/open-contribution.md</code>.
        </div>
      </div>
    </section>
  );
}
