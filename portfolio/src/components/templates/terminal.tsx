import { TemplateShell, normalizeUrl, formatDateRange } from "./shared";
import type { Portfolio } from "@/types/portfolio";

/** Template 4 — Terminal: a professional terminal session, not a gimmick. */
export function TemplateTerminal({ portfolio: p, dark }: { portfolio: Portfolio; dark: boolean }) {
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());
  const host = (t.name || "developer").toLowerCase().replace(/\s+/g, "-");

  const Block = ({ cmd, children }: { cmd: string; children: React.ReactNode }) => (
    <section className="mb-10 last:mb-0">
      <p className="mb-3 text-[13px]">
        <span style={{ color: "var(--pf-accent)" }}>➜</span>{" "}
        <span style={{ color: "var(--pf-muted)" }}>~</span> <span className="font-semibold">{cmd}</span>
      </p>
      <div className="text-[14px] leading-relaxed">{children}</div>
    </section>
  );

  return (
    <TemplateShell portfolio={p} dark={dark} className="pf-mono">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div
          className="overflow-hidden border"
          style={{ borderColor: "var(--pf-border)", borderRadius: "calc(var(--pf-radius) + 4px)", background: "var(--pf-card)" }}
        >
          {/* window bar */}
          <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: "var(--pf-border)" }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
            <span className="ml-2 text-xs" style={{ color: "var(--pf-muted)" }}>
              {host}@{host}: ~
            </span>
          </div>

          <div className="p-5 sm:p-8">
            {/* boot */}
            <div className="mb-8 text-[13px]" style={{ color: "var(--pf-muted)" }}>
              <p>Last login: {new Date().toDateString()} on ttys000</p>
              <p className="mt-3 text-[15px]">
                <span style={{ color: "var(--pf-accent)" }}>➜</span>{" "}
                <span style={{ color: "var(--pf-muted)" }}>~</span>{" "}
                <span className="font-semibold" style={{ color: "var(--pf-fg)" }}>./portfolio --about</span>
              </p>
            </div>

            <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center">
              {t.photo && (
                <img
                  src={t.photo}
                  alt={t.name}
                  className="h-24 w-24 border object-cover"
                  style={{ borderColor: "var(--pf-accent)", borderRadius: "var(--pf-radius)" }}
                />
              )}
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--pf-fg)" }}>
                  {t.name || "Your Name"}
                </h1>
                {t.title && <p className="mt-1 font-semibold" style={{ color: "var(--pf-accent)" }}>{t.title}</p>}
                {t.tagline && <p className="mt-2 text-[14px]" style={{ color: "var(--pf-muted)" }}>{t.tagline}</p>}
                <p className="mt-2 text-[13px]" style={{ color: "var(--pf-muted)" }}>
                  {[t.location, t.email, t.availability].filter(Boolean).join("  ·  ")}
                </p>
              </div>
            </div>

            {p.about && (
              <Block cmd="cat about.txt">
                <p className="whitespace-pre-line" style={{ color: "var(--pf-muted)" }}>{p.about}</p>
              </Block>
            )}

            {socials.length > 0 && (
              <Block cmd="ls ./connect">
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {socials.map((s) => (
                    <a key={s.id} href={normalizeUrl(s.url)} className="hover:underline">
                      <span style={{ color: "var(--pf-muted)" }}>./</span>
                      {s.label || s.platform}
                      <span style={{ color: "var(--pf-muted)" }}> →</span>
                    </a>
                  ))}
                </div>
              </Block>
            )}

            {p.skills.length > 0 && (
              <Block cmd="cat stack.json">
                <pre className="overflow-x-auto whitespace-pre-wrap text-[13px]" style={{ color: "var(--pf-muted)" }}>
                  {"{"}
                  {[...groupSkills(p)].map(([cat, names], i, arr) => (
                    <span key={cat}>
                      {`\n  "${cat}": [`}
                      {names.map((n, j) => (
                        <span key={n}>
                          <span style={{ color: "var(--pf-accent)" }}>"{n}"</span>
                          {j < names.length - 1 ? ", " : ""}
                        </span>
                      ))}
                      {`]`}{i < arr.length - 1 ? "," : ""}
                    </span>
                  ))}
                  {"\n}"}
                </pre>
              </Block>
            )}

            {p.projects.length > 0 && (
              <Block cmd="ls -la ./projects">
                <div className="space-y-4">
                  {p.projects.map((pr) => (
                    <article key={pr.id} className="border-l-2 pl-4" style={{ borderColor: "var(--pf-accent)" }}>
                      <p className="font-bold" style={{ color: "var(--pf-fg)" }}>
                        {pr.featured && <span style={{ color: "var(--pf-accent)" }}>★ </span>}
                        {pr.name}
                        <span style={{ color: "var(--pf-muted)" }}>
                          {"  "}{[pr.githubUrl && "[code]", pr.liveUrl && "[live]"].filter(Boolean).join(" ")}
                        </span>
                      </p>
                      {pr.description && (
                        <p className="mt-1" style={{ color: "var(--pf-muted)" }}>{pr.description}</p>
                      )}
                      {pr.technologies.length > 0 && (
                        <p className="mt-1 text-[13px]" style={{ color: "var(--pf-muted)" }}>
                          <span style={{ color: "var(--pf-accent)" }}>▸</span> {pr.technologies.join(", ")}
                        </p>
                      )}
                      <p className="mt-1 text-[13px]">
                        {pr.githubUrl && <><a href={normalizeUrl(pr.githubUrl)} className="hover:underline">./code</a>{"  "}</>}
                        {pr.liveUrl && <a href={normalizeUrl(pr.liveUrl)} className="hover:underline">./live</a>}
                      </p>
                    </article>
                  ))}
                </div>
              </Block>
            )}

            {p.experience.length > 0 && (
              <Block cmd="git log --experience">
                <div className="space-y-4">
                  {p.experience.map((e) => (
                    <div key={e.id}>
                      <p>
                        <span style={{ color: "var(--pf-accent)" }}>commit</span>{" "}
                        <span style={{ color: "var(--pf-muted)" }}>
                          {e.company.toLowerCase().replace(/\s+/g, "-")}-{e.startDate || "xxxx"}
                        </span>
                      </p>
                      <p className="font-bold" style={{ color: "var(--pf-fg)" }}>
                        {e.position || e.company} @ {e.company}
                      </p>
                      <p className="text-[13px]" style={{ color: "var(--pf-muted)" }}>
                        Date: {formatDateRange(e.startDate, e.endDate, e.current)}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                      {e.description && (
                        <p className="mt-1 whitespace-pre-line" style={{ color: "var(--pf-muted)" }}>
                          {"    "}{e.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Block>
            )}

            {p.education.length > 0 && (
              <Block cmd="cat education.md">
                <div className="space-y-2">
                  {p.education.map((e) => (
                    <p key={e.id}>
                      <span style={{ color: "var(--pf-accent)" }}>#</span>{" "}
                      <strong style={{ color: "var(--pf-fg)" }}>{e.institution}</strong>
                      <span style={{ color: "var(--pf-muted)" }}>
                        {" "}— {[e.degree, e.field].filter(Boolean).join(", ")}
                        {e.grade ? ` (${e.grade})` : ""}
                        {" "}[{[e.startYear, e.endYear].filter(Boolean).join("–")}]
                      </span>
                    </p>
                  ))}
                </div>
              </Block>
            )}

            {p.certifications.length > 0 && (
              <Block cmd="cat certs.txt">
                <div className="space-y-1.5">
                  {p.certifications.map((c) => (
                    <p key={c.id}>
                      <span style={{ color: "var(--pf-accent)" }}>✓</span>{" "}
                      <span style={{ color: "var(--pf-fg)" }}>{c.name}</span>{" "}
                      <span style={{ color: "var(--pf-muted)" }}>
                        — {c.issuer}{c.date ? ` · ${c.date}` : ""}
                      </span>
                      {c.credentialUrl && <> <a href={normalizeUrl(c.credentialUrl)} className="hover:underline">[verify]</a></>}
                    </p>
                  ))}
                </div>
              </Block>
            )}

            <p className="mt-8 text-[13px]">
              <span style={{ color: "var(--pf-accent)" }}>➜</span>{" "}
              <span style={{ color: "var(--pf-muted)" }}>~</span>{" "}
              <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse" style={{ background: "var(--pf-accent)" }} />
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--pf-muted)" }}>
          {host} · exit 0
        </p>
      </div>
    </TemplateShell>
  );
}

function groupSkills(p: Portfolio): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = m.get(s.category || "other") ?? [];
    g.push(s.name);
    m.set(s.category || "other", g);
  }
  return m;
}
