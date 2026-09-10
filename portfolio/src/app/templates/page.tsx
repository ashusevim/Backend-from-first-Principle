"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { samplePortfolio } from "@/data/sample";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { PortfolioTemplate, TEMPLATE_META } from "@/components/templates/registry";
import { cn } from "@/lib/utils";
import type { TemplateId } from "@/types/portfolio";

export default function TemplatesPage() {
  const [active, setActive] = useState<TemplateId>("developer");
  const { resolved } = useTheme();
  const data = useMemo(() => {
    const s = samplePortfolio();
    s.design.template = active;
    return s;
  }, [active]);
  const meta = TEMPLATE_META.find((t) => t.id === active)!;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Templates</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Four crafted starting points, one shared data model. Switching templates never
        touches your content — pick the vibe, keep the substance.
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Templates">
        {TEMPLATE_META.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={t.id}
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "relative scroll-mt-24 rounded-lg border p-4 text-left transition-colors",
              active === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
            )}
          >
            {active === t.id && (
              <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
            <p className="font-semibold">{t.name}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{t.tagline}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
          <p className="text-sm">
            Previewing <strong>{meta.name}</strong>
            <span className="text-muted-foreground"> · with sample data · {resolved} mode</span>
          </p>
          <Link href="/builder">
            <Button size="sm">Use this template <ArrowRight className="h-3.5 w-3.5" /></Button>
          </Link>
        </div>
        <div key={active} className="max-h-[80vh] overflow-y-auto animate-fade-in">
          <PortfolioTemplate
            portfolio={data}
            dark={resolved === "dark" || active === "terminal"}
            template={active}
          />
        </div>
      </div>
    </main>
  );
}
