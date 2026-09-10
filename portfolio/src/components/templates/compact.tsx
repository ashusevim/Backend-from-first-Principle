import { TemplateShell, normalizeUrl, formatDateRange } from "./shared";
import type { Portfolio } from "@/types/portfolio";

/** Template 8 — Compact: a dense one-pager. Resume-like, scannable, print-perfect. */
export function TemplateCompact({ portfolio: p, dark }: { portfolio: Portfolio; dark: boolean }) {
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());

  const skillGroups = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = skillGroups.get(s.category || "Other") ?? [];
    g.push(s.name);
    skillGroups.set(s.category || "Other", g);
  }

  const Head = ({ children }: { children: React.ReactNode }) => (
    <h2
      className="pf-mono mb-2 border-b pb-1 text-[11px] font-bold uppercase tracking-[0.2em]"
      style={{ borderColor: "var(--pf-accent)", color: "var(--pf-fg)" }}
    >
      {children}
    </h2>
  );

  return (
    <TemplateShell portfolio={p} dark={dark}>
      <div className="mx-auto max-w-3xl px-6 py-10 text-[13.5px] leading-relaxed sm:px-8">
        {/* header */}
        <header className="text-center" style={{ marginBottom: "1.4rem" }}>
          <h1 className="pf-display text-[26px] font-extrabold tracking-tight">
            {t.name || "Your Name"}
          </h1>
          {t.title && (
            <p className="mt-0.5 text-[15px] font-semibold" style={{ color: "var(--pf-accent)" }}>
              {t.title}
            </p>
          )}
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--pf-muted)" }}>
            {[t.location, t.email, t.phone, t.availability].filter(Boolean).join("  ·  ")}
          </p>
          {socials.length > 0 && (
            <p className="mt-1 text-[13px] font-medium">
              {socials.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && <span style={{ color: "var(--pf-muted)" }}>{"  ·  "}</span>}
                  <a href={normalizeUrl(s.url)} className="capitalize hover:underline">
                    {s.label || (s.platform === "twitter" ? "X" : s.platform)}
                  </a>
                </span>
              ))}
            </p>
          )}
        </header>

        <div className="space-y-5">
          {(p.about || t.tagline) && (
            <section>
              <Head>Summary</Head>
              <p className="whitespace-pre-line">{p.about || t.tagline}</p>
            </section>
          )}

          {p.skills.length > 0 && (
            <section>
              <Head>Skills</Head>
              <div className="space-y-0.5">
                {[...skillGroups].map(([cat, names]) => (
                  <p key={cat}>
                    <strong className="font-semibold">{cat}: </strong>
                    <span style={{ color: "var(--pf-muted)" }}>{names.join(", ")}</span>
                  </p>
                ))}
              </div>
            </section>
          )}

          {p.projects.length > 0 && (
            <section>
              <Head>Projects</Head>
              <div className="space-y-2">
                {p.projects.map((pr) => (
                  <div key={pr.id}>
                    <p>
                      <strong className="font-bold">{pr.name}</strong>
                      {pr.technologies.length > 0 && (
                        <span style={{ color: "var(--pf-muted)" }}> — {pr.technologies.join(", ")}</span>
                      )}
                      {(pr.githubUrl || pr.liveUrl) && (
                        <span className="text-[12.5px] font-medium">
                          {" "}[
                          {pr.githubUrl && <a href={normalizeUrl(pr.githubUrl)} className="hover:underline">code</a>}
                          {pr.githubUrl && pr.liveUrl && " | "}
                          {pr.liveUrl && <a href={normalizeUrl(pr.liveUrl)} className="hover:underline">live</a>}
                          ]
                        </span>
                      )}
                    </p>
                    {pr.description && (
                      <p style={{ color: "var(--pf-muted)" }}>{pr.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.experience.length > 0 && (
            <section>
              <Head>Experience</Head>
              <div className="space-y-2.5">
                {p.experience.map((e) => (
                  <div key={e.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <p>
                        <strong className="font-bold">{e.position || e.company}</strong>
                        <span> — {e.company}{e.location ? `, ${e.location}` : ""}</span>
                      </p>
                      <span className="pf-mono text-[12px]" style={{ color: "var(--pf-muted)" }}>
                        {formatDateRange(e.startDate, e.endDate, e.current)}
                      </span>
                    </div>
                    {e.description && (
                      <p className="whitespace-pre-line" style={{ color: "var(--pf-muted)" }}>{e.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.education.length > 0 && (
            <section>
              <Head>Education</Head>
              <div className="space-y-1">
                {p.education.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p>
                      <strong className="font-semibold">{e.institution}</strong>
                      <span style={{ color: "var(--pf-muted)" }}>
                        {" "}— {[e.degree, e.field].filter(Boolean).join(", ")}
                        {e.grade ? ` (${e.grade})` : ""}
                      </span>
                    </p>
                    <span className="pf-mono text-[12px]" style={{ color: "var(--pf-muted)" }}>
                      {[e.startYear, e.endYear].filter(Boolean).join("–")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.certifications.length > 0 && (
            <section>
              <Head>Certifications</Head>
              <p>
                {p.certifications.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && <span style={{ color: "var(--pf-muted)" }}>{"  ·  "}</span>}
                    <strong className="font-medium">{c.name}</strong>
                    <span style={{ color: "var(--pf-muted)" }}> ({c.issuer}{c.date ? `, ${c.date}` : ""})</span>
                  </span>
                ))}
              </p>
            </section>
          )}
        </div>
      </div>
    </TemplateShell>
  );
}
