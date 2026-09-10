import { TemplateShell, SectionHead, Meta, formatDateRange, normalizeUrl } from "./shared";
import type { Portfolio } from "@/types/portfolio";

/** Template 1 — Minimal: quiet typography, generous whitespace, print-friendly. */
export function TemplateMinimal({ portfolio: p, dark }: { portfolio: Portfolio; dark: boolean }) {
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());
  const skillsByCat = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = skillsByCat.get(s.category || "Other") ?? [];
    g.push(s.name);
    skillsByCat.set(s.category || "Other", g);
  }

  return (
    <TemplateShell portfolio={p} dark={dark}>
      <div className="mx-auto max-w-2xl px-6 sm:px-8" style={{ paddingTop: "4.5rem", paddingBottom: "4rem" }}>
        <header style={{ marginBottom: "var(--pf-gap)" }}>
          {t.photo && (
            <img
              src={t.photo}
              alt={t.name}
              className="mb-6 h-20 w-20 object-cover"
              style={{ borderRadius: "var(--pf-radius)" }}
            />
          )}
          <p className="pf-mono mb-3 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--pf-accent)" }}>
            Portfolio
          </p>
          <h1 className="pf-display text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: "var(--pf-fg)" }}>
            {t.name || "Your Name"}
          </h1>
          {t.title && (
            <p className="mt-2 text-lg" style={{ color: "var(--pf-muted)" }}>{t.title}</p>
          )}
          {t.tagline && <p className="mt-4 max-w-xl leading-relaxed">{t.tagline}</p>}
          <div className="mt-5"><Meta portfolio={p} /></div>
          {t.availability && (
            <span
              className="pf-mono mt-5 inline-block rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: "var(--pf-accent)", color: "var(--pf-accent)" }}
            >
              {t.availability}
            </span>
          )}
        </header>

        <div className="space-y-0" style={{ display: "grid", gap: "var(--pf-gap)" }}>
          {p.about && (
            <section>
              <SectionHead kicker="01 · About" title="About" />
              <p className="whitespace-pre-line leading-relaxed">{p.about}</p>
            </section>
          )}

          {p.skills.length > 0 && (
            <section>
              <SectionHead kicker="02 · Skills" title="Skills" />
              <dl className="space-y-4">
                {[...skillsByCat].map(([cat, names]) => (
                  <div key={cat} className="grid grid-cols-[110px_1fr] gap-4">
                    <dt className="pf-mono pt-0.5 text-xs uppercase tracking-wider" style={{ color: "var(--pf-muted)" }}>
                      {cat}
                    </dt>
                    <dd className="text-[15px]">{names.join("  ·  ")}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {p.projects.length > 0 && (
            <section>
              <SectionHead kicker="03 · Work" title="Selected Projects" />
              <div className="divide-y" style={{ borderColor: "var(--pf-border)" }}>
                {p.projects.map((pr) => (
                  <article key={pr.id} className="py-5 first:pt-0 last:pb-0" style={{ borderColor: "var(--pf-border)" }}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="pf-display text-lg font-semibold">{pr.name}</h3>
                      <div className="flex gap-3 text-[13px] font-medium">
                        {pr.githubUrl && <a href={normalizeUrl(pr.githubUrl)} className="hover:underline">GitHub</a>}
                        {pr.liveUrl && <a href={normalizeUrl(pr.liveUrl)} className="hover:underline">Live</a>}
                      </div>
                    </div>
                    {pr.description && (
                      <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: "var(--pf-muted)" }}>
                        {pr.description}
                      </p>
                    )}
                    {pr.technologies.length > 0 && (
                      <p className="pf-mono mt-2 text-xs" style={{ color: "var(--pf-muted)" }}>
                        {pr.technologies.join(" · ")}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {p.experience.length > 0 && (
            <section>
              <SectionHead kicker="04 · Experience" title="Experience" />
              <div className="space-y-6">
                {p.experience.map((e) => (
                  <article key={e.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">
                        {e.position || e.company}
                        <span className="font-normal" style={{ color: "var(--pf-muted)" }}>
                          {" "}· {e.company}
                        </span>
                      </h3>
                      <span className="pf-mono text-xs" style={{ color: "var(--pf-muted)" }}>
                        {formatDateRange(e.startDate, e.endDate, e.current)}
                      </span>
                    </div>
                    {e.description && (
                      <p className="mt-1.5 whitespace-pre-line text-[15px]" style={{ color: "var(--pf-muted)" }}>
                        {e.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {p.education.length > 0 && (
            <section>
              <SectionHead kicker="05 · Education" title="Education" />
              <div className="space-y-4">
                {p.education.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{e.institution}</h3>
                      <p className="text-sm" style={{ color: "var(--pf-muted)" }}>
                        {[e.degree, e.field].filter(Boolean).join(" · ")}
                        {e.grade ? ` · ${e.grade}` : ""}
                      </p>
                    </div>
                    <span className="pf-mono text-xs" style={{ color: "var(--pf-muted)" }}>
                      {[e.startYear, e.endYear].filter(Boolean).join(" – ")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.certifications.length > 0 && (
            <section>
              <SectionHead kicker="06 · Certifications" title="Certifications" />
              <ul className="space-y-2.5 text-[15px]">
                {p.certifications.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <strong className="font-medium">{c.name}</strong>
                      <span style={{ color: "var(--pf-muted)" }}> — {c.issuer}</span>
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="pf-mono text-xs" style={{ color: "var(--pf-muted)" }}>{c.date}</span>
                      {c.credentialUrl && <a href={normalizeUrl(c.credentialUrl)} className="text-[13px] hover:underline">Verify</a>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {socials.length > 0 && (
          <footer className="mt-16 border-t pt-6" style={{ borderColor: "var(--pf-border)" }}>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              {socials.map((s) => (
                <a key={s.id} href={normalizeUrl(s.url)} className="capitalize hover:underline">
                  {s.label || s.platform}
                </a>
              ))}
            </div>
          </footer>
        )}
      </div>
    </TemplateShell>
  );
}
