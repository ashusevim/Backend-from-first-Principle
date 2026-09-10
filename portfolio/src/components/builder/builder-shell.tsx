"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award, Briefcase, Check, Download, Eye, FileText, GraduationCap, Import,
  Loader2, Palette, Share2, Sparkles, Trash2, User, Wand2, FolderKanban, Link2, ChevronLeft,
} from "lucide-react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTheme } from "@/components/theme-provider";
import { Logo, ThemeToggle } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { clearPortfolio, hasStoredPortfolio } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { LivePreview } from "./live-preview";
import { ProfilePanel, AboutPanel } from "./panels-basic";
import {
  SkillsPanel, ProjectsPanel, ExperiencePanel, EducationPanel, CertificationsPanel, SocialsPanel,
} from "./panels-lists";
import { DesignPanel } from "./panels-design";
import { ImportPanel } from "./panels-import";
import { ExportPanel } from "./panels-export";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "about", label: "About", icon: FileText },
  { id: "skills", label: "Skills", icon: Wand2 },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "certs", label: "Certifications", icon: Award },
  { id: "socials", label: "Socials", icon: Link2 },
  { id: "design", label: "Design", icon: Palette },
  { id: "import", label: "Import", icon: Import },
  { id: "export", label: "Export", icon: Download },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function BuilderShell() {
  const { portfolio, update, replace, reset, loadSample, hydrated, saveState } = usePortfolio();
  const { toast } = useToast();
  const [section, setSection] = useState<SectionId>("profile");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [confirmReset, setConfirmReset] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
    () => typeof window !== "undefined" && !hasStoredPortfolio()
  );

  const isEmpty =
    !portfolio.profile.name &&
    portfolio.projects.length === 0 &&
    portfolio.skills.length === 0 &&
    portfolio.experience.length === 0 &&
    !portfolio.about;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      {/* top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Back to home" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="hidden sm:block"><Logo /></div>
          <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground md:inline-flex">
            {saveState === "saving" ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
            ) : saveState === "saved" ? (
              <><Check className="h-3 w-3 text-emerald-500" /> Saved locally</>
            ) : (
              <span className="text-destructive">Couldn't save (storage full?)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)} className="hidden sm:inline-flex" aria-label="Reset portfolio">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Link href="/preview">
            <Button variant="outline" size="sm"><Eye className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Preview</span></Button>
          </Link>
          <Button size="sm" onClick={() => { setSection("export"); setMobileTab("edit"); }}>
            <Share2 className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* mobile edit/preview toggle */}
      <div className="flex shrink-0 gap-1 border-b border-border bg-background p-2 lg:hidden" role="tablist" aria-label="Editor or preview">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={mobileTab === t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium capitalize",
              mobileTab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* section nav (desktop) */}
        <nav className="hidden w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-3 lg:flex" aria-label="Builder sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              aria-current={section === s.id ? "true" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm",
                section === s.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
          <div className="mt-auto px-3 pt-4 text-[11px] leading-relaxed text-muted-foreground">
            Your portfolio data stays in your browser.
          </div>
        </nav>

        {/* editor */}
        <div className={cn("min-h-0 w-full flex-col lg:w-[420px] lg:shrink-0 lg:border-r lg:border-border", mobileTab === "edit" ? "flex" : "hidden lg:flex")}>
          {/* mobile section picker */}
          <div className="slim-scroll flex shrink-0 gap-1.5 overflow-x-auto border-b border-border p-2.5 lg:hidden" role="tablist" aria-label="Builder sections">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={section === s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium",
                  section === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                )}
              >
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            ))}
          </div>
          <div className="slim-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {!hydrated ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : (
              <div key={section} className="animate-fade-in">
                {section === "profile" && <ProfilePanel p={portfolio} update={update} />}
                {section === "about" && <AboutPanel p={portfolio} update={update} />}
                {section === "skills" && <SkillsPanel p={portfolio} update={update} />}
                {section === "projects" && <ProjectsPanel p={portfolio} update={update} />}
                {section === "experience" && <ExperiencePanel p={portfolio} update={update} />}
                {section === "education" && <EducationPanel p={portfolio} update={update} />}
                {section === "certs" && <CertificationsPanel p={portfolio} update={update} />}
                {section === "socials" && <SocialsPanel p={portfolio} update={update} />}
                {section === "design" && <DesignPanel p={portfolio} update={update} />}
                {section === "import" && <ImportPanel p={portfolio} update={update} replace={replace} />}
                {section === "export" && <ExportPanel p={portfolio} />}
              </div>
            )}
          </div>
        </div>

        {/* preview */}
        <div className={cn("min-h-0 min-w-0 flex-1 flex-col", mobileTab === "preview" ? "flex" : "hidden lg:flex")}>
          <LivePreview p={portfolio} device={device} setDevice={setDevice} />
        </div>
      </div>

      {/* welcome dialog */}
      <Dialog
        open={showWelcome && hydrated && isEmpty}
        onClose={() => setShowWelcome(false)}
        title="Build your portfolio in minutes"
        description="Start blank, try realistic sample data, or import from GitHub."
      >
        <div className="grid gap-2">
          <Button
            className="w-full justify-start"
            onClick={() => { loadSample(); setShowWelcome(false); setSection("design"); toast("Sample portfolio loaded — make it yours."); }}
          >
            <Sparkles className="h-4 w-4" /> Start with sample portfolio
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => { setShowWelcome(false); setSection("import"); setMobileTab("edit"); }}>
            <Import className="h-4 w-4" /> Import from GitHub or resume
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => { setShowWelcome(false); setMobileTab("edit"); }}>
            Start from scratch
          </Button>
        </div>
      </Dialog>

      {/* reset confirm */}
      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset portfolio?"
        description="This clears everything in the builder and your browser storage. Export a JSON backup first if you might want it back."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => {
              reset();
              clearPortfolio();
              setConfirmReset(false);
              toast("Portfolio reset.");
            }}
          >
            Reset everything
          </Button>
        </div>
      </Dialog>

      {/* reduced theme flash helper */}
      <ThemeSync />
    </div>
  );
}

function ThemeSync() {
  useTheme();
  return null;
}
