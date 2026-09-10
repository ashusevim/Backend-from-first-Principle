import type { Portfolio, TemplateId } from "@/types/portfolio";
import { TemplateMinimal } from "./minimal";
import { TemplateDeveloper } from "./developer";
import { TemplateModern } from "./modern";
import { TemplateTerminal } from "./terminal";

export const TEMPLATE_META: { id: TemplateId; name: string; tagline: string }[] = [
  { id: "minimal", name: "Minimal", tagline: "Quiet typography, generous whitespace. Timeless and print-friendly." },
  { id: "developer", name: "Developer", tagline: "Technical aesthetic with projects and GitHub front and center." },
  { id: "modern", name: "Modern", tagline: "Bold cards and confident hierarchy. Made to impress recruiters." },
  { id: "terminal", name: "Terminal", tagline: "A polished terminal session. Professional, with personality." },
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
    case "developer":
    default:
      return <TemplateDeveloper portfolio={portfolio} dark={dark} />;
  }
}
