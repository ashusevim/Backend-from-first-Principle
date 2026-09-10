/** Deterministic, client-side writing helpers (no external AI required). */

export function makeConcise(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  // drop common filler openers
  t = t.replace(
    /^(hi,?\s*(i'm|i am|my name is)[^.!?]*[.!?]\s*|hello,?\s*[^.!?]*[.!?]\s*)/i,
    ""
  );
  const filler = [
    /\bvery\b/gi, /\breally\b/gi, /\bjust\b/gi, /\bactually\b/gi, /\bbasically\b/gi,
    /\bin order to\b/gi, /\bdue to the fact that\b/gi, /\ba large number of\b/gi,
  ];
  const replacements = ["", "", "", "", "", "to", "because", "many"];
  filler.forEach((re, i) => {
    t = t.replace(re, replacements[i]);
  });
  // keep the strongest ~3 sentences
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
  if (sentences.length > 3) {
    const scored = sentences.map((s) => ({
      s,
      score: (s.match(/\d|%|\+|x\b|shipped|built|led|designed|reduced|improved|launched/gi) || [])
        .length,
    }));
    scored.sort((a, b) => b.score - a.score);
    t = scored.slice(0, 3).map((x) => x.s).join(" ");
  }
  return t.replace(/\s+/g, " ").trim();
}

export function makeBullets(text: string): string {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/[.]+$/, ""))
    .filter((s) => s.length > 8);
  return sentences
    .slice(0, 6)
    .map((s) => `• ${s.charAt(0).toUpperCase()}${s.slice(1)}`)
    .join("\n");
}

export function actionVerbs(text: string): string {
  const swaps: [RegExp, string][] = [
    [/\bresponsible for\b/gi, "Owned"],
    [/\bworked on\b/gi, "Built"],
    [/\bhelped with\b/gi, "Contributed to"],
    [/\bmade\b/gi, "Built"],
    [/\bdid\b/gi, "Delivered"],
    [/\bgot\b/gi, "Achieved"],
  ];
  let t = text;
  for (const [re, to] of swaps) t = t.replace(re, to);
  return t;
}
