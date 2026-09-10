/* One-off logic smoke test — run with: npx -y tsx scripts/smoke.ts */
import { parsePortfolio, emptyPortfolio } from "@/types/portfolio";
import { samplePortfolio } from "@/data/sample";
import { generatePortfolioHtml } from "@/lib/export-html";
import { createZip, buildPortfolioZip } from "@/lib/export-zip";
import { parseResumeText } from "@/lib/resume";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
};

console.log("parsePortfolio:");
ok("empty object → defaults", (() => { const p = parsePortfolio({}); return p.version === 1 && p.profile.name === ""; })());
ok("null → defaults", parsePortfolio(null).skills.length === 0);
ok("malformed string → defaults", parsePortfolio("garbage").design.template === "developer");
ok("partial data merges", parsePortfolio({ profile: { name: "X" } }).profile.name === "X");
ok("missing ids get generated", parsePortfolio({ skills: [{ name: "TS" }] }).skills[0].id.length > 0);
ok("emptyPortfolio valid", parsePortfolio(emptyPortfolio()).version === 1);

console.log("generatePortfolioHtml:");
for (const t of ["minimal", "developer", "modern", "terminal", "editorial", "sidebar", "bento", "compact"] as const) {
  const s = samplePortfolio();
  s.design.template = t;
  const html = generatePortfolioHtml(s);
  ok(`${t}: doctype + name + project`, html.startsWith("<!DOCTYPE html>") && html.includes("Aarav Sharma") && html.includes("Datumly"));
  ok(`${t}: no template leak`, !html.includes("undefined"));
}
const empty = emptyPortfolio();
ok("empty portfolio still valid html", generatePortfolioHtml(empty).includes("<!DOCTYPE html>"));

console.log("zip:");
async function main() {
const zip = await buildPortfolioZip(samplePortfolio());
const buf = Buffer.from(await zip.arrayBuffer());
ok("zip magic PK", buf[0] === 0x50 && buf[1] === 0x4b);
ok("contains index.html", buf.includes("portfolio/index.html"));
ok("contains styles", buf.includes("portfolio/styles/main.css"));
ok("contains README", buf.includes("portfolio/README.md"));
// validate local headers parse
let off = 0; let files = 0;
while (buf.readUInt32LE(off) === 0x04034b50) {
  const nameLen = buf.readUInt16LE(off + 26);
  const extraLen = buf.readUInt16LE(off + 28);
  const size = buf.readUInt32LE(off + 18);
  off += 30 + nameLen + extraLen + size;
  files++;
}
ok("4 file entries parse cleanly", files === 4);
const z2 = createZip([{ name: "a.txt", content: "hello" }]);
ok("tiny zip ok", (await z2.arrayBuffer()).byteLength > 30);
}

await main();
console.log("resume:");
const txt = `Jane Doe
jane@example.com | +1 555-0100 | github.com/janedoe | San Francisco, CA
Summary Senior frontend engineer with 5 years building React apps. Shipped dashboards used daily.
Experience Senior Engineer at Acme 2021 - Present Built design system. Engineer at Beta 2019 - 2021 Worked on checkout.
Education B.S. Computer Science, State University 2015 - 2019
Skills JavaScript TypeScript React Node.js PostgreSQL Docker
Projects Shopfast - headless storefront starter. github.com/janedoe/shopfast
Certifications AWS Certified Developer 2023`;
const g = parseResumeText(txt);
ok("email found", g.profile?.email === "jane@example.com");
ok("github found", (g.socials?.length ?? 0) >= 1);
ok("skills found (>=4)", (g.skills?.length ?? 0) >= 4);
ok("experience found", (g.experience?.length ?? 0) >= 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
