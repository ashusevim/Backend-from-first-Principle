import { ArrowUpRight, Github, Sparkles } from "lucide-react";
import {
  TemplateShell, Meta, socialIcon, socialName, formatDateRange, normalizeUrl,
} from "./shared";
import type { Portfolio } from "@/types/portfolio";

/** Template 3 — Modern: bold cards, strong hierarchy, confident hero. */
export function TemplateModern({ portfolio: p, dark }: { portfolio: Portfolio; dark: boolean }) {
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());
  const [first, ...others] = [...p.projects].sort((a, b) => Number(b.featured) - Number(a.featured));

  const skillGroups = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = skillGroups.get(s.category || "Other") ?? [];
    g.push(s.name);
    skillGroups.set(s.category || "Other", g);
  }

  return (
    <TemplateShell portfolio={p} dark={dark}>
      <div className="mx-auto max-w-5xl px-6 pb-20" style={{ paddingTop: "3rem" }}>
        {/* hero card */}
        <header
          className="relative overflow-hidden border p-8 sm:p-12"
          style={{
            borderRadius: "calc(var(--pf-radius) * 1.75)",
            borderColor: "var(--pf-border)",
            background: `linear-gradient(135deg, color-mix(in srgb, var(--pf-accent) 14%, var(--pf-bg)), var(--pf-bg) 55%)`,
          }}
        >
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="flex-1">
              {t.availability && (
                <span
                  className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{ borderColor: "var(--pf-accent)", color: "var(--pf-accent)", background: "var(--pf-bg)" }}
                >
                  <Sparkles className="h-3 w-3" /> {t.availability}
                </span>
              )}
              <h1 className="pf-display text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: "var(--pf-fg)" }}>
                {t.name || "Your Name"}
              </h1>
              {t.title && (
                <p className="pf-display mt-2 text-xl font-semibold" style={{ color: "var(--pf-accent)" }}>
                  {t.title}
                </p>
              )}
              {t.tagline && <p className="mt-3 max-w-xl text-[17px] leading-relaxed">{t.tagline}</p>}
              <div className="mt-4"><Meta portfolio={p} /></div>
              {socials.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {socials.slice(0, 6).map((s, i) => {
                    const Icon = socialIcon(s.platform);
                    const primary = i === 0;
                    return (
                      <a
                        key={s.id}
                        href={normalizeUrl(s.url)}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                        style={
                          primary
                            ? { background: "var(--pf-accent)", color: "#fff" }
                            : { background: "var(--pf-bg)", border: "1px solid var(--pf-border)", color: "var(--pf-fg)" }
                        }
                      >
                        <Icon className="h-4 w-4" /> {s.label || socialName(s.platform)}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
            {t.photo ? (
              <img
                src={t.photo}
                alt={t.name}
                className="h-40 w-40 shrink-0 border-4 object-cover sm:h-48 sm:w-48"
                style={{ borderRadius: "calc(var(--pf-radius) * 2)", borderColor: "var(--pf-bg)" }}
              />
            ) : (
              <div
                className="pf-display hidden h-44 w-44 shrink-0 items-center justify-center text-4xl font-extrabold text-white sm:flex"
                style={{ borderRadius: "calc(var(--pf-radius) * 2)", background: "var(--pf-accent)" }}
              >
                {t.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "DEV"}
              </div>
            )}
          </div>
        </header>

        <div style={{ display: "grid", gap: "var(--pf-gap)", marginTop: "var(--pf-gap)" }}>
          {p.about && (
            <section
              className="border p-6 sm:p-8"
              style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-border)", background: "var(--pf-card)" }}
            >
              <h2 className="pf-display mb-3 text-lg font-bold">About me</h2>
              <p className="whitespace-pre-line leading-relaxed">{p.about}</p>
            </section>
          )}

          {p.projects.length > 0 && (
            <section>
              <div className="mb-5 flex items-end justify-between">
                <h2 className="pf-display text-2xl font-extrabold tracking-tight">Featured work</h2>
                <span className="pf-mono text-xs" style={{ color: "var(--pf-muted)" }}>
                  {p.projects.length} project{p.projects.length > 1 ? "s" : ""}
                </span>
              </div>
              {first && (
                <article
                  className="mb-4 grid overflow-hidden border sm:grid-cols-2"
                  style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-accent)", background: "var(--pf-card)" }}
                >
                  <div className="p-6 sm:p-8">
                    <span className="pf-mono text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--pf-accent)" }}>
                      ★ Spotlight
                    </span>
                    <h3 className="pf-display mt-2 text-2xl font-bold">{first.name}</h3>
                    <p className="mt-2 leading-relaxed" style={{ color: "var(--pf-muted)" }}>{first.description}</p>
                    {first.technologies.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {first.technologies.map((x) => (
                          <span key={x} className="pf-mono rounded-full border px-2.5 py-0.5 text-[11px]" style={{ borderColor: "var(--pf-border)" }}>
                            {x}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-5 flex gap-2">
                      {first.githubUrl && (
                        <a href={normalizeUrl(first.githubUrl)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--pf-accent)" }}>
                          <Github className="h-4 w-4" /> Code
                        </a>
                      )}
                      {first.liveUrl && (
                        <a href={normalizeUrl(first.liveUrl)} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--pf-border)", color: "var(--pf-fg)" }}>
                          Live <ArrowUpRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex min-h-48 items-center justify-center p-6" style={{ background: "color-mix(in srgb, var(--pf-accent) 10%, var(--pf-card))" }}>
                    {first.image ? (
                      <img src={first.image} alt={first.name} className="w-full rounded-md border object-cover" style={{ borderColor: "var(--pf-border)" }} loading="lazy" />
                    ) : (
                      <span className="pf-mono text-6xl font-bold opacity-20" style={{ color: "var(--pf-accent)" }}>{"</>"}</span>
                    )}
                  </div>
                </article>
              )}
              {others.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {others.map((pr) => (
                    <article key={pr.id} className="border p-6" style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-border)", background: "var(--pf-card)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="pf-display text-lg font-bold">{pr.name}</h3>
                        <span className="flex shrink-0 gap-2">
                          {pr.githubUrl && <a href={normalizeUrl(pr.githubUrl)} aria-label="GitHub"><Github className="h-4 w-4" /></a>}
                          {pr.liveUrl && <a href={normalizeUrl(pr.liveUrl)} aria-label="Live"><ArrowUpRight className="h-4 w-4" /></a>}
                        </span>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: "var(--pf-muted)" }}>{pr.description}</p>
                      {pr.technologies.length > 0 && (
                        <p className="pf-mono mt-3 text-[11px]" style={{ color: "var(--pf-accent)" }}>
                          {pr.technologies.join("  ·  ")}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-5">
            {p.experience.length > 0 && (
              <section className="border p-6 sm:p-8 lg:col-span-3" style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-border)", background: "var(--pf-card)" }}>
                <h2 className="pf-display mb-6 text-lg font-bold">Experience</h2>
                <ol className="relative space-y-7 border-l pl-6" style={{ borderColor: "var(--pf-border)" }}>
                  {p.experience.map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2" style={{ borderColor: "var(--pf-accent)", background: "var(--pf-card)" }} />
                      <p className="pf-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--pf-muted)" }}>
                        {formatDateRange(e.startDate, e.endDate, e.current)}
                      </p>
                      <h3 className="mt-1 font-bold">{e.position || e.company}</h3>
                      <p className="text-sm font-medium" style={{ color: "var(--pf-accent)" }}>
                        {e.company}{e.location ? ` · ${e.location}` : ""}
                      </p>
                      {e.description && <p className="mt-2 whitespace-pre-line text-sm" style={{ color: "var(--pf-muted)" }}>{e.description}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <div className="space-y-4 lg:col-span-2">
              {p.skills.length > 0 && (
                <section className="border p-6" style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-border)", background: "var(--pf-card)" }}>
                  <h2 className="pf-display mb-4 text-lg font-bold">Skills</h2>
                  <div className="space-y-3">
                    {[...skillGroups].map(([cat, names]) => (
                      <div key={cat}>
                        <p className="pf-mono mb-1 text-[11px] uppercase tracking-wider" style={{ color: "var(--pf-muted)" }}>{cat}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {names.map((n) => (
                            <span key={n} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "color-mix(in srgb, var(--pf-accent) 12%, transparent)", color: "var(--pf-fg)" }}>
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
                <section className="border p-6" style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-border)", background: "var(--pf-card)" }}>
                  <h2 className="pf-display mb-4 text-lg font-bold">Education</h2>
                  <div className="space-y-3 text-sm">
                    {p.education.map((e) => (
                      <div key={e.id}>
                        <p className="font-semibold">{e.institution}</p>
                        <p style={{ color: "var(--pf-muted)" }}>
                          {[e.degree, e.field].filter(Boolean).join(" · ")}{e.grade ? ` · ${e.grade}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {p.certifications.length > 0 && (
                <section className="border p-6" style={{ borderRadius: "var(--pf-radius)", borderColor: "var(--pf-border)", background: "var(--pf-card)" }}>
                  <h2 className="pf-display mb-4 text-lg font-bold">Certifications</h2>
                  <ul className="space-y-2 text-sm">
                    {p.certifications.map((c) => (
                      <li key={c.id}>
                        <strong className="font-medium">{c.name}</strong>
                        <span style={{ color: "var(--pf-muted)" }}> — {c.issuer}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-12 text-center text-sm" style={{ color: "var(--pf-muted)" }}>
          {t.name && <p className="pf-display font-bold" style={{ color: "var(--pf-fg)" }}>Let's build something great — {t.name.split(" ")[0]}</p>}
          {t.email && <a href={`mailto:${t.email}`} className="mt-1 inline-block hover:underline">{t.email}</a>}
        </footer>
      </div>
    </TemplateShell>
  );
}
