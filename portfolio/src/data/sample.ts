import { newId, type Portfolio } from "@/types/portfolio";

export function samplePortfolio(): Portfolio {
  return {
    version: 1,
    profile: {
      name: "Aarav Sharma",
      title: "Full Stack Developer",
      tagline: "I build fast, scalable web apps with React, Node.js and a little obsession over DX.",
      photo: "",
      location: "Bengaluru, India",
      email: "aarav.sharma@example.com",
      phone: "",
      availability: "Open to full-time roles",
    },
    about:
      "Full stack developer with 3 years of experience building production web applications. I care about clean APIs, thoughtful UI and systems that are easy to change. Previously shipped real-time dashboards, developer tools and e-commerce storefronts used by thousands of people every day.\n\nWhen I'm not writing code, I'm contributing to open source or writing about backend engineering.",
    skills: [
      { id: newId(), name: "TypeScript", category: "Languages" },
      { id: newId(), name: "JavaScript", category: "Languages" },
      { id: newId(), name: "Python", category: "Languages" },
      { id: newId(), name: "SQL", category: "Languages" },
      { id: newId(), name: "React", category: "Frameworks" },
      { id: newId(), name: "Next.js", category: "Frameworks" },
      { id: newId(), name: "Node.js", category: "Frameworks" },
      { id: newId(), name: "Express", category: "Frameworks" },
      { id: newId(), name: "PostgreSQL", category: "Databases" },
      { id: newId(), name: "Redis", category: "Databases" },
      { id: newId(), name: "Docker", category: "Tools" },
      { id: newId(), name: "Git", category: "Tools" },
    ],
    projects: [
      {
        id: newId(),
        name: "Datumly",
        description:
          "A data-focused developer tool that turns API responses into typed clients. Built the parser engine, diff viewer and one-click export for TypeScript, Python and Go.",
        image: "",
        technologies: ["Next.js", "TypeScript", "PostgreSQL"],
        githubUrl: "https://github.com",
        liveUrl: "https://example.com",
        featured: true,
      },
      {
        id: newId(),
        name: "Pulseboard",
        description:
          "Real-time analytics dashboard with WebSocket streaming, custom funnels and sub-second queries over millions of events.",
        image: "",
        technologies: ["React", "Node.js", "Redis"],
        githubUrl: "https://github.com",
        liveUrl: "",
        featured: true,
      },
      {
        id: newId(),
        name: "Shipkit CLI",
        description:
          "Open-source CLI that scaffolds production-ready backend services with auth, migrations and CI in under a minute. 1.2k stars on GitHub.",
        image: "",
        technologies: ["Go", "Docker"],
        githubUrl: "https://github.com",
        liveUrl: "",
        featured: false,
      },
    ],
    experience: [
      {
        id: newId(),
        company: "Northwind Labs",
        position: "Full Stack Developer",
        location: "Bengaluru, India",
        startDate: "2023-06",
        endDate: "",
        current: true,
        description:
          "Own the customer dashboard used by 40k+ users. Cut p95 load time from 4.2s to 900ms with edge caching and query rewrites. Led migration from REST polling to WebSockets for live data.",
        technologies: ["Next.js", "Node.js", "PostgreSQL", "Redis"],
      },
      {
        id: newId(),
        company: "Freelance",
        position: "Frontend Developer",
        location: "Remote",
        startDate: "2022-01",
        endDate: "2023-05",
        current: false,
        description:
          "Shipped marketing sites and storefronts for 8 clients. Specialized in performance audits — average Lighthouse improvement of +35 points.",
        technologies: ["React", "Tailwind CSS"],
      },
    ],
    education: [
      {
        id: newId(),
        institution: "Visvesvaraya Technological University",
        degree: "B.E.",
        field: "Computer Science",
        startYear: "2019",
        endYear: "2023",
        grade: "CGPA 8.6/10",
        description: "",
      },
    ],
    certifications: [
      {
        id: newId(),
        name: "AWS Certified Solutions Architect – Associate",
        issuer: "Amazon Web Services",
        date: "2024",
        credentialUrl: "",
      },
    ],
    socials: [
      { id: newId(), platform: "github", url: "https://github.com", label: "" },
      { id: newId(), platform: "linkedin", url: "https://linkedin.com", label: "" },
      { id: newId(), platform: "twitter", url: "https://x.com", label: "" },
      { id: newId(), platform: "email", url: "mailto:aarav.sharma@example.com", label: "" },
      { id: newId(), platform: "website", url: "https://example.com", label: "" },
    ],
    design: {
      template: "developer",
      theme: "system",
      accent: "orange",
      font: "inter",
      spacing: "comfortable",
      radius: "medium",
      background: "solid",
    },
  };
}
