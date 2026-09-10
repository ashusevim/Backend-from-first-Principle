import type { Portfolio, TemplateId } from "@/types/portfolio";
import { TemplateMinimal } from "./minimal";
import { TemplateDeveloper } from "./developer";
import { TemplateModern } from "./modern";
import { TemplateTerminal } from "./terminal";
import { TemplateEditorial } from "./editorial";
import { TemplateSidebar } from "./sidebar";
import { TemplateBento } from "./bento";
import { TemplateCompact } from "./compact";

export const TEMPLATE_META: { id: TemplateId; name: string; tagline: string }[] = [
  { id: "minimal", name: "Minimal", tagline: "Quiet typography, generous whitespace. Timeless and print-friendly." },
  { id: "developer", name: "Developer", tagline: "Technical aesthetic with projects and GitHub front and center." },
  { id: "modern", name: "Modern", tagline: "Bold cards and confident hierarchy. Made to impress recruiters." },
  { id: "terminal", name: "Terminal", tagline: "A polished terminal session. Professional, with personality." },
  { id: "editorial", name: "Editorial", tagline: "Magazine-style serif. Oversized type, hairline rules, quiet confidence." },
  { id: "sidebar", name: "Sidebar", tagline: "Classic two-column pro layout with a contact and skills rail." },
  { id: "bento", name: "Bento", tagline: "A tidy grid of cards. Visual, scannable, unmistakably modern." },
  { id: "compact", name: "Compact", tagline: "A dense one-pager. Resume-like, recruiter-proof, print-perfect." },
];

export function PortfolioTemplate({
  portfolio,
  dark,
  template,
}: {
  portfolio: Portfolio;
  dark: boolean;
  template?: TemplateId;
}) {
  const id = template ?? portfolio.design.template;
  switch (id) {
    case "minimal":
      return <TemplateMinimal portfolio={portfolio} dark={dark} />;
    case "modern":
      return <TemplateModern portfolio={portfolio} dark={dark} />;
    case "terminal":
      return <TemplateTerminal portfolio={portfolio} dark={dark} />;
    case "editorial":
      return <TemplateEditorial portfolio={portfolio} dark={dark} />;
    case "sidebar":
      return <TemplateSidebar portfolio={portfolio} dark={dark} />;
    case "bento":
      return <TemplateBento portfolio={portfolio} dark={dark} />;
    case "compact":
      return <TemplateCompact portfolio={portfolio} dark={dark} />;
    case "developer":
    default:
      return <TemplateDeveloper portfolio={portfolio} dark={dark} />;
  }
}
