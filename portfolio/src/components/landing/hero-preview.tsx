"use client";

import { useMemo, useState } from "react";
import { samplePortfolio } from "@/data/sample";
import { useTheme } from "@/components/theme-provider";
import { PortfolioTemplate } from "@/components/templates/registry";
import type { TemplateId } from "@/types/portfolio";
import { cn } from "@/lib/utils";

const TABS: TemplateId[] = ["developer", "minimal", "modern", "terminal", "editorial", "sidebar", "bento", "compact"];

export function HeroPreview() {
  const [tab, setTab] = useState<TemplateId>("developer");
  const { resolved } = useTheme();
  const data = useMemo(() => {
    const s = samplePortfolio();
    s.design.template = tab;
    s.design.theme = "system";
    return s;
  }, [tab]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="slim-scroll flex max-w-[60%] gap-1 overflow-x-auto" role="tablist" aria-label="Preview template">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium capitalize",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="pointer-events-none h-[420px] select-none overflow-hidden sm:h-[480px]">
        <div key={tab} className="animate-fade-in">
          <PortfolioTemplate portfolio={data} dark={resolved === "dark" || tab === "terminal"} template={tab} />
        </div>
      </div>
    </div>
  );
}
