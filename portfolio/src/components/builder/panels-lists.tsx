"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PortfolioUpdate } from "@/hooks/use-portfolio";
import {
  isValidUrl, newId, normalizeUrl, socialPlatforms,
  type Portfolio, type Skill, type SocialPlatform,
} from "@/types/portfolio";
import { socialIcon, socialName } from "@/components/templates/shared";
import { PanelTitle, EmptyState, ItemCard, TechInput, ImageUpload, moveItem } from "./bits";

/* --------------------------------- skills --------------------------------- */

const CATEGORIES = ["Languages", "Frameworks", "Databases", "Tools", "Other"];

export function SkillsPanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("Languages");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const skill: Skill = { id: newId(), name: n.slice(0, 60), category: cat };
    update((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
    setName("");
  };

  const groups = new Map<string, { s: Skill; i: number }[]>();
  p.skills.forEach((s, i) => {
    const g = groups.get(s.category || "Other") ?? [];
    g.push({ s, i });
    groups.set(s.category || "Other", g);
  });

  return (
    <div>
      <PanelTitle title="Skills" hint="Add the technologies you work with." />
      <div className="mb-4 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="e.g. TypeScript"
          aria-label="Skill name"
          maxLength={60}
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Skill category"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Button onClick={add} disabled={!name.trim()} aria-label="Add skill">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {p.skills.length === 0 && (
        <EmptyState
          title="No skills yet"
          body="Add the technologies you work with — languages, frameworks, tools."
          action={<span className="text-xs text-muted-foreground">Use the field above to add your first skill.</span>}
        />
      )}

      <div className="space-y-4">
        {[...groups].map(([category, items]) => (
          <div key={category}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {category} ({items.length})
            </p>
            <ul className="space-y-1.5">
              {items.map(({ s, i }) => (
                <li key={s.id} className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1">
                  <span className="min-w-0 flex-1 truncate px-1 text-sm">{s.name}</span>
                  <button type="button" aria-label={`Move ${s.name} up`} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => update((prev) => ({ ...prev, skills: moveItem(prev.skills, i, -1) }))}>↑</button>
                  <button type="button" aria-label={`Move ${s.name} down`} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => update((prev) => ({ ...prev, skills: moveItem(prev.skills, i, 1) }))}>↓</button>
                  <button type="button" aria-label={`Remove ${s.name}`} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => update((prev) => ({ ...prev, skills: prev.skills.filter((x) => x.id !== s.id) }))}>✕</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- projects -------------------------------- */

export function ProjectsPanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const [openId, setOpenId] = useState<string | null>(p.projects[0]?.id ?? null);

  const add = () => {
    const id = newId();
    update((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { id, name: "", description: "", image: "", technologies: [], githubUrl: "", liveUrl: "", featured: prev.projects.length === 0 },
      ],
    }));
    setOpenId(id);
  };

  const patch = (id: string, v: Partial<Portfolio["projects"][number]>) =>
    update((prev) => ({
      ...prev,
      projects: prev.projects.map((x) => (x.id === id ? { ...x, ...v } : x)),
    }));

  return (
    <div>
      <PanelTitle title="Projects" hint="Your strongest section. Lead with what you're proud of." />
      {p.projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Show recruiters what you've built."
          action={<Button size="sm" onClick={add}><Plus className="mr-1 h-3.5 w-3.5" /> Add your first project</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {p.projects.map((pr, i) => {
            const ghBad = !isValidUrl(pr.githubUrl);
            const liveBad = !isValidUrl(pr.liveUrl);
            return (
              <ItemCard
                key={pr.id}
                title={pr.name}
                subtitle={pr.featured ? "★ Featured" : undefined}
                featured={pr.featured}
                open={openId === pr.id}
                onToggle={() => setOpenId(openId === pr.id ? null : pr.id)}
                onDelete={() => update((prev) => ({ ...prev, projects: prev.projects.filter((x) => x.id !== pr.id) }))}
                onMove={(d) => update((prev) => ({ ...prev, projects: moveItem(prev.projects, i, d) }))}
              >
                <Field label="Project name">
                  <Input value={pr.name} onChange={(e) => patch(pr.id, { name: e.target.value })} placeholder="Datumly" maxLength={80} />
                </Field>
                <Field label="Description">
                  <Textarea value={pr.description} onChange={(e) => patch(pr.id, { description: e.target.value })} placeholder="What it does, who it's for, what you built." rows={3} maxLength={600} />
                </Field>
                <ImageUpload label={`Screenshot for ${pr.name || "project"}`} value={pr.image} onChange={(v) => patch(pr.id, { image: v })} />
                <Field label="Technologies" optional>
                  <TechInput values={pr.technologies} onChange={(v) => patch(pr.id, { technologies: v })} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="GitHub URL" optional error={ghBad ? "Invalid URL." : undefined}>
                    <Input value={pr.githubUrl} onChange={(e) => patch(pr.id, { githubUrl: e.target.value })} onBlur={() => pr.githubUrl && patch(pr.id, { githubUrl: normalizeUrl(pr.githubUrl) })} placeholder="github.com/you/thing" invalid={ghBad} inputMode="url" />
                  </Field>
                  <Field label="Live URL" optional error={liveBad ? "Invalid URL." : undefined}>
                    <Input value={pr.liveUrl} onChange={(e) => patch(pr.id, { liveUrl: e.target.value })} onBlur={() => pr.liveUrl && patch(pr.id, { liveUrl: normalizeUrl(pr.liveUrl) })} placeholder="https://…" invalid={liveBad} inputMode="url" />
                  </Field>
                </div>
                <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2">
                  <span className="text-[13px] font-medium">Featured project</span>
                  <Switch checked={pr.featured} onChange={(v) => patch(pr.id, { featured: v })} label={`Feature ${pr.name || "project"}`} />
                </div>
              </ItemCard>
            );
          })}
          <Button variant="outline" className="w-full" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Add project
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- experience ------------------------------- */

export function ExperiencePanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const add = () => {
    const id = newId();
    update((prev) => ({
      ...prev,
      experience: [...prev.experience, { id, company: "", position: "", location: "", startDate: "", endDate: "", current: false, description: "", technologies: [] }],
    }));
    setOpenId(id);
  };
  const patch = (id: string, v: Partial<Portfolio["experience"][number]>) =>
    update((prev) => ({ ...prev, experience: prev.experience.map((x) => (x.id === id ? { ...x, ...v } : x)) }));

  return (
    <div>
      <PanelTitle title="Experience" hint="Full-time, internships, freelance, open source — it all counts." />
      {p.experience.length === 0 ? (
        <EmptyState
          title="No experience added yet"
          body={"You can add internships,\nfreelance work, or open-source experience."}
          action={<Button size="sm" onClick={add}><Plus className="mr-1 h-3.5 w-3.5" /> Add experience</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {p.experience.map((e, i) => (
            <ItemCard
              key={e.id}
              title={e.position || e.company}
              subtitle={e.company}
              open={openId === e.id}
              onToggle={() => setOpenId(openId === e.id ? null : e.id)}
              onDelete={() => update((prev) => ({ ...prev, experience: prev.experience.filter((x) => x.id !== e.id) }))}
              onMove={(d) => update((prev) => ({ ...prev, experience: moveItem(prev.experience, i, d) }))}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Company">
                  <Input value={e.company} onChange={(ev) => patch(e.id, { company: ev.target.value })} placeholder="Northwind Labs" maxLength={80} />
                </Field>
                <Field label="Position">
                  <Input value={e.position} onChange={(ev) => patch(e.id, { position: ev.target.value })} placeholder="Frontend Developer" maxLength={80} />
                </Field>
              </div>
              <Field label="Location" optional>
                <Input value={e.location} onChange={(ev) => patch(e.id, { location: ev.target.value })} placeholder="Remote / Bengaluru" maxLength={80} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start" optional>
                  <Input type="month" value={e.startDate} onChange={(ev) => patch(e.id, { startDate: ev.target.value })} />
                </Field>
                <Field label="End" optional>
                  <Input type="month" value={e.endDate} disabled={e.current} onChange={(ev) => patch(e.id, { endDate: ev.target.value })} />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2">
                <span className="text-[13px] font-medium">I currently work here</span>
                <Switch checked={e.current} onChange={(v) => patch(e.id, { current: v, endDate: v ? "" : e.endDate })} label="Current position" />
              </div>
              <Field label="Description" optional hint="Impact first. Numbers help.">
                <Textarea value={e.description} onChange={(ev) => patch(e.id, { description: ev.target.value })} placeholder="Cut p95 load time from 4.2s to 900ms…" rows={3} maxLength={1200} />
              </Field>
              <Field label="Technologies" optional>
                <TechInput values={e.technologies} onChange={(v) => patch(e.id, { technologies: v })} />
              </Field>
            </ItemCard>
          ))}
          <Button variant="outline" className="w-full" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Add experience
          </Button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- education ------------------------------- */

export function EducationPanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const add = () => {
    const id = newId();
    update((prev) => ({
      ...prev,
      education: [...prev.education, { id, institution: "", degree: "", field: "", startYear: "", endYear: "", grade: "", description: "" }],
    }));
    setOpenId(id);
  };
  const patch = (id: string, v: Partial<Portfolio["education"][number]>) =>
    update((prev) => ({ ...prev, education: prev.education.map((x) => (x.id === id ? { ...x, ...v } : x)) }));

  return (
    <div>
      <PanelTitle title="Education" hint="Degrees, bootcamps, self-study programs." />
      {p.education.length === 0 ? (
        <EmptyState
          title="No education added"
          body="Add your degree, bootcamp, or coursework."
          action={<Button size="sm" onClick={add}><Plus className="mr-1 h-3.5 w-3.5" /> Add education</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {p.education.map((e, i) => (
            <ItemCard
              key={e.id}
              title={e.institution}
              subtitle={[e.degree, e.field].filter(Boolean).join(" · ")}
              open={openId === e.id}
              onToggle={() => setOpenId(openId === e.id ? null : e.id)}
              onDelete={() => update((prev) => ({ ...prev, education: prev.education.filter((x) => x.id !== e.id) }))}
              onMove={(d) => update((prev) => ({ ...prev, education: moveItem(prev.education, i, d) }))}
            >
              <Field label="Institution">
                <Input value={e.institution} onChange={(ev) => patch(e.id, { institution: ev.target.value })} placeholder="University / Bootcamp" maxLength={120} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Degree" optional>
                  <Input value={e.degree} onChange={(ev) => patch(e.id, { degree: ev.target.value })} placeholder="B.E." maxLength={120} />
                </Field>
                <Field label="Field" optional>
                  <Input value={e.field} onChange={(ev) => patch(e.id, { field: ev.target.value })} placeholder="Computer Science" maxLength={120} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Start" optional>
                  <Input value={e.startYear} onChange={(ev) => patch(e.id, { startYear: ev.target.value })} placeholder="2019" maxLength={10} inputMode="numeric" />
                </Field>
                <Field label="End" optional>
                  <Input value={e.endYear} onChange={(ev) => patch(e.id, { endYear: ev.target.value })} placeholder="2023" maxLength={10} inputMode="numeric" />
                </Field>
                <Field label="Grade" optional>
                  <Input value={e.grade} onChange={(ev) => patch(e.id, { grade: ev.target.value })} placeholder="8.6 CGPA" maxLength={40} />
                </Field>
              </div>
              <Field label="Notes" optional>
                <Textarea value={e.description} onChange={(ev) => patch(e.id, { description: ev.target.value })} rows={2} maxLength={600} />
              </Field>
            </ItemCard>
          ))}
          <Button variant="outline" className="w-full" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Add education
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- certifications ----------------------------- */

export function CertificationsPanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const add = () => {
    const id = newId();
    update((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { id, name: "", issuer: "", date: "", credentialUrl: "" }],
    }));
    setOpenId(id);
  };
  const patch = (id: string, v: Partial<Portfolio["certifications"][number]>) =>
    update((prev) => ({ ...prev, certifications: prev.certifications.map((x) => (x.id === id ? { ...x, ...v } : x)) }));

  return (
    <div>
      <PanelTitle title="Certifications" hint="Only add ones you'd defend in an interview." />
      {p.certifications.length === 0 ? (
        <EmptyState
          title="No certifications"
          body="AWS, GCP, Meta, freeCodeCamp — anything credible."
          action={<Button size="sm" onClick={add}><Plus className="mr-1 h-3.5 w-3.5" /> Add certification</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {p.certifications.map((c, i) => {
            const bad = !isValidUrl(c.credentialUrl);
            return (
              <ItemCard
                key={c.id}
                title={c.name}
                subtitle={c.issuer}
                open={openId === c.id}
                onToggle={() => setOpenId(openId === c.id ? null : c.id)}
                onDelete={() => update((prev) => ({ ...prev, certifications: prev.certifications.filter((x) => x.id !== c.id) }))}
                onMove={(d) => update((prev) => ({ ...prev, certifications: moveItem(prev.certifications, i, d) }))}
              >
                <Field label="Certificate name">
                  <Input value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} placeholder="AWS Solutions Architect – Associate" maxLength={120} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Issuer">
                    <Input value={c.issuer} onChange={(e) => patch(c.id, { issuer: e.target.value })} placeholder="Amazon Web Services" maxLength={120} />
                  </Field>
                  <Field label="Year" optional>
                    <Input value={c.date} onChange={(e) => patch(c.id, { date: e.target.value })} placeholder="2024" maxLength={20} />
                  </Field>
                </div>
                <Field label="Credential URL" optional error={bad ? "Invalid URL." : undefined}>
                  <Input value={c.credentialUrl} onChange={(e) => patch(c.id, { credentialUrl: e.target.value })} onBlur={() => c.credentialUrl && patch(c.id, { credentialUrl: normalizeUrl(c.credentialUrl) })} placeholder="https://…" invalid={bad} inputMode="url" />
                </Field>
              </ItemCard>
            );
          })}
          <Button variant="outline" className="w-full" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Add certification
          </Button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- socials -------------------------------- */

export function SocialsPanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const get = (platform: SocialPlatform) => p.socials.find((s) => s.platform === platform);
  const set = (platform: SocialPlatform, url: string) =>
    update((prev) => {
      const rest = prev.socials.filter((s) => s.platform !== platform);
      if (!url.trim()) return { ...prev, socials: rest };
      const existing = prev.socials.find((s) => s.platform === platform);
      return {
        ...prev,
        socials: existing
          ? prev.socials.map((s) => (s.platform === platform ? { ...s, url: url.trim() } : s))
          : [...rest, { id: newId(), platform, url: url.trim(), label: "" }],
      };
    });

  return (
    <div>
      <PanelTitle title="Social links" hint="Only populated links appear on your portfolio." />
      <div className="space-y-3">
        {socialPlatforms.map((platform) => {
          const Icon = socialIcon(platform);
          const current = get(platform);
          const bad = current ? !isValidUrl(current.url) : false;
          return (
            <div key={platform} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <Input
                  value={current?.url ?? ""}
                  onChange={(e) => set(platform, e.target.value)}
                  onBlur={() => current?.url && set(platform, platform === "email" && !current.url.startsWith("mailto:") && current.url.includes("@") ? `mailto:${current.url}` : normalizeUrl(current.url))}
                  placeholder={platform === "email" ? "you@example.com" : `your ${socialName(platform).toLowerCase()} url`}
                  aria-label={`${socialName(platform)} URL`}
                  invalid={bad}
                />
                {bad && <p className="mt-1 text-xs text-destructive">Invalid URL.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
