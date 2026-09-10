"use client";

import { useState } from "react";
import Link from "next/link";
import { Code2, Eye, FileArchive, FileJson, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildPortfolioZip } from "@/lib/export-zip";
import { generatePortfolioHtml } from "@/lib/export-html";
import { downloadFile } from "@/lib/utils";
import type { Portfolio } from "@/types/portfolio";
import { PanelTitle } from "./bits";

export function ExportPanel({ p }: { p: Portfolio }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const slug = (p.profile.name || "portfolio").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "portfolio";

  const run = async (kind: string, fn: () => void | Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
      toast("Export ready — check your downloads.");
    } catch {
      toast("Export failed. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const Row = ({
    icon, title, body, action, kind,
  }: {
    icon: React.ReactNode; title: string; body: string; action: React.ReactNode; kind: string;
  }) => (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
        {busy === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{body}</p>
        <div className="mt-2.5">{action}</div>
      </div>
    </div>
  );

  return (
    <div>
      <PanelTitle title="Export" hint="Your portfolio belongs to you. Take it anywhere." />
      <div className="space-y-2.5">
        <Row
          kind="html"
          icon={<Code2 className="h-4 w-4" />}
          title="Standalone website"
          body="A single index.html with everything inline. Host it anywhere — no builder required."
          action={
            <Button size="sm" disabled={!!busy} onClick={() => run("html", () => downloadFile(`${slug}.html`, generatePortfolioHtml(p), "text/html"))}>
              Download HTML
            </Button>
          }
        />
        <Row
          kind="zip"
          icon={<FileArchive className="h-4 w-4" />}
          title="Project ZIP"
          body="portfolio/ with index.html, styles, assets folder and a README. Ready for Netlify, Vercel or GitHub Pages."
          action={
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("zip", () => downloadFile(`${slug}.zip`, buildPortfolioZip(p)))}>
              Download ZIP
            </Button>
          }
        />
        <Row
          kind="pdf"
          icon={<FileText className="h-4 w-4" />}
          title="PDF"
          body="A clean print layout of your portfolio. Opens the preview — just hit Print → Save as PDF."
          action={
            <Link href="/preview?print=1">
              <Button size="sm" variant="outline">Open printable preview</Button>
            </Link>
          }
        />
        <Row
          kind="json"
          icon={<FileJson className="h-4 w-4" />}
          title="Data backup (JSON)"
          body="Your portfolio data stays in your browser. Download a backup so you never lose it."
          action={
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("json", () => downloadFile("portfolio.json", JSON.stringify(p, null, 2), "application/json"))}>
              Download portfolio.json
            </Button>
          }
        />
        <Row
          kind="view"
          icon={<Eye className="h-4 w-4" />}
          title="Full preview"
          body="See exactly what recruiters will see — no editor chrome."
          action={
            <Link href="/preview">
              <Button size="sm" variant="outline">Open preview</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
