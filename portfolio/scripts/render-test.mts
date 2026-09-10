/* SSR render test for every template — run with: npx -y tsx scripts/render-test.mts */
import { renderToString } from "react-dom/server";
import * as React from "react";
import { createElement } from "react";
(globalThis as Record<string, unknown>).React = React;
import { emptyPortfolio, templateIds } from "@/types/portfolio";
import { samplePortfolio } from "@/data/sample";
import { PortfolioTemplate } from "@/components/templates/registry";

let pass = 0;
let fail = 0;
for (const t of templateIds) {
  for (const dark of [false, true]) {
    const html = renderToString(
      createElement(PortfolioTemplate, { portfolio: samplePortfolio(), dark, template: t })
    );
    const good = html.includes("Aarav Sharma") && html.includes("Datumly") && !html.includes("undefined");
    console.log(`${good ? "✓" : "✗"} ${t} ${dark ? "dark" : "light"} (${html.length} chars)`);
    good ? pass++ : fail++;
  }
  const empty = renderToString(
    createElement(PortfolioTemplate, { portfolio: emptyPortfolio(), dark: false, template: t })
  );
  const goodEmpty = !empty.includes("undefined") && empty.length > 500;
  console.log(`${goodEmpty ? "✓" : "✗"} ${t} empty`);
  goodEmpty ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
