"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, TerminalSquare } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/templates", label: "Templates" },
  { href: "/builder", label: "Builder" },
  { href: "/about", label: "About" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setMode } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setMode(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <TerminalSquare className="h-4 w-4" />
      </span>
      Devfolio
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/builder") return null;
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground sm:block",
                pathname === n.href && "bg-accent text-accent-foreground"
              )}
            >
              {n.label}
            </Link>
          ))}
          <ThemeToggle />
          <Link href="/builder">
            <Button size="sm" className="ml-1">
              Build My Portfolio
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/builder" || pathname === "/preview") return null;
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-xs">· Local-first portfolio builder for developers</span>
        </div>
        <nav className="flex gap-4" aria-label="Footer">
          <Link href="/templates" className="hover:text-foreground">Templates</Link>
          <Link href="/builder" className="hover:text-foreground">Builder</Link>
          <Link href="/preview" className="hover:text-foreground">Preview</Link>
          <Link href="/about" className="hover:text-foreground">About</Link>
        </nav>
      </div>
    </footer>
  );
}
