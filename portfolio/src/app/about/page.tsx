import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description: "Why Devfolio exists: the fastest way for a developer to create a great portfolio.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">About</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
        The fastest way for a developer to create a great portfolio.
      </h1>
      <div className="prose-dev mt-6 space-y-5 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">Devfolio is a portfolio builder made specifically for developers.</strong>{" "}
          Generic website builders ask you to drag boxes around and pick stock photos. Devfolio asks for
          your GitHub username — and does the boring parts for you.
        </p>
        <h2 className="pt-2 text-lg font-bold text-foreground">What makes it different</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Developer-first.</strong> Stack sections, repo cards, tech tags, timelines — not landing-page widgets.</li>
          <li><strong className="text-foreground">GitHub import.</strong> Your avatar, bio and repositories become a portfolio in seconds.</li>
          <li><strong className="text-foreground">Resume → portfolio.</strong> Already have a resume? Upload it and get a head start.</li>
          <li><strong className="text-foreground">Local-first.</strong> No account, no database. Your data lives in your browser until you export it.</li>
          <li><strong className="text-foreground">Truly exportable.</strong> Standalone HTML, a hostable ZIP, a clean PDF, and your raw JSON. No lock-in.</li>
          <li><strong className="text-foreground">Extremely fast.</strong> Live preview, instant template switching, zero waiting.</li>
        </ul>
        <h2 className="pt-2 text-lg font-bold text-foreground">What it is not</h2>
        <p>
          Devfolio is not trying to replace Webflow, Framer or WordPress. It does one thing well:
          turn a developer's work into a portfolio worth linking on a resume.
        </p>
        <h2 className="pt-2 text-lg font-bold text-foreground">Privacy</h2>
        <p>
          Your portfolio belongs to you. Content you enter is stored in your browser's local storage —
          there is no account and no portfolio database. The only network calls the app makes are the
          ones you trigger (like importing from the public GitHub API) plus the fonts that render the page.
          Exported sites contain only what you put in them.
        </p>
        <h2 className="pt-2 text-lg font-bold text-foreground">Roadmap</h2>
        <p>
          Local-first builder today; hosted portfolios with custom domains, more templates, analytics
          and optional cloud sync later. The architecture is designed so none of that breaks what you
          build now.
        </p>
      </div>
      <div className="mt-8">
        <Link href="/builder">
          <Button>Build My Portfolio <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    </main>
  );
}
