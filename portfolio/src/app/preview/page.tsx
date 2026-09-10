"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Pencil, Printer } from "lucide-react";
import { loadPortfolio } from "@/lib/storage";
import type { Portfolio } from "@/types/portfolio";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { PortfolioTemplate } from "@/components/templates/registry";
import { resolveDark } from "@/components/builder/live-preview";

function PreviewInner() {
  const [p, setP] = useState<Portfolio | null>(null);
  const { resolved } = useTheme();
  const params = useSearchParams();

  useEffect(() => {
    setP(loadPortfolio().portfolio);
    if (params.get("print") === "1") {
      const t = setTimeout(() => window.print(), 900);
      return () => clearTimeout(t);
    }
  }, [params]);

  if (!p) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const isEmpty = !p.profile.name && p.projects.length === 0 && !p.about && p.skills.length === 0;

  return (
    <main className="min-h-screen">
      <div className="no-print sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/builder" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Builder
          </Link>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Download PDF</span>
            </Button>
            <Link href="/builder">
              <Button size="sm" variant="outline"><Pencil className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Edit Portfolio</span></Button>
            </Link>
            <Link href="/builder">
              <Button size="sm"><Download className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Export</span></Button>
            </Link>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-xl font-bold">Nothing to preview yet</h1>
          <p className="mt-2 text-muted-foreground">
            Your portfolio is empty. Head to the builder and add your first details — or start with sample data.
          </p>
          <Link href="/builder" className="mt-6 inline-block">
            <Button>Open the builder</Button>
          </Link>
        </div>
      ) : (
        <div className="print-clean">
          <PortfolioTemplate portfolio={p} dark={resolveDark(p, resolved === "dark")} />
        </div>
      )}
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
      <PreviewInner />
    </Suspense>
  );
}


