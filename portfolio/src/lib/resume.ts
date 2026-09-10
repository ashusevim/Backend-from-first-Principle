import { newId, type Portfolio } from "@/types/portfolio";

/**
 * Best-effort client-side resume parsing (TXT + text-based PDF).
 * Never claimed to be perfect — the UI always asks the user to review.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
    return await file.text();
  }
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const buf = await file.arrayBuffer();
    return extractTextFromPdf(new Uint8Array(buf));
  }
  throw new Error("Unsupported file type. Upload a PDF or TXT resume.");
}

/** Minimal PDF text extraction: pulls literal strings from content streams. */
function extractTextFromPdf(bytes: Uint8Array): string {
  // decode latin1 so byte offsets survive
  let raw = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    raw += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const out: string[] = [];
  // literal strings in Tj / TJ operators: (text) Tj  or  [(a) (b)] TJ
  const re = /\((?:\\.|[^()\\])*\)\s*(?:Tj|TJ|'|")|\[\s*(?:\((?:\\.|[^()\\])*\)\s*)+?\]\s*TJ/g;
  let m: RegExpExecArray | null;
  const unescape = (s: string) =>
    s
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
  while ((m = re.exec(raw)) !== null) {
    const inner = [...m[0].matchAll(/\(((?:\\.|[^()\\])*)\)/g)]
      .map((g) => unescape(g[1]))
      .join("");
    if (inner.trim()) out.push(inner);
  }
  // Fallback: hex strings <...> Tj
  if (out.join(" ").replace(/\s/g, "").length < 50) {
    const hex = /<([0-9A-Fa-f\s]{8,})>\s*(?:Tj|TJ|'|")/g;
    let h: RegExpExecArray | null;
    while ((h = hex.exec(raw)) !== null) {
      const clean = h[1].replace(/\s/g, "");
      if (clean.length % 2 !== 0) continue;
      let s = "";
      for (let i = 0; i < clean.length; i += 2) {
        const code = parseInt(clean.slice(i, i + 2), 16);
        if (code >= 32 || code === 10) s += String.fromCharCode(code);
      }
      if (s.trim().length > 1) out.push(s);
    }
  }
  const text = out.join(" ").replace(/\s+/g, " ").trim();
  if (text.replace(/\s/g, "").length < 60) {
    throw new Error(
      "Could not read text from this PDF. It may be scanned — try exporting it as TXT."
    );
  }
  return text;
}

const SKILL_HINTS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust", "ruby", "php",
  "kotlin", "swift", "sql", "html", "css", "react", "next.js", "nextjs", "node.js", "nodejs",
  "express", "vue", "angular", "svelte", "django", "flask", "fastapi", "spring", "spring boot",
  "laravel", "rails", ".net", "docker", "kubernetes", "aws", "azure", "gcp", "terraform",
  "git", "graphql", "rest", "mongodb", "postgresql", "postgres", "mysql", "redis",
  "elasticsearch", "kafka", "figma", "tailwind", "redux", "prisma", "firebase", "linux",
];

const SKILL_CATEGORIES: Record<string, string> = {
  javascript: "Languages", typescript: "Languages", python: "Languages", java: "Languages",
  "c++": "Languages", "c#": "Languages", go: "Languages", rust: "Languages", ruby: "Languages",
  php: "Languages", kotlin: "Languages", swift: "Languages", sql: "Languages", html: "Languages",
  css: "Languages", react: "Frameworks", "next.js": "Frameworks", nextjs: "Frameworks",
  "node.js": "Frameworks", nodejs: "Frameworks", express: "Frameworks", vue: "Frameworks",
  angular: "Frameworks", svelte: "Frameworks", django: "Frameworks", flask: "Frameworks",
  fastapi: "Frameworks", spring: "Frameworks", "spring boot": "Frameworks", laravel: "Frameworks",
  rails: "Frameworks", ".net": "Frameworks", redux: "Frameworks", tailwind: "Frameworks",
  docker: "Tools", kubernetes: "Tools", aws: "Tools", azure: "Tools", gcp: "Tools",
  terraform: "Tools", git: "Tools", linux: "Tools", figma: "Tools", firebase: "Tools",
  graphql: "Tools", rest: "Tools", mongodb: "Databases", postgresql: "Databases",
  postgres: "Databases", mysql: "Databases", redis: "Databases", elasticsearch: "Databases",
  kafka: "Tools", prisma: "Tools",
};

const SECTION_HEADS = [
  "experience", "work experience", "employment", "education", "skills",
  "technical skills", "projects", "personal projects", "certifications",
  "summary", "about", "objective", "contact",
];

export type ResumeGuess = Partial<Portfolio> & { rawText: string };

export function parseResumeText(text: string): ResumeGuess {
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();

  const email = clean.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  const phone =
    clean.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0].trim() ?? "";
  const github = clean.match(/github\.com\/([A-Za-z0-9-]+)/)?.[0] ?? "";
  const linkedin = clean.match(/(?:linkedin\.com\/in\/[A-Za-z0-9-]+)/)?.[0] ?? "";
  const website = clean.match(/(https?:\/\/[^\s,;|]+)/)?.[0] ?? "";

  // name: first short line-ish chunk before email/phone, fallback first words
  let name = "";
  const head = clean.slice(0, email ? clean.indexOf(email) : 200);
  const headWords = head.split(/[,|•·\n]/)[0].trim().split(/\s+/).slice(0, 4);
  if (headWords.length >= 2 && headWords.join(" ").length <= 40) {
    name = headWords.join(" ");
  }

  // about: sentence after summary/about heading or first long sentence
  let about = "";
  const summaryIdx = lower.search(/\b(summary|about me|profile|objective)\b/);
  if (summaryIdx >= 0) {
    about = clean.slice(summaryIdx, summaryIdx + 600).split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
    about = about.replace(/^(summary|about me|profile|objective)\s*/i, "").slice(0, 500);
  }
  if (!about) {
    const firstLong = clean.split(/(?<=[.!?])\s+/).find((s) => s.length > 80 && s.length < 400);
    if (firstLong) about = firstLong;
  }

  // skills: keyword scan
  const found = SKILL_HINTS.filter((s) =>
    new RegExp(`(^|[^a-z#+.])${s.replace(/[.+]/g, "\\$&")}([^a-z+]|$)`, "i").test(lower)
  );
  const skills = [...new Set(found)].slice(0, 24).map((s) => ({
    id: newId(),
    name: prettifySkill(s),
    category: SKILL_CATEGORIES[s] ?? "Tools",
  }));

  // section splitter
  const sections: Record<string, string> = {};
  const positions: { head: string; idx: number }[] = [];
  for (const h of SECTION_HEADS) {
    const idx = lower.indexOf(h);
    if (idx >= 0) positions.push({ head: h, idx });
  }
  positions.sort((a, b) => a.idx - b.idx);
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : clean.length;
    sections[positions[i].head] = clean.slice(start, Math.min(end, start + 3000));
  }

  // experience: split experience section on year ranges / bullets
  const expText = sections["experience"] ?? sections["work experience"] ?? sections["employment"] ?? "";
  const experience = splitBullets(expText)
    .slice(0, 6)
    .map((b) => {
      const years = b.match(/(20\d{2})\s*[-–—to]+\s*(20\d{2}|present|current)/i);
      return {
        id: newId(),
        company: guessCompany(b),
        position: guessPosition(b),
        location: "",
        startDate: years ? years[1] : "",
        endDate: years ? (/present|current/i.test(years[2]) ? "" : years[2]) : "",
        current: years ? /present|current/i.test(years[2]) : false,
        description: b.slice(0, 500),
        technologies: [] as string[],
      };
    })
    .filter((e) => e.description.length > 20);

  const eduText = sections["education"] ?? "";
  const education = splitBullets(eduText)
    .slice(0, 4)
    .map((b) => {
      const years = [...b.matchAll(/(20\d{2})/g)].map((m) => m[1]);
      const deg = b.match(/(b\.?tech|m\.?tech|bachelor|master|b\.?sc|m\.?sc|mba|ph\.?d|bca|mca)[^,.|]{0,60}/i)?.[0] ?? "";
      return {
        id: newId(),
        institution: b.split(/[,|•·]/)[0].trim().slice(0, 120) || "Institution",
        degree: deg.trim().slice(0, 120),
        field: "",
        startYear: years[0] ?? "",
        endYear: years[1] ?? years[0] ?? "",
        grade: b.match(/(cgpa|gpa)\s*[:\-]?\s*[\d.]+\s*\/?\s*[\d.]*/i)?.[0] ?? "",
        description: "",
      };
    })
    .filter((e) => e.institution.length > 2 && e.institution.toLowerCase() !== "education");

  const projText = sections["projects"] ?? sections["personal projects"] ?? "";
  const projects = splitBullets(projText)
    .slice(0, 6)
    .map((b) => ({
      id: newId(),
      name: b.split(/[-–—:|•·]/)[0].trim().slice(0, 80) || "Project",
      description: b.slice(0, 400),
      image: "",
      technologies: [] as string[],
      githubUrl: b.match(/github\.com\/[^\s,;|]+/)?.[0] ?? "",
      liveUrl: "",
      featured: false,
    }))
    .filter((p) => p.description.length > 20);

  const certText = sections["certifications"] ?? "";
  const certifications = splitBullets(certText)
    .slice(0, 6)
    .map((b) => ({
      id: newId(),
      name: b.split(/[-–—:|•·]/)[0].trim().slice(0, 120) || "Certificate",
      issuer: b.split(/[-–—:|•·]/)[1]?.trim().slice(0, 120) ?? "",
      date: b.match(/(20\d{2})/)?.[0] ?? "",
      credentialUrl: "",
    }))
    .filter((c) => c.name.length > 3);

  const socials: ResumeGuess["socials"] = [];
  if (github) socials.push({ id: newId(), platform: "github", url: `https://${github}`, label: "" });
  if (linkedin) socials.push({ id: newId(), platform: "linkedin", url: `https://${linkedin}`, label: "" });
  if (website && !website.includes("github.com") && !website.includes("linkedin.com"))
    socials.push({ id: newId(), platform: "website", url: website, label: "" });
  if (email) socials.push({ id: newId(), platform: "email", url: `mailto:${email}`, label: "" });

  return {
    rawText: clean.slice(0, 20000),
    profile: {
      name, title: guessPosition(clean.slice(0, 400)), tagline: "", photo: "",
      location: clean.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z][a-z]+)/)?.[0] ?? "",
      email, phone, availability: "",
    },
    about,
    skills,
    projects,
    experience,
    education,
    certifications,
    socials,
  };
}

