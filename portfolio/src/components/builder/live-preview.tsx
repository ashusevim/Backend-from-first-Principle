"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { PortfolioTemplate } from "@/components/templates/registry";
import { cn } from "@/lib/utils";
import type { Portfolio } from "@/types/portfolio";

export function resolveDark(p: Portfolio, appDark: boolean): boolean {
  if (p.design.theme === "dark") return true;
  if (p.design.theme === "light") return false;
  return appDark || p.design.template === "terminal";
}

export function LivePreview({
  p,
  device,
  setDevice,
  bare,
}: {
  p: Portfolio;
  device: "desktop" | "mobile";
  setDevice?: (d: "desktop" | "mobile") => void;
  bare?: boolean;
}) {
  const { resolved } = useTheme();
  const dark = resolveDark(p, resolved === "dark");

  return (
    <div className="flex h-full flex-col">
      {!bare && setDevice && (
        <div className="no-print flex items-center justify-center gap-1 border-b border-border bg-background px-3 py-2">
          <div className="flex rounded-md bg-secondary p-0.5" role="tablist" aria-label="Preview device">
            <button
              role="tab"
              aria-selected={device === "desktop"}
              onClick={() => setDevice("desktop")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium",
                device === "desktop" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>
            <button
              role="tab"
              aria-selected={device === "mobile"}
              onClick={() => setDevice("mobile")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium",
                device === "mobile" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
          </div>
        </div>
      )}
      <div className="slim-scroll flex-1 overflow-y-auto bg-secondary/40 p-2 sm:p-4">
        <div
          className={cn(
            "mx-auto min-h-full overflow-hidden rounded-lg border border-border shadow-sm transition-[max-width]",
            device === "mobile" ? "max-w-[400px]" : "max-w-full"
          )}
        >
          <PortfolioTemplate portfolio={p} dark={dark} />
        </div>
      </div>
    </div>
  );
}
