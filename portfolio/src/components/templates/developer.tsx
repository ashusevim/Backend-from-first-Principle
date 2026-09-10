import { Github, ArrowUpRight } from "lucide-react";
import {
  TemplateShell, SectionHead, Meta, socialIcon, socialName,
  formatDateRange, normalizeUrl,
} from "./shared";
import type { Portfolio } from "@/types/portfolio";

/** Template 2 — Developer: technical aesthetic, projects & GitHub front and center. */
export function TemplateDeveloper({ portfolio: p, dark }: { portfolio: Portfolio; dark: boolean }) {
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());
  const featured = p.projects.filter((x) => x.featured);
  const rest = p.projects.filter((x) => !x.featured);
  const ordered = [...featured, ...rest];
  const github = socials.find((s) => s.platform === "github");

  const skillGroups = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = skillGroups.get(s.category || "Other") ?? [];
    g.push(s.name);
    skillGroups.set(s.category || "Other", g);
  }

  return (
    <TemplateShell portfolio={p} dark={dark}>
      {/* top bar */}
      <div className="border-b" style={{ borderColor: "var(--pf-border)" }}>
        <div className="pf-mono mx-auto flex max-w-4xl items-center justify-between px-6 py-3 text-xs" style={{ color: "var(--pf-muted)" }}>
          <span>
            <span style={{ color: "var(--pf-accent)" }}>~/</span>
            {(t.name || "developer").toLowerCase().replace(/\s+/g, "-")}
          </span>
          <span className="hidden items-center gap-3 sm:flex">
            {p.projects.length > 0 && <span>projects({p.projects.length})</span>}
            {p.experience.length > 0 && <span>exp({p.experience.length})</span>}
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--pf-accent)" }} />
              {t.availability || "available"}
            </span>
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-16" style={{ paddingTop: "3.5rem" }}>
        {/* hero */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start" style={{ marginBottom: "var(--pf-gap)" }}>
          {t.photo ? (
            <img src={t.photo} alt={t.name} className="h-28 w-28 shrink-0 border object-cover" style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-border)" }} />
          ) : (
            <div
              className="pf-mono flex h-28 w-28 shrink-0 items-center justify-center border text-2xl font-bold"
              style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-border)", background: "var(--pf-card)", color: "var(--pf-accent)" }}
            >
              {t.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "</>"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="pf-mono text-[13px]" style={{ color: "var(--pf-accent)" }}>
              <span style={{ color: "var(--pf-muted)" }}>const</span> dev = {"{"}
            </p>
            <h1 className="pf-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.name || "Your Name"}
            </h1>
            {t.title && (
              <p className="pf-mono mt-2 text-sm" style={{ color: "var(--pf-muted)" }}>
                <span style={{ color: "var(--pf-accent)" }}>role:</span> "{t.title}"
              </p>
            )}
            {t.tagline && <p className="mt-3 max-w-2xl leading-relaxed">{t.tagline}</p>}
            <div className="mt-4"><Meta portfolio={p} /></div>
            <div className="mt-5 flex flex-wrap gap-2">
              {github && (
                <a
                  href={normalizeUrl(github.url)}
                  className="pf-mono inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
                  style={{ background: "var(--pf-accent)" }}
                >
                  <Github className="h-3.5 w-3.5" /> GitHub
                </a>
              )}
              {socials.filter((s) => s.platform !== "github").slice(0, 4).map((s) => {
                const Icon = socialIcon(s.platform);
                return (
                  <a
                    key={s.id}
                    href={normalizeUrl(s.url)}
                    className="pf-mono inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] hover:underline"
                    style={{ borderColor: "var(--pf-border)", color: "var(--pf-fg)" }}
                  >
                    <Icon className="h-3.5 w-3.5" /> {s.label || socialName(s.platform)}
                  </a>
                );
              })}
            </div>
          </div>
        </header>

        <div style={{ display: "grid", gap: "var(--pf-gap)" }}>
          {p.about && (
            <section>
              <SectionHead kicker="// about" title="README.md" />
              <div className="rounded-md border p-5 leading-relaxed" style={{ borderColor: "var(--pf-border)", background: "var(--pf-card)", borderRadius: "var(--pf-radius)" }}>
                <p className="whitespace-pre-line text-[15px]">{p.about}</p>
              </div>
            </section>
          )}

          {ordered.length > 0 && (
            <section>
              <SectionHead kicker="// selected work" title={`Projects (${ordered.length})`} />
              <div className="grid gap-4 sm:grid-cols-2">
                {ordered.map((pr) => (
                  <article
                    key={pr.id}
                    className="flex flex-col border p-5 transition-transform"
                    style={{
                      borderColor: pr.featured ? "var(--pf-accent)" : "var(--pf-border)",
                      background: "var(--pf-card)",
                      borderRadius: "var(--pf-radius)",
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="pf-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--pf-accent)" }}>
                        {pr.featured ? "★ featured" : "repo"}
                      </span>
                      <span className="flex gap-2">
                        {pr.githubUrl && <a href={normalizeUrl(pr.githubUrl)} aria-label={`${pr.name} on GitHub`}><Github className="h-4 w-4" /></a>}
                        {pr.liveUrl && <a href={normalizeUrl(pr.liveUrl)} aria-label={`${pr.name} live demo`}><ArrowUpRight className="h-4 w-4" /></a>}
                      </span>
                    </div>
                    {pr.image && (
                      <img src={pr.image} alt={pr.name} className="mb-3 aspect-video w-full border object-cover" style={{ borderColor: "var(--pf-border)", borderRadius: "var(--pf-radius)" }} loading="lazy" />
                    )}
                    <h3 className="pf-display text-base font-bold">{pr.name}</h3>
                    {pr.description && (
                      <p className="mt-1.5 flex-1 text-sm leading-relaxed" style={{ color: "var(--pf-muted)" }}>
                        {pr.description}
                      </p>
                    )}
                    {pr.technologies.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {pr.technologies.map((x) => (
                          <span key={x} className="pf-mono rounded border px-1.5 py-0.5 text-[11px]" style={{ borderColor: "var(--pf-border)", color: "var(--pf-muted)" }}>
                            {x}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-8 lg:grid-cols-2" style={{ gap: "var(--pf-gap)" }}>
            {p.experience.length > 0 && (
              <section>
                <SectionHead kicker="// career" title="Experience" />
                <div className="space-y-5">
                  {p.experience.map((e) => (
                    <article key={e.id} className="border-l-2 pl-4" style={{ borderColor: "var(--pf-accent)" }}>
                      <h3 className="text-[15px] font-semibold">{e.position || e.company}</h3>
                      <p className="text-sm font-medium" style={{ color: "var(--pf-accent)" }}>
                        {e.company}{e.location ? ` · ${e.location}` : ""}
                      </p>
                      <p className="pf-mono mt-0.5 text-[11px]" style={{ color: "var(--pf-muted)" }}>
                        {formatDateRange(e.startDate, e.endDate, e.current)}
                      </p>
                      {e.description && (
                        <p className="mt-2 whitespace-pre-line text-sm" style={{ color: "var(--pf-muted)" }}>{e.description}</p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="space-y-8">
              {p.skills.length > 0 && (
                <section>
                  <SectionHead kicker="// stack" title="Skills" />
                  <div className="space-y-3">
                    {[...skillGroups].map(([cat, names]) => (
                      <div key={cat}>
                        <p className="pf-mono mb-1.5 text-[11px] uppercase tracking-wider" style={{ color: "var(--pf-muted)" }}>
                          {cat}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {names.map((n) => (
                            <span key={n} className="rounded px-2 py-1 text-[13px]" style={{ background: "var(--pf-card)", border: "1px solid var(--pf-border)", borderRadius: "var(--pf-radius)" }}>
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {p.education.length > 0 && (
                <section>
                  <SectionHead kicker="// education" title="Education" />
                  <div className="space-y-3">
                    {p.education.map((e) => (
                      <div key={e.id} className="text-sm">
                        <p className="font-semibold">{e.institution}</p>
                        <p style={{ color: "var(--pf-muted)" }}>
                          {[e.degree, e.field].filter(Boolean).join(" · ")}
                          {e.grade ? ` · ${e.grade}` : ""} · {[e.startYear, e.endYear].filter(Boolean).join("–")}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {p.certifications.length > 0 && (
                <section>
                  <SectionHead kicker="// certs" title="Certifications" />
                  <ul className="space-y-2 text-sm">
                    {p.certifications.map((c) => (
                      <li key={c.id}>
                        <strong className="font-medium">{c.name}</strong>
                        <span style={{ color: "var(--pf-muted)" }}> — {c.issuer}{c.date ? ` · ${c.date}` : ""}</span>
                        {c.credentialUrl && <> · <a href={normalizeUrl(c.credentialUrl)} className="hover:underline">verify</a></>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>

        <footer className="pf-mono mt-14 flex flex-wrap items-center justify-between gap-2 border-t pt-5 text-xs" style={{ borderColor: "var(--pf-border)", color: "var(--pf-muted)" }}>
          <span>{"}"} // end</span>
          <span>{t.name || "dev"} · {new Date().getFullYear()}</span>
        </footer>
      </div>
    </TemplateShell>
  );
}