function splitBullets(section: string): string[] {
  if (!section) return [];
  return section
    .split(/•|·|\n\s*[-*]\s+|\s{2,}[-*]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

function guessCompany(b: string): string {
  const m = b.match(/(?:at|@)\s+([A-Z][\w&.-]+(?:\s+[A-Z][\w&.-]+){0,3})/);
  if (m) return m[1].slice(0, 80);
  const parts = b.split(/[,|•·-]/).map((s) => s.trim());
  return (parts[1] || parts[0] || "").split(" ").slice(0, 4).join(" ").slice(0, 80);
}

function guessPosition(b: string): string {
  const m = b.match(
    /(intern|engineer|developer|designer|manager|analyst|consultant|architect|lead|specialist|scientist)[\w\s/-]{0,40}/i
  );
  if (m) return b.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + m[0].length).trim().slice(0, 80);
  return b.split(/[,|•·]/)[0].trim().slice(0, 80);
}

function prettifySkill(s: string): string {
  const map: Record<string, string> = {
    "next.js": "Next.js", nextjs: "Next.js", "node.js": "Node.js", nodejs: "Node.js",
    "c++": "C++", "c#": "C#", ".net": ".NET", postgresql: "PostgreSQL", postgres: "PostgreSQL",
    mysql: "MySQL", mongodb: "MongoDB", graphql: "GraphQL", javascript: "JavaScript",
    typescript: "TypeScript", aws: "AWS", gcp: "GCP", "spring boot": "Spring Boot",
  };
  return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}
