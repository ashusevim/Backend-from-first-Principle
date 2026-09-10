import { accentHex, fontById } from "@/lib/design";
import { escapeHtml as esc, formatDateRange } from "@/lib/utils";
import { normalizeUrl } from "@/types/portfolio";
import type { Portfolio } from "@/types/portfolio";

/** Build a standalone, dependency-free portfolio website as a single HTML file. */

function head(p: Portfolio): string {
  const name = esc(p.profile.name || "Developer Portfolio");
  const desc = esc(p.profile.tagline || p.about.slice(0, 160) || "Personal developer portfolio");
  const font = fontById(p.design.font);
  const google = font.google
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${font.google}&display=swap" rel="stylesheet">`
    : "";
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}${p.profile.title ? ` — ${esc(p.profile.title)}` : ""}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${name}"><meta property="og:description" content="${desc}"><meta property="og:type" content="website">${google}`;
}

function cssVars(p: Portfolio, darkDefault: boolean): string {
  const accent = accentHex(p.design.accent, darkDefault);
  const accentSoft =
    p.design.accent === "slate" ? (darkDefault ? "#1e293b" : "#f1f5f9") : accent + "1a";
  const font = fontById(p.design.font);
  const radius =
    p.design.radius === "sharp" ? "2px" : p.design.radius === "rounded" ? "16px" : "8px";
  const gap =
    p.design.spacing === "compact" ? "2.5rem" : p.design.spacing === "spacious" ? "5.5rem" : "4rem";
  const bg = darkDefault ? "#0a0a0b" : "#ffffff";
  const fg = darkDefault ? "#f4f4f5" : "#18181b";
  const muted = darkDefault ? "#a1a1aa" : "#52525b";
  const card = darkDefault ? "#131316" : "#fafafa";
  const border = darkDefault ? "#27272a" : "#e4e4e7";
  return `:root{--accent:${accent};--accent-soft:${accentSoft};--bg:${bg};--fg:${fg};--muted:${muted};--card:${card};--border:${border};--radius:${radius};--gap:${gap};--font-body:${font.body};--font-display:${font.display};--font-mono:${font.mono}}`;
}

const baseCss = `
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font-body);background:var(--bg);color:var(--fg);line-height:1.65;font-size:16px;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:880px;margin:0 auto;padding:0 1.5rem}
section{padding:calc(var(--gap)/2) 0}section+section{border-top:1px solid var(--border)}
h1,h2,h3{font-family:var(--font-display);line-height:1.2;letter-spacing:-.02em}
.eyebrow{font-family:var(--font-mono);font-size:.8rem;color:var(--accent);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.75rem}
h2.sec{font-size:1.35rem;margin-bottom:1.5rem}
.hero{padding:5rem 0 3.5rem}.hero .avail{display:inline-block;font-size:.8rem;font-family:var(--font-mono);color:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:.2rem .8rem;margin-bottom:1.25rem}
.hero h1{font-size:clamp(2.2rem,6vw,3.4rem);font-weight:800;margin-bottom:.4rem}
.hero .title{font-size:1.25rem;color:var(--muted);font-weight:500;margin-bottom:1rem}
.hero .tag{font-size:1.05rem;max-width:36rem;margin-bottom:1.5rem}
.meta{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;color:var(--muted);font-size:.9rem;margin-bottom:1.75rem}
.btns{display:flex;flex-wrap:wrap;gap:.7rem}
.btn{display:inline-block;padding:.6rem 1.3rem;border-radius:var(--radius);font-weight:600;font-size:.95rem;border:1px solid var(--border);color:var(--fg)}.btn:hover{text-decoration:none;border-color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.photo{width:104px;height:104px;border-radius:calc(var(--radius)*2);object-fit:cover;margin-bottom:1.25rem;border:1px solid var(--border)}
.about p{white-space:pre-line;color:var(--fg);max-width:44rem}
.skills-cat{margin-bottom:1.25rem}.skills-cat h3{font-size:.85rem;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.6rem}
.pills{display:flex;flex-wrap:wrap;gap:.45rem}.pill{font-size:.85rem;padding:.28rem .75rem;border-radius:999px;background:var(--accent-soft);border:1px solid var(--border)}
.cards{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.card{border:1px solid var(--border);border-radius:var(--radius);padding:1.4rem;background:var(--card)}
.card.feat{border-color:var(--accent)}.card h3{font-size:1.08rem;margin-bottom:.4rem}
.card p{font-size:.92rem;color:var(--muted);margin-bottom:.8rem}.card img{width:100%;border-radius:calc(var(--radius)/1.5);margin-bottom:.8rem;border:1px solid var(--border)}
.tech{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.8rem}.tech span{font-family:var(--font-mono);font-size:.75rem;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:.1rem .45rem}
.links{display:flex;gap:1rem;font-size:.88rem;font-weight:600}
.job{margin-bottom:1.6rem}.job:last-child{margin-bottom:0}
.job .row{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:baseline}
.job h3{font-size:1.05rem}.job .co{color:var(--accent);font-weight:600;font-size:.95rem}
.job .date{font-family:var(--font-mono);font-size:.8rem;color:var(--muted);white-space:nowrap}
.job p{font-size:.93rem;color:var(--muted);white-space:pre-line;margin-top:.35rem;max-width:44rem}
.edu{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.2rem}.edu:last-child{margin-bottom:0}
.edu h3{font-size:1rem}.edu .sub{font-size:.9rem;color:var(--muted)}
.certs{list-style:none;display:grid;gap:.7rem}.certs li{border:1px solid var(--border);border-radius:var(--radius);padding:.8rem 1rem;background:var(--card);font-size:.92rem}
.certs .iss{color:var(--muted)}
footer{padding:3rem 0 4rem;color:var(--muted);font-size:.88rem;border-top:1px solid var(--border)}
.socials{display:flex;flex-wrap:wrap;gap:.4rem 1.1rem;margin-bottom:1rem;text-transform:capitalize;font-weight:600}
.bg-grid body,body.bg-grid{background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:44px 44px}
body.bg-dots{background-image:radial-gradient(var(--border) 1.2px,transparent 1.2px);background-size:24px 24px}
body.bg-gradient{background:linear-gradient(180deg,var(--accent-soft),var(--bg) 34%)}
@media print{body{background:#fff!important;color:#111!important}.wrap{max-width:100%}.btns,.avail{display:none!important}section{padding:1.2rem 0}a{color:#111;text-decoration:none}footer{border:none}}
@media (max-width:600px){.hero{padding:3rem 0 2.5rem}}
/* terminal theme */
.t-term{font-family:var(--font-mono)}.t-term .hero h1{font-size:clamp(1.6rem,5vw,2.4rem)}
.t-term .prompt{color:var(--accent)}.t-term .card,.t-term .certs li{background:transparent}
.t-term section+section{border-top-style:dashed}`;

