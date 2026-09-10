import { z } from "zod";

/* ---------------------------------- ids ---------------------------------- */

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

/* --------------------------------- schemas -------------------------------- */

export const profileSchema = z.object({
  name: z.string().max(80).default(""),
  title: z.string().max(80).default(""),
  tagline: z.string().max(220).default(""),
  photo: z.string().default(""), // data URL or remote URL
  location: z.string().max(80).default(""),
  email: z.string().max(120).default(""),
  phone: z.string().max(40).default(""),
  availability: z.string().max(80).default(""),
});

export const skillSchema = z.object({
  id: z.string().default(""),
  name: z.string().max(60),
  category: z.string().max(60).default("Languages"),
});

export const projectSchema = z.object({
  id: z.string().default(""),
  name: z.string().max(80),
  description: z.string().max(600).default(""),
  image: z.string().default(""),
  technologies: z.array(z.string().max(40)).default([]),
  githubUrl: z.string().max(300).default(""),
  liveUrl: z.string().max(300).default(""),
  featured: z.boolean().default(false),
});

export const experienceSchema = z.object({
  id: z.string().default(""),
  company: z.string().max(80),
  position: z.string().max(80).default(""),
  location: z.string().max(80).default(""),
  startDate: z.string().max(20).default(""),
  endDate: z.string().max(20).default(""),
  current: z.boolean().default(false),
  description: z.string().max(1200).default(""),
  technologies: z.array(z.string().max(40)).default([]),
});

export const educationSchema = z.object({
  id: z.string().default(""),
  institution: z.string().max(120),
  degree: z.string().max(120).default(""),
  field: z.string().max(120).default(""),
  startYear: z.string().max(10).default(""),
  endYear: z.string().max(10).default(""),
  grade: z.string().max(40).default(""),
  description: z.string().max(600).default(""),
});

export const certificationSchema = z.object({
  id: z.string().default(""),
  name: z.string().max(120),
  issuer: z.string().max(120).default(""),
  date: z.string().max(20).default(""),
  credentialUrl: z.string().max(300).default(""),
});

export const socialPlatforms = [
  "github",
  "linkedin",
  "twitter",
  "email",
  "website",
  "youtube",
  "devto",
  "medium",
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export const socialLinkSchema = z.object({
  id: z.string().default(""),
  platform: z.enum(socialPlatforms),
  url: z.string().max(300),
  label: z.string().max(60).default(""),
});

export const templateIds = ["minimal", "developer", "modern", "terminal"] as const;
export type TemplateId = (typeof templateIds)[number];

export const designSchema = z.object({
  template: z.enum(templateIds).default("developer"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  accent: z.string().default("orange"),
  font: z.string().default("inter"),
  spacing: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
  radius: z.enum(["sharp", "medium", "rounded"]).default("medium"),
  background: z.enum(["solid", "gradient", "grid", "dots"]).default("solid"),
});

export const portfolioSchema = z.object({
  version: z.number().default(1),
  profile: profileSchema.default({}),
  about: z.string().max(4000).default(""),
  skills: z.array(skillSchema).default([]),
  projects: z.array(projectSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  socials: z.array(socialLinkSchema).default([]),
  design: designSchema.default({}),
});

/* ---------------------------------- types --------------------------------- */

export type Profile = z.infer<typeof profileSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type SocialLink = z.infer<typeof socialLinkSchema>;
export type DesignSettings = z.infer<typeof designSchema>;
export type Portfolio = z.infer<typeof portfolioSchema>;

/* -------------------------------- defaults -------------------------------- */

export const emptyPortfolio = (): Portfolio => ({
  version: 1,
  profile: {
    name: "",
    title: "",
    tagline: "",
    photo: "",
    location: "",
    email: "",
    phone: "",
    availability: "",
  },
  about: "",
  skills: [],
  projects: [],
  experience: [],
  education: [],
  certifications: [],
  socials: [],
  design: {
    template: "developer",
    theme: "system",
    accent: "orange",
    font: "inter",
    spacing: "comfortable",
    radius: "medium",
    background: "solid",
  },
});

/** Parse unknown data leniently — repairs partial/malformed imports. */
export function parsePortfolio(data: unknown): Portfolio {
  const result = portfolioSchema.safeParse(data);
  if (result.success) {
    const p = result.data;
    // ensure ids exist on all list items
    for (const list of [
      p.skills,
      p.projects,
      p.experience,
      p.education,
      p.certifications,
      p.socials,
    ]) {
      for (const item of list as { id: string }[]) {
        if (!item.id) item.id = newId();
      }
    }
    return p;
  }
  // fallback: merge over empty portfolio so partial data still works
  const base = emptyPortfolio();
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    try {
      if (d.profile && typeof d.profile === "object")
        base.profile = { ...base.profile, ...(d.profile as object) };
      if (typeof d.about === "string") base.about = d.about;
      for (const key of [
        "skills",
        "projects",
        "experience",
        "education",
        "certifications",
        "socials",
      ] as const) {
        if (Array.isArray(d[key])) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (base as any)[key] = (d[key] as any[]).map((item) => ({
            ...item,
            id: typeof item?.id === "string" && item.id ? item.id : newId(),
          }));
        }
      }
      if (d.design && typeof d.design === "object")
        base.design = { ...base.design, ...(d.design as object) } as DesignSettings;
    } catch {
      /* ignore — return base */
    }
  }
  return parsePortfolio(base);
}

/* ------------------------------- validation ------------------------------- */

export const isValidEmail = (v: string) =>
  v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isValidUrl = (v: string) => {
  if (v.trim() === "") return true;
  try {
    const u = new URL(v.startsWith("http") ? v : `https://${v}`);
    return !!u.hostname.includes(".");
  } catch {
    return false;
  }
};

export const normalizeUrl = (v: string) => {
  const t = v.trim();
  if (!t) return "";
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  return `https://${t}`;
};

export const isValidGithubUsername = (v: string) =>
  /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(v.trim());
