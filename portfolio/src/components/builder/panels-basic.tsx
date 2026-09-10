"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { actionVerbs, makeBullets, makeConcise } from "@/lib/text-helpers";
import type { PortfolioUpdate } from "@/hooks/use-portfolio";
import { isValidEmail, type Portfolio } from "@/types/portfolio";
import { PanelTitle, ImageUpload } from "./bits";

export function ProfilePanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const set = (k: keyof Portfolio["profile"], v: string) =>
    update((prev) => ({ ...prev, profile: { ...prev.profile, [k]: v } }));
  const emailBad = !isValidEmail(p.profile.email);

  return (
    <div>
      <PanelTitle title="Profile" hint="The essentials. This is what people see first." />
      <div className="space-y-3.5">
        <ImageUpload
          label="Profile photo"
          value={p.profile.photo}
          onChange={(v) => set("photo", v)}
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={p.profile.name} onChange={(e) => set("name", e.target.value)} placeholder="Aarav Sharma" maxLength={80} autoComplete="name" />
          </Field>
          <Field label="Professional title">
            <Input value={p.profile.title} onChange={(e) => set("title", e.target.value)} placeholder="Full Stack Developer" maxLength={80} />
          </Field>
        </div>
        <Field label="Tagline" hint="One line that sells you.">
          <Textarea value={p.profile.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Building fast, scalable web applications." rows={2} maxLength={220} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Location" optional>
            <Input value={p.profile.location} onChange={(e) => set("location", e.target.value)} placeholder="Bengaluru, India" maxLength={80} />
          </Field>
          <Field label="Availability" optional hint="e.g. Open to work">
            <Input value={p.profile.availability} onChange={(e) => set("availability", e.target.value)} placeholder="Open to full-time roles" maxLength={80} />
          </Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Email" error={emailBad ? "That email doesn't look right." : undefined}>
            <Input value={p.profile.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" invalid={emailBad} />
          </Field>
          <Field label="Phone" optional>
            <Input value={p.profile.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" type="tel" autoComplete="tel" />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function AboutPanel({ p, update }: { p: Portfolio; update: PortfolioUpdate }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const apply = (label: string, fn: (t: string) => string) => {
    if (!p.about.trim()) {
      toast("Write something first, then try a helper.", "info");
      return;
    }
    setBusy(label);
    setTimeout(() => {
      const out = fn(p.about);
      update((prev) => ({ ...prev, about: out }));
      setBusy(null);
      toast("About section updated.");
    }, 350);
  };

  return (
    <div>
      <PanelTitle title="About" hint="A few honest sentences. Recruiters skim — make it count." />
      <Field label="About you" hint={`${p.about.length}/4000`}>
        <Textarea
          value={p.about}
          onChange={(e) => update((prev) => ({ ...prev, about: e.target.value.slice(0, 4000) }))}
          placeholder={"Full stack developer with 3 years of experience…\n\nI care about clean APIs, thoughtful UI and systems that are easy to change."}
          rows={8}
        />
      </Field>
      <div className="mt-3 rounded-lg border border-border bg-card p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium">
          <Wand2 className="h-3.5 w-3.5 text-primary" /> Writing helpers
          <span className="font-normal text-muted-foreground">· run privately in your browser</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => apply("concise", makeConcise)}>
            {busy === "concise" ? "Working…" : "Make more concise"}
          </Button>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => apply("bullets", makeBullets)}>
            {busy === "bullets" ? "Working…" : "Turn into bullets"}
          </Button>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => apply("verbs", actionVerbs)}>
            {busy === "verbs" ? "Working…" : "Stronger verbs"}
          </Button>
        </div>
      </div>
    </div>
  );
}

