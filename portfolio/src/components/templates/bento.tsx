import { ArrowUpRight, Github, Mail, MapPin } from "lucide-react";
import {
  TemplateShell, socialIcon, socialName, formatDateRange, normalizeUrl,
} from "./shared";
import type { Portfolio } from "@/types/portfolio";

/** Template 7 — Bento: a tidy grid of cards. Visual, scannable, modern. */
export function TemplateBento({ portfolio: p, dark }: { portfolio: Portfolio; dark: boolean }) {
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());

  const skillGroups = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = skillGroups.get(s.category || "Other") ?? [];
    g.push(s.name);
    skillGroups.set(s.category || "Other", g);
  }

  const Card = ({ className = "", children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) => (
    <div
      className={`border p-5 sm:p-6 ${className}`}
      style={{
        borderColor: "var(--pf-border)",
        background: "var(--pf-card)",
        borderRadius: "calc(var(--pf-radius) * 1.5)",
        ...style,
      }}
    >
      {children}
    </div>
  );

  const Kicker = ({ children }: { children: React.ReactNode }) => (
    <p className="pf-mono mb-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--pf-accent)" }}>
      {children}
    </p>
  );

  return (
    <TemplateShell portfolio={p} dark={dark}>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* hero */}
          <Card
            className="sm:col-span-2"
            style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--pf-accent) 16%, var(--pf-card)), var(--pf-card) 60%)" }}
          >
            {t.availability && (
              <span className="mb-3 inline-block rounded-full border px-3 py-1 text-xs font-medium"
                    style={{ borderColor: "var(--pf-accent)", color: "var(--pf-accent)", background: "var(--pf-bg)" }}>
                {t.availability}
              </span>
            )}
            <h1 className="pf-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t.name || "Your Name"}
            </h1>
            {t.title && (
              <p className="mt-1 text-lg font-semibold" style={{ color: "var(--pf-accent)" }}>{t.title}</p>
            )}
            {t.tagline && <p className="mt-2 max-w-md leading-relaxed">{t.tagline}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ color: "var(--pf-muted)" }}>
              {t.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.location}</span>}
              {t.email && <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1 hover:underline" style={{ color: "var(--pf-muted)" }}><Mail className="h-3.5 w-3.5" />{t.email}</a>}
            </div>
          </Card>

          {/* connect */}
          <Card>
            <Kicker>Connect</Kicker>
            {t.photo && (
              <img src={t.photo} alt={t.name} className="mb-3 h-16 w-16 object-cover" style={{ borderRadius: "var(--pf-radius)" }} />
            )}
            {socials.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {socials.slice(0, 6).map((s) => {
                  const Icon = socialIcon(s.platform);
                  return (
                    <a key={s.id} href={normalizeUrl(s.url)} className="inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: "var(--pf-fg)" }}>
                      <Icon className="h-4 w-4" style={{ color: "var(--pf-accent)" }} />
                      {s.label || socialName(s.platform)}
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--pf-muted)" }}>Add links in the builder.</p>
            )}
          </Card>

          {/* about */}
          {p.about && (
            <Card className="sm:col-span-2 lg:col-span-1">
              <Kicker>About</Kicker>
              <p className="whitespace-pre-line text-sm leading-relaxed">{p.about}</p>
            </Card>
          )}

          {/* skills */}
          {p.skills.length > 0 && (
            <Card className={p.about ? "" : "sm:col-span-2 lg:col-span-1"}>
              <Kicker>Stack</Kicker>
              <div className="space-y-2.5">
                {[...skillGroups].slice(0, 4).map(([cat, names]) => (
                  <div key={cat}>
                    <p className="pf-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--pf-muted)" }}>{cat}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {names.map((n) => (
                        <span key={n} className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{ background: "color-mix(in srgb, var(--pf-accent) 12%, transparent)" }}>
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* experience */}
          {p.experience.length > 0 && (
            <Card>
              <Kicker>Experience</Kicker>
              <div className="space-y-3.5">
                {p.experience.slice(0, 3).map((e) => (
                  <div key={e.id}>
                    <p className="text-sm font-bold">{e.position || e.company}</p>
                    <p className="text-[13px] font-medium" style={{ color: "var(--pf-accent)" }}>{e.company}</p>
                    <p className="pf-mono text-[11px]" style={{ color: "var(--pf-muted)" }}>
                      {formatDateRange(e.startDate, e.endDate, e.current)}
                    </p>
                  </div>
                ))}
                {p.experience.length > 3 && (
                  <p className="text-xs" style={{ color: "var(--pf-muted)" }}>+{p.experience.length - 3} more roles</p>
                )}
              </div>
            </Card>
          )}

          {/* projects */}
          {p.projects.map((pr, i) => (
            <Card key={pr.id} className={i === 0 && p.projects.length > 2 ? "sm:col-span-2" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Kicker>{pr.featured ? "★ Featured project" : "Project"}</Kicker>
                  <h3 className="pf-display text-lg font-bold leading-snug">{pr.name}</h3>
                </div>
                <span className="flex shrink-0 gap-2 pt-0.5">
                  {pr.githubUrl && <a href={normalizeUrl(pr.githubUrl)} aria-label={`${pr.name} on GitHub`}><Github className="h-4 w-4" /></a>}
                  {pr.liveUrl && <a href={normalizeUrl(pr.liveUrl)} aria-label={`${pr.name} live`}><ArrowUpRight className="h-4 w-4" /></a>}
                </span>
              </div>
              {pr.image && (
                <img src={pr.image} alt={pr.name} loading="lazy" className="mt-3 aspect-video w-full border object-cover" style={{ borderColor: "var(--pf-border)", borderRadius: "var(--pf-radius)" }} />
              )}
              {pr.description && <p className="mt-2 text-sm" style={{ color: "var(--pf-muted)" }}>{pr.description}</p>}
              {pr.technologies.length > 0 && (
                <p className="pf-mono mt-2.5 text-[11px]" style={{ color: "var(--pf-accent)" }}>
                  {pr.technologies.join("  ·  ")}
                </p>
              )}
            </Card>
          ))}

          {/* education */}
          {p.education.length > 0 && (
            <Card>
              <Kicker>Education</Kicker>
              <div className="space-y-2.5">
                {p.education.map((e) => (
                  <div key={e.id} className="text-sm">
                    <p className="font-bold">{e.institution}</p>
                    <p className="text-[13px]" style={{ color: "var(--pf-muted)" }}>
                      {[e.degree, e.field].filter(Boolean).join(" · ")}
                      {e.grade ? ` · ${e.grade}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* certs */}
          {p.certifications.length > 0 && (
            <Card>
              <Kicker>Certifications</Kicker>
              <ul className="space-y-2 text-sm">
                {p.certifications.map((c) => (
                  <li key={c.id}>
                    <strong className="font-medium">{c.name}</strong>
                    <span style={{ color: "var(--pf-muted)" }}> — {c.issuer}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <p className="mt-8 text-center text-[13px]" style={{ color: "var(--pf-muted)" }}>
          {t.name || "Portfolio"}{t.email ? ` · ${t.email}` : ""}
        </p>
      </div>
    </TemplateShell>
  );
}
