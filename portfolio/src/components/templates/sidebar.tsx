import { Mail, MapPin, Phone } from "lucide-react";
import {
  TemplateShell, SectionHead, socialIcon, socialName, formatDateRange, normalizeUrl,
} from "./shared";
import type { Portfolio } from "@/types/portfolio";

/** Template 6 — Sidebar: classic two-column professional layout with a contact rail. */
export function TemplateSidebar({ portfolio: p, dark }: { portfolio: Portfolio; dark: boolean }) {
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());

  const skillGroups = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = skillGroups.get(s.category || "Other") ?? [];
    g.push(s.name);
    skillGroups.set(s.category || "Other", g);
  }

  return (
    <TemplateShell portfolio={p} dark={dark}>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[290px_1fr]">
        {/* rail */}
        <aside
          className="h-fit rounded-md border p-6 lg:sticky lg:top-6"
          style={{
            borderColor: "var(--pf-border)",
            background: "var(--pf-card)",
            borderRadius: "var(--pf-radius)",
          }}
        >
          {t.photo ? (
            <img
              src={t.photo}
              alt={t.name}
              className="mx-auto h-28 w-28 border-2 object-cover"
              style={{ borderRadius: "999px", borderColor: "var(--pf-accent)" }}
            />
          ) : (
            <div
              className="pf-display mx-auto flex h-28 w-28 items-center justify-center text-2xl font-extrabold text-white"
              style={{ borderRadius: "999px", background: "var(--pf-accent)" }}
            >
              {t.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "–"}
            </div>
          )}
          <h1 className="pf-display mt-4 text-center text-xl font-bold leading-tight">
            {t.name || "Your Name"}
          </h1>
          {t.title && (
            <p className="mt-1 text-center text-sm font-medium" style={{ color: "var(--pf-accent)" }}>
              {t.title}
            </p>
          )}
          {t.availability && (
            <p className="mt-3 rounded-full border px-3 py-1 text-center text-xs font-medium"
               style={{ borderColor: "var(--pf-accent)", color: "var(--pf-accent)" }}>
              {t.availability}
            </p>
          )}

          <div className="mt-5 space-y-2 border-t pt-5 text-[13px]" style={{ borderColor: "var(--pf-border)" }}>
            {t.location && <p className="flex items-center gap-2" style={{ color: "var(--pf-muted)" }}><MapPin className="h-3.5 w-3.5 shrink-0" /> {t.location}</p>}
            {t.email && <a href={`mailto:${t.email}`} className="flex items-center gap-2 break-all hover:underline" style={{ color: "var(--pf-muted)" }}><Mail className="h-3.5 w-3.5 shrink-0" /> {t.email}</a>}
            {t.phone && <p className="flex items-center gap-2" style={{ color: "var(--pf-muted)" }}><Phone className="h-3.5 w-3.5 shrink-0" /> {t.phone}</p>}
          </div>

          {socials.length > 0 && (
            <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--pf-border)" }}>
              <p className="pf-mono mb-2.5 text-[11px] uppercase tracking-widest" style={{ color: "var(--pf-muted)" }}>Connect</p>
              <div className="flex flex-wrap gap-2">
                {socials.map((s) => {
                  const Icon = socialIcon(s.platform);
                  return (
                    <a
                      key={s.id}
                      href={normalizeUrl(s.url)}
                      title={s.label || socialName(s.platform)}
                      aria-label={s.label || socialName(s.platform)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border hover:opacity-80"
                      style={{ borderColor: "var(--pf-border)", color: "var(--pf-fg)", background: "var(--pf-bg)" }}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {p.skills.length > 0 && (
            <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--pf-border)" }}>
              <p className="pf-mono mb-2.5 text-[11px] uppercase tracking-widest" style={{ color: "var(--pf-muted)" }}>Skills</p>
              <div className="space-y-3">
                {[...skillGroups].map(([cat, names]) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold">{cat}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: "var(--pf-muted)" }}>
                      {names.join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* main */}
        <div className="min-w-0" style={{ display: "grid", gap: "var(--pf-gap)", alignContent: "start", paddingTop: "0.25rem" }}>
          {t.tagline && (
            <p className="pf-display border-l-4 pl-4 text-lg font-medium leading-relaxed" style={{ borderColor: "var(--pf-accent)" }}>
              {t.tagline}
            </p>
          )}

          {p.about && (
            <section>
              <SectionHead kicker="Profile" title="About" />
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{p.about}</p>
            </section>
          )}

          {p.projects.length > 0 && (
            <section>
              <SectionHead kicker="Work" title="Projects" />
              <div className="space-y-4">
                {p.projects.map((pr) => (
                  <article key={pr.id} className="rounded-md border p-5" style={{ borderColor: "var(--pf-border)", background: "var(--pf-card)", borderRadius: "var(--pf-radius)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="pf-display text-base font-bold">
                        {pr.featured && <span style={{ color: "var(--pf-accent)" }}>★ </span>}{pr.name}
                      </h3>
                      <span className="flex gap-3 text-[13px] font-semibold">
                        {pr.githubUrl && <a href={normalizeUrl(pr.githubUrl)} className="hover:underline">GitHub</a>}
                        {pr.liveUrl && <a href={normalizeUrl(pr.liveUrl)} className="hover:underline">Live</a>}
                      </span>
                    </div>
                    {pr.description && <p className="mt-1.5 text-sm" style={{ color: "var(--pf-muted)" }}>{pr.description}</p>}
                    {pr.technologies.length > 0 && (
                      <p className="pf-mono mt-2 text-xs" style={{ color: "var(--pf-accent)" }}>
                        {pr.technologies.join("  ·  ")}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {p.experience.length > 0 && (
            <section>
              <SectionHead kicker="Career" title="Experience" />
              <div className="space-y-5">
                {p.experience.map((e) => (
                  <article key={e.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="font-bold">{e.position || e.company} <span className="font-medium" style={{ color: "var(--pf-accent)" }}>@ {e.company}</span></h3>
                      <span className="pf-mono text-xs" style={{ color: "var(--pf-muted)" }}>
                        {formatDateRange(e.startDate, e.endDate, e.current)}
                      </span>
                    </div>
                    {e.description && <p className="mt-1 whitespace-pre-line text-sm" style={{ color: "var(--pf-muted)" }}>{e.description}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {p.education.length > 0 && (
            <section>
              <SectionHead kicker="Study" title="Education" />
              <div className="space-y-2.5 text-[15px]">
                {p.education.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <p>
                      <strong className="font-semibold">{e.institution}</strong>
                      <span style={{ color: "var(--pf-muted)" }}> — {[e.degree, e.field].filter(Boolean).join(", ")}{e.grade ? ` (${e.grade})` : ""}</span>
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
              <SectionHead kicker="Proof" title="Certifications" />
              <ul className="space-y-2 text-[15px]">
                {p.certifications.map((c) => (
                  <li key={c.id}>
                    <strong className="font-medium">{c.name}</strong>
                    <span style={{ color: "var(--pf-muted)" }}> — {c.issuer}{c.date ? ` · ${c.date}` : ""}</span>
                    {c.credentialUrl && <> · <a href={normalizeUrl(c.credentialUrl)} className="text-sm hover:underline">verify</a></>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </TemplateShell>
  );
}
