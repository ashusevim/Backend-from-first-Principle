"use client";

import { useRef, useState } from "react";
import { Check, FileUp, Github, Loader2, Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  fetchGithubProfile, fetchGithubRepos, GithubError, type GithubProfile, type GithubRepo,
} from "@/lib/github";
import { extractTextFromFile, parseResumeText } from "@/lib/resume";
import type { PortfolioUpdate } from "@/hooks/use-portfolio";
import {
  isValidGithubUsername, newId, parsePortfolio, type Portfolio,
} from "@/types/portfolio";
import { PanelTitle } from "./bits";

export function ImportPanel({ p, update, replace }: { p: Portfolio; update: PortfolioUpdate; replace: (p: Portfolio) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <PanelTitle title="Import" hint="Start from GitHub, a resume, or a previous backup." />
      </div>
      <GithubImport p={p} update={update} />
      <ResumeImport replace={replace} />
      <JsonImport replace={replace} />
    </div>
  );
}

/* --------------------------------- GitHub --------------------------------- */

function GithubImport({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "pick" | "error">("idle");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<GithubProfile | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const importProfile = async () => {
    const u = username.trim();
    if (!isValidGithubUsername(u)) {
      setError("Enter a valid GitHub username (letters, numbers, hyphens).");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const [prof, rp] = await Promise.all([fetchGithubProfile(u), fetchGithubRepos(u)]);
      setProfile(prof);
      setRepos(rp);
      setSelected(new Set(rp.slice(0, 6).map((r) => r.id)));
      setStatus("pick");
      setDialogOpen(true);
    } catch (e) {
      setStatus("error");
      setError(e instanceof GithubError ? e.message : "Something went wrong. Please retry.");
    }
  };

  const apply = (withProfile: boolean) => {
    if (!profile) return;
    update((prev) => {
      const next = { ...prev };
      if (withProfile) {
        next.profile = {
          ...prev.profile,
          name: prev.profile.name || profile.name || profile.login,
          photo: prev.profile.photo || profile.avatar_url,
          location: prev.profile.location || profile.location || "",
          tagline: prev.profile.tagline || profile.bio || "",
        };
        if (profile.blog) {
          const hasSite = prev.socials.some((s) => s.platform === "website");
          if (!hasSite) {
            next.socials = [
              ...prev.socials,
              { id: newId(), platform: "website" as const, url: profile.blog!.startsWith("http") ? profile.blog! : `https://${profile.blog}`, label: "" },
            ];
          }
        }
        const hasGh = prev.socials.some((s) => s.platform === "github");
        if (!hasGh) {
          next.socials = [
            ...(next.socials ?? prev.socials),
            { id: newId(), platform: "github" as const, url: profile.html_url, label: "" },
          ];
        }
      }
      const chosen = repos.filter((r) => selected.has(r.id));
      const existingUrls = new Set(prev.projects.map((x) => x.githubUrl));
      const additions = chosen
        .filter((r) => !existingUrls.has(r.html_url))
        .map((r, i) => ({
          id: newId(),
          name: r.name,
          description: (r.description ?? "").slice(0, 600),
          image: "",
          technologies: [r.language, ...(r.topics ?? [])].filter(Boolean).slice(0, 6) as string[],
          githubUrl: r.html_url,
          liveUrl: r.homepage && r.homepage.startsWith("http") ? r.homepage : "",
          featured: i < 2 && prev.projects.length === 0,
        }));
      next.projects = [...prev.projects, ...additions];
      return next;
    });
    setDialogOpen(false);
    setStatus("idle");
    toast(withProfile ? "GitHub profile + projects imported. Review everything!" : "Repositories imported. Review everything!");
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Github className="h-4 w-4" /> Import from GitHub
      </h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Pull your avatar, bio and pick which repositories become projects.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), importProfile())}
          placeholder="octocat"
          aria-label="GitHub username"
          className="font-mono"
          spellCheck={false}
        />
        <Button onClick={importProfile} disabled={status === "loading" || !username.trim()}>
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
        </Button>
      </div>
      {status === "error" && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-[13px]">
          {error}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={importProfile}>Retry</Button>
          </div>
        </div>
      )}
      {status === "loading" && (
        <p className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching profile & repositories…
        </p>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={`Import from @${profile?.login}`}
        description="Choose what to bring in. Nothing is overwritten without your say."
        wide
      >
        {profile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3">
              <img src={profile.avatar_url} alt="" className="h-11 w-11 rounded-full" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile.name || profile.login}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile.bio || `${profile.public_repos} public repos · ${profile.followers} followers`}
                </p>
              </div>
            </div>
            {repos.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No public, non-fork repositories found. You can still import the profile info.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Select repositories ({selected.size}/{repos.length})</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(repos.map((r) => r.id)))}>Select all</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
                  </div>
                </div>
                <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {repos.map((r) => {
                    const on = selected.has(r.id);
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => setSelected((s) => {
                            const n = new Set(s);
                            if (on) n.delete(r.id);
                            else n.add(r.id);
                            return n;
                          })}
                          className={`flex w-full items-start gap-2.5 rounded-md border p-2.5 text-left ${on ? "border-primary bg-primary/5" : "border-border"}`}
                        >
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                            {on && <Check className="h-3 w-3" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <span className="truncate">{r.name}</span>
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-normal text-muted-foreground">
                                <Star className="h-3 w-3" /> {r.stargazers_count}
                              </span>
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {r.description || "No description"}
                              {r.language ? ` · ${r.language}` : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => apply(false)} disabled={selected.size === 0}>
                Import {selected.size} repo{selected.size === 1 ? "" : "s"} only
              </Button>
              <Button onClick={() => apply(true)}>Import profile + repos</Button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}

/* --------------------------------- resume --------------------------------- */

function ResumeImport({ replace }: { replace: (p: Portfolio) => void }) {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      const text = await extractTextFromFile(f);
      const guess = parseResumeText(text);
      replace(
        parsePortfolio({
          version: 1,
          profile: guess.profile,
          about: guess.about,
          skills: guess.skills,
          projects: guess.projects,
          experience: guess.experience,
          education: guess.education,
          certifications: guess.certifications,
          socials: guess.socials,
        })
      );
      toast("Resume imported — review everything before publishing.", "info");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse that file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <FileUp className="h-4 w-4" /> Import from resume
      </h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Upload a PDF or TXT resume. Extraction is best-effort —{" "}
        <strong className="font-medium text-foreground">review imported information before publishing.</strong>
      </p>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        aria-label="Upload resume"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button variant="outline" className="mt-3" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Parsing…" : "Choose resume file"}
      </Button>
      {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
    </section>
  );
}

/* ---------------------------------- JSON ---------------------------------- */

function JsonImport({ replace }: { replace: (p: Portfolio) => void }) {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Restore from backup</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Import a <span className="font-mono text-xs">portfolio.json</span> you exported earlier.
      </p>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import portfolio.json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const data = JSON.parse(await f.text());
            replace(parsePortfolio(data));
            setError("");
            toast("Backup restored.");
          } catch {
            setError("That file isn't a valid portfolio backup.");
          }
        }}
      />
      <Button variant="outline" className="mt-3" onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4" /> Import portfolio.json
      </Button>
      {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
    </section>
  );
}

