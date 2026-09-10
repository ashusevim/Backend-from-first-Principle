"use client";

import { Check } from "lucide-react";
import { ACCENTS, FONTS } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { PortfolioUpdate } from "@/hooks/use-portfolio";
import type { Portfolio, TemplateId } from "@/types/portfolio";
import { TEMPLATE_META } from "@/components/templates/registry";
import { PanelTitle } from "./bits";

export function DesignPanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const set = (k: keyof Portfolio["design"], v: string) =>
    update((prev) => ({ ...prev, design: { ...prev.design, [k]: v } }));
  const d = p.design;

  const Option = ({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "relative rounded-lg border p-2.5 text-left transition-colors hover:border-primary/60",
        active ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
    >
      {active && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-2.5 w-2.5" />
        </span>
      )}
      {children}
    </button>
  );

  return (
    <div>
      <PanelTitle title="Design" hint="Tasteful presets. Your content never changes." />

      <p className="mb-2 text-[13px] font-medium">Template</p>
      <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Template">
        {TEMPLATE_META.map((t) => (
          <Option key={t.id} label={`${t.name} template`} active={d.template === t.id} onClick={() => set("template", t.id as TemplateId)}>
            <MiniPreview id={t.id} accent={d.accent} dark={false} />
            <p className="mt-2 text-[13px] font-semibold">{t.name}</p>
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{t.tagline}</p>
          </Option>
        ))}
      </div>

      <p className="mb-2 text-[13px] font-medium">Theme</p>
      <div className="mb-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
        {(["light", "dark", "system"] as const).map((v) => (
          <Option key={v} label={`${v} theme`} active={d.theme === v} onClick={() => set("theme", v)}>
            <span className="flex items-center gap-2">
              <span
                className="h-5 w-5 rounded-full border border-border"
                style={{ background: v === "dark" ? "#0b0b0d" : v === "light" ? "#fff" : "linear-gradient(135deg,#fff 50%,#0b0b0d 50%)" }}
              />
              <span className="text-[13px] font-medium capitalize">{v}</span>
            </span>
          </Option>
        ))}
      </div>

      <p className="mb-2 text-[13px] font-medium">Accent color</p>
      <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Accent color">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={d.accent === a.id}
            aria-label={`${a.label} accent`}
            title={a.label}
            onClick={() => set("accent", a.id)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110",
              d.accent === a.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            style={{ background: a.hex }}
          >
            {d.accent === a.id && <Check className="h-3.5 w-3.5 text-white" />}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[13px] font-medium">Typography</p>
      <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Typography">
        {FONTS.map((f) => (
          <Option key={f.id} label={`${f.label} font`} active={d.font === f.id} onClick={() => set("font", f.id)}>
            <span className="block text-lg leading-none" style={{ fontFamily: f.display }}>Ag</span>
            <span className="mt-1 block text-[12px] font-medium">{f.label}</span>
          </Option>
        ))}
      </div>

      <p className="mb-2 text-[13px] font-medium">Spacing</p>
      <div className="mb-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Spacing">
        {(["compact", "comfortable", "spacious"] as const).map((v) => (
          <Option key={v} label={`${v} spacing`} active={d.spacing === v} onClick={() => set("spacing", v)}>
            <span className="flex flex-col gap-1">
              <span className="h-1.5 rounded bg-secondary" />
              <span className="h-1.5 rounded bg-secondary" style={{ marginTop: v === "compact" ? 0 : v === "spacious" ? 8 : 4 }} />
              <span className="mt-1 text-[12px] font-medium capitalize">{v}</span>
            </span>
          </Option>
        ))}
      </div>

      <p className="mb-2 text-[13px] font-medium">Corners</p>
      <div className="mb-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Corner radius">
        {(["sharp", "medium", "rounded"] as const).map((v) => (
          <Option key={v} label={`${v} corners`} active={d.radius === v} onClick={() => set("radius", v)}>
            <span className="flex items-center gap-2">
              <span className="h-5 w-8 bg-primary/70" style={{ borderRadius: v === "sharp" ? 2 : v === "rounded" ? 12 : 6 }} />
              <span className="text-[12px] font-medium capitalize">{v}</span>
            </span>
          </Option>
        ))}
      </div>

      <p className="mb-2 text-[13px] font-medium">Background</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Background">
        {(
          [
            { id: "solid", label: "Solid" },
            { id: "gradient", label: "Gradient" },
            { id: "grid", label: "Grid" },
            { id: "dots", label: "Dots" },
          ] as const
        ).map((v) => (
          <Option key={v.id} label={`${v.label} background`} active={d.background === v.id} onClick={() => set("background", v.id)}>
            <span
              className="block h-8 rounded border border-border"
              style={{
                background:
                  v.id === "solid"
                    ? "hsl(var(--card))"
                    : v.id === "gradient"
                      ? `linear-gradient(180deg, ${ACCENTS.find((a) => a.id === d.accent)?.hex}33, transparent)`
                      : v.id === "grid"
                        ? "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)"
                        : "radial-gradient(hsl(var(--border)) 1.3px, transparent 1.3px)",
                backgroundSize: v.id === "grid" ? "10px 10px" : v.id === "dots" ? "8px 8px" : undefined,
              }}
            />
            <span className="mt-1.5 block text-[12px] font-medium">{v.label}</span>
          </Option>
        ))}
      </div>
    </div>
  );
}

