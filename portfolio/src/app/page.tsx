import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, Download, FileJson, FileText, Github, Import, Eye,
  LayoutTemplate, Lock, Palette, Sparkles, Zap, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPreview } from "@/components/landing/hero-preview";
import { TEMPLATE_META } from "@/components/templates/registry";

export const metadata: Metadata = {
  title: "Developer Portfolio Builder — Build Your Portfolio in Minutes",
  description:
    "Create a professional developer portfolio in minutes. Import your GitHub, customize your design, and export your site — no coding required.",
};

export default function LandingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[480px]"
          style={{ background: "radial-gradient(52rem 22rem at 50% 0%, hsl(var(--primary) / 0.12), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Made for developers · No account needed</span>
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Build a portfolio that gets you <span className="text-primary">noticed.</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Create a professional developer portfolio in minutes. Import your GitHub,
              customize your design, and export your site — no coding required.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/builder">
                <Button size="lg">Build My Portfolio <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="/templates">
                <Button size="lg" variant="outline">Explore Templates</Button>
              </Link>
            </div>
            <dl className="mt-8 flex gap-6 text-sm">
              {[
                ["5 min", "median build time"],
                ["8", "crafted templates"],
                ["0", "accounts required"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-xl font-bold">{v}</dt>
                  <dd className="text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroPreview />
        </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-center font-mono text-xs uppercase tracking-[0.18em] text-primary">How it works</p>
          <h2 className="mt-2 text-center text-2xl font-bold tracking-tight">From zero to hired in three steps</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Import, t: "1. Add your information", d: "Type it in, import from GitHub, or upload your resume. Everything stays editable." },
              { icon: Palette, t: "2. Customize your portfolio", d: "Pick one of eight developer-grade templates, tune colors, fonts and layout — live." },
              { icon: Download, t: "3. Export and publish", d: "Download a standalone site, a tidy ZIP, or a clean PDF. Host it anywhere." },
            ].map((s) => (
              <div key={s.t} className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                  <s.icon className="h-4 w-4 text-primary" />
                </span>
                <h3 className="mt-3 font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEMPLATES */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Templates</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Eight templates. Zero filler.</h2>
            <p className="mt-1 text-muted-foreground">Same data, four personalities. Switch anytime — nothing is lost.</p>
          </div>
          <Link href="/templates"><Button variant="outline" size="sm">See all templates <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATE_META.map((t, i) => (
            <Link key={t.id} href={`/templates#${t.id}`} className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/60">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-1 font-semibold group-hover:text-primary">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Everything you need. Nothing you don't.</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Github, t: "GitHub import", d: "Avatar, bio and repos in — pick exactly which projects to feature." },
              { icon: FileText, t: "Resume import", d: "Upload a PDF or TXT resume and get a head start in seconds." },
              { icon: Eye, t: "Live preview", d: "Every keystroke updates the preview instantly. No save button." },
              { icon: LayoutTemplate, t: "Beautiful templates", d: "Minimal, Developer, Modern and Terminal — all responsive." },
              { icon: FileJson, t: "JSON backup", d: "Your data lives in your browser. Export and re-import anytime." },
              { icon: Code2, t: "HTML export", d: "A standalone site that works forever, with or without us." },
              { icon: Download, t: "PDF export", d: "A clean, print-ready version for applications and recruiters." },
              { icon: Zap, t: "No account required", d: "Open the builder and start. Done is better than signed-up." },
            ].map((f) => (
              <div key={f.t} className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="h-4 w-4 text-primary" />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEV FOCUSED + PRIVACY */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border p-6 sm:p-8">
          <Code2 className="h-6 w-6 text-primary" />
          <h2 className="mt-3 text-xl font-bold">Built for developers, not businesses</h2>
          <p className="mt-2 text-muted-foreground">
            No hero sliders selling soap. Instead: stack sections, repo cards with tech tags,
            experience timelines, terminal aesthetics, and mono-spaced details that feel like home.
            This is the fastest way for a developer to ship a portfolio worth linking.
          </p>
        </div>
        <div className="rounded-lg border border-border p-6 sm:p-8">
          <Lock className="h-6 w-6 text-primary" />
          <h2 className="mt-3 text-xl font-bold">Your portfolio belongs to you</h2>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li>· No account required — nothing to sign up for</li>
            <li>· Portfolio data stored locally in your browser</li>
            <li>· Export your data and your site anytime</li>
            <li>· No lock-in: exported sites work independently</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-xl border border-border bg-primary px-6 py-12 text-center text-primary-foreground sm:py-16">
          <h2 className="mx-auto max-w-xl text-3xl font-extrabold tracking-tight">
            Build your portfolio today.
          </h2>
          <p className="mx-auto mt-3 max-w-md opacity-90">
            Five minutes from now you could have a portfolio worth putting on your resume.
          </p>
          <div className="mt-7">
            <Link href="/builder">
              <Button size="lg" variant="secondary">Start building — it's free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