function backgroundClass(p: Portfolio): string {
  return p.design.background === "grid"
    ? "bg-grid"
    : p.design.background === "dots"
      ? "bg-dots"
      : p.design.background === "gradient"
        ? "bg-gradient"
        : "";
}

function socialLabel(platform: string, url: string, label: string): string {
  if (label) return esc(label);
  if (platform === "email") return esc(url.replace(/^mailto:/, ""));
  return esc(platform === "twitter" ? "X / Twitter" : platform === "devto" ? "Dev.to" : platform);
}

export function generatePortfolioHtml(p: Portfolio): string {
  const darkDefault = p.design.theme === "dark" || p.design.template === "terminal";
  const isTerm = p.design.template === "terminal";
  const t = p.profile;
  const socials = p.socials.filter((s) => s.url.trim());
  const initials = t.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const skillGroups = new Map<string, string[]>();
  for (const s of p.skills) {
    const g = skillGroups.get(s.category || "Other") ?? [];
    g.push(s.name);
    skillGroups.set(s.category || "Other", g);
  }

  const projects = [...p.projects].sort(
    (a, b) => Number(b.featured) - Number(a.featured)
  );

  const body = `
<header class="hero wrap">
  ${t.availability ? `<span class="avail">${isTerm ? "● " : ""}${esc(t.availability)}</span>` : ""}
  ${t.photo ? `<div><img class="photo" src="${t.photo}" alt="${esc(t.name)}"></div>` : ""}
  ${isTerm ? `<div class="eyebrow"><span class="prompt">$</span> whoami</div>` : ""}
  <h1>${esc(t.name || "Your Name")}</h1>
  ${t.title ? `<div class="title">${esc(t.title)}</div>` : ""}
  ${t.tagline ? `<p class="tag">${esc(t.tagline)}</p>` : ""}
  <div class="meta">
    ${t.location ? `<span>◷ ${esc(t.location)}</span>` : ""}
    ${t.email ? `<span>✉ <a href="mailto:${esc(t.email)}">${esc(t.email)}</a></span>` : ""}
    ${t.phone ? `<span>☎ ${esc(t.phone)}</span>` : ""}
  </div>
  ${
    socials.length
      ? `<div class="btns">${socials
          .slice(0, 5)
          .map(
            (s, i) =>
              `<a class="btn${i === 0 ? " primary" : ""}" href="${esc(normalizeUrl(s.url))}">${socialLabel(s.platform, s.url, s.label)}</a>`
          )
          .join("")}</div>`
      : ""
  }
</header>
<main class="wrap">
  ${
    p.about
      ? `<section class="about"><div class="eyebrow">${isTerm ? "$ cat about.txt" : "About"}</div><h2 class="sec">About</h2><p>${esc(p.about)}</p></section>`
      : ""
  }
  ${
    p.skills.length
      ? `<section><div class="eyebrow">${isTerm ? "$ ls ~/skills" : "Skills"}</div><h2 class="sec">Skills</h2>${[...skillGroups]
          .map(
            ([cat, names]) =>
              `<div class="skills-cat"><h3>${esc(cat)}</h3><div class="pills">${names.map((n) => `<span class="pill">${esc(n)}</span>`).join("")}</div></div>`
          )
          .join("")}</section>`
      : ""
  }
  ${
    projects.length
      ? `<section><div class="eyebrow">${isTerm ? "$ ls ~/projects" : "Projects"}</div><h2 class="sec">Projects</h2><div class="cards">${projects
          .map(
            (pr) => `<article class="card${pr.featured ? " feat" : ""}">
          ${pr.image ? `<img src="${pr.image}" alt="${esc(pr.name)}" loading="lazy">` : ""}
          <h3>${esc(pr.name)}</h3><p>${esc(pr.description)}</p>
          ${pr.technologies.length ? `<div class="tech">${pr.technologies.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
          <div class="links">${pr.githubUrl ? `<a href="${esc(normalizeUrl(pr.githubUrl))}">GitHub →</a>` : ""}${pr.liveUrl ? `<a href="${esc(normalizeUrl(pr.liveUrl))}">Live demo →</a>` : ""}</div>
        </article>`
          )
          .join("")}</div></section>`
      : ""
  }
  ${
    p.experience.length
      ? `<section><div class="eyebrow">${isTerm ? "$ cat experience.log" : "Experience"}</div><h2 class="sec">Experience</h2>${p.experience
          .map(
            (e) => `<div class="job"><div class="row"><div><h3>${esc(e.position || e.company)}</h3><div class="co">${esc(e.company)}${e.location ? ` · ${esc(e.location)}` : ""}</div></div><span class="date">${esc(formatDateRange(e.startDate, e.endDate, e.current))}</span></div>${e.description ? `<p>${esc(e.description)}</p>` : ""}${e.technologies.length ? `<div class="tech" style="margin-top:.5rem">${e.technologies.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</div>`
          )
          .join("")}</section>`
      : ""
  }
  ${
    p.education.length
      ? `<section><div class="eyebrow">${isTerm ? "$ cat education.log" : "Education"}</div><h2 class="sec">Education</h2>${p.education
          .map(
            (e) => `<div class="edu"><div><h3>${esc(e.institution)}</h3><div class="sub">${[e.degree, e.field].filter(Boolean).join(" · ")}${e.grade ? ` · ${esc(e.grade)}` : ""}</div>${e.description ? `<div class="sub">${esc(e.description)}</div>` : ""}</div><span class="date">${esc([e.startYear, e.endYear].filter(Boolean).join(" – "))}</span></div>`
          )
          .join("")}</section>`
      : ""
  }
  ${
    p.certifications.length
      ? `<section><div class="eyebrow">${isTerm ? "$ cat certs.log" : "Certifications"}</div><h2 class="sec">Certifications</h2><ul class="certs">${p.certifications
          .map(
            (c) => `<li><strong>${esc(c.name)}</strong> <span class="iss">— ${esc(c.issuer)}${c.date ? ` · ${esc(c.date)}` : ""}</span>${c.credentialUrl ? ` <a href="${esc(normalizeUrl(c.credentialUrl))}">Verify →</a>` : ""}</li>`
          )
          .join("")}</ul></section>`
      : ""
  }
</main>
<footer><div class="wrap">
  ${socials.length ? `<div class="socials">${socials.map((s) => `<a href="${esc(normalizeUrl(s.url))}">${socialLabel(s.platform, s.url, s.label)}</a>`).join("")}</div>` : ""}
  <div>${esc(t.name || initials || "Portfolio")} · Built with Devfolio Builder</div>
</div></footer>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>${head(p)}
<style>${cssVars(p, darkDefault)}${baseCss}</style>
</head>
<body class="${backgroundClass(p)}${isTerm ? " t-term" : ""}">
${body}
</body>
</html>`;
}