function MiniPreview({ id, accent, dark }: { id: TemplateId; accent: string; dark: boolean }) {
  const hex = ACCENTS.find((a) => a.id === accent)?.hex ?? "#ea580c";
  const line = dark ? "#26262b" : "#e8e8ec";
  const fg = dark ? "#f4f4f5" : "#17171c";
  return (
    <span
      className="block h-20 overflow-hidden rounded border border-border p-1.5"
      style={{ background: dark ? "#0b0b0d" : "#fff" }}
      aria-hidden
    >
      {id === "terminal" ? (
        <span className="block font-mono text-[8px] leading-relaxed" style={{ color: fg }}>
          <span style={{ color: hex }}>➜ ~</span> whoami
          <br />
          <span style={{ color: "#888" }}>full-stack developer</span>
          <br />
          <span style={{ color: hex }}>➜ ~</span> ls ./projects
        </span>
      ) : id === "modern" ? (
        <span className="block space-y-1">
          <span className="block h-6 rounded" style={{ background: `linear-gradient(135deg, ${hex}44, transparent)` }} />
          <span className="grid grid-cols-2 gap-1">
            <span className="block h-5 rounded border" style={{ borderColor: line }} />
            <span className="block h-5 rounded border" style={{ borderColor: line }} />
          </span>
          <span className="block h-2 w-2/3 rounded" style={{ background: line }} />
        </span>
      ) : id === "developer" ? (
        <span className="block font-mono text-[8px] leading-relaxed" style={{ color: fg }}>
          <span style={{ color: "#888" }}>const</span> dev = {"{"}
          <br />
          &nbsp;&nbsp;role: <span style={{ color: hex }}>"full-stack"</span>
          <br />
          {"}"}
          <span className="mt-1 grid grid-cols-3 gap-1">
            <span className="block h-4 rounded-sm border" style={{ borderColor: line }} />
            <span className="block h-4 rounded-sm border" style={{ borderColor: line }} />
            <span className="block h-4 rounded-sm border" style={{ borderColor: line }} />
          </span>
        </span>
      ) : id === "editorial" ? (
        <span className="block px-1 pt-1" style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: fg }}>
          <span className="block text-[15px] font-bold leading-tight">Aa</span>
          <span className="block text-[9px] italic" style={{ color: hex }}>Full-stack developer</span>
          <span className="mt-1 block h-px" style={{ background: line }} />
          <span className="mt-1 block h-1 w-full rounded-sm" style={{ background: line }} />
          <span className="mt-0.5 block h-1 w-4/5 rounded-sm" style={{ background: line }} />
        </span>
      ) : id === "sidebar" ? (
        <span className="grid h-full grid-cols-[26px_1fr] gap-1">
          <span className="rounded-sm p-1" style={{ background: `${hex}22` }}>
            <span className="mx-auto block h-3 w-3 rounded-full" style={{ background: hex }} />
            <span className="mx-auto mt-1 block h-1 w-4 rounded-sm" style={{ background: line }} />
            <span className="mx-auto mt-0.5 block h-1 w-4 rounded-sm" style={{ background: line }} />
          </span>
          <span className="space-y-1 pt-0.5">
            <span className="block h-1.5 w-3/4 rounded-sm" style={{ background: fg }} />
            <span className="block h-4 rounded-sm border" style={{ borderColor: line }} />
            <span className="block h-4 rounded-sm border" style={{ borderColor: line }} />
          </span>
        </span>
      ) : id === "bento" ? (
        <span className="grid h-full grid-cols-3 gap-1">
          <span className="col-span-2 rounded border p-1" style={{ borderColor: hex }}>
            <span className="block h-1.5 w-2/3 rounded-sm" style={{ background: fg }} />
            <span className="mt-1 block h-1 w-1/2 rounded-sm" style={{ background: line }} />
          </span>
          <span className="block rounded border" style={{ borderColor: line }} />
          <span className="block rounded border" style={{ borderColor: line }} />
          <span className="block rounded border" style={{ borderColor: line }} />
          <span className="block rounded border" style={{ borderColor: line }} />
        </span>
      ) : id === "compact" ? (
        <span className="block space-y-[3px] px-1 pt-1">
          <span className="mx-auto block h-1.5 w-1/2 rounded-sm" style={{ background: fg }} />
          <span className="mx-auto block h-1 w-2/3 rounded-sm" style={{ background: line }} />
          <span className="block h-px" style={{ background: hex }} />
          <span className="block h-1 w-full rounded-sm" style={{ background: line }} />
          <span className="block h-1 w-full rounded-sm" style={{ background: line }} />
          <span className="block h-1 w-4/5 rounded-sm" style={{ background: line }} />
          <span className="block h-px" style={{ background: hex }} />
          <span className="block h-1 w-full rounded-sm" style={{ background: line }} />
        </span>
      ) : (
        <span className="block space-y-1.5 px-1 pt-1">
          <span className="block h-2.5 w-3/4 rounded-sm" style={{ background: fg }} />
          <span className="block h-1.5 w-1/2 rounded-sm" style={{ background: line }} />
          <span className="block h-px" style={{ background: line }} />
          <span className="block h-1.5 w-2/3 rounded-sm" style={{ background: line }} />
          <span className="block h-1.5 w-1/2 rounded-sm" style={{ background: line }} />
        </span>
      )}
    </span>
  );
}
