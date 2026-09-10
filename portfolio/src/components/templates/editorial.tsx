import { TemplateShell, Meta, formatDateRange, normalizeUrl } from "./shared";
import type { Portfolio } from "@/types/portfolio";

/** Template 5 — Editorial: magazine-style serif display, oversized type, hairline rules. */
const SERIF = "'Source Serif 4', Georgia, 'Times New Roman', serif";

export function TemplateEditorial({ portfolio: p, dark }: { portfolio: Portfolio; dark: boolean }) {
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());
  const year = new Date().getFullYear();
  let n = 0;
  const num = () => String(++n).padStart(2, "0");

  const skillsByCat = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = skillsByCat.get(s.category || "Other") ?? [];
    g.push(s.name);
    skillsByCat.set(s.category || "Other", g);
  }

  return (
    <TemplateShell portfolio={p} dark={dark}>
      <div className="mx-auto max-w-3xl px-6 sm:px-10" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        {/* masthead */}
        <header className="border-b pb-10" style={{ borderColor: "var(--pf-border)", marginBottom: "var(--pf-gap)" }}>
          <div className="pf-mono flex items-center justify-between text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--pf-muted)" }}>
            <span>Portfolio</span>
            <span>Vol. {year}</span>
          </div>
          <h1
            className="mt-6 font-bold leading-[1.02] tracking-tight"
            style={{ fontFamily: SERIF, fontSize: "clamp(2.8rem, 8vw, 4.6rem)", color: "var(--pf-fg)" }}
          >
            {t.name || "Your Name"}
          </h1>
          {t.title && (
            <p className="mt-3 text-xl italic sm:text-2xl" style={{ fontFamily: SERIF, color: "var(--pf-accent)" }}>
              {t.title}
            </p>
          )}
          {t.tagline && (
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed">{t.tagline}</p>
          )}
          <div className="mt-6"><Meta portfolio={p} /></div>
          {t.availability && (
            <p className="pf-mono mt-4 text-xs uppercase tracking-[0.16em]" style={{ color: "var(--pf-accent)" }}>
              ✦ {t.availability}
            </p>
          )}
        </header>

        <div style={{ display: "grid", gap: "var(--pf-gap)" }}>
          {p.about && (
            <section>
              <SectionNo n={num()} label="About" />
              <p className="whitespace-pre-line text-[17px] leading-[1.85]">{p.about}</p>
            </section>
          )}

          {p.projects.length > 0 && (
            <section>
              <SectionNo n={num()} label="Selected Work" />
              <div>
                {p.projects.map((pr, i) => (
                  <article
                    key={pr.id}
                    className="border-b py-7 first:pt-0 last:border-0 last:pb-0"
                    style={{ borderColor: "var(--pf-border)" }}
                  >
                    <div className="flex items-baseline gap-4">
                      <span className="pf-mono text-sm" style={{ color: "var(--pf-accent)" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="flex-1 text-2xl font-bold tracking-tight" style={{ fontFamily: SERIF }}>
                        {pr.name}
                      </h3>
                    </div>
                    {pr.description && (
                      <p className="mt-2 max-w-2xl leading-relaxed" style={{ color: "var(--pf-muted)", paddingLeft: "2.5rem" }}>
                        {pr.description}
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ paddingLeft: "2.5rem" }}>
                      {pr.technologies.length > 0 && (
                        <span className="pf-mono text-xs" style={{ color: "var(--pf-muted)" }}>
                          {pr.technologies.join(" · ")}
                        </span>
                      )}
                      <span className="flex gap-3 text-[13px] font-semibold">
                        {pr.githubUrl && <a href={normalizeUrl(pr.githubUrl)} className="hover:underline">GitHub ↗</a>}
                        {pr.liveUrl && <a href={normalizeUrl(pr.liveUrl)} className="hover:underline">Live ↗</a>}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {p.experience.length > 0 && (
            <section>
              <SectionNo n={num()} label="Experience" />
              <div className="space-y-6">
                {p.experience.map((e) => (
                  <article key={e.id} className="grid gap-1 sm:grid-cols-[1fr_180px]">
                    <div>
                      <h3 className="text-lg font-bold" style={{ fontFamily: SERIF }}>
                        {e.position || e.company}
                        <span className="font-normal italic" style={{ color: "var(--pf-muted)" }}> — {e.company}</span>
                      </h3>
                      {e.description && (
                        <p className="mt-1 whitespace-pre-line text-[15px]" style={{ color: "var(--pf-muted)" }}>
                          {e.description}
                        </p>
                      )}
                    </div>
                    <p className="pf-mono text-xs sm:text-right" style={{ color: "var(--pf-muted)" }}>
                      {formatDateRange(e.startDate, e.endDate, e.current)}
                      {e.location ? <><br />{e.location}</> : null}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {p.skills.length > 0 && (
            <section>
              <SectionNo n={num()} label="Expertise" />
              <div className="grid gap-5 sm:grid-cols-2">
                {[...skillsByCat].map(([cat, names]) => (
                  <div key={cat}>
                    <p className="pf-mono mb-1.5 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--pf-accent)" }}>
                      {cat}
                    </p>
                    <p className="text-[15px] leading-relaxed">{names.join(", ")}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.education.length > 0 && (
            <section>
              <SectionNo n={num()} label="Education" />
              <div className="space-y-3">
                {p.education.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[15px]">
                      <strong className="font-semibold" style={{ fontFamily: SERIF, fontSize: "1.05rem" }}>{e.institution}</strong>
                      <span style={{ color: "var(--pf-muted)" }}>
                        {" "}— {[e.degree, e.field].filter(Boolean).join(", ")}
                        {e.grade ? ` (${e.grade})` : ""}
                      </span>
                    </p>
                    <span className="pf-mono text-xs" style={{ color: "var(--pf-muted)" }}>
                      {[e.startYear, e.endYear].filter(Boolean).join("–")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.certifications.length > 0 && (
            <section>
              <SectionNo n={num()} label="Certifications" />
              <ul className="space-y-2 text-[15px]">
                {p.certifications.map((c) => (
                  <li key={c.id}>
                    <em style={{ fontFamily: SERIF }}>{c.name}</em>
                    <span style={{ color: "var(--pf-muted)" }}> — {c.issuer}{c.date ? `, ${c.date}` : ""}</span>
                    {c.credentialUrl && <> · <a href={normalizeUrl(c.credentialUrl)} className="text-sm hover:underline">verify</a></>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="mt-16 border-t pt-6 text-center" style={{ borderColor: "var(--pf-border)" }}>
          {socials.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold">
              {socials.map((s) => (
                <a key={s.id} href={normalizeUrl(s.url)} className="capitalize hover:underline">
                  {s.label || s.platform}
                </a>
              ))}
            </div>
          )}
          <p className="pf-mono mt-4 text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--pf-muted)" }}>
            Set in serif · {year}
          </p>
        </footer>
      </div>
    </TemplateShell>
  );
}

function SectionNo({ n, label }: { n: string; label: string }) {
  return (
    <div className="mb-6 flex items-baseline gap-3">
      <span className="pf-mono text-sm" style={{ color: "var(--pf-accent)" }}>{n}</span>
      <h2 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: "var(--pf-fg)" }}>
        {label}
      </h2>
      <span className="h-px flex-1" style={{ background: "var(--pf-border)" }} />
    </div>
  );
}
