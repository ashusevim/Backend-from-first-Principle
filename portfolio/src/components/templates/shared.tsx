import {
  Github, Linkedin, Twitter, Mail, Globe, Youtube, PenLine, BookOpen,
  MapPin, ExternalLink, Star, ArrowUpRight,
} from "lucide-react";
import { accentHex, fontById } from "@/lib/design";
import { cn } from "@/lib/utils";
import { normalizeUrl, type Portfolio, type SocialPlatform } from "@/types/portfolio";
import { formatDateRange } from "@/lib/utils";

export const socialIcon = (platform: SocialPlatform) =>
  ({
    github: Github,
    linkedin: Linkedin,
    twitter: Twitter,
    email: Mail,
    website: Globe,
    youtube: Youtube,
    devto: PenLine,
    medium: BookOpen,
  })[platform];

export const socialName = (p: SocialPlatform) =>
  p === "twitter" ? "X / Twitter" : p === "devto" ? "Dev.to" : p[0].toUpperCase() + p.slice(1);

export function TemplateShell({
  portfolio,
  dark,
  className,
  children,
  id,
}: {
  portfolio: Portfolio;
  dark: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const font = fontById(portfolio.design.font);
  const radius =
    portfolio.design.radius === "sharp" ? "2px" : portfolio.design.radius === "rounded" ? "16px" : "9px";
  const gap =
    portfolio.design.spacing === "compact" ? "2rem" : portfolio.design.spacing === "spacious" ? "4.5rem" : "3.25rem";
  const bg = portfolio.design.background;
  const style = {
    "--pf-accent": accentHex(portfolio.design.accent, dark),
    "--pf-bg": dark ? "#0b0b0d" : "#ffffff",
    "--pf-fg": dark ? "#f4f4f5" : "#17171c",
    "--pf-muted": dark ? "#a1a1aa" : "#5b5b66",
    "--pf-card": dark ? "#141417" : "#f8f8fa",
    "--pf-border": dark ? "#26262b" : "#e8e8ec",
    "--pf-radius": radius,
    "--pf-gap": gap,
    "--pf-font-body": font.body,
    "--pf-font-display": font.display,
    "--pf-font-mono": font.mono,
  } as React.CSSProperties;

  return (
    <div
      id={id}
      style={style}
      className={cn(
        "pf-root min-h-full w-full transition-colors",
        bg === "grid" && "pf-bg-grid",
        bg === "dots" && "pf-bg-dots",
        bg === "gradient" && "pf-bg-gradient",
        className
      )}
    >
      <style>{`
        .pf-root{background:var(--pf-bg);color:var(--pf-fg);font-family:var(--pf-font-body)}
        .pf-root.pf-bg-grid{background-image:linear-gradient(var(--pf-border) 1px,transparent 1px),linear-gradient(90deg,var(--pf-border) 1px,transparent 1px);background-size:44px 44px}
        .pf-root.pf-bg-dots{background-image:radial-gradient(var(--pf-border) 1.3px,transparent 1.3px);background-size:22px 22px}
        .pf-root.pf-bg-gradient{background:linear-gradient(180deg,color-mix(in srgb,var(--pf-accent) 9%,var(--pf-bg)),var(--pf-bg) 30%)}
        .pf-root a{color:var(--pf-accent)}
        .pf-display{font-family:var(--pf-font-display)}
        .pf-mono{font-family:var(--pf-font-mono)}
      `}</style>
      {children}
    </div>
  );
}

export function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="pf-mono mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] opacity-80" style={{ color: "var(--pf-accent)" }}>
        {kicker}
      </div>
      <h2 className="pf-display text-xl font-bold tracking-tight" style={{ color: "var(--pf-fg)" }}>
        {title}
      </h2>
    </div>
  );
}

export function Meta({ portfolio }: { portfolio: Portfolio }) {
  const t = portfolio.profile;
  if (!t.location && !t.email && !t.phone) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]" style={{ color: "var(--pf-muted)" }}>
      {t.location && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> {t.location}
        </span>
      )}
      {t.email && (
        <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1.5 hover:underline" style={{ color: "var(--pf-muted)" }}>
          <Mail className="h-3.5 w-3.5" /> {t.email}
        </a>
      )}
      {t.phone && <span>{t.phone}</span>}
    </div>
  );
}

export { formatDateRange, normalizeUrl, ExternalLink, Star, ArrowUpRight };
